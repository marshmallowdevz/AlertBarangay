export type AppRole = "resident" | "official" | "admin";

/** Each role has exactly one home dashboard. */
export const roleDashboardPaths: Record<AppRole, string> = {
  resident: "/resident/dashboard",
  official: "/official/dashboard",
  admin: "/admin/dashboard",
};

/** The two sign-in tabs on /login. Admins sign in through the staff (official) tab. */
export type PortalChoice = "resident" | "official";

export const portalRoles: Record<PortalChoice, readonly AppRole[]> = {
  resident: ["resident"],
  official: ["official", "admin"],
};

const roleLabels: Record<AppRole, string> = {
  resident: "Resident",
  official: "Barangay Official",
  admin: "Administrator",
};

export function isAppRole(role: unknown): role is AppRole {
  return role === "resident" || role === "official" || role === "admin";
}

export function getRoleDashboardPath(role: unknown) {
  return isAppRole(role) ? roleDashboardPaths[role] : null;
}

export function getRoleLabel(role: AppRole) {
  return roleLabels[role];
}

/** True when an account with this role may sign in through the chosen tab. */
export function portalAllowsRole(portal: PortalChoice, role: AppRole) {
  return portalRoles[portal].includes(role);
}

/** The message shown when someone signs in through the wrong tab. */
export function wrongPortalMessage(portal: PortalChoice, role: AppRole) {
  if (portal === "resident") {
    return `This is a ${roleLabels[role]} account. Please sign in using the Barangay Official tab.`;
  }
  return "This is a Resident account. Please sign in using the Resident tab.";
}

function inArea(pathname: string, area: string) {
  return pathname === area || pathname.startsWith(`${area}/`);
}

/** Which role a protected page area requires, or null for public/shared pages. */
export function getRequiredRole(pathname: string): AppRole | null {
  if (inArea(pathname, "/admin")) return "admin";
  if (inArea(pathname, "/official")) return "official";
  if (inArea(pathname, "/resident")) return "resident";
  return null;
}
