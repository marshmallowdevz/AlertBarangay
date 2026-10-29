const residentPath = import.meta.env.VITE_RESIDENT_DASHBOARD_PATH || "/resident";
const officialPath = import.meta.env.VITE_OFFICIAL_DASHBOARD_PATH || "/official";

function isSafeLocalPath(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//")) return false;
  try {
    return new URL(path, window.location.origin).origin === window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Dashboard assignment is read from trusted app_metadata. New public sign-ups
 * are residents; user_metadata is used only for that resident destination.
 */
export function getDashboardPath(user) {
  if (!user) return null;

  const appMetadata = user.app_metadata ?? {};
  const assignedPath = appMetadata.dashboard_path;
  if (isSafeLocalPath(assignedPath)) return assignedPath;

  const assignedRole = String(appMetadata.dashboard ?? appMetadata.role ?? "").toLowerCase();
  if (["official", "barangay_official", "admin", "administrator"].includes(assignedRole)) {
    return isSafeLocalPath(officialPath) ? officialPath : null;
  }
  if (assignedRole === "resident") {
    return isSafeLocalPath(residentPath) ? residentPath : null;
  }

  // Public sign-up creates a resident. Never grant an official destination
  // from user-editable metadata.
  if (String(user.user_metadata?.role ?? "").toLowerCase() === "resident") {
    return isSafeLocalPath(residentPath) ? residentPath : null;
  }

  return null;
}
