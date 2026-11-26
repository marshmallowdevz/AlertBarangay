"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Lock, Send } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LoadingButton } from "@/components/ui/loading-button";
import { useI18n } from "@/lib/i18n/provider";
import { toast } from "@/lib/ui/toast";
import { formatDate } from "@/lib/incidents";

export type ReportMessage = {
  id: string;
  incident_id: string;
  sender_id: string | null;
  sender_role: "resident" | "official" | "admin";
  body: string;
  created_at: string;
};

export const MESSAGE_MAX = 1000;

function isMissingTable(error: { code?: string; message?: string } | null) {
  return !!error && (error.code === "42P01" || error.code === "PGRST205" || /incident_messages/.test(error.message ?? "") && /not find|does not exist/.test(error.message ?? ""));
}

/**
 * Private conversation about one report between the resident who filed it and
 * barangay staff. Senders are shown by role only, never by email or phone.
 */
export function ReportMessages({ incidentId, viewerId, viewer }: {
  incidentId: string;
  viewerId: string;
  viewer: "resident" | "staff";
}) {
  const { t } = useI18n();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [messages, setMessages] = useState<ReportMessage[] | null>(null);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    let active = true;
    supabase.from("incident_messages").select("id, incident_id, sender_id, sender_role, body, created_at")
      .eq("incident_id", incidentId).order("created_at", { ascending: true }).limit(200)
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError(isMissingTable(loadError) ? t("msg.err.setup") : t("msg.err.load"));
        else setMessages((data ?? []) as ReportMessage[]);
      });
    const channel = supabase.channel(`incident-messages-${incidentId}-${viewerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "incident_messages", filter: `incident_id=eq.${incidentId}` }, (payload) => {
        const row = payload.new as ReportMessage;
        if (!row?.id) return;
        setMessages((current) => (current ?? []).some((item) => item.id === row.id) ? current : [...(current ?? []), row]);
      })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
    // t is stable per language; reloading on language change isn't needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, incidentId, viewerId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { data, error: sendError } = await supabase.from("incident_messages")
        .insert({ incident_id: incidentId, body })
        .select("id, incident_id, sender_id, sender_role, body, created_at").single();
      if (sendError) throw sendError;
      const row = data as ReportMessage;
      setMessages((current) => (current ?? []).some((item) => item.id === row.id) ? current : [...(current ?? []), row]);
      setDraft("");
    } catch (cause) {
      const message = isMissingTable(cause as { code?: string }) ? t("msg.err.setup") : t("msg.err.send");
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  function senderName(item: ReportMessage) {
    if (item.sender_id === viewerId) return t("msg.you");
    return item.sender_role === "resident" ? t("msg.resident") : t("msg.official");
  }

  return <div className="report-messages">
    <p className="report-messages-privacy"><Lock size={12} aria-hidden="true" />{t("msg.privacy")}</p>
    {error && <div className="inline-error" role="alert">{error}</div>}
    {!error && messages === null && <div className="skeleton" />}
    {messages && messages.length === 0 && <p className="report-messages-empty">{viewer === "staff" ? t("msg.emptyStaff") : t("msg.empty")}</p>}
    {messages && messages.length > 0 && <ol className="report-messages-list" ref={listRef} aria-live="polite">
      {messages.map((item) => <li key={item.id} className={item.sender_id === viewerId ? "mine" : item.sender_role === "resident" ? "resident" : "staff"}>
        <span className="report-message-meta">{senderName(item)} · {formatDate(item.created_at)}</span>
        <span className="report-message-body">{item.body}</span>
      </li>)}
    </ol>}
    {!error && <form className="report-messages-form" onSubmit={send}>
      <label className="sr-only" htmlFor={`message-${incidentId}`}>{t("msg.placeholder")}</label>
      <textarea id={`message-${incidentId}`} rows={2} maxLength={MESSAGE_MAX} value={draft} placeholder={t("msg.placeholder")}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }}
        disabled={sending} />
      <LoadingButton className="button primary" loading={sending} loadingText={t("msg.sending")} disabled={!draft.trim()}>
        <Send size={14} aria-hidden="true" /><span>{t("msg.send")}</span>
      </LoadingButton>
    </form>}
  </div>;
}
