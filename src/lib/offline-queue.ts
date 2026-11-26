/**
 * Reports written while offline are kept in IndexedDB on the device (with any
 * photo or video) and sent when the connection comes back.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { incidentColumns, uploadIncidentMedia, type Incident, type IncidentType } from "@/lib/incidents";

export type QueuedReport = {
  id: string;
  userId: string;
  createdAt: string;
  type: IncidentType;
  description: string;
  lat: number | null;
  lng: number | null;
  locationText: string;
  file: Blob | null;
  fileName: string | null;
  fileType: string | null;
};

const DB_NAME = "alertbarangay";
const STORE = "queued-reports";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("Offline storage is not available.")); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline storage could not be opened."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error ?? request.error);
      tx.onabort = () => reject(tx.error ?? new Error("Offline storage was interrupted."));
    });
  } finally {
    db.close();
  }
}

export async function queueReport(report: QueuedReport) {
  try {
    await withStore("readwrite", (store) => store.put(report));
  } catch (cause) {
    // Some browsers (private mode) refuse to store large files: keep the text.
    if (!report.file) throw cause;
    await withStore("readwrite", (store) => store.put({ ...report, file: null, fileName: null, fileType: null }));
    return { mediaDropped: true };
  }
  return { mediaDropped: false };
}

export async function listQueuedReports(userId: string): Promise<QueuedReport[]> {
  const all = await withStore<QueuedReport[]>("readonly", (store) => store.getAll() as IDBRequest<QueuedReport[]>);
  return all.filter((item) => item.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeQueuedReport(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
}

/** True for errors that mean "no connection", so the report should be queued. */
export function looksOffline(cause: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const message = cause instanceof Error ? cause.message : typeof cause === "object" && cause && "message" in cause ? String((cause as { message: unknown }).message) : "";
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(message);
}

/** Sends one queued report. Returns the created incident. */
export async function sendQueuedReport(supabase: SupabaseClient, report: QueuedReport): Promise<Incident> {
  let uploadedPath: string | null = null;
  try {
    let media: { path: string; type: "image" | "video" } | null = null;
    if (report.file && report.fileType) {
      const file = new File([report.file], report.fileName || "attachment", { type: report.fileType });
      media = await uploadIncidentMedia(supabase, report.userId, file);
      uploadedPath = media.path;
    }
    const { data, error } = await supabase.from("incidents").insert({
      type: report.type,
      description: report.description,
      reporter_id: report.userId,
      lat: report.lat,
      lng: report.lng,
      ...(report.locationText ? { location_text: report.locationText } : {}),
      media_path: media?.path ?? null,
      media_type: media?.type ?? null,
    }).select(incidentColumns).single();
    if (error) throw error;
    return data as Incident;
  } catch (cause) {
    if (uploadedPath) await supabase.storage.from("incident-media").remove([uploadedPath]).catch(() => undefined);
    throw cause;
  }
}
