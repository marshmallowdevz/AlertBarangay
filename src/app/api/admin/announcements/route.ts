import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/http";
import { adminAccessResponse, requireAdmin } from "@/lib/supabase/guard";

function announcementWriteError(error: unknown) {
  const dbError = error as { code?: string; message?: string; details?: string; hint?: string };
  console.error("Announcement write failed", { code: dbError.code, message: dbError.message, details: dbError.details, hint: dbError.hint });
  if (dbError.code === "42P01" || dbError.code === "PGRST205") {
    return jsonError("The announcements table is missing from this Supabase project. Apply migration 202611250002_admin_announcements_notifications.sql, then retry.", 500);
  }
  if (dbError.code === "42501") {
    return jsonError("Supabase denied the announcement write. Check that the server is configured with its Supabase secret/service-role key.", 500);
  }
  if (dbError.code === "23503") {
    return jsonError("The signed-in admin profile is not linked to an Auth user. Refresh your session and try again.", 400);
  }
  return jsonError("Unable to create announcement. Check the server log for the Supabase error details.", 500);
}

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);
  const { data, error } = await createSupabaseAdminClient().from("announcements")
    .select("id,title,body,is_published,created_at,updated_at,published_at").order("created_at", { ascending: false });
  if (error) return jsonError("Unable to load announcements.", 500);
  return Response.json({ announcements: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.body === "string" ? body.body.trim() : "";
    const is_published = body.is_published === true;
    if (!title || title.length > 180 || !content || content.length > 10000) return jsonError("Enter a title (1–180 characters) and announcement (1–10,000 characters).", 400);
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.from("announcements").insert({ title, body: content, is_published, created_by: access.actor.id, published_at: is_published ? new Date().toISOString() : null }).select("id,title,body,is_published,created_at,updated_at,published_at").single();
    if (error) throw error;
    if (is_published) {
      const { error: notificationError } = await admin.from("admin_notifications").insert({ event_type: "announcement.published", message: `Announcement published: ${title}`, subject_id: data.id });
      if (notificationError) console.error("Could not create announcement notification", notificationError);
    }
    return Response.json({ announcement: data }, { status: 201 });
  } catch (error) {
    return announcementWriteError(error);
  }
}
