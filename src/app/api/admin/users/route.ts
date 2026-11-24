import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/http";
import { adminAccessResponse, requireAdmin } from "@/lib/supabase/guard";
import type { ManagedUser, UserRole } from "@/types/user";

const roles: UserRole[] = ["admin", "official", "resident"];

export async function GET(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);

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
    const group = params.get("group");
    if (query) users = users.filter((user) => `${user.email} ${user.full_name}`.toLocaleLowerCase().includes(query));
    if (group === "residents") users = users.filter((user) => user.role === "resident");
    if (group === "officials") users = users.filter((user) => user.role === "official" || user.role === "admin");
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
  if (!access.ok) return adminAccessResponse(access);

  let createdUserId: string | undefined;
  let admin: ReturnType<typeof createSupabaseAdminClient> | undefined;
  let failureStage: "auth" | "profile" | "audit" = "auth";
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const role = body.role as UserRole;
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !full_name || !roles.includes(role)) {
      return jsonError("Enter a valid email, full name, role, and temporary password of at least 8 characters.", 400);
    }

    const position = role === "official" && typeof body.position === "string" ? body.position.trim() || null : null;
    const department = role === "official" && typeof body.department === "string" ? body.department.trim() || null : null;
    if ((position?.length ?? 0) > 120 || (department?.length ?? 0) > 120) {
      return jsonError("Position and department must be 120 characters or fewer.", 400);
    }

    admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name, role, position, department },
    });
    if (error) throw error;
    createdUserId = data.user.id;

    failureStage = "profile";
    const { error: profileError } = await admin.from("profiles").upsert({
      id: createdUserId, full_name, role,
      position,
      department,
      is_active: true,
    });
    if (profileError) throw profileError;

    failureStage = "audit";
    const { error: auditError } = await admin.from("audit_logs").insert({
      actor_id: access.actor.id, target_user_id: createdUserId,
      action: "user.create", details: { email, role },
    });
    if (auditError) throw auditError;
    return Response.json({ id: createdUserId }, { status: 201 });
  } catch (error) {
    console.error("Admin user creation failed", error);
    let rollbackFailed = false;
    if (createdUserId) {
      if (admin) {
        const { error: cleanupError } = await admin.auth.admin.deleteUser(createdUserId);
        rollbackFailed = Boolean(cleanupError);
        if (cleanupError) console.error("Failed to roll back created Auth user", cleanupError);
        const { error: auditError } = await admin.from("audit_logs").insert({
          actor_id: access.actor.id, target_user_id: createdUserId,
          action: "user.create_failed", details: { reason: error instanceof Error ? error.message : "unknown" },
        });
        if (auditError) console.error("Could not record failed account creation", auditError);
      } else {
        rollbackFailed = true;
      }
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("Supabase server configuration is missing")) {
      return jsonError("Account creation is not configured. Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY on the server.", 500);
    }
    if (failureStage === "auth" && /already registered|already exists|email.*taken/i.test(message)) {
      return jsonError("An account with this email already exists.", 409);
    }
    if (failureStage === "auth" && /password|weak/i.test(message)) {
      return jsonError("Supabase rejected the password. Use at least 8 characters and meet your project's password rules.", 400);
    }
    if (failureStage === "auth" && /database error|trigger|profile/i.test(message)) {
      return jsonError("Supabase could not create the profile. Check the auth user trigger and profiles schema.", 500);
    }
    if (failureStage === "profile") {
      return jsonError(rollbackFailed
        ? "Saving the profile failed and the new Auth user could not be rolled back. Check the server logs."
        : "Saving the profile failed; the new Auth user was rolled back. Check the profiles schema and service key permissions.", 500);
    }
    if (failureStage === "audit") {
      return jsonError(rollbackFailed
        ? "Audit logging failed and the new account could not be rolled back. Check the server logs."
        : "Audit logging failed; the new account was rolled back. Check the audit_logs schema and permissions.", 500);
    }
    return jsonError("Supabase could not create the account. Check the email and password requirements, then try again.", 400);
  }
}
