/** Text pieces from one parsed server-sent event (null/undefined = nothing to show). */
export type PickText = (event: unknown) => string | null | undefined;

/** Gemini's streamGenerateContent (alt=sse) puts reply text in candidates[0].content.parts[].text. */
export const geminiText: PickText = (event) => {
  const parts = (event as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts;
  return parts?.map((part) => part.text ?? "").join("") || null;
};

/** Reads a server-sent event stream and yields each piece of reply text. */
export async function* readSseText(body: ReadableStream<Uint8Array>, pick: PickText = geminiText) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const text = pick(JSON.parse(data));
        if (text) yield text;
      } catch { /* ignore keep-alive or partial lines */ }
    }
  }
}
