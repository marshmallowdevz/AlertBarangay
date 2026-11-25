import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/http";
import { errorMessage } from "@/lib/fetch-json";
import { isTheme, resolveTheme } from "@/lib/theme";

describe("isUuid", () => {
  it("accepts real UUIDs only", () => {
    expect(isUuid("3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b; drop table")).toBe(false);
  });
});

describe("theme", () => {
  it("resolves the system theme from the OS preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(isTheme("sepia")).toBe(false);
  });
});

describe("errorMessage", () => {
  it("falls back when the error has no message", () => {
    expect(errorMessage(new Error("Nope"), "fallback")).toBe("Nope");
    expect(errorMessage("string", "fallback")).toBe("fallback");
  });
});
