"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Ambulance, Car, CheckCircle2, CloudUpload, Construction, Droplets, Flame, GlassWater, HelpCircle, LocateFixed, MapPin, MessageSquare,
  Paperclip, Phone, Send, ShieldAlert, Siren, Trash2, X, Zap, type LucideIcon,
} from "lucide-react";
import { AnnouncementsFeed } from "@/components/announcements-feed";
import { IncidentMedia } from "@/components/incident-media";
import { ReportMessages } from "@/components/messages/report-messages";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LoadingButton } from "@/components/ui/loading-button";
import { useOnline } from "@/components/ui/offline-banner";
import { useI18n } from "@/lib/i18n/provider";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  checkMediaFile, describeLocation, formatDate, getCurrentPosition, incidentColumns, incidentTypes, mapLink,
  MAX_DESCRIPTION, MAX_LOCATION_TEXT, uploadIncidentMedia, type Incident, type IncidentType,
} from "@/lib/incidents";
import { listQueuedReports, looksOffline, queueReport, removeQueuedReport, sendQueuedReport, type QueuedReport } from "@/lib/offline-queue";
import { toast } from "@/lib/ui/toast";

const typeIcons: Record<IncidentType, LucideIcon> = {
  fire: Flame, medical: Ambulance, flood: Droplets, crime: ShieldAlert, accident: Car,
  electrical_hazard: Zap, road_damage: Construction, water_problems: GlassWater, garbage_collection: Trash2, other: HelpCircle,
};

const statusSteps = ["pending", "responding", "resolved"] as const;
const draftKey = (userId: string) => `alertbarangay.reportDraft.${userId}`;

type Draft = { type: IncidentType; description: string; locationText: string };

export function ResidentDashboard({ userId }: { userId: string }) {
  const { t } = useI18n();
  const online = useOnline();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [reports, setReports] = useState<Incident[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [type, setType] = useState<IncidentType>("fire");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationText, setLocationText] = useState("");
  const [locating, setLocating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [queued, setQueued] = useState<QueuedReport[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [openThread, setOpenThread] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const draftLoaded = useRef(false);
  const syncingRef = useRef(false);

  const typeLabel = useCallback((value: string) => t(`type.${value}` as MessageKey), [t]);
  const statusLabel = useCallback((value: string) => t(`status.${value}` as MessageKey), [t]);
  const timeAgo = useCallback((iso: string) => {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return t("time.justNow");
    if (minutes < 60) return t("time.minutes", { n: minutes });
    const hours = Math.round(minutes / 60);
    return hours < 24 ? t("time.hours", { n: hours }) : formatDate(iso);
  }, [t]);

  // Restore a half-written report (e.g. after the tab was closed or the phone went offline).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(draftKey(userId));
      if (saved) {
        const draft = JSON.parse(saved) as Partial<Draft>;
        // Restoring saved form state from storage once after mount.
        /* eslint-disable react-hooks/set-state-in-effect */
        if (draft.type && (incidentTypes as readonly string[]).includes(draft.type)) setType(draft.type);
        if (draft.description) setDescription(draft.description);
        if (draft.locationText) setLocationText(draft.locationText);
        /* eslint-enable react-hooks/set-state-in-effect */
        if (draft.description || draft.locationText) toast.info(t("res.form.draftRestored"));
      }
    } catch { /* storage unavailable */ }
    draftLoaded.current = true;
    // Only on first load for this account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!draftLoaded.current) return;
    try {
      if (description.trim() || locationText.trim()) {
        window.localStorage.setItem(draftKey(userId), JSON.stringify({ type, description, locationText } satisfies Draft));
      } else {
        window.localStorage.removeItem(draftKey(userId));
      }
    } catch { /* storage unavailable */ }
  }, [userId, type, description, locationText]);

  useEffect(() => {
    let active = true;
    supabase.from("incidents").select(incidentColumns).eq("reporter_id", userId)
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setLoadError(t("res.list.loadError"));
        else setReports((data ?? []) as Incident[]);
      });

    // Live status updates, e.g. when an official marks a report "Responding".
    const channel = supabase.channel(`resident-incidents-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents", filter: `reporter_id=eq.${userId}` }, (payload) => {
        const row = payload.new as Incident;
        if (!row?.id) return;
        setReports((current) => {
          const list = current ?? [];
          return list.some((item) => item.id === row.id)
            ? list.map((item) => (item.id === row.id ? row : item))
            : [row, ...list];
        });
      })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId]);

  const refreshQueue = useCallback(async () => {
    try { setQueued(await listQueuedReports(userId)); } catch { setQueued([]); }
  }, [userId]);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const pending = await listQueuedReports(userId);
      for (const item of pending) {
        try {
          const created = await sendQueuedReport(supabase, item);
          await removeQueuedReport(item.id);
          setReports((current) => [created, ...(current ?? []).filter((report) => report.id !== created.id)]);
          toast.success(t("res.queue.sent", { eid: created.eid }));
        } catch (cause) {
          if (!looksOffline(cause)) toast.error(t("res.queue.failed"));
          break;
        }
      }
    } catch { /* storage unavailable */ } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refreshQueue();
    }
  }, [refreshQueue, supabase, t, userId]);

  useEffect(() => {
    // Read the device queue once, and send it whenever we're online.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    // Sending the queue updates state as each report is delivered.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (online) void syncQueue();
  }, [online, syncQueue]);

  async function locate() {
    setLocating(true); setFormError("");
    try { setPosition(await getCurrentPosition()); }
    catch (cause) { setFormError(`${cause instanceof Error ? cause.message : ""} ${t("res.form.err.locationFallback")}`.trim()); }
    finally { setLocating(false); }
  }

  function pickFile(next: File | null) {
    setFormError("");
    if (next) {
      const problem = checkMediaFile(next);
      if (problem) {
        setFormError(problem);
        if (fileInput.current) fileInput.current.value = "";
        return;
      }
    }
    setFile(next);
  }

  function clearFile() {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  function resetForm() {
    setDescription(""); setLocationText(""); setPosition(null); clearFile();
    try { window.localStorage.removeItem(draftKey(userId)); } catch { /* ignore */ }
  }

  async function saveForLater(text: string, address: string) {
    const result = await queueReport({
      id: crypto.randomUUID(), userId, createdAt: new Date().toISOString(), type, description: text,
      lat: position?.lat ?? null, lng: position?.lng ?? null, locationText: address,
      file, fileName: file?.name ?? null, fileType: file?.type ?? null,
    });
    if (result.mediaDropped) toast.info(t("res.queue.mediaDropped"));
    setSuccess(t("res.form.ok.queued"));
    resetForm();
    await refreshQueue();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(""); setSuccess("");
    const text = description.trim();
    const address = locationText.trim();
    if (text.length < 5) { setFormError(t("res.form.err.description")); return; }
    if (!position && address.length < 3) { setFormError(t("res.form.err.location")); return; }

    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      if (!navigator.onLine) { await saveForLater(text, address); return; }
      let media: { path: string; type: "image" | "video" } | null = null;
      if (file) {
        media = await uploadIncidentMedia(supabase, userId, file);
        uploadedPath = media.path;
      }
      const { data, error } = await supabase.from("incidents").insert({
        type, description: text, reporter_id: userId,
        lat: position?.lat ?? null, lng: position?.lng ?? null,
        // Only send the address when given, so databases without migration 0007 still accept GPS-only reports.
        ...(address ? { location_text: address } : {}),
        media_path: media?.path ?? null, media_type: media?.type ?? null,
      }).select(incidentColumns).single();
      if (error) throw error;

      const created = data as Incident;
      setReports((current) => [created, ...(current ?? []).filter((item) => item.id !== created.id)]);
      setSuccess(t("res.form.ok.sent", { eid: created.eid }));
      resetForm();
    } catch (cause) {
      if (uploadedPath) await supabase.storage.from("incident-media").remove([uploadedPath]);
      if (looksOffline(cause)) {
        try { await saveForLater(text, address); return; } catch { /* fall through to the error */ }
      }
      setFormError(t("res.form.err.send"));
    } finally {
      setSubmitting(false);
    }
  }

  const openCount = (reports ?? []).filter((item) => item.status !== "resolved").length;

  return <>
    <a className="hotline-banner" href="tel:911">
      <span className="hotline-icon"><Phone size={18} /></span>
      <span><strong>{t("res.hotline.title")}</strong> {t("res.hotline.body")}</span>
      <span className="hotline-cta">{t("res.hotline.cta")}</span>
    </a>

    <div className="role-grid">
      <section className="panel role-panel" aria-labelledby="report-heading">
        <div className="panel-header"><div className="panel-heading"><h2 className="section-title" id="report-heading"><Siren size={15} /> {t("res.form.title")}</h2><p>{t("res.form.subtitle")}</p></div></div>
        <form className="role-panel-body incident-form" onSubmit={submit} noValidate>
          <fieldset className="type-picker">
            <legend>{t("res.form.step1")}</legend>
            {incidentTypes.map((value) => {
              const Icon = typeIcons[value];
              return <label key={value} className={`type-option ${type === value ? "selected" : ""}`}>
                <input type="radio" name="incident-type" value={value} checked={type === value} onChange={() => setType(value)} />
                <Icon size={20} aria-hidden="true" /><span>{typeLabel(value)}</span>
              </label>;
            })}
          </fieldset>

          <div className="field">
            <label htmlFor="incident-description">{t("res.form.step2")}</label>
            <textarea id="incident-description" rows={4} maxLength={MAX_DESCRIPTION} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("res.form.step2.placeholder")} required />
            <span className="field-hint">{description.length}/{MAX_DESCRIPTION}</span>
          </div>

          <div className="field">
            <span className="field-label">{t("res.form.step3")}</span>
            {position
              ? <div className="location-chip"><MapPin size={14} /> {t("res.form.gpsCaptured")} · <a href={mapLink(position) ?? "#"} target="_blank" rel="noreferrer">{t("res.form.checkMap")}</a> <button type="button" className="link-button" onClick={() => setPosition(null)}>{t("res.form.remove")}</button></div>
              : <LoadingButton type="button" className="button secondary" onClick={() => void locate()} loading={locating} loadingText={t("res.form.locating")}><LocateFixed size={15} />{t("res.form.useLocation")}</LoadingButton>}
            <label className="sr-only" htmlFor="incident-address">{t("res.form.address")}</label>
            <input id="incident-address" className="text-input" maxLength={MAX_LOCATION_TEXT} value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder={position ? t("res.form.address.withGps") : t("res.form.address.noGps")} />
          </div>

          <div className="field">
            <label htmlFor="incident-media"><Paperclip size={12} /> {t("res.form.step4")}</label>
            {file
              ? <div className="file-chip"><Paperclip size={13} /><span>{file.name}</span><button type="button" className="link-button" onClick={clearFile} aria-label={t("res.form.removeAttachment")}><X size={14} /></button></div>
              : <input id="incident-media" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/3gpp" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />}
            <span className="field-hint">{t("res.form.mediaHint")}</span>
          </div>

          {formError && <div className="inline-error" role="alert">{formError}</div>}
          {success && <div className="success-note" role="status"><CheckCircle2 size={15} />{success}</div>}
          <LoadingButton className="button primary submit-report" loading={submitting} loadingText={t("res.form.sending")}><Send size={15} />{t("res.form.send")}</LoadingButton>
        </form>
      </section>

      <div className="role-side">
        {queued.length > 0 && <section className="panel role-panel queue-panel" aria-labelledby="queue-heading">
          <div className="role-panel-body">
            <h2 className="section-title" id="queue-heading"><CloudUpload size={15} aria-hidden="true" /> {t("res.queue.title")}</h2>
            <p>{t("res.queue.body", { count: queued.length })}</p>
            <ul className="queue-list">{queued.map((item) => <li key={item.id}><strong>{typeLabel(item.type)}</strong> · {item.description.slice(0, 60)}{item.description.length > 60 ? "…" : ""}</li>)}</ul>
            <LoadingButton type="button" className="button secondary" loading={syncing} loadingText={t("res.queue.sending")} disabled={!online} onClick={() => void syncQueue()}><Send size={14} />{t("res.queue.retry")}</LoadingButton>
          </div>
        </section>}

        <section className="panel role-panel" aria-labelledby="my-reports-heading">
          <div className="panel-header"><div className="panel-heading"><h2 className="section-title" id="my-reports-heading">{t("res.list.title")}</h2><p>{reports && reports.length ? t("res.list.open", { count: openCount }) : t("res.list.auto")}</p></div></div>
          <div className="role-panel-body">
            {loadError && <div className="inline-error" role="alert">{loadError}</div>}
            {!loadError && reports === null && <><div className="skeleton" /><div className="skeleton" /></>}
            {reports?.length === 0 && <div className="empty-inline"><Siren size={18} /><p>{t("res.list.empty")}</p></div>}
            {reports && reports.length > 0 && <ul className="incident-list">
              {reports.map((item) => {
                const Icon = typeIcons[item.type] ?? HelpCircle;
                const stepIndex = statusSteps.indexOf(item.status);
                const threadOpen = openThread === item.id;
                return <li key={item.id} className="incident-item">
                  <div className="incident-item-top"><strong><Icon size={14} aria-hidden="true" /> {typeLabel(item.type)}</strong><span className={`incident-status ${item.status}`}>{statusLabel(item.status)}</span></div>
                  <ol className="status-track" aria-label={t("res.list.status", { status: statusLabel(item.status) })}>
                    {statusSteps.map((step, index) => <li key={step} className={index <= stepIndex ? "done" : ""}>{statusLabel(step)}</li>)}
                  </ol>
                  <p>{item.description}</p>
                  <small>{item.eid} · {timeAgo(item.created_at)} · {describeLocation(item)}</small>
                  <IncidentMedia incident={item} />
                  <button type="button" className="link-button thread-toggle" aria-expanded={threadOpen} onClick={() => setOpenThread(threadOpen ? null : item.id)}>
                    <MessageSquare size={13} aria-hidden="true" />{threadOpen ? t("msg.hide") : t("msg.open")}
                  </button>
                  {threadOpen && <ReportMessages incidentId={item.id} viewerId={userId} viewer="resident" />}
                </li>;
              })}
            </ul>}
          </div>
        </section>
        <AnnouncementsFeed />
      </div>
    </div>
  </>;
}
