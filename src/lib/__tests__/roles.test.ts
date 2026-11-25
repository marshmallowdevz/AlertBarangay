import { describe, expect, it } from "vitest";
import { getRequiredRole, getRoleDashboardPath, isAppRole } from "@/lib/auth/roles";

describe("roles", () => {
  it("sends each role to its own dashboard", () => {
    expect(getRoleDashboardPath("admin")).toBe("/admin");
    expect(getRoleDashboardPath("official")).toBe("/dashboard");
    expect(getRoleDashboardPath("resident")).toBe("/resident");
  });

  it("rejects unknown roles", () => {
    expect(isAppRole("superuser")).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
    expect(getRoleDashboardPath("Admin")).toBeNull();
  });

  it("knows which role each protected area needs", () => {
    expect(getRequiredRole("/admin")).toBe("admin");
    expect(getRequiredRole("/admin/users")).toBe("admin");
    expect(getRequiredRole("/administrator")).toBeNull();
    expect(getRequiredRole("/dashboard")).toBe("official");
    expect(getRequiredRole("/resident")).toBe("resident");
    expect(getRequiredRole("/login")).toBeNull();
  });
});
