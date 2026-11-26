import { describe, expect, it } from "vitest";
import { getRequiredRole, getRoleDashboardPath, isAppRole, portalAllowsRole, portalLabels, wrongPortalMessage } from "@/lib/auth/roles";

describe("roles", () => {
  it("sends each role to its own dashboard", () => {
    expect(getRoleDashboardPath("admin")).toBe("/admin/dashboard");
    expect(getRoleDashboardPath("official")).toBe("/official/dashboard");
    expect(getRoleDashboardPath("resident")).toBe("/resident/dashboard");
  });

  it("rejects unknown roles", () => {
    expect(isAppRole("superuser")).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
    expect(getRoleDashboardPath("Admin")).toBeNull();
  });

  it("knows which role each protected area needs", () => {
    expect(getRequiredRole("/admin")).toBe("admin");
    expect(getRequiredRole("/admin/dashboard")).toBe("admin");
    expect(getRequiredRole("/admin/users")).toBe("admin");
    expect(getRequiredRole("/administrator")).toBeNull();
    expect(getRequiredRole("/official/dashboard")).toBe("official");
    expect(getRequiredRole("/officials")).toBeNull();
    expect(getRequiredRole("/resident/dashboard")).toBe("resident");
    expect(getRequiredRole("/dashboard")).toBeNull();
    expect(getRequiredRole("/login")).toBeNull();
  });

  it("only lets residents through the resident portal tab", () => {
    expect(portalAllowsRole("resident", "resident")).toBe(true);
    expect(portalAllowsRole("resident", "official")).toBe(false);
    expect(portalAllowsRole("resident", "admin")).toBe(false);
  });

  it("lets officials and admins through the Barangay Official tab, but not residents", () => {
    expect(portalAllowsRole("official", "official")).toBe(true);
    expect(portalAllowsRole("official", "admin")).toBe(true);
    expect(portalAllowsRole("official", "resident")).toBe(false);
  });

  it("names the tabs exactly as they are labeled on screen", () => {
    expect(portalLabels).toEqual({ resident: "Admin", official: "Barangay Official" });
    expect(wrongPortalMessage("resident", "official")).toBe(
      "This is a Barangay Official account, so it can't sign in with the Admin tab. Please choose the Barangay Official tab instead.",
    );
    expect(wrongPortalMessage("resident", "admin")).toContain("choose the Barangay Official tab");
    expect(wrongPortalMessage("official", "resident")).toBe(
      "This is a Resident account, so it can't sign in with the Barangay Official tab. Please choose the Admin tab instead.",
    );
  });
});
