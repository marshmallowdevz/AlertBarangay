"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { signedMediaUrl, type Incident } from "@/lib/incidents";

/** Loads a private photo/video only when someone asks to see it. */
export function IncidentMedia({ incident }: { incident: Incident }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!incident.media_path) return null;

  async function load() {
    setBusy(true); setError("");
    try { setUrl(await signedMediaUrl(createSupabaseBrowserClient(), incident.media_path!)); }
    catch { setError("Attachment could not be opened."); }
    finally { setBusy(false); }
  }

  if (url) {
    return incident.media_type === "video"
      ? <video className="incident-media" src={url} controls playsInline />
      : <img className="incident-media" src={url} alt={`Attachment for ${incident.eid}`} />;
  }
  return <>
    <button type="button" className="button secondary small-button" onClick={() => void load()} disabled={busy}>
      <ImageIcon size={14} />{busy ? "Opening…" : `View ${incident.media_type === "video" ? "video" : "photo"}`}
    </button>
    {error && <span className="field-hint" role="alert">{error}</span>}
  </>;
}
