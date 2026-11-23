import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/http";
import { requireAdmin } from "@/lib/supabase/guard";
import type { ManagedUser, UserRole } from "@/types/user";

const roles: UserRole[] = ["admin", "official", "resident"];

export async function GET(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return jsonError("Administrator access required.", access.status);

  try {
    const admin = createSupabaseAdminClient();
    const allUsers = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      allUsers.push(...data.users);
      if (data.users.length < 1000) break;
    }
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, full_name, role, position, department, is_active, created_at");
    if (profileError) throw profileError;

    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    let users: ManagedUser[] = allUsers.map((user) => {
      const profile = profileById.get(user.id);
      return {
        id: user.id,
        email: user.email ?? "",
        full_name: profile?.full_name || user.user_metadata?.full_name || "",
        role: (profile?.role ?? "resident") as UserRole,
        position: profile?.position ?? null,
        department: profile?.department ?? null,
        is_active: profile?.is_active ?? false,
        created_at: profile?.created_at ?? user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
      };
    });

    const params = new URL(request.url).searchParams;
    const query = params.get("q")?.trim().toLocaleLowerCase();
    const role = params.get("role");
    const status = params.get("status");
    if (query) users = users.filter((user) => `${user.email} ${user.full_name}`.toLocaleLowerCase().includes(query));
    if (role && roles.includes(role as UserRole)) users = users.filter((user) => user.role === role);
    if (status === "active") users = users.filter((user) => user.is_active);
    if (status === "disabled") users = users.filter((user) => !user.is_active);

    return Response.json({
      users,
      metrics: {
        total: allUsers.length,
        admins: allUsers.filter((user) => profileById.get(user.id)?.role === "admin").length,
        officials: allUsers.filter((user) => profileById.get(user.id)?.role === "official").length,
        residents: allUsers.filter((user) => !["admin", "official"].includes(profileById.get(user.id)?.role ?? "resident")).length,
        active: allUsers.filter((user) => profileById.get(user.id)?.is_active === true).length,
        disabled: allUsers.filter((user) => profileById.get(user.id)?.is_active !== true).length,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin user listing failed", error);
    return jsonError("Unable to load user accounts.", 500);
  }
}

export async function POST(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return jsonError("Administrator access required.", access.status);

  let createdUserId: string | undefined;
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const role = body.role as UserRole;
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || !full_name || !roles.includes(role)) {
      return jsonError("Enter a valid email, full name, role, and temporary password of at least 12 characters.", 400);
    }

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, role },
    });
    if (error) throw error;
    createdUserId = data.user.id;

    const { error: profileError } = await admin.from("profiles").upsert({
      id: createdUserId, full_name, role,
      position: typeof body.position === "string" ? body.position.trim() || null : null,
      department: typeof body.department === "string" ? body.department.trim() || null : null,
      is_active: true,
    });
    if (profileError) throw profileError;

    const { error: auditError } = await admin.from("audit_logs").insert({
      actor_id: access.actor.id, target_user_id: createdUserId,
      action: "user.create", details: { email, role },
    });
    if (auditError) throw auditError;
    return Response.json({ id: createdUserId }, { status: 201 });
  } catch (error) {
    console.error("Admin user creation failed", error);
    if (createdUserId) {
      const admin = createSupabaseAdminClient();
      await admin.auth.admin.deleteUser(createdUserId);
      const { error: auditError } = await admin.from("audit_logs").insert({
        actor_id: access.actor.id, target_user_id: createdUserId,
        action: "user.create_failed", details: { reason: error instanceof Error ? error.message : "unknown" },
      });
      if (auditError) console.error("Could not record failed account creation", auditError);
    }
    return jsonError("Unable to create account. Confirm the email is unused and try again.", 400);
  }
}
