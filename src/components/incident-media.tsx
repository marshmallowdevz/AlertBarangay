"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { fetchJson } from "@/lib/fetch-json";
import { signedMediaUrl, type Incident } from "@/lib/incidents";

type IncidentAttachment = { path: string; type: "image" | "video" };
type ResolvedAttachment = IncidentAttachment & { url: string };

function getAttachments(incident: Incident): IncidentAttachment[] {
  if (incident.media_paths?.length) {
    return incident.media_paths.map((path, index) => ({
      path,
      type: incident.media_types?.[index] ?? "image",
    }));
  }
  return incident.media_path
    ? [{ path: incident.media_path, type: incident.media_type ?? "image" }]
    : [];
}

/** Loads private report attachments on demand so list views do not sign every file. */
export function IncidentMedia({ incident, staffIncidentId }: { incident: Incident; staffIncidentId?: string }) {
  const [resolvedAttachments, setResolvedAttachments] = useState<ResolvedAttachment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const attachments = getAttachments(incident);
  if (!attachments.length) return null;

  async function load() {
    setBusy(true);
    setError("");
    try {
      if (staffIncidentId) {
        const result = await fetchJson<{ attachments: ResolvedAttachment[] }>(`/api/official/incidents/${staffIncidentId}/media`);
        setResolvedAttachments(result.attachments);
      } else {
        const client = createSupabaseBrowserClient();
        const signedUrls = await Promise.all(attachments.map(({ path }) => signedMediaUrl(client, path)));
        setResolvedAttachments(attachments.map((attachment, index) => ({ ...attachment, url: signedUrls[index] })));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Attachment could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  if (resolvedAttachments) {
    return <div className="report-media-preview">
      {resolvedAttachments.map((attachment) => attachment.type === "video"
        ? <video key={attachment.path} className="incident-media" src={attachment.url} controls playsInline onError={() => setError("An attachment could not be displayed.")} />
        : <img key={attachment.path} className="incident-media" src={attachment.url} alt={`Attachment for ${incident.eid}`} loading="lazy" onError={() => setError("An attachment could not be displayed.")} />)}
      {error && <span className="field-hint" role="alert">{error}</span>}
    </div>;
  }

  return <>
    <button type="button" className="button secondary small-button" onClick={() => void load()} disabled={busy}>
      <ImageIcon size={14} />{busy ? "Opening…" : `View ${attachments.length === 1 ? (attachments[0].type === "video" ? "video" : "photo") : `${attachments.length} attachments`}`}
    </button>
    {error && <span className="field-hint" role="alert">{error}</span>}
  </>;
}
