import { useState, useEffect, useRef, Fragment } from "react";
import {
  Home, PlusCircle, FileText, Megaphone, Bell, ShieldCheck, Phone, Settings,
  Flame, Waves, Car, Zap, Trash2, MapPin, Droplets, ClipboardList, Clock,
  CheckCircle2, ChevronDown, Menu, X, LogOut, User, Shield, Copy,
} from "lucide-react";
import { supabase, isConfigured, configError } from "./supabaseClient";
import "./App.css";

const HOTLINE = "(02) 8123-4567";
const HOTLINE_TEL = "tel:0281234567";

const EMERGENCY_TYPES = [
  { key: "Fire", icon: Flame, color: "#c0392b" },
  { key: "Flood", icon: Waves, color: "#1f7a99" },
  { key: "Accident", icon: Car, color: "#b03a2e" },
  { key: "Electrical Hazard", icon: Zap, color: "#c9a227" },
  { key: "Garbage Collection", icon: Trash2, color: "#5a0f24" },
  { key: "Road Damage", icon: MapPin, color: "#5a0f24" },
  { key: "Water Problems", icon: Droplets, color: "#1f7a99" },
];

const iconFor = (type) =>
  (EMERGENCY_TYPES.find((t) => t.key === type) || EMERGENCY_TYPES[0]).icon;

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
  { name: "Barangay Emergency Hotline", number: HOTLINE },
  { name: "Barangay Hall", number: "(02) 8123-1000" },
  { name: "Fire Station", number: "(02) 8123-2000" },
  { name: "Police Station", number: "(02) 8123-3000" },
  { name: "Health Center", number: "(02) 8123-4000" },
];

const PAGES = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "report", label: "Report Emergency", icon: PlusCircle },
  { key: "reports", label: "My Reports", icon: FileText },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "tips", label: "Safety Tips", icon: ShieldCheck },
  { key: "contacts", label: "Barangay Contacts", icon: Phone },
  { key: "settings", label: "Settings", icon: Settings },
];

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
  status: row.status,
  date: fmtDate(row.created_at),
  mine: row.user_id === userId,
  history: (row.report_history || [])
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((h) => ({ status: h.status, date: fmtDate(h.created_at) })),
});

const toNotification = (row) => ({
  id: row.id,
  text: row.message,
  time: fmtDate(row.created_at),
  read: row.read,
});

async function fetchReports(userId) {
  const { data, error } = await supabase
    .from("reports")
    .select("*, report_history(status, created_at)")
    .order("created_at", { ascending: false });
  return { error, reports: (data || []).map((r) => toReport(r, userId)) };
}

async function fetchNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });
  return { error, notifications: (data || []).map(toNotification) };
}

async function fetchProfile(userId) {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
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

/* ---------- App ---------- */

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState({ name: "Resident", role: "Resident" });
  const [modalType, setModalType] = useState(null);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const bellRef = useRef(null);
  const profileRef = useRef(null);
  useClickOutside(bellRef, () => setBellOpen(false));
  useClickOutside(profileRef, () => setProfileOpen(false));

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

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
        fetchNotifications(),
      ]);
      if (cancelled) return;
      setUser({
        name: profile?.full_name || userEmail || "Resident",
        role: profile?.role === "admin" ? "Admin" : "Resident",
      });
      setReports(reportResult.reports);
      setNotifications(notificationResult.notifications);
      if (reportResult.error || notificationResult.error) {
        setToast("Some of your data could not be loaded.");
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [userId, userEmail]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const myReports = reports.filter((r) => r.mine);
  const inProgress = myReports.filter((r) => r.status === "In Progress").length;
  const resolved = myReports.filter((r) => r.status === "Resolved").length;
  const unread = notifications.filter((n) => !n.read).length;

  const goTo = (key) => {
    setPage(key);
    setSidebarOpen(false);
    setBellOpen(false);
    setProfileOpen(false);
    window.scrollTo(0, 0);
  };

  // Returns an error message (shown in the form) or null when it worked.
  const submitReport = async ({ type, location, severity, description }) => {
    const { error } = await supabase
      .from("reports")
      .insert({ type, location, severity, description });
    if (error) return "Could not submit your report. Please try again.";

    await supabase
      .from("notifications")
      .insert({ message: `Your ${type} report in ${location} was submitted.` });

    const [reportResult, notificationResult] = await Promise.all([
      fetchReports(userId),
      fetchNotifications(),
    ]);
    setReports(reportResult.reports);
    setNotifications(notificationResult.notifications);
    setModalType(null);
    setToast(`${type} report submitted.`);
    return null;
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

  const markAllRead = async () => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
    if (error) {
      setToast("Could not update notifications.");
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setToast("All notifications marked as read.");
  };

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  };

  const deleteNotification = async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  const saveSettings = async (name) => {
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
    if (error) {
      setToast("Could not save your name.");
      return;
    }
    setUser((u) => ({ ...u, name }));
    setToast("Settings saved.");
  };

  const copyNumber = async (number) => {
    try {
      await navigator.clipboard.writeText(number);
      setToast(`Copied ${number}`);
    } catch {
      setToast("Could not copy. Please copy it manually.");
    }
  };

  if (!isConfigured) return <SetupNotice detail={configError} />;
  if (!authReady) return <div className="auth-loading">Loading…</div>;
  if (!session) return <AuthScreen />;

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-logo"><Shield size={26} /></div>
          <div>
            <strong>AlertBarangay</strong>
            <small>Safer Community, Together</small>
          </div>
          <button className="icon-btn sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav>
          {PAGES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`nav-item ${page === key ? "active" : ""}`}
              onClick={() => goTo(key)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {key === "notifications" && unread > 0 && <span className="badge">{unread}</span>}
            </button>
          ))}
        </nav>

        <div className="emergency-box">
          <strong>In Case of Emergency</strong>
          <small>Call Barangay Hotline</small>
          <a href={HOTLINE_TEL}><Phone size={16} /> {HOTLINE}</a>
        </div>
      </aside>
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN */}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="welcome">
            <h1>Welcome back, {user.name}! 👋</h1>
            <p>Let's keep our barangay safe and prepared.</p>
          </div>

          <div className="topbar-right">
            <div className="dropdown-wrap" ref={bellRef}>
              <button
                className="bell-btn"
                onClick={() => { setBellOpen((o) => !o); setProfileOpen(false); }}
                aria-label="Notifications"
              >
                <Bell size={20} />
                {unread > 0 && <span className="bell-dot" />}
              </button>
              {bellOpen && (
                <div className="dropdown notif-dropdown">
                  <div className="dropdown-head">
                    <strong>Notifications</strong>
                    <button className="link-btn" onClick={markAllRead} disabled={unread === 0}>
                      Mark all as read
                    </button>
                  </div>
                  {notifications.length === 0 && <p className="empty">You're all caught up.</p>}
                  {notifications.slice(0, 4).map((n) => (
                    <button
                      key={n.id}
                      className={`notif-item ${n.read ? "" : "unread"}`}
                      onClick={() => markRead(n.id)}
                    >
                      <span>{n.text}</span>
                      <small>{n.time}</small>
                    </button>
                  ))}
                  <button className="link-btn dropdown-foot" onClick={() => goTo("notifications")}>
                    See all notifications
                  </button>
                </div>
              )}
            </div>

            <div className="dropdown-wrap" ref={profileRef}>
              <button
                className="profile-btn"
                onClick={() => { setProfileOpen((o) => !o); setBellOpen(false); }}
              >
                <span className="avatar"><User size={20} /></span>
                <span className="profile-text">
                  <strong>{user.name}</strong>
                  <small>{user.role}</small>
                </span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="dropdown profile-dropdown">
                  <button className="dropdown-row" onClick={() => goTo("settings")}>
                    <Settings size={16} /> Settings
                  </button>
                  <button className="dropdown-row" onClick={() => goTo("reports")}>
                    <FileText size={16} /> My Reports
                  </button>
                  <button
                    className="dropdown-row danger"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to log out?")) {
                        setProfileOpen(false);
                        supabase.auth.signOut();
                      }
                    }}
                  >
                    <LogOut size={16} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          {page === "dashboard" && (
            <DashboardPage
              reports={myReports}
              myCount={myReports.length}
              inProgress={inProgress}
              resolved={resolved}
              unread={unread}
              goTo={goTo}
              openReport={setModalType}
            />
          )}

          {page === "report" && (
            <section className="card">
              <h2>Report an Emergency</h2>
              <p className="muted">Choose what you would like to report.</p>
              <TypeGrid onPick={setModalType} />
            </section>
          )}

          {page === "reports" && (
            <section className="card">
              <div className="card-head">
                <div>
                  <h2>My Reports</h2>
                  <p className="muted">{myReports.length} submitted</p>
                </div>
                <div className="filters">
                  {["All", "Pending", "In Progress", "Resolved"].map((s) => (
                    <button
                      key={s}
                      className={`chip ${statusFilter === s ? "active" : ""}`}
                      onClick={() => setStatusFilter(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <ReportTable
                rows={myReports.filter((r) => statusFilter === "All" || r.status === statusFilter)}
                onCancel={cancelReport}
                empty={
                  myReports.length === 0
                    ? "You haven't submitted any reports yet. Use Report Emergency to send one."
                    : "No reports match this filter."
                }
              />
            </section>
          )}

          {page === "announcements" && (
            <section className="card">
              <h2>Announcements</h2>
              <div className="stack">
                {ANNOUNCEMENTS.map((a) => (
                  <article key={a.id} className="list-item">
                    <strong>{a.title}</strong>
                    <p>{a.body}</p>
                    <small>{a.date}</small>
                  </article>
                ))}
              </div>
            </section>
          )}

          {page === "notifications" && (
            <section className="card">
              <div className="card-head">
                <h2>Notifications</h2>
                <button className="btn btn-outline" onClick={markAllRead} disabled={unread === 0}>
                  Mark all as read
                </button>
              </div>
              {notifications.length === 0 && <p className="empty">You're all caught up.</p>}
              <div className="stack">
                {notifications.map((n) => (
                  <article key={n.id} className={`list-item row ${n.read ? "" : "unread"}`}>
                    <div>
                      <p>{n.text}</p>
                      <small>{n.time}</small>
                    </div>
                    <div className="row-actions">
                      {!n.read && (
                        <button className="link-btn" onClick={() => markRead(n.id)}>Mark as read</button>
                      )}
                      <button className="link-btn danger" onClick={() => deleteNotification(n.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {page === "tips" && (
            <section className="card">
              <h2>Safety Tips</h2>
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
              <h2>Barangay Contacts</h2>
              <div className="stack">
                {CONTACTS.map((c) => (
                  <article key={c.name} className="list-item row">
                    <div>
                      <strong>{c.name}</strong>
                      <p>{c.number}</p>
                    </div>
                    <div className="row-actions">
                      <a className="btn btn-outline" href={`tel:${c.number.replace(/[^\d+]/g, "")}`}>
                        <Phone size={16} /> Call
                      </a>
                      <button className="btn btn-outline" onClick={() => copyNumber(c.number)}>
                        <Copy size={16} /> Copy
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {page === "settings" && (
            <SettingsPage user={user} onSave={(name) => saveSettings(name)} />
          )}

          <footer className="footer">© 2025 AlertBarangay. All rights reserved.</footer>
        </main>
      </div>

      {modalType && (
        <ReportModal type={modalType} onClose={() => setModalType(null)} onSubmit={submitReport} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

/* ---------- Dashboard ---------- */

function DashboardPage({ reports, myCount, inProgress, resolved, unread, goTo, openReport }) {
  const stats = [
    { icon: ClipboardList, value: myCount, label: "My Reports", sub: "View your submitted reports", to: "reports" },
    { icon: Clock, value: inProgress, label: "In Progress", sub: "Reports being reviewed", to: "reports" },
    { icon: CheckCircle2, value: resolved, label: "Resolved", sub: "Reports that were resolved", to: "reports" },
    { icon: Bell, value: unread, label: "Notifications", sub: "Unread notifications", to: "notifications" },
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

      <div className="grid-2">
        <section className="card">
          <h2>Report an Emergency</h2>
          <p className="muted">What would you like to report?</p>
          <TypeGrid onPick={openReport} />
        </section>

        <div className="side-col">
          <section className="card">
            <h2>Emergency Hotline</h2>
            <p className="muted">Need immediate assistance?</p>
            <a className="hotline" href={HOTLINE_TEL}>
              <Phone size={24} />
              <span>
                <strong>{HOTLINE}</strong>
                <small>Barangay Emergency Hotline</small>
              </span>
            </a>
            <p className="available">Available 24/7</p>
          </section>

          <section className="card">
            <h2><ShieldCheck size={18} /> Safety Reminder</h2>
            <ul className="reminder">
              <li>Stay alert and aware of your surroundings.</li>
              <li>Report emergencies immediately.</li>
              <li>Let's work together for a safer barangay.</li>
            </ul>
            <p className="motto">“Bayanihan at Malasakit,<br />Kaligtasan ay Makakamtan.”</p>
          </section>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Your Recent Reports</h2>
          <button className="link-btn" onClick={() => goTo("reports")}>View All</button>
        </div>
        <ReportTable rows={reports.slice(0, 3)} empty="You haven't submitted any reports yet." />
      </section>
    </>
  );
}

function TypeGrid({ onPick }) {
  return (
    <div className="type-grid">
      {EMERGENCY_TYPES.map(({ key, icon: Icon, color }) => (
        <button key={key} className="type-tile" onClick={() => onPick(key)}>
          <Icon size={30} color={color} />
          <span>{key}</span>
        </button>
      ))}
    </div>
  );
}

function ReportTable({ rows, onCancel, empty }) {
  const [openId, setOpenId] = useState(null);
  const detailed = Boolean(onCancel);
  if (rows.length === 0) return <p className="empty">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Type</th><th>Location</th><th>Severity</th><th>Status</th><th>Reported At</th>
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
                  <td><span className="type-cell"><Icon size={16} /> {r.type}</span></td>
                  <td>{r.location}</td>
                  <td><span className={`pill sev-${r.severity.toLowerCase()}`}>{r.severity}</span></td>
                  <td><span className={`pill st-${r.status.replace(" ", "").toLowerCase()}`}>{r.status}</span></td>
                  <td>{r.date}</td>
                  {detailed && (
                    <td className="row-actions">
                      <button className="link-btn" onClick={() => setOpenId(open ? null : r.id)}>
                        {open ? "Hide details" : "Details"}
                      </button>
                      {r.status === "Pending" && (
                        <button className="link-btn danger" onClick={() => onCancel(r.id)}>Cancel</button>
                      )}
                    </td>
                  )}
                </tr>
                {detailed && open && (
                  <tr className="detail-row">
                    <td colSpan={6}>
                      <p><strong>What happened:</strong> {r.description || "No description provided."}</p>
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

/* ---------- Report modal ---------- */

function ReportModal({ type, onClose, onSubmit }) {
  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fillCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Your browser does not support location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setError("");
      },
      () => setError("Could not get your location. Please type it in.")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location.trim()) {
      setError("Enter the location of the incident.");
      return;
    }
    if (description.trim().length < 5) {
      setError("Add a short description (at least 5 characters).");
      return;
    }
    setError("");
    setSubmitting(true);
    const problem = await onSubmit({
      type,
      location: location.trim(),
      severity,
      description: description.trim(),
    });
    if (problem) {
      setError(problem);
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="card-head">
          <h2>Report: {type}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <label>
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Zone 4, near the basketball court"
            autoFocus
          />
        </label>
        <button type="button" className="link-btn" onClick={fillCurrentLocation}>
          <MapPin size={14} /> Use my current location
        </button>

        <label>
          Severity
          <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </label>

        <label>
          What happened?
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the situation"
          />
        </label>

        {error && <p className="form-error">{error}</p>}
        {severity === "High" && (
          <p className="hint">For life-threatening emergencies, also call {HOTLINE}.</p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-maroon" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Settings ---------- */

function SettingsPage({ user, onSave }) {
  const [name, setName] = useState(user.name);
  const [push, setPush] = useState(true);
  const [sms, setSms] = useState(false);

  return (
    <section className="card">
      <h2>Settings</h2>
      <form
        className="settings-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave(name.trim());
        }}
      >
        <label>
          Full name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="toggle">
          <input type="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} />
          Push notifications
        </label>
        <label className="toggle">
          <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />
          SMS alerts
        </label>
        <button type="submit" className="btn btn-maroon">Save changes</button>
      </form>
    </section>
  );
}

/* ---------- Sign up / Log in ---------- */

function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isSignup = mode === "signup";

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setNotice("");
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
        setMode("login");
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

  return (
    <div className="auth">
      <div className="auth-side">
        <div className="brand-logo"><Shield size={30} /></div>
        <h1>AlertBarangay</h1>
        <p>Report problems in your barangay and follow every update, all in one place.</p>
        <p className="motto-light">“Bayanihan at Malasakit, Kaligtasan ay Makakamtan.”</p>
      </div>

      <div className="auth-main">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className={!isSignup ? "active" : ""}
              onClick={() => switchMode("login")}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={isSignup ? "active" : ""}
              onClick={() => switchMode("signup")}
            >
              Sign up
            </button>
          </div>

          <h2>{isSignup ? "Create your resident account" : "Welcome back"}</h2>

          {isSignup && (
            <label>
              Full name
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                placeholder="Juan Dela Cruz"
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
            />
          </label>

          {isSignup && (
            <label>
              Confirm password
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {error && <p className="form-error">{error}</p>}
          {notice && <p className="form-notice">{notice}</p>}

          <button type="submit" className="btn btn-maroon" disabled={busy}>
            {busy ? "Please wait…" : isSignup ? "Create account" : "Log in"}
          </button>

          <p className="auth-switch">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="link-btn"
              onClick={() => switchMode(isSignup ? "login" : "signup")}
            >
              {isSignup ? "Log in" : "Create an account"}
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
