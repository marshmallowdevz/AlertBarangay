import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const htmlEscapes: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => htmlEscapes[character] ?? character);
}

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin" && profile.is_active !== false) {
      return NextResponse.redirect(new URL("/admin/settings/maintenance", request.url));
    }
  }

  const { data: settings, error } = await supabase.from("system_settings")
    .select("maintenance_mode,maintenance_message").eq("id", 1).maybeSingle();
  if (error) console.error("Maintenance screen settings lookup failed", error.message);
  if (!settings?.maintenance_mode) return NextResponse.redirect(new URL("/", request.url));

  const safeMessage = escapeHtml(settings.maintenance_message).replace(/\r?\n/g, "<br>");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>503 — Under Maintenance | AlertBarangay</title><style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:#1e1c1e;color:#f4f1f3;font-family:Arial,Helvetica,sans-serif;display:grid;place-items:center;padding:24px}.maintenance-card{width:min(560px,100%);padding:42px 38px;background:#252326;border:1px solid #3b373b;border-radius:18px;box-shadow:0 18px 60px #0004;text-align:center}.brand{display:flex;align-items:center;justify-content:center;gap:10px;color:#fff;font-weight:700;font-size:15px}.brand-mark{width:38px;height:38px;border-radius:12px;background:#f5eedb;color:#3b1219;display:grid;place-items:center;font-size:19px}.code{display:inline-block;margin:30px 0 12px;padding:6px 10px;border-radius:20px;background:#392f21;color:#efdaa5;font-size:11px;font-weight:700;letter-spacing:.06em}.status{color:#d8b8bd;font-size:10px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}h1{font-size:30px;letter-spacing:-.04em;margin:9px 0 12px}p{font-size:14px;line-height:1.7;color:#c4bbc2;margin:0}.link{display:inline-flex;margin-top:26px;padding:11px 17px;border-radius:9px;background:#4a101e;color:#fff;text-decoration:none;font-size:12px;font-weight:700}.link:hover{background:#5b1c2c}.help{margin-top:22px;color:#8f858d;font-size:10px}@media(max-width:520px){.maintenance-card{padding:32px 23px}h1{font-size:25px}}
  </style></head><body><main class="maintenance-card"><div class="brand"><span class="brand-mark">✦</span><span>AlertBarangay</span></div><span class="code">503 — SERVICE UNAVAILABLE</span><div class="status">Under Maintenance</div><h1>We’ll be back soon</h1><p>${safeMessage}</p><a class="link" href="/login">Admin Sign-In</a><div class="help">Thank you for your patience while we make improvements.</div></main></body></html>`;
  return new Response(html, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "120" },
  });
}
