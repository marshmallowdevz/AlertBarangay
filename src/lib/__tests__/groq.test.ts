import { describe, expect, it } from "vitest";
import { readGroqStream } from "@/lib/chat/groq";

function streamOf(parts: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) { parts.forEach((part) => controller.enqueue(encoder.encode(part))); controller.close(); },
  });
}

describe("readGroqStream", () => {
  it("joins text deltas across split chunks and stops at [DONE]", async () => {
    const chunk = (text: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
    const raw = chunk("Kumusta") + chunk("! Tawag") + ": keep-alive\n\n" + chunk(" sa 911.") + "data: [DONE]\n\n" + chunk("ignored");
    const parts = [raw.slice(0, 17), raw.slice(17, 60), raw.slice(60)];
    let text = "";
    for await (const piece of readGroqStream(streamOf(parts))) text += piece;
    expect(text).toBe("Kumusta! Tawag sa 911.");
  });
});
