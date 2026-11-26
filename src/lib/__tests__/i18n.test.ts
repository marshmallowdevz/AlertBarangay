import { describe, expect, it } from "vitest";
import { dictionaries, isLang, translate } from "@/lib/i18n/messages";

describe("i18n", () => {
  it("has every English key in Filipino and Cebuano, with the same placeholders", () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, english] of Object.entries(dictionaries.en)) {
      for (const lang of ["fil", "ceb"] as const) {
        const text = dictionaries[lang][key as keyof typeof dictionaries.en];
        expect(text, `${lang}:${key}`).toBeTruthy();
        expect(placeholders(text), `${lang}:${key}`).toEqual(placeholders(english));
      }
    }
  });

  it("fills placeholders", () => {
    expect(translate("en", "header.welcome", { name: "Ana" })).toBe("Welcome, Ana");
    expect(translate("ceb", "res.form.ok.sent", { eid: "EID-1" })).toContain("EID-1");
  });

  it("validates language codes", () => {
    expect(isLang("fil")).toBe(true);
    expect(isLang("es")).toBe(false);
  });
});
