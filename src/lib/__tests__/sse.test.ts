import { describe, expect, it } from "vitest";
import { readSseText } from "@/lib/chat/sse";

function streamOf(parts: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) { parts.forEach((part) => controller.enqueue(encoder.encode(part))); controller.close(); },
  });
}

describe("readSseText (Gemini)", () => {
  it("joins text across split chunks and skips events without text", async () => {
    const chunk = (text: string) => `data: ${JSON.stringify({ candidates: [{ content: { role: "model", parts: [{ text }] } }] })}\r\n\r\n`;
    const raw = chunk("Kumusta") + chunk("! Tawag") + `data: ${JSON.stringify({ candidates: [{ finishReason: "STOP" }] })}\r\n\r\n` + chunk(" sa 911.");
    const parts = [raw.slice(0, 17), raw.slice(17, 90), raw.slice(90)];
    let text = "";
    for await (const piece of readSseText(streamOf(parts))) text += piece;
    expect(text).toBe("Kumusta! Tawag sa 911.");
  });
});
