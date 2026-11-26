"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { CHAT_MAX_MESSAGE_CHARS, type ChatTurn } from "@/lib/chat/assistant";
import { friendlyNetworkError, toast } from "@/lib/ui/toast";

const REQUEST_TIMEOUT_MS = 60_000;

const greeting = (firstName: string) =>
  `Hi${firstName ? ` ${firstName}` : ""}! I'm the AlertBarangay Assistant. I can help you send a report, follow its status, or share safety tips. For a life-threatening emergency, call 911 right away.`;

const suggestions = [
  "How do I report an emergency?",
  "What do the report statuses mean?",
  "What should I prepare before a typhoon?",
  "Unsaon pag-report og sunog?",
];

/** Floating AI chat widget for resident users. Talks to /api/resident/chat. */
export function ResidentAssistant({ firstName = "" }: { firstName?: string }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setError("");
    setDraft("");
    const history: ChatTurn[] = [...turns, { role: "user", content }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/resident/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "The assistant is unavailable right now. Please try again.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        const snapshot = reply;
        setTurns([...history, { role: "assistant", content: snapshot }]);
      }
      reply += decoder.decode();
      setTurns([...history, { role: "assistant", content: reply.trim() || "Sorry, I didn't get a reply. Please try again." }]);
    } catch (cause) {
      const reason = controller.signal.reason;
      const message = reason instanceof DOMException && reason.name === "TimeoutError"
        ? "The assistant took too long to answer. Please try again."
        : friendlyNetworkError(cause, "The assistant is unavailable right now. Please try again.");
      // Put the question back so the resident can retry without retyping.
      setTurns(turns);
      setDraft(content);
      setError(message);
      toast.error(message);
    } finally {
      window.clearTimeout(timer);
      abortRef.current = null;
      setSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(draft);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setTurns([]);
    setDraft("");
    setError("");
  }

  const lastTurn = turns[turns.length - 1];
  const waitingForFirstWord = sending && lastTurn?.role === "assistant" && !lastTurn.content;

  return <>
    {!open && <button type="button" className="assistant-fab" onClick={() => setOpen(true)} aria-label="Open the AlertBarangay Assistant">
      <MessageCircle size={22} aria-hidden="true" /><span>Ask the assistant</span>
    </button>}

    {open && <section className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
      <header className="assistant-head">
        <span className="assistant-avatar" aria-hidden="true"><Bot size={18} /></span>
        <div>
          <h2 id="assistant-title">AlertBarangay Assistant</h2>
          <p>AI helper. It can make mistakes and can&apos;t dispatch help.</p>
        </div>
        <button type="button" className="assistant-icon-button" onClick={reset} aria-label="Start a new conversation" title="New conversation" disabled={!turns.length && !draft}><RotateCcw size={15} /></button>
        <button type="button" className="assistant-icon-button" onClick={() => setOpen(false)} aria-label="Close the assistant" title="Close"><X size={16} /></button>
      </header>

      <div className="assistant-messages" ref={listRef} aria-live="polite">
        <div className="assistant-bubble assistant">{greeting(firstName)}</div>
        {!turns.length && <div className="assistant-suggestions">
          {suggestions.map((text) => <button type="button" key={text} onClick={() => void send(text)} disabled={sending}>{text}</button>)}
        </div>}
        {turns.map((turn, index) => (turn.content || turn.role === "user")
          ? <div key={index} className={`assistant-bubble ${turn.role}`}>{turn.content}</div>
          : null)}
        {waitingForFirstWord && <div className="assistant-bubble assistant typing" role="status"><span className="sr-only">The assistant is typing…</span><i /><i /><i /></div>}
        {error && <div className="inline-error assistant-error" role="alert">{error}</div>}
      </div>

      <form className="assistant-form" onSubmit={submit}>
        <label htmlFor="assistant-input" className="sr-only">Message the assistant</label>
        <textarea
          id="assistant-input"
          ref={inputRef}
          rows={1}
          maxLength={CHAT_MAX_MESSAGE_CHARS}
          placeholder="Type your question…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={sending}
        />
        <LoadingButton className="button primary assistant-send" loading={sending} loadingText="Sending…" disabled={!draft.trim()} aria-label="Send message">
          <Send size={15} aria-hidden="true" /><span>Send</span>
        </LoadingButton>
      </form>
    </section>}
  </>;
}
