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
  let claimRole: unknown;
  try {
    const { data, error } = accessToken
      ? await supabase.auth.getClaims(accessToken)
      : await supabase.auth.getClaims();
    if (!error) claimRole = data?.claims?.user_role;
  } catch {
    // Fall back to the RLS-protected own-profile query below.
  }

  if (isAppRole(claimRole)) {
    const destination = getRoleDashboardPath(claimRole);
    if (destination) return { ok: true, role: claimRole, destination };
  }

  let profile: { role: unknown; is_active: boolean } | null;
  try {
    const result = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();
    if (result.error) throw new RoleResolutionError();
    profile = result.data;
  } catch {
    throw new RoleResolutionError();
  }
  if (!profile) return { ok: false, reason: "missing" };
  if (!profile.is_active) return { ok: false, reason: "inactive" };
  if (!isAppRole(profile.role)) return { ok: false, reason: "unrecognized" };

  // A missing or unrecognized JWT role falls back to the user's own profile.
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
