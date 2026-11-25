import type { SupabaseClient } from "@supabase/supabase-js";

// Must match the checks in supabase/migrations/202611150001_incidents.sql.
export const incidentTypes = ["fire", "medical", "flood", "crime", "accident", "other"] as const;
export type IncidentType = (typeof incidentTypes)[number];

export const incidentStatuses = ["pending", "responding", "resolved"] as const;
export type IncidentStatus = (typeof incidentStatuses)[number];

export type Incident = {
  id: string;
  eid: string;
  type: IncidentType;
  description: string;
  lat: number | null;
  lng: number | null;
  /** Typed address or landmark (migration 0007). Missing on older databases. */
  location_text?: string | null;
  status: IncidentStatus;
  media_path: string | null;
  media_type: "image" | "video" | null;
  reporter_id: string | null;
  created_at: string;
  updated_at: string;
};

// "*" keeps working whether or not the optional location_text column (migration 0007) exists yet.
export const incidentColumns = "*";

export const typeLabels: Record<IncidentType, string> = {
  fire: "Fire",
  medical: "Medical",
  flood: "Flood",
  crime: "Crime",
  accident: "Accident",
  other: "Other",
};

export const statusLabels: Record<IncidentStatus, string> = {
  pending: "Pending",
  responding: "Responding",
  resolved: "Resolved",
};

export const MAX_DESCRIPTION = 300;
export const MAX_LOCATION_TEXT = 200;
const MB = 1024 * 1024;
// Same limits as the incident-media storage policy.
export const MAX_IMAGE_BYTES = 5 * MB;
export const MAX_VIDEO_BYTES = 15 * MB;
const allowedMime = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm", "video/3gpp"];

/** Returns an error message, or null when the file can be uploaded. */
export function checkMediaFile(file: File): string | null {
  if (!allowedMime.includes(file.type)) return "Attach a JPG, PNG or WebP photo, or an MP4, MOV, WebM or 3GP video.";
  const isVideo = file.type.startsWith("video/");
  const limit = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) return `${isVideo ? "Videos" : "Photos"} can be up to ${limit / MB} MB.`;
  return null;
}

/** Uploads into the reporter's own folder of the private incident-media bucket. */
export async function uploadIncidentMedia(supabase: SupabaseClient, userId: string, file: File) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("incident-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { path, type: file.type.startsWith("video/") ? ("video" as const) : ("image" as const) };
}

/** Media is private, so viewers get a link that expires after 10 minutes. */
export async function signedMediaUrl(supabase: SupabaseClient, path: string) {
  const { data, error } = await supabase.storage.from("incident-media").createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

export function mapLink(incident: { lat: number | null; lng: number | null; location_text?: string | null }) {
  if (incident.lat != null && incident.lng != null) return `https://www.google.com/maps?q=${incident.lat},${incident.lng}`;
  if (incident.location_text) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(incident.location_text)}`;
  return null;
}

/** Short human description of where an incident is. */
export function describeLocation(incident: { lat: number | null; lng: number | null; location_text?: string | null }) {
  if (incident.location_text) return incident.location_text;
  if (incident.lat != null && incident.lng != null) return `GPS ${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}`;
  return "No location given";
}

/** "5 min ago", "2 h ago", or a date for older items. */
export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDate(iso);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This browser cannot share your location."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => reject(new Error(error.code === error.PERMISSION_DENIED
        ? "Location access was blocked. Allow location for this site and try again."
        : "We couldn't get your location. Move to an open area and try again.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}
