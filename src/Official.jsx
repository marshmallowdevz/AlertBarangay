import { useEffect, useState } from 'react';
import './Official.css';
import { configError, isConfigured } from './supabaseClient';
import { initialConversations, initialReports, initialResidents } from './dashboardData';
import OverviewView from './OverviewView';
import ReportsView from './ReportsView';
import ResidentsView from './ResidentsView';
import MessagesView from './MessagesView';

const iconMap = {
  overview: 'â—”',
  reports: 'âš ',
  dispatch: 'ðŸš¨',
  residents: 'ðŸ‘¥',
  messages: 'ðŸ’¬',
  alert: 'âš ',
  check: 'âœ“',
  shield: 'ðŸ›¡',
  clock: 'â±',
  bell: 'ðŸ””',
  menu: 'â˜°',
  chevron: 'â–¾',
  dot: 'â—‰',
  settings: 'âš™',
  logout: 'â†©',
  phone: 'â˜Ž',
  plus: '+',
  flame: 'ðŸ”¥',
  location: 'ðŸ“',
  calendar: 'ðŸ—“',
  activity: 'â–£',
  x: 'âœ•',
};

const renderIcon = (name, size = 18) => (
  <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    {iconMap[name] ?? 'â€¢'}
  </span>
);

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'overview', badge: null },
  { id: 'reports', label: 'Reports', icon: 'reports', badge: '12' },
  { id: 'dispatch', label: 'Dispatch', icon: 'dispatch', badge: '4' },
  { id: 'residents', label: 'Residents', icon: 'residents', badge: null },
  { id: 'messages', label: 'Messages', icon: 'messages', badge: '3' },
  { id: 'announcements', label: 'Announcements', icon: 'bell', badge: null },
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
  const [operationalData, setOperationalData] = useState({
    reports: initialReports,
    residents: initialResidents,
    conversations: initialConversations,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState('');
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

  const navigateTo = (view) => setActiveNav(view);

  const selectReport = (reportId) => {
    setSelectedReportId(reportId);
    setActiveNav('reports');
  };

  const createReport = (reportInput) => {
    const nextReport = {
      ...reportInput,
      id: `AB-${Date.now()}`,
      status: 'Pending',
      time: 'Just now',
      dispatchHistory: [],
    };
    setOperationalData((current) => ({ ...current, reports: [nextReport, ...current.reports] }));
    setSelectedReportId(nextReport.id);
  };

  const replyToConversation = (conversationId, body) => {
    const sentAt = new Date().toISOString();
    setOperationalData((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === conversationId
        ? { ...conversation, messages: [...conversation.messages, { id: `reply-${Date.now()}`, sender: profile.name, body, createdAt: sentAt }] }
        : conversation),
    }));
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
            <div className="dropdown-wrap">
              <button
                type="button"
                className="profile-btn"
                aria-label="Profile menu"
                onClick={() => {
                  setProfileOpen((open) => !open);
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

          {activeNav === 'overview' && (
            <OverviewView
              reports={operationalData.reports}
              announcements={announcements}
              onNavigate={navigateTo}
              onSelectReport={selectReport}
              onAnnounce={() => { setFormError(''); setAnnouncementModalOpen(true); }}
            />
          )}
          {activeNav === 'reports' && (
            <ReportsView
              reports={operationalData.reports}
              selectedReportId={selectedReportId}
              onSelectReport={setSelectedReportId}
              onCreateReport={createReport}
            />
          )}
          {activeNav === 'dispatch' && (
            <section className="card">
              <div className="card-head"><h2>Dispatch</h2></div>
              <p className="muted">Choose a response for an open report from the dispatch view.</p>
            </section>
          )}
          {activeNav === 'residents' && <ResidentsView residents={operationalData.residents} />}
          {activeNav === 'messages' && (
            <MessagesView conversations={operationalData.conversations} onReply={replyToConversation} />
          )}
          {activeNav === 'announcements' && (
            <section className="card">
              <div className="card-head">
                <div><h2>Announcements</h2><p className="muted">Posts are currently saved in this browser.</p></div>
                <button type="button" className="btn btn-maroon" onClick={() => { setFormError(''); setAnnouncementModalOpen(true); }}>+ Announce</button>
              </div>
              <div className="stack">
                {announcements.length === 0 ? <p className="empty">No announcements yet.</p> : announcements.map((announcement) => (
                  <article key={announcement.id} className="list-item announcement-item">
                    <strong>{announcement.title}</strong><p>{announcement.body}</p>
                    <small>Posted by {announcement.author} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(announcement.createdAt))}</small>
                  </article>
                ))}
              </div>
            </section>
          )}
          <div className="footer">Â© 2026 AlertBarangay â€¢ Built for faster local emergency coordination</div>
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

