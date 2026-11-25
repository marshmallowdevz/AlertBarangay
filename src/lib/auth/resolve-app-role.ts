import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoleDashboardPath, isAppRole, type AppRole } from "@/lib/auth/roles";

export type AppRoleResolution =
  | { ok: true; role: AppRole; destination: string }
  | { ok: false; reason: "missing" | "inactive" | "unrecognized" };

export class RoleResolutionError extends Error {
  constructor() {
    super("The profile role could not be loaded.");
    this.name = "RoleResolutionError";
  }
}

export async function resolveAppRole(
  supabase: SupabaseClient,
  userId: string,
  accessToken?: string,
): Promise<AppRoleResolution> {
  // Always check Auth ban status so disabled accounts are refused even while
  // their access token is still valid.
  void accessToken;
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.banned_until && new Date(user.banned_until).getTime() > Date.now()) {
    return { ok: false, reason: "inactive" };
  }
  let profile: { role: unknown } | null;
  try {
    const result = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();
    if (result.error) throw new RoleResolutionError();
    profile = result.data;
  } catch {
    throw new RoleResolutionError();
  }
  if (!profile) return { ok: false, reason: "missing" };
  if (!isAppRole(profile.role)) return { ok: false, reason: "unrecognized" };

  const role = profile.role;
  const destination = getRoleDashboardPath(role);
  return destination
    ? { ok: true, role, destination }
    : { ok: false, reason: "unrecognized" };
}

export function appRoleErrorMessage(reason: "missing" | "inactive" | "unrecognized") {
  if (reason === "inactive") return "Your account is inactive. Contact an administrator.";
  if (reason === "missing") return "Your account has no role profile. Contact an administrator.";
  return "Your account has an unrecognized role. Contact an administrator.";
}
