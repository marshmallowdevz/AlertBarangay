"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellRing, CheckCheck, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { toast } from "@/lib/ui/toast";
import { formatDate } from "@/lib/incidents";
import { showDeviceNotification } from "@/components/ui/service-worker";

type NotificationRow = {
  id: number;
  event_type: string;
  title: string;
  body: string;
  incident_id: string | null;
  recipient_id: string | null;
  audience: string;
  created_at: string;
};

const columns = "id, event_type, title, body, incident_id, recipient_id, audience, created_at";
const STATUS_BODY = /^(\S+) is now (Pending|Responding|Resolved)\.$/i;
const MESSAGE_TITLE = /^New message about (\S+)$/;

type Permission = "default" | "granted" | "denied" | "unsupported";

function readPermission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as Permission;
}

/**
 * Resident notification bell: report status changes, messages from the
 * barangay and announcements, live via Supabase Realtime. With permission it
 * also shows a system notification while the app is open in the background.
 */
export function NotificationBell({ userId }: { userId: string }) {
  const { t } = useI18n();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  // The panel starts closed, so reading this on the first client render is safe.
  const [permission, setPermission] = useState<Permission>(readPermission);
  const panelRef = useRef<HTMLDivElement>(null);
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);

  // Translates the database's English text for the event types we know.
  const describe = useCallback((row: NotificationRow) => {
    const translateStatus = (status: string) => t(`status.${status.toLowerCase()}` as MessageKey);
    if (row.event_type === "incident_status_changed") {
      const match = STATUS_BODY.exec(row.body);
      if (match) return { title: t("notif.statusTitle"), body: t("notif.statusBody", { eid: match[1], status: translateStatus(match[2]) }) };
    }
    if (row.event_type === "incident_message") {
      const match = MESSAGE_TITLE.exec(row.title);
      if (match) return { title: t("notif.messageTitle", { eid: match[1] }), body: row.body };
    }
    return { title: row.title, body: row.body };
  }, [t]);
  const describeRef = useRef(describe);
  useEffect(() => { describeRef.current = describe; }, [describe]);

  useEffect(() => {
    let active = true;
    const relevant = (row: NotificationRow) => row.recipient_id === userId || (row.audience === "all" && !row.recipient_id);

    Promise.all([
      supabase.from("notifications").select(columns)
        .or(`recipient_id.eq.${userId},and(audience.eq.all,recipient_id.is.null)`)
        .order("created_at", { ascending: false }).limit(30),
      supabase.from("notification_reads").select("notification_id").eq("user_id", userId).limit(500),
    ]).then(([list, reads]) => {
      if (!active) return;
      if (list.error) { setError(tRef.current("notif.err")); return; }
      setItems((list.data ?? []) as NotificationRow[]);
      if (!reads.error) setReadIds(new Set((reads.data ?? []).map((row) => Number(row.notification_id))));
    });

    const channel = supabase.channel(`resident-notifications-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const row = payload.new as NotificationRow;
        if (!row?.id || !relevant(row)) return;
        setItems((current) => current.some((item) => item.id === row.id) ? current : [row, ...current].slice(0, 30));
        const text = describeRef.current(row);
        toast.info(`${text.title}: ${text.body}`);
        if (document.visibilityState !== "visible") void showDeviceNotification(text.title, text.body, "/resident/dashboard");
      })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [supabase, userId]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  const unread = items.filter((item) => !readIds.has(item.id));

  async function markAllRead() {
    if (!unread.length) return;
    const ids = unread.map((item) => item.id);
    setReadIds((current) => new Set([...current, ...ids]));
    const { error: saveError } = await supabase.from("notification_reads")
      .upsert(ids.map((id) => ({ notification_id: id, user_id: userId })), { onConflict: "notification_id,user_id", ignoreDuplicates: true });
    if (saveError) setReadIds((current) => { const next = new Set(current); ids.forEach((id) => next.delete(id)); return next; });
  }

  async function enableAlerts() {
    if (permission === "unsupported") return;
    const result = await Notification.requestPermission();
    setPermission(result as Permission);
    if (result === "granted") toast.success(t("notif.enabled"));
  }

  return <div className="notif" ref={panelRef}>
    <button type="button" className="notif-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="dialog"
      aria-label={unread.length ? `${t("notif.open")} (${t("notif.unread", { count: unread.length })})` : t("notif.open")}>
      {unread.length ? <BellRing size={16} aria-hidden="true" /> : <Bell size={16} aria-hidden="true" />}
      {unread.length > 0 && <span className="notif-count" aria-hidden="true">{unread.length > 9 ? "9+" : unread.length}</span>}
    </button>
    {open && <div className="notif-panel" role="dialog" aria-label={t("notif.title")}>
      <div className="notif-head">
        <strong>{t("notif.title")}</strong>
        <button type="button" className="link-button" onClick={() => void markAllRead()} disabled={!unread.length}><CheckCheck size={13} aria-hidden="true" />{t("notif.markRead")}</button>
        <button type="button" className="notif-close" onClick={() => setOpen(false)} aria-label="Close"><X size={15} /></button>
      </div>
      {permission === "default" && <button type="button" className="button secondary notif-enable" onClick={() => void enableAlerts()}><BellRing size={14} aria-hidden="true" />{t("notif.enable")}</button>}
      {permission === "denied" && <p className="notif-hint">{t("notif.blocked")}</p>}
      {error && <div className="inline-error" role="alert">{error}</div>}
      {!error && items.length === 0 && <p className="notif-hint">{t("notif.empty")}</p>}
      {items.length > 0 && <ul className="notif-list">
        {items.map((item) => {
          const text = describe(item);
          return <li key={item.id} className={readIds.has(item.id) ? "" : "unread"}>
            <strong>{text.title}</strong>
            <span>{text.body}</span>
            <small>{formatDate(item.created_at)}</small>
          </li>;
        })}
      </ul>}
    </div>}
  </div>;
}
