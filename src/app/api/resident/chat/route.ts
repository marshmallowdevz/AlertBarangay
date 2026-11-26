import { isUserBanned } from "@/lib/auth/is-user-banned";
import { sanitizeChatHistory } from "@/lib/chat/assistant";
import { readSseText } from "@/lib/chat/sse";
import { answerFromFaq, type FaqLang } from "@/lib/chat/faq";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Google Gemini (free tier, key from aistudio.google.com) over its REST API.
// gemini-1.5-flash has been retired by Google, so the default is its current
// free successor; set GEMINI_MODEL to use another one.
const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
const REQUEST_TIMEOUT_MS = 45_000;

const SYSTEM_PROMPT = `You are the AlertBarangay Assistant, a friendly helper inside the AlertBarangay app used by residents of a barangay in Cebu, Philippines.

What you help residents with:
- Using the app: filing an emergency report from the dashboard (pick a type such as fire, medical, flood, crime, accident, electrical hazard, road damage, water problem or garbage, describe what is happening, share GPS location or type an address/landmark, optionally attach a photo or video), following a report's status (Pending, Responding, Resolved), messaging the barangay about a report with the Messages link under it (contact details stay private), the notification bell, writing a report while offline (it is saved on the phone and sent automatically when back online), switching the app language (English, Filipino, Cebuano) at the top of the page, reading barangay announcements, and updating their name, photo or password on the Account page.
- Practical safety and preparedness tips (fire, flood, typhoon, earthquake, first aid basics, what to pack in a go-bag) in plain language.
- Helping a resident word a clear incident description before they submit it.

Rules:
- If someone describes a life-threatening emergency happening now, tell them first to call 911 (the national emergency hotline) and to send a report with the Report form on their dashboard. Keep that reply very short.
- You cannot file reports, dispatch responders, see anyone's reports, or contact officials. Never claim you did. Point residents to the dashboard form instead.
- Do not invent local details (barangay hotline numbers, office hours, names of officials, evacuation centres). Say they can check the Announcements section or ask the barangay hall.
- Give general first-aid information only, and recommend professional medical help for anything serious. No diagnoses.
- Reply in the resident's language (English, Filipino/Tagalog or Cebuano/Bisaya). If their message doesn't make the language clear, use the app language they picked. Keep answers short and easy to read on a phone: a few sentences or a short list. Plain text only, no markdown headings or tables.
- Politely decline requests unrelated to the barangay, safety or using AlertBarangay.`;

// Simple per-user limit so one account can't run up the AI bill.
// In-memory: resets on deploy and is per server instance, which is enough here.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const usage = new Map<string, number[]>();

function rateLimited(userId: string) {
  const now = Date.now();
  // Forget idle users now and then so the map can't grow without limit.
  if (usage.size > 500) {
    for (const [id, times] of usage) if (!times.some((time) => now - time < WINDOW_MS)) usage.delete(id);
  }
  const recent = (usage.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    usage.set(userId, recent);
    return true;
  }
  recent.push(now);
  usage.set(userId, recent);
  return false;
}

export async function POST(request: Request) {
  // Only signed-in, active resident accounts may use the assistant.
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Please sign in again to use the assistant.", 401);
  if (isUserBanned(user.banned_until)) return jsonError("This account is inactive.", 403);
  const { data: profile, error: profileError } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).maybeSingle();
  if (profileError) return jsonError("We couldn't verify your account. Please try again.", 500);
  if (profile?.role !== "resident" || profile.is_active === false) {
    return jsonError("The assistant is available to resident accounts only.", 403);
  }

  const body = await request.json().catch(() => null) as { messages?: unknown; lang?: unknown } | null;
  const lang: FaqLang = body?.lang === "fil" || body?.lang === "ceb" ? body.lang : "en";
  const appLanguage = lang === "fil" ? "Filipino" : lang === "ceb" ? "Cebuano" : "English";
  const messages = sanitizeChatHistory(body?.messages);
  if (!messages) return jsonError("Please type a message first.", 400);

  if (rateLimited(user.id)) {
    return jsonError("You've sent a lot of messages. Please wait a few minutes and try again.", 429);
  }

  // Plug and play: without a Gemini key (or when Gemini is down or over its free
  // quota) the assistant answers from built-in English/Filipino/Cebuano help.
  const lastQuestion = messages[messages.length - 1]?.content ?? "";
  const builtIn = () => textResponse(answerFromFaq(lastQuestion, lang));
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return builtIn();

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeout]);
  let upstream: Response;
  try {
    upstream = await fetch(geminiUrl(MODEL), {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\n\nThe resident's app language is ${appLanguage}.` }] },
        contents: messages.map((turn) => ({ role: turn.role === "assistant" ? "model" : "user", parts: [{ text: turn.content }] })),
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          // 2.5 models "think" by default; skipping it keeps replies fast and inside the free quota.
          ...(/2\.5-flash/.test(MODEL) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error("[resident-chat] could not reach Gemini", timeout.aborted ? "timeout" : error);
    return builtIn();
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    if (upstream.status === 400 && /API key/i.test(detail) || upstream.status === 401 || upstream.status === 403) console.error("[resident-chat] GEMINI_API_KEY was rejected; using built-in answers");
    else console.error("[resident-chat] Gemini request failed; using built-in answers", { status: upstream.status, detail: detail.slice(0, 300) });
    return builtIn();
  }

  const encoder = new TextEncoder();
  const geminiBody = upstream.body;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let wroteText = false;
      try {
        for await (const text of readSseText(geminiBody)) {
          wroteText = true;
          controller.enqueue(encoder.encode(text));
        }
        // e.g. Gemini's safety filter returned no text: answer from the built-in help instead.
        if (!wroteText) controller.enqueue(encoder.encode(answerFromFaq(lastQuestion, lang)));
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("[resident-chat] stream failed", error);
          controller.enqueue(encoder.encode(!wroteText
            ? answerFromFaq(lastQuestion, lang)
            : timeout.aborted
              ? "\n\n[The assistant took too long to answer. Please try again.]"
              : "\n\n[The assistant is unavailable right now. Please try again in a moment.]"));
        }
      } finally {
        try { controller.close(); } catch { /* already closed by a cancel */ }
      }
    },
    cancel() { void geminiBody.cancel().catch(() => undefined); },
  });

  return textResponse(stream);
}

function textResponse(body: BodyInit) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
