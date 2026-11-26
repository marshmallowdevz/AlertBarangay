"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Bot, MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { CHAT_MAX_MESSAGE_CHARS, type ChatTurn } from "@/lib/chat/assistant";
import { friendlyNetworkError, toast } from "@/lib/ui/toast";
import { useI18n } from "@/lib/i18n/provider";

const REQUEST_TIMEOUT_MS = 60_000;

/** Floating AI chat widget for resident users. Talks to /api/resident/chat. */
export function ResidentAssistant({ firstName = "" }: { firstName?: string }) {
  const { t, lang } = useI18n();
  const suggestions = [t("ai.s1"), t("ai.s2"), t("ai.s3")];
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
        body: JSON.stringify({ messages: history, lang }),
        signal: controller.signal,
        cache: "no-store",
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || t("ai.err.unavailable"));
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
      setTurns([...history, { role: "assistant", content: reply.trim() || t("ai.err.empty") }]);
    } catch (cause) {
      const reason = controller.signal.reason;
      const message = reason instanceof DOMException && reason.name === "TimeoutError"
        ? t("ai.err.timeout")
        : friendlyNetworkError(cause, t("ai.err.unavailable"));
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
    {!open && <button type="button" className="assistant-fab" onClick={() => setOpen(true)} aria-label={t("ai.openLabel")}>
      <MessageCircle size={22} aria-hidden="true" /><span>{t("ai.open")}</span>
    </button>}

    {open && <section className="assistant-panel" role="dialog" aria-modal="false" aria-labelledby="assistant-title">
      <header className="assistant-head">
        <span className="assistant-avatar" aria-hidden="true"><Bot size={18} /></span>
        <div>
          <h2 id="assistant-title">{t("ai.title")}</h2>
          <p>{t("ai.subtitle")}</p>
        </div>
        <button type="button" className="assistant-icon-button" onClick={reset} aria-label={t("ai.reset")} title={t("ai.reset")} disabled={!turns.length && !draft}><RotateCcw size={15} /></button>
        <button type="button" className="assistant-icon-button" onClick={() => setOpen(false)} aria-label={t("ai.close")} title={t("ai.close")}><X size={16} /></button>
      </header>

      <div className="assistant-messages" ref={listRef} aria-live="polite">
        <div className="assistant-bubble assistant">{t("ai.greeting", { name: firstName ? ` ${firstName}` : "" })}</div>
        {!turns.length && <div className="assistant-suggestions">
          {suggestions.map((text) => <button type="button" key={text} onClick={() => void send(text)} disabled={sending}>{text}</button>)}
        </div>}
        {turns.map((turn, index) => (turn.content || turn.role === "user")
          ? <div key={index} className={`assistant-bubble ${turn.role}`}>{turn.content}</div>
          : null)}
        {waitingForFirstWord && <div className="assistant-bubble assistant typing" role="status"><span className="sr-only">{t("ai.typing")}</span><i /><i /><i /></div>}
        {error && <div className="inline-error assistant-error" role="alert">{error}</div>}
      </div>

      <form className="assistant-form" onSubmit={submit}>
        <label htmlFor="assistant-input" className="sr-only">{t("ai.inputLabel")}</label>
        <textarea
          id="assistant-input"
          ref={inputRef}
          rows={1}
          maxLength={CHAT_MAX_MESSAGE_CHARS}
          placeholder={t("ai.placeholder")}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={sending}
        />
        <LoadingButton className="button primary assistant-send" loading={sending} loadingText={t("ai.sending")} disabled={!draft.trim()} aria-label={t("ai.send")}>
          <Send size={15} aria-hidden="true" /><span>{t("ai.send")}</span>
        </LoadingButton>
      </form>
    </section>}
  </>;
}
