import { describe, expect, it } from "vitest";
import { answerFromFaq, detectLang } from "@/lib/chat/faq";

describe("built-in assistant answers", () => {
  it("detects Filipino and Cebuano, otherwise uses the app language", () => {
    expect(detectLang("Unsaon pag-report og sunog?", "en")).toBe("ceb");
    expect(detectLang("Paano mag-ulat ng baha?", "en")).toBe("fil");
    expect(detectLang("How do I report?", "ceb")).toBe("ceb");
  });

  it("answers common questions", () => {
    expect(answerFromFaq("What do the report statuses mean?", "en")).toContain("Responding");
    expect(answerFromFaq("What should I prepare before a typhoon?", "en")).toContain("go-bag");
    expect(answerFromFaq("Unsaon pag-report og sunog?", "en")).toContain("Ipadala ang report");
    expect(answerFromFaq("asdf", "fil")).toContain("911");
  });
});
