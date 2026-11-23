import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/http";
import { requireAdmin } from "@/lib/supabase/guard";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (!access.ok) return jsonError("Administrator access required.", access.status);
  const { id } = await params;
  try {
    const body = await request.json();
    if (typeof body.password !== "string" || body.password.length < 12 || body.password !== body.confirmPassword) {
      return jsonError("Passwords must match and be at least 12 characters.", 400);
    }
    const admin = createSupabaseAdminClient();
    const { data: auditRow, error: auditError } = await admin.from("audit_logs").insert({
      actor_id: access.actor.id, target_user_id: id,
      action: "user.password_reset", details: { result: "requested" },
    }).select("id").single();
    if (auditError || !auditRow) throw auditError ?? new Error("Unable to record password reset audit event.");
    const { error } = await admin.auth.admin.updateUserById(id, { password: body.password });
    if (error) {
      await admin.from("audit_logs").update({ details: { result: "failed" } }).eq("id", auditRow.id);
      throw error;
    }
    const { error: completedAuditError } = await admin.from("audit_logs")
      .update({ details: { result: "completed" } }).eq("id", auditRow.id);
    if (completedAuditError) console.error("Password changed but audit result could not be finalized", completedAuditError);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Admin password reset failed", error);
    return jsonError("Unable to reset this password.", 400);
  }
}
