"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { LocateFixed, LoaderCircle, MapPinned, Send, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useI18n } from "@/lib/i18n/provider";
import { checkMediaFile, incidentTypes, MAX_DESCRIPTION, type IncidentType, type IncidentStatus } from "@/lib/incidents";
import type { MessageKey } from "@/lib/i18n/messages";
import styles from "./resident-community.module.css";
import mapStyles from "./resident-map.module.css";

type MapIncident = {
  id: string;
  eid: string;
  type: IncidentType;
  description: string;
  lat: number | null;
  lng: number | null;
  status: IncidentStatus;
  created_at: string;
};

const typeColors: Record<IncidentType, string> = {
  fire: "#c43e3e", medical: "#c94d75", flood: "#247eb5", crime: "#7b455f", accident: "#c77b2f",
  electrical_hazard: "#9c7919", road_damage: "#7652b7", water_problems: "#237184", garbage_collection: "#397856", other: "#756b62",
};
const reportColumns = "id, eid, type, description, lat, lng, status, created_at";

function readVideoDuration(file: File) {
  const url = URL.createObjectURL(file);
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { const duration = video.duration; video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); resolve(duration); };
    video.onerror = () => { video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); reject(new Error("The video duration could not be checked.")); };
    video.src = url;
  });
}

function isLocated(incident: MapIncident): incident is MapIncident & { lat: number; lng: number } {
  return typeof incident.lat === "number" && Number.isFinite(incident.lat)
    && typeof incident.lng === "number" && Number.isFinite(incident.lng);
}

function makePopup(incident: MapIncident, typeLabel: string, statusLabel: string) {
  const popup = document.createElement("article");
  popup.className = "resident-map-popup";
  const title = document.createElement("strong");
  title.textContent = incident.eid;
  const type = document.createElement("p");
  type.textContent = `${typeLabel} · ${statusLabel}`;
  const detail = document.createElement("p");
  detail.textContent = incident.description;
  popup.append(title, type, detail);
  return popup;
}

export function ResidentLiveMap({ userId }: { userId: string }) {
  const { t } = useI18n();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const reportMarkerRef = useRef<import("leaflet").Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [reports, setReports] = useState<MapIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState<IncidentType>("fire");
  const [description, setDescription] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReports = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("incidents").select(reportColumns)
        .neq("status", "resolved").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      setLoadError("");
      setReports((data ?? []) as MapIncident[]);
    } catch {
      setLoadError(t("resident.map.loadError"));
    } finally {
      setLoading(false);
    }
  }, [supabase, t]);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | null = null;
    void import("leaflet").then((leaflet) => {
      if (disposed || !hostRef.current) return;
      leafletRef.current = leaflet;
      map = leaflet.map(hostRef.current, { center: [10.31, 123.95], zoom: 12, scrollWheelZoom: true });
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      markersRef.current = leaflet.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
      window.setTimeout(() => map?.invalidateSize(), 0);
    }).catch(() => {
      if (!disposed) setMapError(t("resident.map.mapError"));
    });
    return () => {
      disposed = true;
      map?.remove();
      mapRef.current = null;
      markersRef.current = null;
      leafletRef.current = null;
      reportMarkerRef.current = null;
    };
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadReports(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReports]);

  useEffect(() => {
    const channel = supabase.channel(`resident-map-incidents-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const id = String(payload.old?.id ?? "");
          setReports((current) => current.filter((report) => report.id !== id));
          return;
        }
        const row = payload.new as MapIncident;
        if (!row?.id) return;
        setReports((current) => row.status === "resolved"
          ? current.filter((report) => report.id !== row.id)
          : [row, ...current.filter((report) => report.id !== row.id)]);
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setLoadError(t("resident.map.liveError"));
      });
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, t, userId]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersRef.current;
    const leaflet = leafletRef.current;
    if (!mapReady || !map || !layer || !leaflet) return;
    layer.clearLayers();
    for (const incident of reports) {
      if (!isLocated(incident)) continue;
      const marker = leaflet.marker([incident.lat, incident.lng], {
        icon: leaflet.divIcon({
          className: "resident-map-marker-wrap",
          html: `<span class="resident-map-marker" style="--marker-color:${typeColors[incident.type]}"></span>`,
          iconSize: [30, 38], iconAnchor: [15, 36], popupAnchor: [0, -34],
        }),
          title: `${t(`type.${incident.type}` as MessageKey)}: ${incident.eid}`,
      }).bindPopup(makePopup(incident, t(`type.${incident.type}` as MessageKey), t(`status.${incident.status}` as MessageKey)));
      layer.addLayer(marker);
    }
  }, [mapReady, reports, t]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;
    reportMarkerRef.current?.remove();
    reportMarkerRef.current = null;
    if (!reportOpen || !coordinates) return;
    const marker = leaflet.marker([coordinates.lat, coordinates.lng], { draggable: true, title: t("resident.map.dragPin") }).addTo(map);
    marker.on("dragend", () => {
      const point = marker.getLatLng();
      setCoordinates({ lat: point.lat, lng: point.lng });
      setLocationMessage(t("resident.map.pinPlaced"));
    });
    reportMarkerRef.current = marker;
    return () => { marker.remove(); if (reportMarkerRef.current === marker) reportMarkerRef.current = null; };
  }, [coordinates, mapReady, reportOpen, t]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !reportOpen) return;
    const onClick = (event: import("leaflet").LeafletMouseEvent) => {
      setCoordinates({ lat: event.latlng.lat, lng: event.latlng.lng });
      setLocationMessage(t("resident.map.pinPlaced"));
      setFormError("");
    };
    map.on("click", onClick);
    return () => { map.off("click", onClick); };
  }, [mapReady, reportOpen, t]);

  async function locateMe() {
    setLocationMessage(t("resident.map.locating"));
    setFormError("");
    if (!navigator.geolocation) { setLocationMessage(t("resident.map.locationUnavailable")); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const point = { lat: coords.latitude, lng: coords.longitude };
      setCoordinates(point);
      setLocationMessage(t("resident.map.pinPlaced"));
      mapRef.current?.flyTo([point.lat, point.lng], 15);
    }, (error) => {
      setLocationMessage(error.code === error.PERMISSION_DENIED ? t("resident.map.locationDenied") : t("resident.map.locationUnavailable"));
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  async function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    setFormError("");
    const combined = [...files, ...selected];
    const videoFiles = combined.filter((file) => file.type.startsWith("video/"));
    if (combined.length > 5 || videoFiles.length > 0 && (combined.length !== 1 || videoFiles.length !== 1)) {
      setFormError(t("resident.map.mediaLimit"));
      return;
    }
    const invalid = combined.find((file) => checkMediaFile(file));
    if (invalid) { setFormError(checkMediaFile(invalid) ?? t("resident.map.mediaInvalid")); return; }
    setMediaBusy(true);
    try {
      if (videoFiles.length && await readVideoDuration(videoFiles[0]) > 15) {
        setFormError(t("resident.map.videoDuration"));
        return;
      }
      setFiles(combined);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : t("resident.map.mediaInvalid"));
    } finally {
      setMediaBusy(false);
    }
  }

  function openReport() {
    setSuccess("");
    setFormError("");
    setLocationMessage(t("resident.map.chooseLocation"));
    setCoordinates(null);
    setFiles([]);
    setDescription("");
    setReportOpen(true);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setSuccess("");
    const text = description.trim();
    if (!coordinates) { setFormError(t("resident.map.locationRequired")); return; }
    if (text.length < 5) { setFormError(t("resident.map.descriptionRequired")); return; }
    if (!navigator.onLine) { setFormError(t("resident.map.offline")); return; }
    setSubmitting(true);
    const uploadedPaths: string[] = [];
    const mediaPaths: string[] = [];
    const mediaTypes: Array<"image" | "video"> = [];
    try {
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("incident-media").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        uploadedPaths.push(path);
        mediaPaths.push(path);
        mediaTypes.push(file.type.startsWith("video/") ? "video" : "image");
      }
      const { data, error } = await supabase.from("incidents").insert({
        reporter_id: userId,
        type: reportType,
        description: text.slice(0, MAX_DESCRIPTION),
        lat: coordinates.lat,
        lng: coordinates.lng,
        status: "pending",
        media_path: mediaPaths[0] ?? null,
        media_type: mediaTypes[0] ?? null,
        media_paths: mediaPaths,
        media_types: mediaTypes,
      }).select("eid").single();
      if (error) throw error;
      setSuccess(t("resident.map.reportSent", { eid: data.eid }));
      setReportOpen(false);
      setCoordinates(null);
      setDescription("");
      setFiles([]);
      void loadReports();
    } catch {
      let cleanupFailed = false;
      if (uploadedPaths.length) {
        try {
          const { error: cleanupError } = await supabase.storage.from("incident-media").remove(uploadedPaths);
          if (cleanupError) {
            cleanupFailed = true;
            console.warn("Could not remove incident media after report submission failed.", cleanupError);
          }
        } catch (cleanupError) {
          cleanupFailed = true;
          console.warn("Could not remove incident media after report submission failed.", cleanupError);
        }
      }
      setFormError(t(cleanupFailed ? "resident.map.submitErrorCleanup" : "resident.map.submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  const unlocatedCount = reports.filter((report) => !isLocated(report)).length;

  return <section className={mapStyles.mapPage} aria-labelledby="resident-map-title">
    <div className={mapStyles.toolbar}>
      <div><h2 id="resident-map-title"><MapPinned size={19} /> {t("resident.map.title")}</h2><p>{t("resident.map.subtitle")}</p></div>
      <div className={mapStyles.actions}>
        <Link href="/resident/community" className="button secondary">{t("resident.community.title")}</Link>
        <button className="button primary" type="button" onClick={openReport}><MapPinned size={16} /> {t("resident.map.report")}</button>
      </div>
    </div>
    <div className={mapStyles.mapLayout}>
      <div className={mapStyles.mapCard}>
        {mapError ? <div className={mapStyles.mapFallback} role="alert">{mapError}</div> : <div ref={hostRef} className={mapStyles.canvas} aria-label={t("resident.map.mapLabel")} />}
        {mapReady && <button className={`${mapStyles.locate} button secondary`} type="button" onClick={() => void locateMe()} aria-label={t("resident.map.locateMe")}><LocateFixed size={17} /></button>}
      </div>
      <aside className={`${mapStyles.reportPanel} panel`}>
        <h3>{t("resident.map.activeReports", { n: reports.filter((report) => report.status !== "resolved").length })}</h3>
        {loading && <p className={mapStyles.mapMessage}>{t("resident.map.loading")}</p>}
        {loadError && <p className="inline-error" role="status">{loadError}</p>}
        {!loading && !reports.length && <p className={mapStyles.mapMessage}>{t("resident.map.noReports")}</p>}
        {!loading && reports.length > 0 && !reports.some(isLocated) && <p className={mapStyles.mapMessage}>{t("resident.map.noCoordinates")}</p>}
        {unlocatedCount > 0 && reports.some(isLocated) && <p className={mapStyles.mapHint}>{t("resident.map.unlocated", { n: unlocatedCount })}</p>}
        <p className={mapStyles.mapHint}>{t("resident.map.accessNote")}</p>
      </aside>
    </div>
    {reportOpen && <form className={`${mapStyles.reportForm} panel`} onSubmit={submitReport}>
      <div className={mapStyles.formHeading}><div><h3>{t("resident.map.reportTitle")}</h3><p>{t("resident.map.tapMap")}</p></div>
        <button className={mapStyles.close} type="button" onClick={() => setReportOpen(false)} aria-label={t("resident.map.closeForm")}><X size={17} /></button>
      </div>
      <label className={mapStyles.field}><span>{t("resident.map.incidentType")}</span><select value={reportType} onChange={(event) => setReportType(event.target.value as IncidentType)}>
        {incidentTypes.map((type) => <option key={type} value={type}>{t(`type.${type}` as MessageKey)}</option>)}
      </select></label>
      <label className={mapStyles.field}><span>{t("resident.map.description")}</span><textarea rows={3} maxLength={MAX_DESCRIPTION} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("resident.map.descriptionPlaceholder")} /></label>
      <div className={mapStyles.field}><span>{t("resident.map.location")}</span>
        <button className="button secondary" type="button" onClick={() => void locateMe()}><LocateFixed size={15} /> {t("resident.map.useGps")}</button>
        <p className={mapStyles.locationText}>{coordinates ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` : locationMessage}</p>
      </div>
      <label className={mapStyles.field}><span>{t("resident.map.photosOrVideo")}</span><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/3gpp" multiple onChange={(event) => void chooseFiles(event)} disabled={mediaBusy || submitting || files.length >= 5} />
        <small>{mediaBusy ? t("resident.map.preparingMedia") : t("resident.map.mediaHint")}</small>
      </label>
      {files.length > 0 && <ul className={mapStyles.fileList} aria-label={t("resident.map.selectedMedia")}>
        {files.map((file, index) => <li key={`${file.name}-${index}`}><span>{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, item) => item !== index))} disabled={submitting} aria-label={t("resident.map.removeFile", { name: file.name })}><X size={14} /></button></li>)}
      </ul>}
      {formError && <p className="inline-error" role="alert">{formError}</p>}
      <button className="button primary" type="submit" disabled={submitting || mediaBusy}>{submitting ? <LoaderCircle className={styles.spin} size={16} /> : <Send size={16} />}{submitting ? t("resident.map.submitting") : t("resident.map.submit")}</button>
    </form>}
    {success && <p className={mapStyles.success} role="status">{success}</p>}
  </section>;
}
