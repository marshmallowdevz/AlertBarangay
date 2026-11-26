export type AppRole = "resident" | "official" | "admin";

/** Each role has exactly one home dashboard. */
export const roleDashboardPaths: Record<AppRole, string> = {
  resident: "/resident/dashboard",
  official: "/official/dashboard",
  admin: "/admin/dashboard",
};

/** The two sign-in tabs on /login. Admins sign in through the staff (official) tab. */
export type PortalChoice = "resident" | "official";

/**
 * Text shown on each sign-in tab. The resident portal's tab is labeled
 * "Admin" at the product owner's request; every message that names a tab
 * reads from here so the wording always matches what is on screen.
 */
export const portalLabels: Record<PortalChoice, string> = {
  resident: "Admin",
  official: "Barangay Official",
};

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
  const rightTab = (Object.keys(portalRoles) as PortalChoice[]).find((choice) => portalAllowsRole(choice, role));
  const tab = rightTab ? portalLabels[rightTab] : portalLabels[portal === "resident" ? "official" : "resident"];
  return `This is a ${roleLabels[role]} account, so it can't sign in with the ${portalLabels[portal]} tab. Please choose the ${tab} tab instead.`;
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
