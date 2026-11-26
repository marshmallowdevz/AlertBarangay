"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Ambulance, Car, CheckCircle2, Droplets, Flame, HelpCircle, LocateFixed, MapPin, Paperclip, Phone, Send, ShieldAlert, Siren, X,
  type LucideIcon,
} from "lucide-react";
import { AnnouncementsFeed } from "@/components/announcements-feed";
import { IncidentMedia } from "@/components/incident-media";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  checkMediaFile, describeLocation, getCurrentPosition, incidentColumns, incidentTypes, mapLink,
  MAX_DESCRIPTION, MAX_LOCATION_TEXT, statusLabels, timeAgo, typeLabels, uploadIncidentMedia, type Incident, type IncidentType,
} from "@/lib/incidents";

const typeIcons: Record<IncidentType, LucideIcon> = {
  fire: Flame, medical: Ambulance, flood: Droplets, crime: ShieldAlert, accident: Car, other: HelpCircle,
};

const statusSteps = ["pending", "responding", "resolved"] as const;

export function ResidentDashboard({ userId }: { userId: string }) {
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
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    supabase.from("incidents").select(incidentColumns).eq("reporter_id", userId)
      .order("created_at", { ascending: false }).limit(50)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setLoadError("Your reports could not be loaded right now. Please try again later.");
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
    catch (cause) { setFormError(`${cause instanceof Error ? cause.message : "We couldn't get your location."} You can type the address instead.`); }
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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(""); setSuccess("");
    const text = description.trim();
    const address = locationText.trim();
    if (text.length < 5) { setFormError("Describe what happened (at least 5 characters)."); return; }
    if (!position && address.length < 3) { setFormError("Share your GPS location or type the address or a nearby landmark."); return; }

    setSubmitting(true);
    let uploadedPath: string | null = null;
    try {
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
      setSuccess(`Report ${created.eid} sent. Barangay responders can see it now.`);
      setDescription(""); setLocationText(""); setPosition(null); clearFile();
    } catch {
      if (uploadedPath) await supabase.storage.from("incident-media").remove([uploadedPath]);
      setFormError("Your report could not be sent. Check your connection and try again. For life-threatening emergencies, call 911.");
    } finally {
      setSubmitting(false);
    }
  }

  const openCount = (reports ?? []).filter((item) => item.status !== "resolved").length;

  return <>
    <a className="hotline-banner" href="tel:911">
      <span className="hotline-icon"><Phone size={18} /></span>
      <span><strong>Life-threatening emergency?</strong> Call 911 first, then send a report here.</span>
      <span className="hotline-cta">Call 911</span>
    </a>

    <div className="role-grid">
      <section className="panel role-panel" aria-labelledby="report-heading">
        <div className="panel-header"><div className="panel-heading"><h2 className="section-title" id="report-heading"><Siren size={15} /> Report an emergency</h2><p>Barangay responders see your report right away.</p></div></div>
        <form className="role-panel-body incident-form" onSubmit={submit} noValidate>
          <fieldset className="type-picker">
            <legend>1. What is happening?</legend>
            {incidentTypes.map((value) => {
              const Icon = typeIcons[value];
              return <label key={value} className={`type-option ${type === value ? "selected" : ""}`}>
                <input type="radio" name="incident-type" value={value} checked={type === value} onChange={() => setType(value)} />
                <Icon size={20} aria-hidden="true" /><span>{typeLabels[value]}</span>
              </label>;
            })}
          </fieldset>

          <div className="field">
            <label htmlFor="incident-description">2. Describe what happened</label>
            <textarea id="incident-description" rows={4} maxLength={MAX_DESCRIPTION} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Smoke coming from a house near the chapel on Rizal St." required />
            <span className="field-hint">{description.length}/{MAX_DESCRIPTION}</span>
          </div>

          <div className="field">
            <span className="field-label">3. Where is it?</span>
            {position
              ? <div className="location-chip"><MapPin size={14} /> GPS location captured · <a href={mapLink(position) ?? "#"} target="_blank" rel="noreferrer">check on map</a> <button type="button" className="link-button" onClick={() => setPosition(null)}>Remove</button></div>
              : <LoadingButton type="button" className="button secondary" onClick={() => void locate()} loading={locating} loadingText="Finding you…"><LocateFixed size={15} />Use my current location</LoadingButton>}
            <label className="sr-only" htmlFor="incident-address">Address or landmark</label>
            <input id="incident-address" className="text-input" maxLength={MAX_LOCATION_TEXT} value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder={position ? "Add a landmark (optional), e.g. beside the chapel" : "Or type the address / nearest landmark"} />
          </div>

          <div className="field">
            <label htmlFor="incident-media"><Paperclip size={12} /> 4. Photo or video (optional)</label>
            {file
              ? <div className="file-chip"><Paperclip size={13} /><span>{file.name}</span><button type="button" className="link-button" onClick={clearFile} aria-label="Remove attachment"><X size={14} /></button></div>
              : <input id="incident-media" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/3gpp" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />}
            <span className="field-hint">Photos up to 5 MB, videos up to 15 MB. Only you and barangay staff can see it.</span>
          </div>

          {formError && <div className="inline-error" role="alert">{formError}</div>}
          {success && <div className="success-note" role="status"><CheckCircle2 size={15} />{success}</div>}
          <LoadingButton className="button primary submit-report" loading={submitting} loadingText="Sending report…"><Send size={15} />Send report</LoadingButton>
        </form>
      </section>

      <div className="role-side">
        <section className="panel role-panel" aria-labelledby="my-reports-heading">
          <div className="panel-header"><div className="panel-heading"><h2 className="section-title" id="my-reports-heading">My reports</h2><p>{reports && reports.length ? `${openCount} open · updates appear automatically` : "Updates appear here automatically"}</p></div></div>
          <div className="role-panel-body">
            {loadError && <div className="inline-error" role="alert">{loadError}</div>}
            {!loadError && reports === null && <><div className="skeleton" /><div className="skeleton" /></>}
            {reports?.length === 0 && <div className="empty-inline"><Siren size={18} /><p>No reports yet. When you send one, you can follow its progress here.</p></div>}
            {reports && reports.length > 0 && <ul className="incident-list">
              {reports.map((item) => {
                const Icon = typeIcons[item.type] ?? HelpCircle;
                const stepIndex = statusSteps.indexOf(item.status);
                return <li key={item.id} className="incident-item">
                  <div className="incident-item-top"><strong><Icon size={14} aria-hidden="true" /> {typeLabels[item.type]}</strong><span className={`incident-status ${item.status}`}>{statusLabels[item.status]}</span></div>
                  <ol className="status-track" aria-label={`Status: ${statusLabels[item.status]}`}>
                    {statusSteps.map((step, index) => <li key={step} className={index <= stepIndex ? "done" : ""}>{statusLabels[step]}</li>)}
                  </ol>
                  <p>{item.description}</p>
                  <small>{item.eid} · {timeAgo(item.created_at)} · {describeLocation(item)}</small>
                  <IncidentMedia incident={item} />
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
