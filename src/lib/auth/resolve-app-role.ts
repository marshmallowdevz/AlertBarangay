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
  // Always read the profile so a disabled account (is_active = false) is
  // refused even while its access token is still valid.
  void accessToken;
  let profile: { role: unknown; is_active?: boolean | null } | null;
  try {
    const result = await supabase
      .from("profiles")
      .select("*") // "*" so this still works if is_active has not been added yet
      .eq("id", userId)
      .maybeSingle();
    if (result.error) throw new RoleResolutionError();
    profile = result.data;
  } catch {
    throw new RoleResolutionError();
  }
  if (!profile) return { ok: false, reason: "missing" };
  if (profile.is_active === false) return { ok: false, reason: "inactive" };
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
