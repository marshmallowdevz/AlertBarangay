import { getRoleDashboardPath, isAppRole, type AppRole } from "@/lib/auth/roles";

/** Return the server redirect required for a profile attempting a role page. */
export function getRolePageRedirect(
  profile: { role?: unknown; is_active?: boolean } | null,
  isBanned: boolean,
  allowed: AppRole[],
) {
  if (!profile || isBanned || profile.is_active === false || !isAppRole(profile.role)) {
    return "/login?notice=role";
  }
  if (!allowed.includes(profile.role)) return getRoleDashboardPath(profile.role) ?? "/login?notice=role";
  return null;
}
