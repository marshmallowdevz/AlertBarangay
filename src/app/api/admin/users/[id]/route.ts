import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/http";
import { adminAccessResponse, requireAdmin } from "@/lib/supabase/guard";
import type { UserRole } from "@/types/user";

type RouteContext = { params: Promise<{ id: string }> };
const roles: UserRole[] = ["admin", "official", "resident"];

export async function PATCH(request: Request, { params }: RouteContext) {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);
  const { id } = await params;
  try {
    const body = await request.json();
    const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = body.role as UserRole;
    if (!full_name || !/^\S+@\S+\.\S+$/.test(email) || !roles.includes(role) || typeof body.is_active !== "boolean") {
      return jsonError("Enter a valid email, full name, role, and account status.", 400);
    }
    const admin = createSupabaseAdminClient();
    const { data: target, error: targetError } = await admin.auth.admin.getUserById(id);
    if (targetError || !target.user) return jsonError("User account not found.", 404);
    const { data: priorProfile, error: priorProfileError } = await admin.from("profiles").select("*").eq("id", id).single();
    if (priorProfileError) throw priorProfileError;
    if (id === access.actor.id && (!body.is_active || role !== "admin")) {
      return jsonError("You cannot disable yourself or remove your own administrator role.", 400);
    }
    if (priorProfile?.role === "admin" && priorProfile.is_active && (!body.is_active || role !== "admin")) {
      const { count, error: countError } = await admin.from("profiles")
        .select("id", { count: "exact", head: true }).eq("role", "admin").eq("is_active", true);
      if (countError) throw countError;
      if ((count ?? 0) <= 1) return jsonError("At least one active administrator must remain.", 400);
    }

    const profile = {
      id, full_name, role,
      position: role === "official" && typeof body.position === "string" ? body.position.trim() || null : null,
      department: role === "official" && typeof body.department === "string" ? body.department.trim() || null : null,
      is_active: body.is_active,
    };
    if ((profile.position?.length ?? 0) > 120 || (profile.department?.length ?? 0) > 120) {
      return jsonError("Position and department must be 120 characters or fewer.", 400);
    }
    const { error: authError } = await admin.auth.admin.updateUserById(id, {
      email,
      email_confirm: Boolean(target.user.email_confirmed_at),
      user_metadata: { ...target.user.user_metadata, full_name, role, position: profile.position, department: profile.department },
      ban_duration: body.is_active ? "none" : "876000h",
    });
    if (authError) throw authError;
    const { error: profileError } = await admin.from("profiles").upsert(profile);
    if (profileError) {
      if (!priorProfile) await admin.from("profiles").delete().eq("id", id);
      await admin.auth.admin.updateUserById(id, {
        email: target.user.email,
        email_confirm: Boolean(target.user.email_confirmed_at),
        user_metadata: target.user.user_metadata,
        ban_duration: priorProfile?.is_active === false ? "876000h" : "none",
      });
      throw profileError;
    }
    const { error: auditError } = await admin.from("audit_logs").insert({
      actor_id: access.actor.id, target_user_id: id, action: "user.update",
      details: { email, role, is_active: body.is_active, position: profile.position, department: profile.department },
    });
    if (auditError) {
      if (priorProfile) await admin.from("profiles").upsert(priorProfile);
      else await admin.from("profiles").delete().eq("id", id);
      await admin.auth.admin.updateUserById(id, {
        email: target.user.email,
        email_confirm: Boolean(target.user.email_confirmed_at),
        user_metadata: target.user.user_metadata,
        ban_duration: priorProfile?.is_active === false ? "876000h" : "none",
      });
      throw auditError;
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Admin user update failed", error);
    return jsonError("Unable to update account.", 400);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);
  const { id } = await params;
  if (id === access.actor.id) return jsonError("You cannot delete your own administrator account.", 400);

  try {
    const admin = createSupabaseAdminClient();
    const { data: target, error: targetError } = await admin.auth.admin.getUserById(id);
    if (targetError || !target.user) return jsonError("User account not found.", 404);
    const { data: targetProfile } = await admin.from("profiles").select("role, is_active").eq("id", id).single();
    if (targetProfile?.role === "admin" && targetProfile.is_active) {
      const { count, error: countError } = await admin.from("profiles")
        .select("id", { count: "exact", head: true }).eq("role", "admin").eq("is_active", true);
      if (countError) throw countError;
      if ((count ?? 0) <= 1) return jsonError("At least one active administrator must remain.", 400);
    }
    const { data: auditRow, error: auditError } = await admin.from("audit_logs").insert({
      actor_id: access.actor.id, target_user_id: id, action: "user.delete",
      details: { email: target.user.email ?? "", result: "requested" },
    }).select("id").single();
    if (auditError || !auditRow) throw auditError ?? new Error("Unable to record deletion audit event.");
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      await admin.from("audit_logs").update({ details: { email: target.user.email ?? "", result: "failed" } }).eq("id", auditRow.id);
      throw error;
    }
    const { error: completedAuditError } = await admin.from("audit_logs")
      .update({ details: { email: target.user.email ?? "", result: "completed" } }).eq("id", auditRow.id);
    if (completedAuditError) console.error("Account deleted but audit result could not be finalized", completedAuditError);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Admin user deletion failed", error);
    return jsonError("Unable to delete account.", 400);
  }
}
