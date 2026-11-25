"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, LocateFixed, MapPin, Paperclip, Send, Siren } from "lucide-react";
import { AnnouncementsFeed } from "@/components/announcements-feed";
import { IncidentMedia } from "@/components/incident-media";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  checkMediaFile, formatDate, getCurrentPosition, incidentColumns, incidentTypes, mapLink,
  MAX_DESCRIPTION, statusLabels, typeLabels, uploadIncidentMedia, type Incident, type IncidentType,
} from "@/lib/incidents";

export function ResidentDashboard({ userId }: { userId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [reports, setReports] = useState<Incident[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [type, setType] = useState<IncidentType>("fire");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    supabase.from("incidents").select(incidentColumns).eq("reporter_id", userId)
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setLoadError("Your reports could not be loaded. Ask an administrator to apply the incidents migration.");
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
  }, [supabase, userId]);

  async function locate() {
    setLocating(true); setFormError("");
    try { setPosition(await getCurrentPosition()); }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : "We couldn't get your location."); }
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(""); setSuccess("");
    const text = description.trim();
    if (text.length < 5) { setFormError("Describe what happened (at least 5 characters)."); return; }
    if (!position) { setFormError("Share your location so responders can find you."); return; }

    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      let media: { path: string; type: "image" | "video" } | null = null;
      if (file) {
        media = await uploadIncidentMedia(supabase, userId, file);
        uploadedPath = media.path;
      }
      const { data, error } = await supabase.from("incidents").insert({
        type, description: text, lat: position.lat, lng: position.lng, reporter_id: userId,
        media_path: media?.path ?? null, media_type: media?.type ?? null,
      }).select(incidentColumns).single();
      if (error) throw error;

      const created = data as Incident;
      setReports((current) => [created, ...(current ?? []).filter((item) => item.id !== created.id)]);
      setSuccess(`Report ${created.eid} sent. Barangay responders have been notified.`);
      setDescription(""); setFile(null); setPosition(null);
      if (fileInput.current) fileInput.current.value = "";
    } catch {
      if (uploadedPath) await supabase.storage.from("incident-media").remove([uploadedPath]);
      setFormError("Your report could not be sent. Check your connection and try again. For life-threatening emergencies, call 911.");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="role-grid">
    <section className="panel role-panel" aria-labelledby="report-heading">
      <div className="panel-header"><div className="panel-heading"><h2 className="section-title" id="report-heading"><Siren size={15} /> Report an emergency</h2><p>For life-threatening emergencies, call 911 first.</p></div></div>
      <form className="role-panel-body incident-form" onSubmit={submit}>
        <fieldset className="type-picker">
          <legend>What is happening?</legend>
          {incidentTypes.map((value) => <label key={value} className={`type-option ${type === value ? "selected" : ""}`}>
            <input type="radio" name="incident-type" value={value} checked={type === value} onChange={() => setType(value)} />{typeLabels[value]}
          </label>)}
        </fieldset>

        <div className="field">
          <label htmlFor="incident-description">Describe what happened</label>
          <textarea id="incident-description" rows={4} maxLength={MAX_DESCRIPTION} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Smoke coming from a house near the chapel on Rizal St." required />
          <span className="field-hint">{description.length}/{MAX_DESCRIPTION}</span>
        </div>

        <div className="field">
          <span>Location</span>
          {position
            ? <div className="location-chip"><MapPin size={14} /> Location captured · <a href={mapLink(position.lat, position.lng)} target="_blank" rel="noreferrer">check on map</a> <button type="button" className="link-button" onClick={() => void locate()}>Update</button></div>
            : <button type="button" className="button secondary" onClick={() => void locate()} disabled={locating}><LocateFixed size={15} />{locating ? "Finding you…" : "Use my current location"}</button>}
        </div>

        <div className="field">
          <label htmlFor="incident-media"><Paperclip size={12} /> Photo or video (optional)</label>
          <input id="incident-media" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/3gpp" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          <span className="field-hint">Photos up to 5 MB, videos up to 15 MB. Only you and barangay staff can see it.</span>
        </div>

        {formError && <div className="inline-error" role="alert">{formError}</div>}
        {success && <div className="success-note" role="status"><CheckCircle2 size={15} />{success}</div>}
        <button className="button primary" disabled={submitting}><Send size={15} />{submitting ? "Sending report…" : "Send report"}</button>
      </form>
    </section>

    <div className="role-side">
      <section className="panel role-panel" aria-labelledby="my-reports-heading">
        <div className="panel-header"><div className="panel-heading"><h2 className="section-title" id="my-reports-heading">My reports</h2><p>Status updates appear here automatically</p></div></div>
        <div className="role-panel-body">
          {loadError && <div className="inline-error" role="alert">{loadError}</div>}
          {!loadError && reports === null && <div className="skeleton" />}
          {reports?.length === 0 && <p className="muted">You haven&apos;t sent any reports yet.</p>}
          {reports && reports.length > 0 && <ul className="incident-list">
            {reports.map((item) => <li key={item.id} className="incident-item">
              <div className="incident-item-top"><strong>{typeLabels[item.type]}</strong><span className={`incident-status ${item.status}`}>{statusLabels[item.status]}</span></div>
              <p>{item.description}</p>
              <small>{item.eid} · {formatDate(item.created_at)}</small>
              <IncidentMedia incident={item} />
            </li>)}
          </ul>}
        </div>
      </section>
      <AnnouncementsFeed />
    </div>
  </div>;
}
