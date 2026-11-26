import Anthropic from "@anthropic-ai/sdk";
import { isUserBanned } from "@/lib/auth/is-user-banned";
import { sanitizeChatHistory } from "@/lib/chat/assistant";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

const SYSTEM_PROMPT = `You are the AlertBarangay Assistant, a friendly helper inside the AlertBarangay app used by residents of a barangay in Cebu, Philippines.

What you help residents with:
- Using the app: filing an emergency report from the dashboard (pick a type such as fire, medical, flood, crime or accident, describe what is happening, share GPS location or type an address/landmark, optionally attach a photo or video), following a report's status (Pending, Responding, Resolved), reading barangay announcements, and updating their name, photo or password on the Account page.
- Practical safety and preparedness tips (fire, flood, typhoon, earthquake, first aid basics, what to pack in a go-bag) in plain language.
- Helping a resident word a clear incident description before they submit it.

Rules:
- If someone describes a life-threatening emergency happening now, tell them first to call 911 (the national emergency hotline) and to send a report with the Report form on their dashboard. Keep that reply very short.
- You cannot file reports, dispatch responders, see anyone's reports, or contact officials. Never claim you did. Point residents to the dashboard form instead.
- Do not invent local details (barangay hotline numbers, office hours, names of officials, evacuation centres). Say they can check the Announcements section or ask the barangay hall.
- Give general first-aid information only, and recommend professional medical help for anything serious. No diagnoses.
- Reply in the resident's language (English, Filipino/Tagalog or Cebuano/Bisaya). Keep answers short and easy to read on a phone: a few sentences or a short list. Plain text only, no markdown headings or tables.
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

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return client;
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

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[resident-chat] ANTHROPIC_API_KEY is not set");
    return jsonError("The assistant isn't set up yet. Please contact your barangay administrator.", 503);
  }

  const body = await request.json().catch(() => null) as { messages?: unknown } | null;
  const messages = sanitizeChatHistory(body?.messages);
  if (!messages) return jsonError("Please type a message first.", 400);

  if (rateLimited(user.id)) {
    return jsonError("You've sent a lot of messages. Please wait a few minutes and try again.", 429);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const response = getClient().beta.messages.stream({
          model: MODEL,
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages,
          output_config: { effort: "low" },
          // If the model declines a request, retry it on a fallback model automatically.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        }, { signal: request.signal });

        let wroteText = false;
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            wroteText = true;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await response.finalMessage();
        if (final.stop_reason === "refusal" && !wroteText) {
          controller.enqueue(encoder.encode("Sorry, I can't help with that. For emergencies, call 911 and send a report from your dashboard."));
        } else if (!wroteText) {
          controller.enqueue(encoder.encode("Sorry, I couldn't come up with an answer. Please try asking another way."));
        }
        controller.close();
      } catch (error) {
        if (request.signal.aborted) {
          controller.close();
          return;
        }
        let message = "\n\n[The assistant is unavailable right now. Please try again in a moment.]";
        if (error instanceof Anthropic.RateLimitError) message = "\n\n[The assistant is busy right now. Please try again in a minute.]";
        else if (error instanceof Anthropic.APIConnectionTimeoutError) message = "\n\n[The assistant took too long to answer. Please try again.]";
        else if (error instanceof Anthropic.AuthenticationError) console.error("[resident-chat] Anthropic API key was rejected");
        if (!(error instanceof Anthropic.AuthenticationError)) {
          console.error("[resident-chat] request failed", error instanceof Anthropic.APIError ? { status: error.status, message: error.message } : error);
        }
        controller.enqueue(encoder.encode(message));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
