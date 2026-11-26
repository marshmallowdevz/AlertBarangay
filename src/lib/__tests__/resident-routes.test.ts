import { describe, expect, it } from "vitest";
import { getRolePageRedirect } from "@/lib/auth/role-page-access";

describe("resident page authorization", () => {
  it("allows an active resident to open resident routes", () => {
    expect(getRolePageRedirect({ role: "resident", is_active: true }, false, ["resident"])).toBeNull();
  });

  it.each([
    [null, false],
    [{ role: "resident", is_active: false }, false],
    [{ role: "resident", is_active: true }, true],
    [{ role: "unknown", is_active: true }, false],
  ])("rejects a missing, inactive, banned, or invalid profile", (profile, banned) => {
    expect(getRolePageRedirect(profile, banned, ["resident"])).toBe("/login?notice=role");
  });

  it("sends an authenticated non-resident to their own dashboard", () => {
    expect(getRolePageRedirect({ role: "official", is_active: true }, false, ["resident"])).toBe("/official/dashboard");
  });
});
