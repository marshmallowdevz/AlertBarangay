/** Shared limits and types for the resident AI assistant (used by client and server). */
export const CHAT_MAX_MESSAGES = 20;
export const CHAT_MAX_MESSAGE_CHARS = 2000;

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Validates and trims a chat history sent by the browser. Returns null when invalid. */
export function sanitizeChatHistory(input: unknown): ChatTurn[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const turns: ChatTurn[] = [];
  for (const item of input.slice(-CHAT_MAX_MESSAGES)) {
    if (!item || typeof item !== "object") return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.trim().slice(0, CHAT_MAX_MESSAGE_CHARS);
    if (!text) continue;
    turns.push({ role, content: text });
  }
  // The API needs the conversation to start and end with the resident.
  while (turns.length && turns[0].role !== "user") turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== "user") return null;
  return turns;
}
