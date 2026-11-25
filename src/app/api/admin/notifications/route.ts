import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/http";
import { adminAccessResponse, requireAdmin } from "@/lib/supabase/guard";

const pageSize = 30;

export async function GET(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);
  const offset = Math.max(0, Number(new URL(request.url).searchParams.get("offset")) || 0);
  const admin = createSupabaseAdminClient();
  const [feed, total] = await Promise.all([
    admin.from("admin_notifications").select("id,event_type,message,subject_id,created_at").order("created_at", { ascending: false }).range(offset, offset + pageSize - 1),
    admin.from("admin_notifications").select("id", { count: "exact", head: true }),
  ]);
  if (feed.error || total.error) return jsonError("Unable to load notifications.", 500);
  const feedIds = (feed.data ?? []).map((item) => item.id);
  let readRows: { notification_id: string }[] = [];
  if (feedIds.length) {
    const receipts = await admin.from("admin_notification_reads").select("notification_id").eq("admin_id", access.actor.id).in("notification_id", feedIds);
    if (receipts.error) return jsonError("Unable to load notifications.", 500);
    readRows = receipts.data ?? [];
  }
  const receiptCount = await admin.from("admin_notification_reads").select("notification_id", { count: "exact", head: true }).eq("admin_id", access.actor.id);
  if (receiptCount.error) return jsonError("Unable to load notifications.", 500);
  const readIds = new Set(readRows.map((receipt) => receipt.notification_id));
  const notifications = (feed.data ?? []).map((item) => ({ ...item, read_at: readIds.has(item.id) ? "read" : null }));
  const unreadCount = Math.max(0, (total.count ?? 0) - (receiptCount.count ?? 0));
  return Response.json({ notifications, unreadCount, hasMore: offset + notifications.length < (total.count ?? 0) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length > pageSize || ids.some((id) => typeof id !== "string")) return jsonError("Invalid notification selection.", 400);
    if (ids.length) {
      const rows = ids.map((notification_id: string) => ({ notification_id, admin_id: access.actor.id }));
      const { error } = await createSupabaseAdminClient().from("admin_notification_reads").upsert(rows, { onConflict: "notification_id,admin_id", ignoreDuplicates: true });
      if (error) throw error;
    }
    return Response.json({ ok: true });
  } catch {
    return jsonError("Unable to mark notifications as read.", 500);
  }
}
