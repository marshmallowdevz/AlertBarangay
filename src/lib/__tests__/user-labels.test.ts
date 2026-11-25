import { describe, expect, it } from "vitest";
import { cleanUserMetadataLabel } from "@/lib/admin/user-labels";

describe("cleanUserMetadataLabel", () => {
  it("repairs mojibake in stored position labels", () => {
    expect(cleanUserMetadataLabel("Barangay Captain \u00c5\u00b7 Health Department")).toBe("Barangay Captain · Health Department");
    expect(cleanUserMetadataLabel("Barangay Captain \u00e2\u20ac\u201d Health Department")).toBe("Barangay Captain — Health Department");
  });

  it("returns null for empty or non-string values", () => {
    expect(cleanUserMetadataLabel("  ")).toBeNull();
    expect(cleanUserMetadataLabel(undefined)).toBeNull();
  });
});
