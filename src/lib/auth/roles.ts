export type AppRole = "resident" | "official" | "admin";

export const roleDashboardPaths: Record<AppRole, string> = {
  resident: "/resident",
  official: "/dashboard",
  admin: "/admin/users",
};

export function isAppRole(role: unknown): role is AppRole {
  return role === "resident" || role === "official" || role === "admin";
}

export function getRoleDashboardPath(role: unknown) {
  return isAppRole(role) ? roleDashboardPaths[role] : null;
}

export function getRequiredRole(pathname: string): AppRole | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "official";
  if (pathname === "/resident" || pathname.startsWith("/resident/")) return "resident";
  return null;
}
