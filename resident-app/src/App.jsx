import { useState, useEffect, useRef, Fragment } from "react";
import {
  Home, FileText, Megaphone, Bell, ShieldCheck, Phone, CircleUserRound, Clapperboard,
  Flame, Waves, Car, Zap, Trash2, MapPin, Droplets, HeartPulse, ClipboardList, Clock,
  CheckCircle2, ChevronDown, ChevronRight, LogOut, User, Shield, Copy,
  LockKeyhole, Info, Sun, CalendarDays, CircleHelp, ImagePlus, Languages,
  Play, Pause, Volume2, VolumeX,
  ArrowLeft, Eye, EyeOff, Map,
} from "lucide-react";
import { supabase, isConfigured, configError } from "./supabaseClient";
import "./App.css";
import "./landing.css";
import { ReportMedia } from "./MediaPicker";
import { getCommunityFileMediaType, getCommunityPostMediaKind, removeCommunityMedia, resolveCommunityPosts, resolveIncidentReports, uploadCommunityMedia } from "./communityMedia";
import MediaSourceChooser from "./MediaSourceChooser";
import ReelsMapView from "./ReelsMapView";

const HOTLINE = "0932 537 7770";
const HOTLINE_TEL = "tel:+639325377770";

const EMERGENCY_TYPES = [
  { key: "Fire", incidentType: "fire", icon: Flame, color: "#c0392b" },
  { key: "Medical", incidentType: "medical", icon: HeartPulse, color: "#d94b73" },
  { key: "Flood", incidentType: "flood", icon: Waves, color: "#1f7a99" },
  { key: "Accident", incidentType: "accident", icon: Car, color: "#b03a2e" },
  { key: "Electrical Hazard", incidentType: "electrical_hazard", icon: Zap, color: "#c9a227" },
  { key: "Garbage Collection", incidentType: "garbage_collection", icon: Trash2, color: "#3aa66a" },
  { key: "Road Damage", incidentType: "road_damage", icon: MapPin, color: "#8d69d8" },
  { key: "Water Problems", incidentType: "water_problems", icon: Droplets, color: "#1f7a99" },
];

const iconFor = (type) => EMERGENCY_TYPES.find((item) =>
  item.incidentType === type || item.key.toLowerCase() === String(type).toLowerCase()
)?.icon || CircleHelp;

const incidentLabel = (type) => EMERGENCY_TYPES.find((item) => item.incidentType === type)?.key || type;

const ANNOUNCEMENTS = [
  { id: 1, title: "Barangay clean-up drive", body: "Join us this Saturday, 7:00 AM at the barangay hall. Gloves and bags provided.", date: "May 21, 2025" },
  { id: 2, title: "Water interruption notice", body: "Expect low water pressure in Zones 3 and 4 from 10 PM to 4 AM.", date: "May 19, 2025" },
  { id: 3, title: "Typhoon preparedness meeting", body: "All zone leaders and volunteers are invited to the covered court on Friday, 3 PM.", date: "May 16, 2025" },
];

const SAFETY_TIPS = [
  { title: "Fire", tip: "Get out, stay out, and call the hotline. Never use elevators during a fire." },
  { title: "Flood", tip: "Move to higher ground, switch off the main power, and avoid walking through floodwater." },
  { title: "Electrical hazards", tip: "Stay away from fallen wires and report them right away. Never touch wet electrical devices." },
  { title: "Road accidents", tip: "Turn on hazard lights, keep the area safe, and report the exact location." },
  { title: "Earthquake", tip: "Drop, cover, and hold on. Move to an open area after shaking stops." },
];

const CONTACTS = [
  { name: "Philippine Red Cross", number: "143", tel: "tel:143" },
  { name: "Cebu City Fire", number: "160", tel: "tel:160" },
  { name: "Cebu City Police", number: "166", tel: "tel:166" },
  { name: "CCDRRMO Rescue Hotline", number: HOTLINE, tel: HOTLINE_TEL },
  { name: "Cebu City Hall", number: "(032) 411-0100", tel: "tel:+63324110100" },
  { name: "Visayan Electric", number: "(032) 230-8326", tel: "tel:+63322308326" },
  { name: "CCDRRMO Mambaling", number: "(032) 262-1424", tel: "tel:+63322621424" },
  { name: "MCWD", number: "(032) 254-8434", tel: "tel:+63322548434" },
];

const PAGES = [
  { key: "dashboard", label: "Home", icon: Home },
  { key: "reports", label: "My Reports", icon: FileText },
  { key: "reels", label: "Reels", icon: Clapperboard },
  { key: "appointments", label: "Appointments", icon: CalendarDays },
  { key: "profile", label: "Profile", icon: CircleUserRound },
];

const FILIPINO = {
  "Home": "Tahanan", "My Reports": "Aking mga Ulat", "Reels": "Mga Post", "Message": "Mensahe", "Profile": "Profile",
  "Stay informed, stay safe.": "Manatiling may alam at ligtas.",
  "View your submitted reports": "Tingnan ang iyong mga naisumiteng ulat", "Reports being reviewed": "Mga ulat na sinusuri", "Reports that were resolved": "Mga ulat na nalutas na", "Notifications": "Mga Abiso", "Unread notifications": "Mga hindi pa nababasang abiso",
  "Welcome back,": "Maligayang pagbabalik,", "Stay informed, stay safe.": "Manatiling may alam at ligtas.",
  "Report an Emergency": "Mag-ulat ng Emergency", "Choose what you would like to report.": "Piliin kung ano ang nais mong iulat.",
  "What would you like to report?": "Ano ang nais mong iulat?", "Emergency Hotline": "Hotline para sa Emergency",
  "Need immediate assistance?": "Kailangan mo ba ng agarang tulong?", "Barangay Emergency Hotline": "Hotline ng Barangay para sa Emergency",
  "Available 24/7": "Handang tumulong 24/7", "submitted": "naisumite", "New report": "Bagong ulat",
  "You haven't submitted any reports yet. Use Report Emergency to send one.": "Wala ka pang naisusumiteng ulat. Gamitin ang Mag-ulat ng Emergency para magpadala ng ulat.",
  "No reports match this filter.": "Walang ulat na tumutugma sa filter na ito.", "Type": "Uri", "Location": "Lokasyon",
  "Severity": "Antas ng panganib", "Status": "Katayuan", "Reported At": "Iniulat noong", "Pending": "Nakabinbin",
  "In Progress": "Isinasagawa", "Resolved": "Nalutas", "High": "Mataas", "Medium": "Katamtaman", "Low": "Mababa",
  "Details": "Detalye", "Hide details": "Itago ang detalye", "Cancel": "Kanselahin", "What happened:": "Ano ang nangyari:",
  "No description provided.": "Walang ibinigay na paglalarawan.", "Notifications & Announcements": "Mga Abiso at Anunsyo",
  "Barangay announcements and updates on your reports.": "Mga anunsyo ng barangay at update tungkol sa iyong mga ulat.",
  "Post an announcement": "Mag-post ng anunsyo", "Announcement title": "Pamagat ng anunsyo", "Message for residents": "Mensahe para sa mga residente",
  "Publish announcement": "I-publish ang anunsyo", "Report updates": "Mga update sa ulat", "Mark all as read": "Markahang nabasa lahat",
  "You're all caught up.": "Wala ka nang hindi nababasang abiso.", "Mark as read": "Markahang nabasa", "Delete": "Burahin",
  "Message Barangay Officials": "Mensahe sa mga Opisyal ng Barangay", "Send a private message to your barangay officials.": "Magpadala ng pribadong mensahe sa mga opisyal ng barangay.",
  "Your message": "Iyong mensahe", "Write your message here...": "Isulat dito ang iyong mensahe...", "Send message": "Ipadala ang mensahe",
  "Resident messages": "Mga mensahe ng residente", "No messages yet.": "Wala pang mga mensahe.", "No email provided": "Walang ibinigay na email",
  "Safety Tips": "Mga Paalala sa Kaligtasan", "Barangay Contacts": "Mga Contact ng Barangay", "Call": "Tumawag", "Copy": "Kopyahin",
  "Community Reels": "Mga Post ng Komunidad", "Share photos and videos with residents.": "Magbahagi ng mga larawan at video sa mga residente.",
  "Live Incident Map": "Live na Mapa ng Insidente", "Tap to view active incidents on the map.": "Pindutin upang makita sa mapa ang mga aktibong insidente.", "Open live map": "Buksan ang live na mapa",
  "No appointments to show.": "Walang mga appointment na ipapakita.",
  "Photo or video": "Larawan o video", "Caption": "Caption", "What's happening in your community?": "Ano ang nangyayari sa inyong komunidad?",
  "Share with residents": "Ibahagi sa mga residente", "Uploading…": "Ina-upload…", "No community posts yet.": "Wala pang mga post sa komunidad.",
  "Account": "Account", "Manage Profile": "Pamahalaan ang Profile", "Name": "Pangalan", "Choose profile picture": "Pumili ng larawan sa profile",
  "Save name": "I-save ang pangalan", "Upload picture": "I-upload ang larawan", "Uploading…": "Ina-upload…", "Password & Security": "Password at Seguridad",
  "New password": "Bagong password", "Confirm new password": "Kumpirmahin ang bagong password", "Update password": "I-update ang password",
  "Language": "Wika", "English": "Ingles", "Filipino": "Filipino", "Choose your language.": "Piliin ang iyong wika.",
  "Preferences": "Mga Kagustuhan", "About AlertBarangay": "Tungkol sa AlertBarangay", "Theme": "Tema", "System": "Ayon sa system", "Light": "Maliwanag", "Dark": "Madilim", "System auto": "Awtomatikong system",
  "Choose how AlertBarangay looks on this device.": "Piliin ang itsura ng AlertBarangay sa device na ito.", "Appointments": "Mga Appointment",
  "Barangay appointment booking is not available yet. Contact the barangay hall for assistance.": "Hindi pa available ang pag-book ng appointment sa barangay. Makipag-ugnayan sa barangay hall para sa tulong.",
  "Support": "Suporta", "Help Center": "Sentro ng Tulong", "Log out": "Mag-log out", "Resident": "Residente",
  "Fire": "Sunog", "Medical": "Medikal", "Flood": "Baha", "Accident": "Aksidente", "Electrical Hazard": "Panganib sa Kuryente", "Garbage Collection": "Koleksyon ng Basura", "Road Damage": "Sirang Kalsada", "Water Problems": "Problema sa Tubig",
};

const tr = (text, language) => language === "fil" ? (FILIPINO[text] || text) : text;

/* ---------- Database helpers (no React state in here) ---------- */

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });

const toReport = (row, userId) => ({
  id: row.id,
  type: row.type,
  location: row.location,
  severity: row.severity,
  description: row.description,
  media: row.media_urls || [],
  status: row.status,
  date: fmtDate(row.created_at),
  createdAt: row.created_at,
  mine: row.user_id === userId,
  source: "legacy",
  history: (row.report_history || [])
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((h) => ({ status: h.status, date: fmtDate(h.created_at) })),
});

const toIncidentReport = (row, userId, statusHistory = []) => ({
  id: row.id,
  type: incidentLabel(row.type),
  location: `${Number(row.lat).toFixed(6)}, ${Number(row.lng).toFixed(6)}`,
  severity: null,
  description: row.description,
  media: [],
  status: row.status === "responding" ? "In Progress" : row.status[0].toUpperCase() + row.status.slice(1),
  date: fmtDate(row.created_at),
  createdAt: row.created_at,
  mine: row.reporter_id === userId,
  source: "incident",
  history: statusHistory.map((event) => ({
    status: event.new_status === "responding"
      ? "In Progress"
      : event.new_status[0].toUpperCase() + event.new_status.slice(1),
    date: fmtDate(event.created_at),
  })),
});

const toNotification = (row) => ({
  id: row.id,
  type: row.event_type,
  title: row.title,
  body: row.body,
  time: fmtDate(row.created_at),
  read: Boolean(row.read),
});

const isMissingOptionalTable = (error) =>
  ["42P01", "PGRST205"].includes(error?.code)
  || /relation .* does not exist|could not find the table .* in the schema cache/i.test(error?.message || "");

async function fetchReports(userId) {
  const [legacyResult, incidentResult] = await Promise.all([
    supabase.from("reports")
      .select("*, report_history(status, created_at)")
      .order("created_at", { ascending: false }),
    supabase.from("incidents")
      .select("id, type, description, lat, lng, status, reporter_id, created_at")
      .eq("reporter_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  const incidents = incidentResult.data || [];
  const incidentIds = incidents.map((row) => row.id);
  let historyResult = incidentIds.length
    ? await supabase.from("incident_status_history")
      .select("id, incident_id, previous_status, new_status, created_at")
      .in("incident_id", incidentIds)
      .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (isMissingOptionalTable(historyResult.error)) historyResult = { data: [], error: null };
  const incidentHistory = new Map();
  for (const event of historyResult.data || []) {
    const events = incidentHistory.get(event.incident_id) || [];
    events.push(event);
    incidentHistory.set(event.incident_id, events);
  }
  const reports = [
    ...(legacyResult.data || []).map((row) => toReport(row, userId)),
    ...incidents.map((row) => toIncidentReport(row, userId, incidentHistory.get(row.id) || [])),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { error: legacyResult.error || incidentResult.error || historyResult.error, reports };
}

async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, event_type, title, body, report_id, announcement_id, incident_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { error, notifications: [] };

  const rows = data || [];
  const notificationIds = rows.map((row) => row.id);
  const readResult = notificationIds.length
    ? await supabase.from("notification_reads")
      .select("notification_id")
      .eq("user_id", userId)
      .in("notification_id", notificationIds)
    : { data: [], error: null };
  const readIds = new Set((readResult.data || []).map((row) => row.notification_id));
  return {
    error: readResult.error,
    notifications: rows.map((row) => ({ ...toNotification(row), read: readIds.has(row.id) })),
  };
}

async function fetchProfile(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

function ReelUploadPreview({ file, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file || !previewUrl) return null;

  const mediaType = getCommunityFileMediaType(file);
  const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);

  return (
    <div className="reel-upload-preview">
      {mediaType === "video"
        ? <video src={previewUrl} controls muted playsInline preload="metadata" />
        : mediaType === "image"
          ? <img src={previewUrl} alt="Selected community post" />
          : <p className="hint">This file type is not supported. Choose a supported photo or video.</p>}
      <div className="reel-preview-meta">
        <small>{file.name} · {sizeInMb} MB</small>
        <button type="button" className="link-btn danger" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}

function ReelPostMedia({ post }) {
  const [failedUrl, setFailedUrl] = useState("");
  const [muted, setMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const videoRef = useRef(null);
  const videoVisibleRef = useRef(false);
  const userPausedRef = useRef(false);
  const pointerStartRef = useRef(null);
  const mediaItems = Array.isArray(post.media_urls)
    ? post.media_urls.map((item) => {
        const mediaUrl = typeof item === "string" ? item : item?.url || item?.signedUrl || "";
        if (!mediaUrl) return null;
        const itemType = typeof item === "object" ? item?.type || item?.media_type : "";
        return {
          url: mediaUrl,
          type: ["image", "video"].includes(itemType)
            ? itemType
            : getCommunityPostMediaKind({ media_url: mediaUrl }),
        };
      }).filter(Boolean)
    : [];
  const singleUrl = post.displayMediaUrl || "";
  if (!mediaItems.length && singleUrl) {
    mediaItems.push({ url: singleUrl, type: post.displayMediaType || getCommunityPostMediaKind(post) });
  }
  const activeMedia = mediaItems[activeMediaIndex];
  const url = activeMedia?.url || singleUrl;
  const mediaType = activeMedia?.type || post.displayMediaType || getCommunityPostMediaKind(post);
  const hasMedia = Boolean(post.media_path || post.media_paths?.length || post.media_url || post.media_urls?.length || url);

  useEffect(() => {
    setActiveMediaIndex(0);
    videoVisibleRef.current = false;
  }, [post.reelKey]);

  useEffect(() => {
    videoVisibleRef.current = false;
    setPlaybackBlocked(false);
    setMuted(false);
    setIsPlaying(false);
    userPausedRef.current = false;
    videoRef.current?.pause();
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || mediaType !== "video" || !url) return undefined;

    let observer;
    let isVisible = false;
    // Mobile Safari and some Android browsers require inline playback to be
    // set directly on the element. Reels default to audible playback.
    video.defaultMuted = false;
    video.muted = muted;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

    const attemptPlayback = () => {
      if (!isVisible || document.hidden || userPausedRef.current) return;
      video.muted = muted;
      video.preload = "auto";
      try {
        Promise.resolve(video.play())
          .then(() => setPlaybackBlocked(false))
          .catch(() => setPlaybackBlocked(true));
      } catch {
        setPlaybackBlocked(true);
      }
    };
    const updatePlayback = () => {
      const isOnScreen = isVisible && !document.hidden;
      const shouldPlay = isOnScreen && !userPausedRef.current;
      videoVisibleRef.current = isOnScreen;
      if (shouldPlay) attemptPlayback();
      else {
        video.pause();
        if (!isOnScreen) setPlaybackBlocked(false);
      }
    };
    if ("IntersectionObserver" in window) {
      // Reels scroll inside their own feed, not the document viewport. Use
      // that feed as the observer root so each swipe reliably activates the
      // video in the newly visible card.
      const feed = video.closest(".reel-feed");
      const card = video.closest(".reel-card") || video;
      observer = new IntersectionObserver(([entry]) => {
        isVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.5);
        updatePlayback();
      }, { root: feed || null, threshold: [0, 0.25, 0.5, 0.75, 1] });
      observer.observe(card);
    } else {
      isVisible = true;
      videoVisibleRef.current = true;
      updatePlayback();
    }
    const handleVisibilityChange = () => updatePlayback();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      observer?.disconnect();
      isVisible = false;
      videoVisibleRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      video.pause();
    };
  }, [mediaType, muted, url]);

  if (!hasMedia) return null;

  const swipeToMedia = (direction) => {
    if (mediaItems.length < 2) return;
    setActiveMediaIndex((current) => Math.max(0, Math.min(mediaItems.length - 1, current + direction)));
  };
  const handlePointerDown = (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };
  const handlePointerUp = (event) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || mediaItems.length < 2) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return;
    swipeToMedia(deltaX < 0 ? 1 : -1);
  };

  const mediaView = !url || failedUrl === url
    ? <div className="reel-media-fallback" role="status">This photo or video could not be loaded.</div>
    : mediaType === "video"
      ? <video
        ref={videoRef}
        src={url}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        onCanPlay={(event) => {
          if (!videoVisibleRef.current || document.hidden || userPausedRef.current) return;
          event.currentTarget.muted = muted;
          try {
            Promise.resolve(event.currentTarget.play())
              .then(() => setPlaybackBlocked(false))
              .catch(() => setPlaybackBlocked(true));
          } catch {
            setPlaybackBlocked(true);
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          setPlaybackBlocked(false);
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => setFailedUrl(url)}
        />
      : <img
        src={url}
        alt={post.caption || post.description || "Community post"}
        loading="lazy"
        draggable="false"
        onError={() => setFailedUrl(url)}
        />;

  return (
    <>
      <div
        className={`reel-media-wrap ${mediaItems.length > 1 ? "reel-media-carousel" : ""}`}
        onPointerDown={mediaItems.length > 1 ? handlePointerDown : undefined}
        onPointerUp={mediaItems.length > 1 ? handlePointerUp : undefined}
        onPointerCancel={() => { pointerStartRef.current = null; }}
        aria-label={mediaItems.length > 1 ? `Photo ${activeMediaIndex + 1} of ${mediaItems.length}` : undefined}
      >
        {mediaView}
      </div>
      {mediaType === "video" && url && failedUrl !== url && (
        <>
          {playbackBlocked && videoVisibleRef.current && (
            <button
              type="button"
              className="reel-play-toggle"
              onClick={() => {
                userPausedRef.current = false;
                const video = videoRef.current;
                if (video) video.muted = muted;
                try {
                  Promise.resolve(video?.play())
                    .then(() => setPlaybackBlocked(false))
                    .catch(() => setPlaybackBlocked(true));
                } catch {
                  setPlaybackBlocked(true);
                }
              }}
            >
              Tap to play with sound
            </button>
          )}
          <div className="reel-video-controls">
            <button
              type="button"
              className="reel-playback-toggle"
              aria-label={isPlaying ? "Pause video" : "Play video"}
              onClick={() => {
                const video = videoRef.current;
                if (!video) return;
                if (!video.paused) {
                  userPausedRef.current = true;
                  video.pause();
                  setPlaybackBlocked(false);
                  return;
                }
                userPausedRef.current = false;
                video.muted = muted;
                try {
                  Promise.resolve(video.play())
                    .then(() => setPlaybackBlocked(false))
                    .catch(() => setPlaybackBlocked(true));
                } catch {
                  setPlaybackBlocked(true);
                }
              }}
            >
              {isPlaying ? <Pause size={17} /> : <Play size={17} />}
            </button>
            <button
              type="button"
              className="reel-audio-toggle"
              aria-label={muted ? "Turn video sound on" : "Mute video"}
              aria-pressed={!muted}
              onClick={() => {
                const video = videoRef.current;
                setMuted((current) => {
                  const nextMuted = !current;
                  if (video) video.muted = nextMuted;
                  return nextMuted;
                });
              }}
            >
              {muted ? <><VolumeX size={17} /> Sound off</> : <><Volume2 size={17} /> Sound on</>}
            </button>
          </div>
        </>
      )}
      {mediaItems.length > 1 && (
        <div className="reel-carousel-dots" role="group" aria-label="Choose report photo">
          {mediaItems.map((item, index) => (
            <button
              key={`${item.url}-${index}`}
              type="button"
              className={`reel-carousel-dot ${index === activeMediaIndex ? "active" : ""}`}
              aria-label={`Show photo ${index + 1} of ${mediaItems.length}`}
              aria-current={index === activeMediaIndex ? "true" : undefined}
              onClick={() => setActiveMediaIndex(index)}
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ---------- App ---------- */

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [mapOpen, setMapOpen] = useState(false);
  const [mapLaunchOptions, setMapLaunchOptions] = useState({ openReport: false, type: "" });
  const lastReelsTapRef = useRef(0);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState({ name: "Resident", role: "Resident" });
  const [themePreference, setThemePreference] = useState(() => {
    try { return localStorage.getItem("alertbarangay-theme") || "system"; }
    catch { return "system"; }
  });
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem("alertbarangay-language") || "en"; }
    catch { return "en"; }
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [reelItems, setReelItems] = useState([]);
  const [reelsLoading, setReelsLoading] = useState(false);
  const [reelsFeedError, setReelsFeedError] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [postFile, setPostFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const [reelComposerOpen, setReelComposerOpen] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messages, setMessages] = useState([]);

  const profileRef = useRef(null);
  const reloadReelsRef = useRef(null);
  useClickOutside(profileRef, () => setProfileOpen(false));

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const theme = themePreference === "system" ? (media.matches ? "dark" : "light") : themePreference;
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem("alertbarangay-theme", themePreference); } catch { /* storage may be disabled */ }
    };
    applyTheme();
    if (themePreference === "system") {
      media.addEventListener("change", applyTheme);
      return () => media.removeEventListener("change", applyTheme);
    }
  }, [themePreference]);

  useEffect(() => {
    document.documentElement.lang = language === "fil" ? "fil" : "en";
    try { localStorage.setItem("alertbarangay-language", language); } catch { /* storage may be disabled */ }
  }, [language]);

  // Who is logged in? Supabase remembers the login after a refresh.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setReports([]);
        setNotifications([]);
        setPage("dashboard");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // After login, load this resident's profile, reports and notifications.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const load = async () => {
      const [profile, reportResult, notificationResult] = await Promise.all([
        fetchProfile(userId),
        fetchReports(userId),
        fetchNotifications(userId),
      ]);
      if (cancelled) return;
      setUser({
        // The account metadata is updated directly when the resident saves a
        // name, so it remains authoritative across sign-outs and logins.
        name: session?.user?.user_metadata?.full_name || profile?.full_name || "Resident",
        role: profile?.role === "admin" ? "Admin" : "Resident",
        avatarUrl: profile?.avatar_url || "",
      });
      setReports(reportResult.reports);
      setNotifications((current) => [...new Map([
        ...notificationResult.notifications,
        ...current,
      ].map((notification) => [notification.id, notification])).values()]
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .slice(0, 100));
      if (reportResult.error || notificationResult.error) {
        setToast("Some of your data could not be loaded.");
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [userId, userEmail, session?.user?.user_metadata?.full_name]);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    const loadReelItems = async () => {
      setReelsLoading(true);
      try {
        const [communityResult, incidentResult, reportResult] = await Promise.all([
          supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(50),
          supabase.from("incidents")
            .select("id, eid, type, description, lat, lng, status, media_path, media_type, media_paths, media_types, created_at")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(50),
        ]);

        if (!active) return;

        if (communityResult.error) console.error("Unable to load community posts for Reels.", communityResult.error);
        if (incidentResult.error) console.error("Unable to load emergency incidents for Reels.", incidentResult.error);
        if (reportResult.error) console.error("Unable to load legacy emergency reports for Reels.", reportResult.error);

        const [communityPosts, incidents] = await Promise.all([
          communityResult.error ? [] : resolveCommunityPosts(supabase, communityResult.data || []),
          incidentResult.error ? [] : resolveIncidentReports(supabase, incidentResult.data || []),
        ]);
        const legacyReports = reportResult.error ? [] : (reportResult.data || []).map((report) => ({
          ...report,
          media_urls: Array.isArray(report.media_urls)
            ? report.media_urls
            : report.media_urls
              ? [report.media_urls]
              : [],
        })).map((report) => ({
          ...report,
          displayMediaUrl: report.media_urls[0] || "",
          displayMediaType: report.media_urls[0]
            ? getCommunityPostMediaKind({ media_url: report.media_urls[0] })
            : "image",
        }));

        const items = [
          ...communityPosts.map((post) => ({
            ...post,
            reelKind: "community",
            reelKey: `community-${post.id}`,
          })),
          ...incidents.map((incident) => ({
            ...incident,
            reelKind: "incident",
            reelKey: `incident-${incident.id}`,
          })),
          ...legacyReports.map((report) => ({
            ...report,
            reelKind: "legacy-report",
            reelKey: `report-${report.id}`,
          })),
        ].sort((left, right) => new Date(right.created_at) - new Date(left.created_at));

        if (active) {
          setReelItems(items.slice(0, 100));
          const failedSources = [
            communityResult.error && "community posts",
            incidentResult.error && "emergency reports",
            reportResult.error && "older emergency reports",
          ].filter(Boolean);
          setReelsFeedError(failedSources.length
            ? `Some Reels content could not load: ${failedSources.join(", ")}.`
            : "");
        }
      } catch (feedError) {
        console.error("Unable to load the resident Reels feed.", feedError);
        if (active) setReelsFeedError("Reels could not load. Check your connection and refresh the page.");
      } finally {
        if (active) setReelsLoading(false);
      }
    };
    reloadReelsRef.current = loadReelItems;
    const channel = supabase.channel("resident-reels-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, loadReelItems)
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, loadReelItems)
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, loadReelItems)
      .subscribe();
    loadReelItems();
    supabase.from("community_announcements").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (active) setAnnouncements(data || []); });
    return () => {
      active = false;
      if (reloadReelsRef.current === loadReelItems) reloadReelsRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    const channel = supabase.channel("resident-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, ({ new: row }) => {
        const notification = { ...toNotification(row), read: false };
        setNotifications((current) => {
          const existing = current.find((item) => item.id === notification.id);
          return [
            existing ? { ...notification, read: existing.read } : notification,
            ...current.filter((item) => item.id !== notification.id),
          ].slice(0, 100);
        });
        if (row.event_type === "incident_status_changed") {
          fetchReports(userId).then((result) => {
            if (active) setReports(result.reports);
          }).catch((error) => console.error("Could not refresh resident reports after a notification.", error));
        }
      })
      .subscribe((status) => {
        if (active && ["CHANNEL_ERROR", "TIMED_OUT"].includes(status)) {
          setToast("Live notifications are unavailable. Refresh the page to check for updates.");
        }
      });
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || user.role !== "Admin") return;
    supabase.from("resident_messages").select("id, sender_name, sender_email, body, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setToast("Could not load resident messages. Apply the messaging database migration.");
        else setMessages(data || []);
      });
  }, [userId, user.role]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const myReports = reports.filter((r) => r.mine);
  const inProgress = myReports.filter((r) => r.status === "In Progress").length;
  const resolved = myReports.filter((r) => r.status === "Resolved").length;
  const unread = notifications.filter((n) => !n.read).length;

  const goTo = (key, { preserveMap = false } = {}) => {
    setPage(key);
    if (!preserveMap) setMapOpen(false);
    setProfileOpen(false);
    window.scrollTo(0, 0);
  };

  const handleNavClick = (key) => {
    if (key !== "reels") {
      lastReelsTapRef.current = 0;
      goTo(key);
      return;
    }

    const now = Date.now();
    const isDoubleTap = now - lastReelsTapRef.current <= 300;
    lastReelsTapRef.current = isDoubleTap ? 0 : now;
    goTo("reels", { preserveMap: true });
    if (isDoubleTap) {
      setMapLaunchOptions({ openReport: false, type: "" });
      setMapOpen((open) => !open);
    }
  };

  const openEmergencyReport = (type = "") => {
    setMapLaunchOptions({ openReport: true, type });
    setMapOpen(true);
  };

  const openIncidentMap = () => {
    setMapLaunchOptions({ openReport: false, type: "" });
    setMapOpen(true);
  };

  const closeIncidentMap = () => {
    setMapOpen(false);
    setMapLaunchOptions({ openReport: false, type: "" });
  };

  const handleIncidentSubmitted = async () => {
    const result = await fetchReports(userId);
    setReports(result.reports);
    await reloadReelsRef.current?.();
    setToast("Emergency report submitted.");
  };

  const cancelReport = async (id) => {
    const { data, error } = await supabase.from("reports").delete().eq("id", id).select();
    if (error || !data || data.length === 0) {
      setToast("Only pending reports can be cancelled.");
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== id));
    setToast("Report cancelled.");
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const body = messageBody.trim();
    if (!body || sendingMessage) return;
    setSendingMessage(true);
    const { error } = await supabase.from("resident_messages").insert({
      user_id: userId,
      sender_name: user.name,
      sender_email: userEmail || "",
      body,
    });
    setSendingMessage(false);
    if (error) {
      setToast("Could not send your message. Please try again.");
      return;
    }
    setMessageBody("");
    setToast("Your message was sent to the barangay officials.");
  };

  const markAllRead = async () => {
    const { error } = await supabase.from("notification_reads").upsert(
      notifications.map((notification) => ({ notification_id: notification.id, user_id: userId })),
      { onConflict: "notification_id,user_id" },
    );
    if (error) {
      setToast("Could not update notifications.");
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setToast("All notifications marked as read.");
  };

  const markRead = async (id) => {
    const { error } = await supabase.from("notification_reads").upsert(
      { notification_id: id, user_id: userId },
      { onConflict: "notification_id,user_id" },
    );
    if (error) {
      setToast("Could not update this notification.");
      return;
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const saveSettings = async (name) => {
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: name },
    });
    if (authError) {
      setToast("Could not save your name.");
      return;
    }

    // Keep the profile table in sync when its update policy allows it. The
    // account metadata above is the durable fallback used on the next login.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: name })
      .eq("id", userId);
    setUser((u) => ({ ...u, name }));
    setToast(profileError ? "Name saved to your account." : "Settings saved.");
  };

  // Uploads the picture to the "avatars" storage bucket (inside a folder named
  // after the user's id), then saves the public link in the profiles table.
  const saveAvatar = async (file) => {
    if (!file?.type.startsWith("image/")) { setToast("Choose an image file for your profile picture."); return false; }
    if (file.size > 10 * 1024 * 1024) { setToast("Profile pictures must be 10 MB or smaller."); return false; }
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl;

      // .select() lets us detect the case where no profile row was updated.
      const { data: updated, error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", userId)
        .select();
      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error("No profile row found for this user. Run the backfill SQL.");
      }

      setUser((current) => ({ ...current, avatarUrl }));
      setToast("Profile picture updated.");
      return true;
    } catch (err) {
      console.error("Avatar error:", err);
      setToast("Could not update your profile picture.");
      return false;
    }
  };

  const changePassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setToast(error.message || "Could not change your password.");
      return false;
    }
    setToast("Password changed.");
    return true;
  };

  const publishReel = async (event) => {
    event.preventDefault();
    if (!postFile) { setToast("Choose a photo or video first."); return; }
    setPosting(true);
    let mediaPath = "";
    let postSaved = false;
    try {
      const upload = await uploadCommunityMedia(supabase, userId, postFile);
      mediaPath = upload.path;
      const { data: signedMedia, error: signedError } = await supabase.storage
        .from("community-media")
        .createSignedUrl(mediaPath, 86400);
      if (signedError) throw signedError;
      if (!signedMedia?.signedUrl) throw new Error("The uploaded media could not be opened. Check the community-media storage policy.");
      const { data, error } = await supabase.from("community_posts").insert({
        user_id: userId,
        author_name: user.name,
        caption: postCaption.trim(),
        media_path: mediaPath,
        media_type: upload.mediaType,
      }).select().single();
      if (error) throw error;
      postSaved = true;
      setReelItems((items) => [{
        ...data,
        reelKind: "community",
        reelKey: `community-${data.id}`,
        displayMediaType: upload.mediaType,
        displayMediaUrl: signedMedia.signedUrl,
      }, ...items].slice(0, 100));
      setPostCaption(""); setPostFile(null);
      event.target.reset();
      setReelComposerOpen(false);
      setToast("Your post is live in the community feed.");
    } catch (error) {
      if (mediaPath && !postSaved) await removeCommunityMedia(supabase, mediaPath);
      console.error("Could not publish a community reel.", error);
      setToast(error.message || "Could not publish. Apply the shared Reels and notifications migration, then try again.");
    } finally { setPosting(false); }
  };

  const publishAnnouncement = async (event) => {
    event.preventDefault();
    const { data, error } = await supabase.from("community_announcements").insert({
      title: announcementTitle.trim(), body: announcementBody.trim(), author_id: userId,
    }).select().single();
    if (error) { setToast("Could not publish announcement. Admin access may be required."); return; }
    setAnnouncements((items) => [data, ...items]);
    setAnnouncementTitle(""); setAnnouncementBody("");
    setToast("Announcement published for residents.");
  };

  const copyNumber = async (number) => {
    let copied = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard permission is unavailable.");
      await navigator.clipboard.writeText(number);
      copied = true;
    } catch {
      const field = document.createElement("textarea");
      field.value = number;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.focus();
      field.select();
      try { copied = document.execCommand("copy"); }
      catch { copied = false; }
      field.remove();
    }
    setToast(copied ? `Copied ${number}` : "Could not copy. Please copy it manually.");
  };

  if (!isConfigured) return <SetupNotice detail={configError} />;
  if (!authReady) return <div className="auth-loading">Loading…</div>;
  if (!session) return <AuthScreen />;

  return (
    <div className="app">
      {/* MAIN */}
      <div className={`main ${page === "reels" ? "reels-main" : ""}`}>
        <header className="topbar">
          <div className="welcome">
            <h1>{language === "fil" ? "Maligayang pagbabalik," : "Welcome back,"} {user.name}!</h1>
            <p>{tr("Stay informed, stay safe.", language)}</p>
          </div>

          <div className="topbar-right">
            <button
              className={`bell-btn ${page === "notifications" ? "active" : ""}`}
              type="button"
              onClick={() => goTo("notifications")}
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
              title="Notifications"
            >
              <Bell size={21} />
              {unread > 0 && <i className="bell-dot" />}
            </button>
            <div className="dropdown-wrap" ref={profileRef}>
              <button
                className="profile-btn"
                onClick={() => setProfileOpen((o) => !o)}
              >
                <span className="avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <User size={20} />}</span>
                <span className="profile-text">
                  <strong>{user.name}</strong>
                  <small>{tr(user.role, language)}</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="dropdown profile-dropdown">
                  <button
                    className="dropdown-row danger"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to log out?")) {
                        setProfileOpen(false);
                        supabase.auth.signOut();
                      }
                    }}
                  >
                    <LogOut size={16} /> {tr("Log out", language)}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={`content ${page === "reels" ? "reels-content" : ""}`}>
          {page === "dashboard" && (
            <DashboardPage
              myCount={myReports.length}
              inProgress={inProgress}
              resolved={resolved}
              unread={unread}
              goTo={goTo}
              openReport={openEmergencyReport}
              openMap={openIncidentMap}
              copyNumber={copyNumber}
              language={language}
            />
          )}

          {page === "report" && (
            <section className="card">
              <h2>{tr("Report an Emergency", language)}</h2>
              <p className="muted">{tr("Choose what you would like to report.", language)}</p>
              <TypeGrid onPick={openEmergencyReport} language={language} />
            </section>
          )}

          {page === "reports" && (
            <section className="card reports-card">
              <div className="card-head">
                <div>
                  <h2>{tr("My Reports", language)}</h2>
                  <p className="muted">{myReports.length} {tr("submitted", language)}</p>
                </div>
                <button className="btn btn-maroon new-report-btn" onClick={() => goTo("report")}>{tr("New report", language)}</button>
              </div>
              <ReportTable
                rows={myReports}
                onCancel={cancelReport}
                language={language}
                empty={
                  myReports.length === 0
                    ? "You haven't submitted any reports yet. Use Report Emergency to send one."
                    : "No reports match this filter."
                }
              />
            </section>
          )}

          {page === "notifications" && (
            <section className="card">
              <h2>{tr("Notifications & Announcements", language)}</h2>
              <p className="muted">{tr("Barangay announcements and updates on your reports.", language)}</p>
              {user.role === "Admin" && <form className="announcement-form" onSubmit={publishAnnouncement}><h3>Post an announcement</h3><input value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} placeholder="Announcement title" maxLength={120} required /><textarea value={announcementBody} onChange={(e) => setAnnouncementBody(e.target.value)} placeholder="Message for residents" rows={3} maxLength={2000} required /><button className="btn btn-maroon">Publish announcement</button></form>}
              <div className="stack announcement-stack">
                {[...announcements, ...ANNOUNCEMENTS].map((a) => <article key={a.id} className="list-item"><strong><Megaphone size={16} /> {a.title}</strong><p>{a.body}</p><small>{a.date || fmtDate(a.created_at)} · Barangay announcement</small></article>)}
              </div>
              <div className="card-head notification-title"><h2>{tr("Report updates", language)}</h2><button className="btn btn-outline" onClick={markAllRead} disabled={unread === 0}>{tr("Mark all as read", language)}</button></div>
              {notifications.length === 0 && <p className="empty">{tr("You're all caught up.", language)}</p>}
              <div className="stack">
                {notifications.map((n) => (
                  <article key={n.id} className={`list-item row ${n.read ? "" : "unread"}`}>
                    <div>
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <small>{n.time}</small>
                    </div>
                    <div className="row-actions">
                      {!n.read && (
                        <button className="link-btn" onClick={() => markRead(n.id)}>{tr("Mark as read", language)}</button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {page === "messages" && (
            <section className="card message-page">
              <button className="btn btn-outline message-back-btn" onClick={() => goTo("appointments")}>{language === "fil" ? "Bumalik sa mga appointment" : "Back to appointments"}</button>
              <h2>{tr("Message Barangay Officials", language)}</h2>
              <p className="muted">{tr("Send a private message to your barangay officials.", language)}</p>
              <form className="message-form" onSubmit={sendMessage}>
                <label htmlFor="official-message">{tr("Your message", language)}</label>
                <textarea id="official-message" value={messageBody} onChange={(e) => setMessageBody(e.target.value)} rows={6} maxLength={3000} placeholder={tr("Write your message here...", language)} required />
                <div className="message-form-footer"><small>{messageBody.length}/3000</small><button className="btn btn-maroon" disabled={sendingMessage || !messageBody.trim()}>{sendingMessage ? (language === "fil" ? "Ipinapadala…" : "Sending…") : tr("Send message", language)}</button></div>
              </form>
              {user.role === "Admin" && <div className="message-inbox"><h3>{tr("Resident messages", language)}</h3>{messages.length === 0 ? <p className="empty">{tr("No messages yet.", language)}</p> : <div className="stack">{messages.map((message) => <article className="list-item" key={message.id}><strong>{message.sender_name} <span className="muted">({message.sender_email || tr("No email provided", language)})</span></strong><p>{message.body}</p><small>{fmtDate(message.created_at)}</small></article>)}</div>}</div>}
            </section>
          )}

          {page === "appointments" && (
            <section className="card appointments-page">
              <p className="empty">{tr("No appointments to show.", language)}</p>
            </section>
          )}

          {page === "tips" && (
            <section className="card">
              <h2>{tr("Safety Tips", language)}</h2>
              <div className="stack">
                {SAFETY_TIPS.map((t) => (
                  <article key={t.title} className="list-item">
                    <strong>{t.title}</strong>
                    <p>{t.tip}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {page === "contacts" && (
            <section className="card">
              <h2>{tr("Barangay Contacts", language)}</h2>
              <div className="stack">
                {CONTACTS.map((c) => (
                  <article key={c.name} className="list-item row">
                    <div>
                      <strong>{c.name}</strong>
                      <p>{c.number}</p>
                    </div>
                    <div className="row-actions">
                      <a className="btn btn-outline" href={c.tel}>
                        <Phone size={16} /> {tr("Call", language)}
                      </a>
                      <button className="btn btn-outline" onClick={() => copyNumber(c.number)}>
                        <Copy size={16} /> {tr("Copy", language)}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {page === "reels" && (
            <section className="reels-page">
              <div className="reels-toolbar">
                <div className="reels-heading">
                  <div>
                    <h2>{tr("Community Reels", language)}</h2>
                    <p className="muted">Swipe up or down for community posts and emergency reports.</p>
                  </div>
                </div>
                <div className="reels-toolbar-actions">
                  <button type="button" className="btn btn-outline reels-map-link" onClick={openIncidentMap}><MapPin size={16} /> Incident map</button>
                  <button type="button" className="btn btn-maroon reels-create-button" onClick={() => setReelComposerOpen(true)}><ImagePlus size={17} /> Post</button>
                </div>
              </div>
              <div className={`card reels-compose ${reelComposerOpen ? "reel-compose-open" : "reel-compose-hidden"}`}>
                <div className="card-head reels-heading">
                  <div>
                    <h2>Share a community post</h2>
                    <p className="muted">Choose a photo or video and add a caption.</p>
                  </div>
                  <button type="button" className="btn btn-outline reels-map-link" onClick={() => setReelComposerOpen(false)}>Close</button>
                </div>
                <form onSubmit={publishReel} className="reel-form">
                  <div className="reel-media-source-field">
                    <span>{tr("Photo or video", language)}</span>
                    <MediaSourceChooser
                      buttonLabel={postFile ? "Choose another file" : "Choose gallery or camera"}
                      galleryAccept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/3gpp"
                      onFiles={(files) => setPostFile(files[0] || null)}
                    />
                  </div>
                  <ReelUploadPreview file={postFile} onRemove={() => setPostFile(null)} />
                  <label>{tr("Caption", language)}<textarea value={postCaption} onChange={(e) => setPostCaption(e.target.value)} rows={2} maxLength={500} placeholder={tr("What's happening in your community?", language)} /></label>
                  <button className="btn btn-maroon" disabled={posting}>{posting ? (language === "fil" ? "Ina-upload…" : "Uploading…") : tr("Share with residents", language)}</button>
                </form>
                <p className="hint">Choose one photo or video up to 40 MB. Live streaming is not supported. For an active emergency, call {HOTLINE} and submit an emergency report.</p>
              </div>
              <div className="reel-feed">
                {reelsFeedError && <section className="card reel-feed-warning" role="status">{reelsFeedError}</section>}
                {reelsLoading && <section className="card empty">Loading Reels and emergency reports...</section>}
                {!reelsLoading && reelItems.length === 0 && !reelsFeedError && <section className="card empty">No community posts or emergency reports yet.</section>}
                {reelItems.map((item) => (
                  <article className={`card reel-card ${item.reelKind === "community" ? "" : "reel-report-card"}`} key={item.reelKey}>
                    <ReelPostMedia post={item} />
                    {item.reelKind === "community" ? (
                      <div className="reel-overlay">
                        <div className="reel-meta"><strong>{item.author_name || "Resident"}</strong><small>{fmtDate(item.created_at)}</small></div>
                        {item.caption && <p>{item.caption}</p>}
                      </div>
                    ) : (
                      <div className="reel-overlay reel-report-overlay">
                        <div className="reel-report-meta">
                          <span className="reel-type-label">Emergency report</span>
                          <small>{fmtDate(item.created_at)}</small>
                        </div>
                        <h3>{item.reelKind === "incident" ? incidentLabel(item.type) : item.type || "Emergency"}</h3>
                        {item.description && <p>{item.description}</p>}
                        <div className="reel-report-details">
                          {(item.eid || item.report_code) && <span>Report ID: {item.eid || item.report_code}</span>}
                          {item.status && <span>Status: {String(item.status).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</span>}
                          {item.severity && <span>Severity: {item.severity}</span>}
                          {item.location && <span>Location: {item.location}</span>}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

          {page === "profile" && (
            <SettingsPage user={user} email={userEmail} language={language} onLanguageChange={setLanguage} onSave={(name) => saveSettings(name)} onAvatarUpload={saveAvatar} onPasswordChange={changePassword} themePreference={themePreference} onThemeChange={setThemePreference} />
          )}

          <footer className="footer">© 2026 AlertBarangay. All rights reserved.</footer>
        </main>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
      {mapOpen && (
        <ReelsMapView
          userId={userId}
          onClose={closeIncidentMap}
          returnLabel={page === "reels" ? "Reels" : "Back"}
          initialReportOpen={mapLaunchOptions.openReport}
          initialReportType={mapLaunchOptions.type}
          onReportSubmitted={handleIncidentSubmitted}
        />
      )}
      <nav className="bottom-nav" aria-label="Main navigation">
        {PAGES.map(({ key, label, icon: Icon }) => <button key={key} className={`bottom-nav-item ${page === key ? "active" : ""}`} onClick={() => handleNavClick(key)} aria-label={key === "reels" ? "Reels; double-tap to toggle incident map" : label} title={key === "reels" ? "Double-tap to toggle the live incident map" : undefined} aria-current={page === key ? "page" : undefined}><span className="bottom-nav-icon"><Icon size={22} /></span><span>{tr(label, language)}</span></button>)}
      </nav>
    </div>
  );
}

/* ---------- Dashboard ---------- */

function DashboardPage({ myCount, inProgress, resolved, unread, goTo, openReport, openMap, copyNumber, language }) {
  const stats = [
    { icon: ClipboardList, value: myCount, label: tr("My Reports", language), sub: tr("View your submitted reports", language), to: "reports" },
    { icon: Clock, value: inProgress, label: tr("In Progress", language), sub: tr("Reports being reviewed", language), to: "reports" },
    { icon: CheckCircle2, value: resolved, label: tr("Resolved", language), sub: tr("Reports that were resolved", language), to: "reports" },
  ];

  return (
    <>
      <div className="stats">
        {stats.map(({ icon: Icon, value, label, sub, to }) => (
          <button key={label} className="stat-card" onClick={() => goTo(to)}>
            <span className="stat-icon"><Icon size={22} /></span>
            <span className="stat-text">
              <strong>{value}</strong>
              <b>{label}</b>
              <small>{sub}</small>
            </span>
          </button>
        ))}
      </div>

      <div
        className="live-map-preview"
        role="button"
        tabIndex={0}
        onClick={openMap}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMap();
          }
        }}
        aria-label={tr("Open live map", language)}
      >
        <iframe
          title="OpenStreetMap preview of the barangay area"
          src="https://www.openstreetmap.org/export/embed.html?bbox=123.915%2C10.285%2C123.985%2C10.345&layer=mapnik"
          loading="lazy"
          tabIndex={-1}
          aria-hidden="true"
        />
        <div className="live-map-preview-content">
          <span className="live-map-preview-icon"><Map size={22} /></span>
          <strong>{tr("Live Incident Map", language)}</strong>
          <span>{tr("Tap to view active incidents on the map.", language)}</span>
          <b>{tr("Open live map", language)} <MapPin size={15} /></b>
        </div>
        <small className="live-map-attribution">© OpenStreetMap</small>
      </div>

      <div className="grid-2">
        <section className="card">
          <h2>{tr("Report an Emergency", language)}</h2>
          <p className="muted">{tr("What would you like to report?", language)}</p>
          <TypeGrid onPick={openReport} language={language} />
        </section>

        <div className="side-col">
          <section className="card">
            <h2>{tr("Emergency Hotline", language)}</h2>
            <p className="muted">{tr("Need immediate assistance?", language)}</p>
            <div className="emergency-contact-box">
              <div className="who-to-call-heading">
                <h3><Phone size={17} /> {language === "fil" ? "Sino ang tatawagan" : "Who to call"}</h3>
              </div>
              <div className="contact-grid">
                {CONTACTS.map((contact) => (
                  <article className="contact-card" key={contact.name}>
                    <strong>{contact.name}</strong>
                    <p>{contact.number}</p>
                    <div className="contact-actions">
                      <a className="btn btn-outline" href={contact.tel} aria-label={`Call ${contact.name}`}>
                        <Phone size={15} /> {tr("Call", language)}
                      </a>
                      <button className="btn btn-outline" type="button" onClick={() => copyNumber(contact.number)} aria-label={`Copy ${contact.name} number`}>
                        <Copy size={15} /> {tr("Copy", language)}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <p className="available">{tr("Available 24/7", language)}</p>
          </section>
        </div>
      </div>

    </>
  );
}

function TypeGrid({ onPick, language = "en" }) {
  return (
    <div className="type-grid">
      {EMERGENCY_TYPES.map(({ key, incidentType, icon: Icon }) => (
        <button key={key} className={`type-tile type-${key.toLowerCase().replace(/\s+/g, "-")}`} onClick={() => onPick(incidentType)}>
          <span className="type-icon"><Icon size={34} strokeWidth={2.2} /></span>
          <span>{tr(key, language)}</span>
        </button>
      ))}
    </div>
  );
}

function ReportTable({ rows, onCancel, empty, language = "en" }) {
  const [openId, setOpenId] = useState(null);
  const detailed = Boolean(onCancel);
  if (rows.length === 0) return <p className="empty">{tr(empty, language)}</p>;
  return (
    <div className="table-wrap">
      <table className={detailed ? "reports-table" : undefined}>
        <thead>
          <tr>
            <th>{tr("Type", language)}</th><th>{tr("Location", language)}</th><th>{tr("Severity", language)}</th><th>{tr("Status", language)}</th><th>{tr("Reported At", language)}</th>
            {detailed && <th></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const Icon = iconFor(r.type);
            const open = openId === r.id;
            return (
              <Fragment key={r.id}>
                <tr>
                  <td><span className="type-cell"><span className="report-type-icon"><Icon size={15} /></span><strong>{tr(r.type, language)}</strong></span></td>
                  <td>{r.location}</td>
                  <td>{r.severity ? <span className={`pill sev-${r.severity.toLowerCase()}`}>{tr(r.severity, language)}</span> : "—"}</td>
                  <td><span className={`pill st-${r.status.replace(" ", "").toLowerCase()}`}>{tr(r.status, language)}</span></td>
                  <td className="reported-at">{(() => { const parts = r.date.match(/^(.*), (\d{1,2}:\d{2} [AP]M)$/); return parts ? <><span>{parts[1]}</span><small>{parts[2]}</small></> : r.date; })()}</td>
                  {detailed && (
                    <td className="row-actions">
                      <button className="btn btn-outline report-details-btn" onClick={() => setOpenId(open ? null : r.id)}>
                        {open ? tr("Hide details", language) : tr("Details", language)}
                      </button>
                      {r.source !== "incident" && r.status === "Pending" && (
                        <button className="link-btn danger" onClick={() => onCancel(r.id)}>{tr("Cancel", language)}</button>
                      )}
                    </td>
                  )}
                </tr>
                {detailed && open && (
                  <tr className="detail-row">
                    <td colSpan={6}>
                      <p><strong>{tr("What happened:", language)}</strong> {r.description || tr("No description provided.", language)}</p>
                      <ReportMedia urls={r.media} />
                      <p className="history-title"><strong>Status history</strong></p>
                      <ul className="history-list">
                        {r.history.map((h, i) => (
                          <li key={i}>
                            <span className={`pill st-${h.status.replace(" ", "").toLowerCase()}`}>{h.status}</span> {h.date}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Settings ---------- */

function SettingsPage({ user, email, language, onLanguageChange, onSave, onAvatarUpload, onPasswordChange, themePreference, onThemeChange }) {
  const [name, setName] = useState(user.name);
  const [section, setSection] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => setName(user.name), [user.name]);

  return (
    <section className="profile-page">
      <h2 className="profile-page-title">{tr("Profile", language)}</h2>
      <div className="profile-identity card">
        <span className="profile-photo">{user.avatarUrl ? <img src={user.avatarUrl} alt={`${user.name}'s profile`} /> : <User size={32} />}</span>
        <div><strong>{user.name}</strong><p>{email}</p></div>
      </div>
      <ProfileGroup title={tr("Account", language)}>
        <ProfileRow icon={User} label={tr("Manage Profile", language)} active={section === "manage"} onClick={() => setSection(section === "manage" ? "" : "manage")} />
        {section === "manage" && <form className="profile-detail manage-profile-form" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); }}>
          <label>{tr("Name", language)}<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
          <div className="photo-upload"><ImagePlus size={18} /> <span>{tr("Choose profile picture", language)}</span>
            <MediaSourceChooser buttonLabel={avatarFile ? "Choose another picture" : "Choose gallery or camera"} galleryAccept="image/*" allowVideos={false} onFiles={(files) => setAvatarFile(files[0] || null)} />
            {avatarFile && <small>{avatarFile.name}</small>}
          </div>
          <div className="profile-form-actions"><button className="btn btn-outline" type="submit">{tr("Save name", language)}</button><button className="btn btn-maroon" type="button" disabled={!avatarFile || avatarBusy} onClick={async () => { setAvatarBusy(true); const ok = await onAvatarUpload(avatarFile); if (ok) setAvatarFile(null); setAvatarBusy(false); }}>{avatarBusy ? tr("Uploading…", language) : tr("Upload picture", language)}</button></div>
        </form>}
        <ProfileRow icon={LockKeyhole} label={tr("Password & Security", language)} active={section === "security"} onClick={() => setSection(section === "security" ? "" : "security")} />
        {section === "security" && <form className="profile-detail" onSubmit={async (e) => { e.preventDefault(); setPasswordError(""); if (password.length < 6) { setPasswordError("Use at least 6 characters."); return; } if (password !== confirmPassword) { setPasswordError("Passwords do not match."); return; } if (await onPasswordChange(password)) { setPassword(""); setConfirmPassword(""); } }}>
          <label>{tr("New password", language)}<input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <label>{tr("Confirm new password", language)}<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label>
          {passwordError && <p className="form-error">{passwordError}</p>}
          <button type="submit" className="btn btn-maroon">{tr("Update password", language)}</button>
        </form>}
        <ProfileRow icon={Languages} label={tr("Language", language)} detail={language === "fil" ? "Filipino" : "English"} active={section === "language"} onClick={() => setSection(section === "language" ? "" : "language")} />
        {section === "language" && <div className="profile-detail language-options"><p className="theme-description">{tr("Choose your language.", language)}</p><div className="theme-options" role="group" aria-label={tr("Language", language)}>{[["en", "English"], ["fil", "Filipino"]].map(([value, label]) => <button key={value} type="button" className={`theme-option ${language === value ? "selected" : ""}`} aria-pressed={language === value} onClick={() => onLanguageChange(value)}>{label}</button>)}</div></div>}
      </ProfileGroup>

      <ProfileGroup title={tr("Preferences", language)}>
        <ProfileRow icon={Sun} label={tr("Theme", language)} detail={tr(themePreference === "system" ? "System" : themePreference === "dark" ? "Dark" : "Light", language)} active={section === "theme"} onClick={() => setSection(section === "theme" ? "" : "theme")} />
        {section === "theme" && <div className="profile-detail"><p className="theme-description">{tr("Choose how AlertBarangay looks on this device.", language)}</p><div className="theme-options" role="group" aria-label={tr("Theme", language)}>{[["light", "Light"], ["dark", "Dark"], ["system", "System auto"]].map(([value, label]) => <button key={value} type="button" className={`theme-option ${themePreference === value ? "selected" : ""}`} aria-pressed={themePreference === value} onClick={() => onThemeChange(value)}>{tr(label, language)}</button>)}</div></div>}
      </ProfileGroup>

      <ProfileGroup title={tr("Support", language)}>
        <ProfileRow icon={Info} label={tr("About AlertBarangay", language)} active={section === "about"} onClick={() => setSection(section === "about" ? "" : "about")} />
        {section === "about" && <p className="profile-detail">AlertBarangay is a community-centered platform built to bring residents and local authorities closer together when it matters most. Residents can instantly report emergencies such as fires, accidents, medical incidents, floods, and crimes, and their reports go directly to barangay officials so help can be coordinated quickly and efficiently. After submitting a report, you can follow its status in real time, from the moment it is received until it has been acted on, so you are always informed and the process stays open and accountable. You can also attach photos and videos to your reports and share them with the community, helping officials understand the situation better and keeping neighbors aware of what is happening around them. Designed to be simple and easy to use for everyone, whether you are a student, a parent, a senior citizen, or a barangay official, AlertBarangay aims to strengthen communication, speed up response times, and build a safer, more connected community for all.</p>}
        <ProfileRow icon={CircleHelp} label={tr("Help Center", language)} active={section === "help"} onClick={() => setSection(section === "help" ? "" : "help")} />
        {section === "help" && <p className="profile-detail">{language === "fil" ? <>Para sa agarang emergency, tumawag sa <a href={HOTLINE_TEL}>{HOTLINE}</a>. Maaari kang magsumite ng ulat mula sa Tahanan at tingnan ang status nito sa Mga Abiso.</> : <>For urgent emergencies, call <a href={HOTLINE_TEL}>{HOTLINE}</a>. You can submit a report from Home and check its status in Notifications.</>}</p>}
      </ProfileGroup>
    </section>
  );
}

function ProfileGroup({ title, children }) {
  return <section className="profile-group"><h3>{title}</h3><div className="profile-group-card">{children}</div></section>;
}

function ProfileRow({ icon: Icon, label, detail, active, onClick }) {
  return <button type="button" className={`profile-row ${active ? "active" : ""}`} onClick={onClick}><Icon size={20} /><span>{label}</span>{detail && <small>{detail}</small>}<ChevronDown size={16} /></button>;
}

/* ---------- Get started / Sign up / Log in ---------- */

function AuthScreen() {
  const [screen, setScreen] = useState("welcome"); // welcome | login | signup
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isSignup = screen === "signup";

  const goScreen = (next) => {
    setScreen(next);
    setError("");
    setNotice("");
    setShowPw(false);
  };

  const friendly = (message = "") => {
    const m = message.toLowerCase();
    if (m.includes("invalid login")) return "Wrong email or password.";
    if (m.includes("already registered")) return "That email already has an account. Try logging in.";
    if (m.includes("not confirmed")) return "Please confirm your email first. Check your inbox.";
    if (m.includes("rate limit")) return "Too many attempts. Please wait a few minutes and try again.";
    if (m.includes("password")) return message;
    return "Something went wrong. Please try again.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (isSignup) {
      if (fullName.trim().length < 2) {
        setError("Enter your full name.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
    }

    setBusy(true);
    if (isSignup) {
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      setBusy(false);
      if (err) {
        setError(friendly(err.message));
        return;
      }
      if (!data.session) {
        // Email confirmation is turned on in Supabase
        setScreen("login");
        setPassword("");
        setConfirm("");
        setNotice("Account created. Check your email to confirm it, then log in.");
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setBusy(false);
      if (err) setError(friendly(err.message));
    }
  };

  /* Screen 1: Get Started */
  if (screen === "welcome") {
    return (
      <div className="auth">
        <div className="auth-phone">
          <div className="welcome-top">
            <div className="welcome-logo"><Shield size={44} /></div>
            <p className="welcome-brand">AlertBarangay</p>
            <h1>Get Started</h1>
            <p className="welcome-sub">Start with sign up or sign in</p>
            <div className="welcome-actions">
              <button type="button" className="pill-btn" onClick={() => goScreen("signup")}>
                Sign up
              </button>
              <button type="button" className="pill-btn" onClick={() => goScreen("login")}>
                Sign in
              </button>
            </div>
          </div>

          <div className="welcome-waves">
            <svg className="waves" viewBox="0 0 400 210" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0 80 C 70 10, 140 30, 200 80 S 330 150, 400 50 L400 210 L0 210 Z" fill="#7a1f38" opacity="0.3" />
              <path d="M0 125 C 90 60, 160 105, 225 135 S 340 170, 400 105 L400 210 L0 210 Z" fill="#7a1f38" opacity="0.55" />
              <path d="M0 165 C 100 125, 180 158, 260 172 S 360 190, 400 158 L400 210 L0 210 Z" fill="#5a0f24" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  /* Screens 2 and 3: Create account / Welcome back */
  return (
    <div className="auth">
      <div className="auth-phone">
        <div className="form-head">
          <button type="button" className="back-btn" onClick={() => goScreen("welcome")} aria-label="Back">
            <ArrowLeft size={22} />
          </button>
          <div className="form-logo"><Shield size={24} /></div>
          <h1>{isSignup ? "Create Your Account" : "Hello Welcome Back!"}</h1>
        </div>

        <form className="form-panel" onSubmit={handleSubmit}>
          {isSignup && (
            <label className="line-field">
              <span>Full name</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                placeholder="Juan Dela Cruz"
              />
            </label>
          )}

          <label className="line-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="line-field">
            <span>Password</span>
            <span className="pw-wrap">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {isSignup && (
            <label className="line-field">
              <span>Confirm password</span>
              <span className="pw-wrap">
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </span>
            </label>
          )}

          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}

          <button type="submit" className="pill-btn pill-light" disabled={busy}>
            {busy ? "Please wait…" : isSignup ? "Sign up" : "Sign in"}
          </button>

          <p className="form-switch">
            {isSignup ? "Already have an account?" : "Don't have an account?"}
            <button
              type="button"
              className="link-btn"
              onClick={() => goScreen(isSignup ? "login" : "signup")}
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

/* ---------- Shown instead of a blank page when the .env.local keys are missing ---------- */

function SetupNotice({ detail }) {
  return (
    <div className="auth-loading">
      <div className="auth-card">
        <h2>Supabase is not connected yet</h2>
        <p>The app could not use your Supabase keys.</p>
        {detail && <p className="form-error">Details: {detail}</p>}
        <p>Check these three things:</p>
        <ol className="setup-list">
          <li>
            Save <code>.env.local</code> (press <code>Ctrl+S</code>). It sits in the project root,
            next to <code>package.json</code>.
          </li>
          <li>
            It has exactly these two lines, with no quotes and no spaces around the equals sign:
            <pre>{`VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key`}</pre>
          </li>
          <li>
            Stop the dev server with <code>Ctrl+C</code> and run <code>npm run dev</code> again.
          </li>
        </ol>
      </div>
    </div>
  );
}
