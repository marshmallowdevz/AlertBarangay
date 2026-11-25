import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/http";
import { adminAccessResponse, requireAdmin } from "@/lib/supabase/guard";

type Context = { params: Promise<{ id: string }> };
function parseBody(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.body === "string" ? body.body.trim() : "";
  if (!title || title.length > 180 || !content || content.length > 10000 || typeof body.is_published !== "boolean") return null;
  return { title, body: content, is_published: body.is_published === true };
}

export async function PATCH(request: Request, { params }: Context) {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return jsonError("Invalid announcement ID.", 400);
  try {
    const values = parseBody(await request.json());
    if (!values) return jsonError("Enter a title (1–180 characters) and announcement (1–10,000 characters).", 400);
    const admin = createSupabaseAdminClient();
    const { data: prior, error: readError } = await admin.from("announcements").select("is_published,published_at").eq("id", id).maybeSingle();
    if (readError) throw readError;
    if (!prior) return jsonError("Announcement not found.", 404);
    const publishedAt = values.is_published ? (prior?.published_at ?? new Date().toISOString()) : null;
    const { data, error } = await admin.from("announcements").update({ ...values, published_at: publishedAt }).eq("id", id).select("id,title,body,is_published,created_at,updated_at,published_at").maybeSingle();
    if (error) throw error;
    if (!data) return jsonError("Announcement not found.", 404);
    if (!prior.is_published && data.is_published) {
      const { error: notificationError } = await admin.from("admin_notifications").insert({ event_type: "announcement.published", message: `Announcement published: ${data.title}`, subject_id: data.id });
      if (notificationError) console.error("Could not create announcement notification", notificationError);
    }
    return Response.json({ announcement: data });
  } catch (error) {
    console.error("Announcement update failed", error);
    return jsonError("Unable to update announcement.", 500);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return jsonError("Invalid announcement ID.", 400);
  const { error, count } = await createSupabaseAdminClient().from("announcements").delete({ count: "exact" }).eq("id", id);
  if (error) return jsonError("Unable to delete announcement.", 500);
  if (count === 0) return jsonError("Announcement not found.", 404);
  return Response.json({ ok: true });
}
