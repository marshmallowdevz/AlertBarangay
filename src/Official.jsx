import { useEffect, useState } from 'react';
import './Official.css';
import { configError, isConfigured } from './supabaseClient';
import { initialConversations, initialReports, initialResidents } from './dashboardData';

const iconMap = {
  overview: '◔',
  reports: '⚠',
  dispatch: '🚨',
  residents: '👥',
  messages: '💬',
  alert: '⚠',
  check: '✓',
  shield: '🛡',
  clock: '⏱',
  bell: '🔔',
  menu: '☰',
  search: '⌕',
  chevron: '▾',
  dot: '◉',
  settings: '⚙',
  logout: '↩',
  phone: '☎',
  plus: '+',
  flame: '🔥',
  location: '📍',
  calendar: '🗓',
  activity: '▣',
  x: '✕',
};

const renderIcon = (name, size = 18) => (
  <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    {iconMap[name] ?? '•'}
  </span>
);

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'overview', badge: null },
  { id: 'reports', label: 'Reports', icon: 'reports', badge: '12' },
  { id: 'dispatch', label: 'Dispatch', icon: 'dispatch', badge: '4' },
  { id: 'residents', label: 'Residents', icon: 'residents', badge: null },
  { id: 'messages', label: 'Messages', icon: 'messages', badge: '3' },
];

const stats = [
  { label: 'Open incidents', value: '24', change: '+4 today', tone: 'maroon', icon: 'alert' },
  { label: 'Resolved', value: '18', change: '92% SLA', tone: 'gold', icon: 'check' },
];

const serviceTypes = [
  { label: 'Medical', icon: 'shield' },
  { label: 'Fire', icon: 'flame' },
  { label: 'Rescue', icon: 'dispatch' },
  { label: 'Evacuation', icon: 'location' },
];

const actions = [
  'Reconfirm family contact list for all priority households.',
  'Verify backup generators and radio check with purok captains.',
  'Review weekend weather advisory and flood-prone routes.',
];

const notifications = [
  { title: 'Medical team dispatched to Barangay Hall', detail: 'Volunteer responders are en route. ETA 4 minutes.', time: '2 min ago', unread: true },
  { title: 'Weather advisory updated', detail: 'Heavy rain warning remains active until 11:00 PM.', time: '18 min ago', unread: false },
  { title: 'Resident report escalated', detail: 'Two households requested immediate welfare follow-up.', time: '1 hour ago', unread: false },
];

const dashboardStorageKey = 'alertBarangay.dashboard';

function readDashboardData() {
  const defaults = {
    profile: { name: 'Captain Dela Cruz', picture: '' },
    announcements: [],
    error: '',
  };

  try {
    const savedData = JSON.parse(window.localStorage.getItem(dashboardStorageKey) || '{}') || {};
    return {
      profile: {
        name: typeof savedData.profile?.name === 'string' ? savedData.profile.name : defaults.profile.name,
        picture: typeof savedData.profile?.picture === 'string' ? savedData.profile.picture : '',
      },
      announcements: Array.isArray(savedData.announcements) ? savedData.announcements : [],
      error: '',
    };
  } catch (error) {
    console.error('Unable to load saved dashboard data.', error);
    return { ...defaults, error: 'Saved dashboard data could not be loaded from this browser.' };
  }
}

function Official() {
  const [activeNav, setActiveNav] = useState('overview');
  const [operationalData] = useState({
    reports: initialReports,
    residents: initialResidents,
    conversations: initialConversations,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [initialData] = useState(readDashboardData);
  const [profile, setProfile] = useState(initialData.profile);
  const [announcements, setAnnouncements] = useState(initialData.announcements);
  const [storageError, setStorageError] = useState(initialData.error);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState(initialData.profile.name);
  const [profilePictureDraft, setProfilePictureDraft] = useState(initialData.profile.picture);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [formError, setFormError] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const saveDashboardData = (nextProfile, nextAnnouncements) => {
    try {
      window.localStorage.setItem(dashboardStorageKey, JSON.stringify({
        profile: nextProfile,
        announcements: nextAnnouncements,
      }));
      setStorageError('');
      return true;
    } catch (error) {
      console.error('Unable to save dashboard data.', error);
      setStorageError('Changes could not be saved in this browser. Check available storage and try again.');
      return false;
    }
  };

  const openProfileEditor = () => {
    setProfileNameDraft(profile.name);
    setProfilePictureDraft(profile.picture);
    setFormError('');
    setProfileModalOpen(true);
    setProfileOpen(false);
  };

  const saveProfile = (event) => {
    event.preventDefault();
    const name = profileNameDraft.trim();
    if (!name) {
      setFormError('Enter a name before saving your profile.');
      return;
    }

    const nextProfile = { name, picture: profilePictureDraft };
    if (saveDashboardData(nextProfile, announcements)) {
      setProfile(nextProfile);
      setProfileModalOpen(false);
    }
  };

  const updateProfilePicture = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Choose an image file for your profile picture.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setFormError('Choose an image smaller than 1 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfilePictureDraft(reader.result);
        setFormError('');
      } else {
        setFormError('The selected image could not be loaded.');
      }
    };
    reader.onerror = () => setFormError('The selected image could not be read. Please try another file.');
    reader.readAsDataURL(file);
  };

  const postAnnouncement = (event) => {
    event.preventDefault();
    const title = announcementTitle.trim();
    const body = announcementBody.trim();
    if (!title || !body) {
      setFormError('Enter both a title and announcement before posting.');
      return;
    }

    const nextAnnouncements = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        body,
        author: profile.name,
        createdAt: new Date().toISOString(),
      },
      ...announcements,
    ];
    if (saveDashboardData(profile, nextAnnouncements)) {
      setAnnouncements(nextAnnouncements);
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setFormError('');
      setAnnouncementModalOpen(false);
    }
  };

  return (
    <div className="app">
      {sidebarOpen && <button type="button" className="overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">{renderIcon('shield', 24)}</div>
          <div>
            <strong>AlertBarangay</strong>
            <small>Emergency Ops</small>
          </div>
          <button type="button" className="icon-btn sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
            {renderIcon('x', 18)}
          </button>
        </div>

        <nav>
          {navItems.map(({ id, label, icon, badge }) => (
            <button
              key={id}
              type="button"
              className={`nav-item ${activeNav === id ? 'active' : ''}`}
              onClick={() => {
                setActiveNav(id);
                setSidebarOpen(false);
              }}
            >
              {renderIcon(icon, 18)}
              <span>{label}</span>
              {badge && <span className="badge">{badge}</span>}
            </button>
          ))}
        </nav>

        <div className="emergency-box">
          <strong>Emergency line</strong>
          <small>Hotline 24/7</small>
          <a href="tel:911">
            {renderIcon('phone', 16)}
            911 / 0917-123-4567
          </a>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="welcome">
            <button type="button" className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
              {renderIcon('menu', 20)}
            </button>
            <h1>Barangay Official</h1>
            <p>{new Intl.DateTimeFormat(undefined, {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
            }).format(now)}</p>
          </div>

          <div className="topbar-right">
            <button type="button" className="icon-btn" aria-label="Search">
              {renderIcon('search', 18)}
            </button>

            <div className="dropdown-wrap">
              <button
                type="button"
                className="bell-btn"
                aria-label="Notifications"
                onClick={() => {
                  setNotifyOpen((open) => !open);
                  setProfileOpen(false);
                }}
              >
                {renderIcon('bell', 18)}
                <span className="bell-dot" />
              </button>

              {notifyOpen && (
                <div className="dropdown notif-dropdown">
                  <div className="dropdown-head">
                    <strong>Notifications</strong>
                    <button type="button" className="link-btn">Mark all read</button>
                  </div>
                  {notifications.map((item) => (
                    <button key={item.title} type="button" className={`notif-item ${item.unread ? 'unread' : ''}`}>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                      <small>{item.time}</small>
                    </button>
                  ))}
                  <button type="button" className="dropdown-foot link-btn">View all alerts</button>
                </div>
              )}
            </div>

            <div className="dropdown-wrap">
              <button
                type="button"
                className="profile-btn"
                aria-label="Profile menu"
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotifyOpen(false);
                }}
              >
                <span className="avatar">
                  {profile.picture ? <img src={profile.picture} alt="" /> : renderIcon('residents', 20)}
                </span>
                <span className="profile-text">
                  <strong>{profile.name}</strong>
                  <small>Barangay Admin</small>
                </span>
                {renderIcon('chevron', 16)}
              </button>

              {profileOpen && (
                <div className="dropdown profile-dropdown">
                  <button type="button" className="dropdown-row" onClick={openProfileEditor}>
                    {renderIcon('settings', 16)} Edit profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content" aria-live="polite">
          {storageError && <div className="card form-error" role="alert">{storageError}</div>}
          {!isConfigured && (
            <div className="card" style={{ borderColor: '#f0d88c', background: '#fffaf0' }}>
              <div className="card-head">
                <h2>{renderIcon('activity', 18)} Local configuration notice</h2>
              </div>
              <p className="muted">{configError}</p>
            </div>
          )}

          <section className="stats">
            {stats.map(({ label, value, change, icon, tone }) => (
              <div key={label} className="stat-card">
                <div className="stat-icon" style={{ background: tone === 'gold' ? '#f7ecc4' : '#f5e6e6' }}>
                  {renderIcon(icon, 24)}
                </div>
                <div className="stat-text">
                  <strong>{value}</strong>
                  <b>{label}</b>
                  <small>{change}</small>
                </div>
              </div>
            ))}
          </section>

          <div className="grid-2">
            <section className="card">
              <div className="card-head">
                <h2>{renderIcon('dispatch', 18)} Live incident feed</h2>
                <button type="button" className="btn btn-outline">
                  {renderIcon('plus', 16)} New report
                </button>
              </div>
              <p className="muted">865 households monitored across 8 puroks</p>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Incident</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operationalData.reports.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="type-cell">
                            <span className="pill sev-medium">{row.type}</span>
                            <strong>{row.id}</strong>
                          </div>
                        </td>
                        <td>
                          <span className={`pill ${row.severity === 'High' ? 'sev-high' : row.severity === 'Medium' ? 'sev-medium' : 'sev-low'}`}>
                            {row.severity}
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${row.status === 'In progress' ? 'st-inprogress' : row.status === 'Resolved' ? 'st-resolved' : 'st-pending'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td>{row.location}</td>
                        <td>{row.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="side-col">
              <section className="card">
                <div className="card-head">
                  <h2>{renderIcon('shield', 18)} Response types</h2>
                </div>
                <div className="type-grid">
                  {serviceTypes.map(({ label, icon }) => (
                    <div key={label} className="type-tile">
                      {renderIcon(icon, 22)}
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <div className="hotline">
                  {renderIcon('phone', 20)}
                  <div>
                    <strong>0917-123-4567</strong>
                    <small>Call center support</small>
                  </div>
                </div>
                <div className="available">12 responders available now</div>
              </section>

              <section className="card">
                <div className="card-head">
                  <h2>{renderIcon('calendar', 18)} Today&apos;s checklist</h2>
                </div>
                <ul className="reminder">
                  {actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
                <div className="motto">“Prepared communities respond faster together.”</div>
              </section>
            </div>
          </div>

          <div className="grid-2">
            <section className="card">
              <div className="card-head">
                <h2>{renderIcon('activity', 18)} Operations summary</h2>
                <div className="filters">
                  <button type="button" className="chip active">Today</button>
                  <button type="button" className="chip">This week</button>
                </div>
              </div>

              <div className="stack">
                <div className="list-item row">
                  <div>
                    <strong>Household welfare checks</strong>
                    <small>26 of 37 scheduled families confirmed</small>
                  </div>
                  <span className="pill sev-medium">71%</span>
                </div>
                <div className="list-item row">
                  <div>
                    <strong>Volunteer mobilization</strong>
                    <small>6 teams on standby for flood response</small>
                  </div>
                  <span className="pill st-inprogress">Active</span>
                </div>
                <div className="list-item row">
                  <div>
                    <strong>Barangay inventory</strong>
                    <small>All emergency kits inspected and restocked</small>
                  </div>
                  <span className="pill sev-low">Ready</span>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-head">
                <h2>{renderIcon('bell', 18)} Announcements</h2>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setFormError('');
                    setAnnouncementModalOpen(true);
                  }}
                >
                  {renderIcon('plus', 14)} Announce
                </button>
              </div>
              <p className="muted">Posts are currently saved in this browser. Connect Supabase to share them with other users.</p>
              <div className="stack">
                {announcements.length === 0 ? (
                  <p className="empty">No announcements yet. Post one to keep the community informed.</p>
                ) : announcements.map((announcement) => (
                  <article key={announcement.id} className="list-item announcement-item">
                    <strong>{announcement.title}</strong>
                    <p>{announcement.body}</p>
                    <small>Posted by {announcement.author} · {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(announcement.createdAt))}</small>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="footer">© 2026 AlertBarangay • Built for faster local emergency coordination</div>
        </div>
      </main>

      {profileModalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setProfileModalOpen(false);
        }}>
          <form className="modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onSubmit={saveProfile}>
            <h2 id="profile-modal-title">Edit profile</h2>
            <p className="muted">Profile changes are saved in this browser.</p>
            <div className="profile-picture-editor">
              <span className="avatar avatar-large">
                {profilePictureDraft ? <img src={profilePictureDraft} alt="Profile preview" /> : renderIcon('residents', 28)}
              </span>
              <label>
                Profile picture
                <input type="file" accept="image/*" onChange={updateProfilePicture} />
              </label>
            </div>
            <label>
              Name
              <input
                type="text"
                value={profileNameDraft}
                maxLength={80}
                onChange={(event) => setProfileNameDraft(event.target.value)}
                required
              />
            </label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setProfileModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-maroon">Save profile</button>
            </div>
          </form>
        </div>
      )}

      {announcementModalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAnnouncementModalOpen(false);
        }}>
          <form className="modal" role="dialog" aria-modal="true" aria-labelledby="announcement-modal-title" onSubmit={postAnnouncement}>
            <h2 id="announcement-modal-title">Post an announcement</h2>
            <p className="muted">Announcements are currently visible only in this browser.</p>
            <label>
              Title
              <input
                type="text"
                value={announcementTitle}
                maxLength={120}
                onChange={(event) => setAnnouncementTitle(event.target.value)}
                required
              />
            </label>
            <label>
              Announcement
              <textarea
                rows="5"
                value={announcementBody}
                maxLength={2000}
                onChange={(event) => setAnnouncementBody(event.target.value)}
                required
              />
            </label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setAnnouncementModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-maroon">Post announcement</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Official;
