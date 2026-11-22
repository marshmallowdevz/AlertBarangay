import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, LocateFixed, MapPin, Plus, Radio, X } from "lucide-react";
import { supabase } from "./supabaseClient";
import { createVideoThumbnail, getVideoDuration, INCIDENT_MEDIA_LIMITS, prepareIncidentImage } from "./incidentMedia";
import "./ReelsMapView.css";

const INCIDENT_TYPES = [
  { key: "fire", label: "Fire", color: "#e54949", glyph: "\u{1F525}" },
  { key: "medical", label: "Medical", color: "#e95b8a", glyph: "+" },
  { key: "flood", label: "Flood", color: "#358fd1", glyph: "\u2248" },
  { key: "accident", label: "Accident", color: "#e99b37", glyph: "A" },
  { key: "electrical_hazard", label: "Electrical Hazard", color: "#c9a227", glyph: "\u26A1" },
  { key: "garbage_collection", label: "Garbage Collection", color: "#3aa66a", glyph: "\u25A0" },
  { key: "road_damage", label: "Road Damage", color: "#8d69d8", glyph: "\u25CF" },
  { key: "water_problems", label: "Water Problems", color: "#1f7a99", glyph: "\u2248" },
];

const DEFAULT_CENTER = [10.31, 123.95];
const MEDIA_BUCKET = "incident-media";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const CLUSTER_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
const CLUSTER_DEFAULT_CSS = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";

function addStylesheet(id, href) {
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(id, src) {
  const current = document.getElementById(id);
  if (current?.dataset.loaded === "true") return Promise.resolve();
  if (current) {
    return new Promise((resolve, reject) => {
      current.addEventListener("load", resolve, { once: true });
      current.addEventListener("error", reject, { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("Map assets could not be downloaded."));
    };
    document.head.appendChild(script);
  });
}

async function loadLeaflet() {
  addStylesheet("alert-leaflet-css", LEAFLET_CSS);
  addStylesheet("alert-cluster-css", CLUSTER_CSS);
  addStylesheet("alert-cluster-default-css", CLUSTER_DEFAULT_CSS);
  if (!window.L?.map) {
    await loadScript("alert-leaflet-js", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
  }
  if (!window.L?.markerClusterGroup) {
    await loadScript("alert-markercluster-js", "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js");
  }
  if (!window.L?.markerClusterGroup) throw new Error("Map clustering did not load. Check your internet connection and retry.");
  return window.L;
}

function typeInfo(type) {
  return INCIDENT_TYPES.find((item) => item.key === type) || INCIDENT_TYPES[0];
}

function relativeTime(iso) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function inCurrentBounds(incident, bounds) {
  return Boolean(
    bounds && incident.lat >= bounds.getSouth() && incident.lat <= bounds.getNorth()
      && incident.lng >= bounds.getWest() && incident.lng <= bounds.getEast()
  );
}

function popupContent(incident, thumbnailUrl) {
  const wrapper = document.createElement("article");
  wrapper.className = "incident-popup";

  const title = document.createElement("strong");
  title.className = "incident-popup-eid";
  title.textContent = incident.eid;
  wrapper.append(title);

  const detail = document.createElement("p");
  detail.className = "incident-popup-type";
  detail.textContent = `${typeInfo(incident.type).label} · ${relativeTime(incident.created_at)}`;
  wrapper.append(detail);

  const description = document.createElement("p");
  description.textContent = incident.description.length > 120
    ? `${incident.description.slice(0, 117)}…`
    : incident.description;
  wrapper.append(description);

  const status = document.createElement("span");
  status.className = `incident-status incident-status-${incident.status}`;
  status.textContent = incident.status === "responding"
    ? "Responding"
    : incident.status.charAt(0).toUpperCase() + incident.status.slice(1);
  wrapper.append(status);

  if (thumbnailUrl) {
    const image = document.createElement("img");
    image.className = "incident-popup-image";
    image.src = thumbnailUrl;
    image.alt = "Incident photo";
    image.loading = "lazy";
    wrapper.append(image);
  }
  return wrapper;
}

function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser does not support location. Tap the map to place the pin."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? "Location permission was denied. Tap the map to place your report pin."
          : "Could not get your location. Tap the map to place your report pin.";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

function uniquePath(userId) {
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${userId}/${id}`;
}

export default function ReelsMapView({
  userId,
  onClose,
  returnLabel = "Reels",
  initialReportOpen = false,
  initialReportType = "",
  onReportSubmitted,
}) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const clusterRef = useRef(null);
  const boundsRef = useRef(null);
  const reloadRef = useRef(null);
  const requestNumberRef = useRef(0);
  const reportPinRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [mapError, setMapError] = useState("");
  const [incidents, setIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [queryError, setQueryError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [reportOpen, setReportOpen] = useState(initialReportOpen);
  const [reportType, setReportType] = useState(initialReportType);
  const [description, setDescription] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [locationMessage, setLocationMessage] = useState("Getting your location…");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [submittedEid, setSubmittedEid] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      setQueryError("");
      reloadRef.current?.();
    };
    const onOffline = () => {
      setIsOnline(false);
      setQueryError("You are offline. The map will refresh when your connection returns.");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let map;
    let moveTimer;
    let resizeMap;

    const initialize = async () => {
      setMapError("");
      setIncidentsLoading(true);
      try {
        const L = await loadLeaflet();
        if (cancelled || !hostRef.current) return;

        map = L.map(hostRef.current, { center: DEFAULT_CENTER, zoom: 12, zoomControl: false });
        L.control.zoom({ position: "topright" }).addTo(map);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        const cluster = L.markerClusterGroup({
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          disableClusteringAtZoom: 16,
          maxClusterRadius: 48,
        });
        map.addLayer(cluster);
        mapRef.current = map;
        clusterRef.current = cluster;
        resizeMap = () => map?.invalidateSize({ pan: false });
        window.addEventListener("resize", resizeMap);
        setMapReady(true);

        const loadIncidents = async () => {
          if (!map || !navigator.onLine) {
            if (!navigator.onLine) setQueryError("You are offline. The map will refresh when your connection returns.");
            setIncidentsLoading(false);
            return;
          }
          const bounds = map.getBounds();
          boundsRef.current = bounds;
          const requestNumber = ++requestNumberRef.current;
          setIncidentsLoading(true);
          setQueryError("");
          const now = new Date();
          const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data, error } = await supabase
            .from("incidents")
            .select("id, eid, type, description, lat, lng, status, media_path, media_type, created_at")
            .gte("created_at", since)
            .lte("created_at", now.toISOString())
            .neq("status", "resolved")
            .gte("lat", bounds.getSouth())
            .lte("lat", bounds.getNorth())
            .gte("lng", bounds.getWest())
            .lte("lng", bounds.getEast())
            .order("created_at", { ascending: false });
          if (cancelled || requestNumber !== requestNumberRef.current) return;
          setIncidentsLoading(false);
          if (error) {
            setQueryError(error.message.includes("incidents")
              ? "Incident map setup is incomplete. Apply the Supabase migration, then reload."
              : "Incident markers could not be loaded. Check your connection and access.");
            return;
          }
          setIncidents(data || []);
        };

        reloadRef.current = loadIncidents;
        const onMoveEnd = () => {
          window.clearTimeout(moveTimer);
          moveTimer = window.setTimeout(loadIncidents, 280);
        };
        map.on("moveend", onMoveEnd);
        loadIncidents();
        window.setTimeout(() => map?.invalidateSize(), 0);
      } catch (error) {
        if (!cancelled) {
          setMapError(error.message || "The map could not be loaded.");
          setIncidentsLoading(false);
        }
      }
    };

    initialize();
    return () => {
      cancelled = true;
      window.clearTimeout(moveTimer);
      if (resizeMap) window.removeEventListener("resize", resizeMap);
      reloadRef.current = null;
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
      clusterRef.current = null;
      reportPinRef.current = null;
    };
  }, [mapAttempt]);

  useEffect(() => {
    const channel = supabase
      .channel("incident-map-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, (payload) => {
        const incoming = payload.new;
        const id = payload.old?.id || incoming?.id;
        if (!id) return;
        setIncidents((current) => {
          const withoutUpdated = current.filter((incident) => incident.id !== id);
          if (payload.eventType === "DELETE" || !incoming || incoming.status === "resolved") return withoutUpdated;
          if (!boundsRef.current || !inCurrentBounds(incoming, boundsRef.current)) return withoutUpdated;
          const age = Date.now() - new Date(incoming.created_at).getTime();
          if (age < 0 || age > 7 * 24 * 60 * 60 * 1000) return withoutUpdated;
          return [incoming, ...withoutUpdated];
        });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setQueryError((current) => current || "Live updates are unavailable. Refresh the map to retry.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const cluster = clusterRef.current;
    if (!map || !cluster) return;
    const L = window.L;
    cluster.clearLayers();

    incidents.forEach((incident) => {
      const type = typeInfo(incident.type);
      const marker = L.marker([incident.lat, incident.lng], {
        icon: L.divIcon({
          className: "incident-marker-wrap",
          html: `<span class="incident-marker" style="--marker-color:${type.color}"><i>${type.glyph}</i></span>`,
          iconSize: [32, 40],
          iconAnchor: [16, 39],
          popupAnchor: [0, -38],
        }),
        title: `${type.label}: ${incident.eid}`,
        alt: `${type.label} incident marker`,
      });
      marker.on("click", async () => {
        marker.bindPopup(popupContent(incident, ""), { maxWidth: 270, minWidth: 190 }).openPopup();
        if (incident.media_path) {
          const { data } = await supabase.storage
            .from(MEDIA_BUCKET)
            .createSignedUrl(`${incident.media_path}.thumb`, 300);
          if (data?.signedUrl && mapRef.current === map) {
            marker.setPopupContent(popupContent(incident, data.signedUrl));
          }
        }
      });
      cluster.addLayer(marker);
    });
  }, [incidents, mapReady]);

  useEffect(() => {
    if (!mapReady || !reportOpen) return undefined;
    const map = mapRef.current;
    const onMapClick = (event) => {
      setCoordinates({ lat: event.latlng.lat, lng: event.latlng.lng });
      setLocationMessage("Pin location set. Drag the pin to adjust it.");
      setReportError("");
    };
    map.on("click", onMapClick);
    return () => map.off("click", onMapClick);
  }, [mapReady, reportOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    if (reportPinRef.current) {
      map.removeLayer(reportPinRef.current);
      reportPinRef.current = null;
    }
    if (!reportOpen || !coordinates) return;

    const L = window.L;
    const pin = L.marker([coordinates.lat, coordinates.lng], {
      draggable: true,
      icon: L.divIcon({
        className: "report-pin-wrap",
        html: '<span class="report-pin"><span></span></span>',
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      }),
      title: "Drag to adjust incident location",
    }).addTo(map);
    pin.on("dragend", () => {
      const point = pin.getLatLng();
      setCoordinates({ lat: point.lat, lng: point.lng });
      setLocationMessage("Pin location set. Drag the pin to adjust it.");
    });
    reportPinRef.current = pin;
    return () => {
      if (map.hasLayer(pin)) map.removeLayer(pin);
      if (reportPinRef.current === pin) reportPinRef.current = null;
    };
  }, [coordinates, mapReady, reportOpen]);

  const requestLocation = async () => {
    setLocationMessage("Getting your location…");
    setReportError("");
    try {
      const next = await getBrowserPosition();
      setCoordinates(next);
      setLocationMessage("GPS location set. Drag the pin to adjust it.");
      mapRef.current?.flyTo([next.lat, next.lng], 15);
    } catch (error) {
      setCoordinates(null);
      setLocationMessage(error.message);
    }
  };

  const openReport = (selectedType = "") => {
    setSubmittedEid("");
    setCoordinates(null);
    setDescription("");
    setReportType(selectedType);
    setMediaFile(null);
    setReportError("");
    setLocationMessage("Getting your location…");
    setReportOpen(true);
  };

  useEffect(() => {
    if (!reportOpen || coordinates) return;
    let current = true;
    getBrowserPosition().then((next) => {
      if (!current) return;
      setCoordinates(next);
      setLocationMessage("GPS location set. Drag the pin to adjust it.");
      mapRef.current?.flyTo([next.lat, next.lng], 15);
    }).catch((error) => {
      if (current) setLocationMessage(error.message);
    });
    return () => { current = false; };
  }, [reportOpen]);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setMediaFile(null);
    setReportError("");
    if (!file) return;

    if (file.type.startsWith("image/")) {
      if (file.size > 50 * 1024 * 1024) {
        setReportError("The selected photo is over 50 MB. Choose a smaller image.");
        return;
      }
      setMediaBusy(true);
      try {
        const prepared = await prepareIncidentImage(file);
        setMediaFile({ kind: "image", ...prepared, name: "Compressed image" });
      } catch (error) {
        setReportError(error.message || "Could not prepare that image.");
      } finally {
        setMediaBusy(false);
      }
      return;
    }

    if (!file.type.startsWith("video/")) {
      setReportError("Choose a supported image or video file.");
      return;
    }
    if (file.size > INCIDENT_MEDIA_LIMITS.videoBytes) {
      setReportError("Videos must be 15 MB or smaller.");
      return;
    }
    const supportedVideoTypes = ["video/mp4", "video/quicktime", "video/webm", "video/3gpp"];
    if (!supportedVideoTypes.includes(file.type)) {
      setReportError("Use an MP4, MOV, WebM, or 3GP video.");
      return;
    }
    try {
      const duration = await getVideoDuration(file);
      if (duration > INCIDENT_MEDIA_LIMITS.videoSeconds) {
        setReportError("Videos must be 15 seconds or shorter.");
        return;
      }
      const thumbnail = await createVideoThumbnail(file);
      setMediaFile({ kind: "video", file, thumbnail, name: file.name });
    } catch (error) {
      setReportError(error.message);
    }
  };

  const submitIncident = async (event) => {
    event.preventDefault();
    setReportError("");
    if (!isOnline) {
      setReportError("You are offline. Reconnect before sending this emergency report.");
      return;
    }
    if (!coordinates) {
      setReportError("Set a report location with GPS or tap the map to place a pin.");
      return;
    }
    if (!reportType) {
      setReportError("Choose an emergency type.");
      return;
    }
    if (!description.trim()) {
      setReportError("Add a short description of the emergency.");
      return;
    }

    setReportBusy(true);
    const uploadedPaths = [];
    let mediaPath = null;
    let mediaType = null;
    try {
      if (mediaFile) {
        mediaPath = uniquePath(userId);
        mediaType = mediaFile.kind;
        const mainFile = mediaFile.kind === "image" ? mediaFile.main : mediaFile.file;
        const mainType = mediaFile.kind === "image" ? mediaFile.main.type : mediaFile.file.type;
        const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(mediaPath, mainFile, {
          contentType: mainType,
          upsert: false,
        });
        if (uploadError) throw uploadError;
        uploadedPaths.push(mediaPath);

        const thumbnailPath = `${mediaPath}.thumb`;
        const { error: thumbnailError } = await supabase.storage.from(MEDIA_BUCKET).upload(thumbnailPath, mediaFile.thumbnail, {
          contentType: mediaFile.thumbnail.type,
          upsert: false,
        });
        if (thumbnailError) throw thumbnailError;
        uploadedPaths.push(thumbnailPath);
      }

      const { data, error } = await supabase
        .from("incidents")
        .insert({
          type: reportType,
          description: description.trim(),
          lat: coordinates.lat,
          lng: coordinates.lng,
          reporter_id: userId,
          media_path: mediaPath,
          media_type: mediaType,
        })
        .select("eid")
        .single();
      if (error) throw error;

      setSubmittedEid(data.eid);
      setMediaFile(null);
      reloadRef.current?.();
      await onReportSubmitted?.(data.eid);
    } catch (error) {
      if (uploadedPaths.length) {
        await supabase.storage.from(MEDIA_BUCKET).remove(uploadedPaths);
      }
      setReportError(error.message?.includes("incident-media")
        ? "Media upload was rejected. Check the bucket policy and file size."
        : error.message?.includes("incidents")
          ? "Could not save this incident. Apply the Supabase migration and check your access."
          : "Could not submit the emergency report. Check your connection and try again.");
    } finally {
      setReportBusy(false);
    }
  };

  const copyEid = async () => {
    try {
      await navigator.clipboard.writeText(submittedEid);
      setCopied(true);
    } catch {
      setReportError("Copy was blocked by this browser. You can select the EID and copy it manually.");
    }
  };

  const locateMe = async () => {
    setQueryError("");
    try {
      const point = await getBrowserPosition();
      mapRef.current?.flyTo([point.lat, point.lng], 15);
    } catch (error) {
      setQueryError(error.message);
    }
  };

  return (
    <section className="reels-map-overlay" aria-label="Emergency incident map">
      <div ref={hostRef} className="reels-map-canvas" aria-label="Map showing recent active incidents" />

      <div className="reels-map-header">
        <button type="button" className="reels-map-back" onClick={onClose} aria-label={returnLabel === "Reels" ? "Return to Reels" : "Close incident map"}>
          <ArrowLeft size={18} /> <span>{returnLabel}</span>
        </button>
        <div className="reels-map-title"><Radio size={16} /><span>Live incident map</span></div>
        {!isOnline && <span className="reels-map-offline">Offline</span>}
      </div>

      <div className="reels-map-tools">
        <button type="button" className="reels-map-locate" onClick={locateMe} aria-label="Locate me" title="Locate me">
          <LocateFixed size={19} />
        </button>
        {incidentsLoading && <span className="reels-map-loading">Loading incidents…</span>}
      </div>

      {mapError && (
        <div className="reels-map-state reels-map-state-error" role="alert">
          <p>{mapError}</p>
          <button className="btn btn-outline" type="button" onClick={() => setMapAttempt((value) => value + 1)}>Retry map</button>
        </div>
      )}

      {!mapError && !incidentsLoading && incidents.length === 0 && !queryError && (
        <div className="reels-map-empty"><MapPin size={17} /> No active incidents in this area from the past 7 days.</div>
      )}

      {queryError && <div className="reels-map-message" role="status">{queryError}</div>}
      {!reportOpen && !submittedEid && (
        <button type="button" className="reels-map-report" onClick={openReport}>
          <Plus size={19} /> Report Emergency
        </button>
      )}

      {reportOpen && (
        <form className="incident-report-panel" onSubmit={submitIncident}>
          <div className="incident-report-heading">
            <div><small>COMMUNITY RESPONSE</small><h2>Report Emergency</h2></div>
            <button type="button" className="incident-panel-close" onClick={() => setReportOpen(false)} aria-label="Close report form"><X size={19} /></button>
          </div>

          <label className="incident-field">Emergency type
            <select value={reportType} onChange={(event) => setReportType(event.target.value)} required>
              <option value="" disabled>Choose an emergency type</option>
              {INCIDENT_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
          </label>

          <label className="incident-field">Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} rows={3} placeholder="Describe what is happening" required />
            <small className="incident-counter">{description.length}/300</small>
          </label>

          <div className="incident-location-field">
            <div className="incident-location-heading"><strong>Location</strong><button type="button" className="incident-use-location" onClick={requestLocation}><LocateFixed size={14} /> Use GPS</button></div>
            {coordinates
              ? <p>{coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</p>
              : <p className="incident-location-message">{locationMessage}</p>}
            <small>Tap the map or drag the pin to adjust.</small>
          </div>

          <label className="incident-field">Photo or short video (optional)
            <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/3gpp" onChange={handleFile} disabled={mediaBusy || reportBusy} />
            <small>{mediaBusy ? "Compressing image…" : mediaFile ? `${mediaFile.name} ready` : "Images are compressed to WebP. Videos: up to 15 seconds and 15 MB."}</small>
          </label>

          {!isOnline && <p className="incident-form-error">You are offline. Reconnect before sending this report.</p>}
          {reportError && <p className="incident-form-error" role="alert">{reportError}</p>}
          <button className="btn btn-maroon incident-submit" type="submit" disabled={reportBusy || mediaBusy || !isOnline}>
            {reportBusy ? "Submitting…" : "Submit emergency"}
          </button>
        </form>
      )}

      {submittedEid && (
        <section className="incident-report-panel incident-success-panel" aria-live="polite">
          <button type="button" className="incident-panel-close" onClick={() => { setReportOpen(false); setSubmittedEid(""); }} aria-label="Close confirmation"><X size={19} /></button>
          <span className="incident-success-icon"><Check size={22} /></span>
          <small>REPORT RECEIVED</small>
          <h2>Your emergency report was submitted.</h2>
          <p>Share this Emergency ID with responders:</p>
          <strong className="incident-eid-result">{submittedEid}</strong>
          <button className="btn btn-maroon incident-copy-button" type="button" onClick={copyEid}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy EID"}</button>
          {reportError && <p className="incident-form-error">{reportError}</p>}
          <button type="button" className="incident-done-link" onClick={() => { setReportOpen(false); setSubmittedEid(""); }}>Return to map</button>
        </section>
      )}

      <div className="reels-map-legend" aria-label="Incident marker types">
        {INCIDENT_TYPES.map((type) => <span key={type.key}><i style={{ backgroundColor: type.color }} />{type.label}</span>)}
      </div>
    </section>
  );
}
