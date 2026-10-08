import { useEffect, useState } from 'react';
import './Official.css';
import { configError, isConfigured, supabase } from './supabaseClient';
import { initialConversations, initialResidents } from './dashboardData';
import OverviewView from './OverviewView';
import ReportsView from './ReportsView';
import ResidentsView from './ResidentsView';
import MessagesView from './MessagesView';
import DispatchView from './DispatchView';
import AnnouncementsView from './AnnouncementsView';
import { createAnnouncement, listAnnouncements, subscribeToAnnouncements } from './announcementService';
import Icon from './Icon';
import { createReport as insertReport, listReports } from './reportService';

const renderIcon = (name, size = 18) => <Icon name={name} size={size} />;

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
    error: '',
  };

  try {
    const savedData = JSON.parse(window.localStorage.getItem(dashboardStorageKey) || '{}') || {};
    return {
      profile: {
        name: typeof savedData.profile?.name === 'string' ? savedData.profile.name : defaults.profile.name,
        picture: typeof savedData.profile?.picture === 'string' ? savedData.profile.picture : '',
      },
      error: '',
    };
  } catch (error) {
    console.error('Unable to load saved dashboard data.', error);
    return { ...defaults, error: 'Saved dashboard data could not be loaded from this browser.' };
  }
}

function mergeAnnouncements(current, incoming) {
  const unique = new Map([...current, ...incoming].map((announcement) => [announcement.id, announcement]));
  return [...unique.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function Official() {
  const [activeNav, setActiveNav] = useState('overview');
  const [operationalData, setOperationalData] = useState({
    reports: [],
    residents: initialResidents,
    conversations: initialConversations,
    dispatches: [],
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const [selectedReportId, setSelectedReportId] = useState('');
  const [initialData] = useState(readDashboardData);
  const [profile, setProfile] = useState(initialData.profile);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementLoading, setAnnouncementLoading] = useState(isConfigured);
  const [announcementError, setAnnouncementError] = useState(isConfigured ? '' : configError);
  const [announcementRetry, setAnnouncementRetry] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(isConfigured);
  const [reportsError, setReportsError] = useState(isConfigured ? '' : configError);
  const [reportsRetry, setReportsRetry] = useState(0);
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
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

  useEffect(() => {
    let active = true;
    if (!isConfigured) {
      return () => { active = false; };
    }

    const unsubscribe = subscribeToAnnouncements(
      (announcement) => { if (active) setAnnouncements((current) => mergeAnnouncements(current, [announcement])); },
      (error) => { if (active) setAnnouncementError(error.message); },
    );

    listAnnouncements()
      .then((rows) => { if (active) setAnnouncements((current) => mergeAnnouncements(current, rows)); })
      .catch((error) => {
        console.error('Unable to load shared announcements.', error);
        if (active) setAnnouncementError(error.message || 'Announcements could not be loaded.');
      })
      .finally(() => { if (active) setAnnouncementLoading(false); });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [announcementRetry]);

  useEffect(() => {
    let active = true;
    if (!isConfigured) return () => { active = false; };

    listReports()
      .then((rows) => { if (active) setOperationalData((current) => ({ ...current, reports: rows })); })
      .catch((error) => {
        console.error('Unable to load shared reports.', error);
        if (active) setReportsError(error.message || 'Reports could not be loaded.');
      })
      .finally(() => { if (active) setReportsLoading(false); });

    return () => { active = false; };
  }, [reportsRetry]);

  const saveDashboardData = (nextProfile) => {
    try {
      window.localStorage.setItem(dashboardStorageKey, JSON.stringify({ profile: nextProfile }));
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
    if (saveDashboardData(nextProfile)) {
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

  const postAnnouncement = async (event) => {
    event.preventDefault();
    const title = announcementTitle.trim();
    const body = announcementBody.trim();
    if (!title || !body) {
      setFormError('Enter both a title and announcement before posting.');
      return;
    }

    setPostingAnnouncement(true);
    try {
      const announcement = await createAnnouncement({ title, body, author: profile.name });
      setAnnouncements((current) => mergeAnnouncements(current, [announcement]));
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setFormError('');
      setAnnouncementModalOpen(false);
    } catch (error) {
      console.error('Unable to post shared announcement.', error);
      setFormError('The announcement could not be shared. Check your connection and try again.');
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const navigateTo = (view) => setActiveNav(view);

  const selectReport = (reportId) => {
    setSelectedReportId(reportId);
    setActiveNav('reports');
  };

  const createReport = async (reportInput) => {
    const nextReport = await insertReport({ ...reportInput, author: profile.name || 'Barangay Official' });
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

  const dispatchResponse = ({ reportId, responseType, note }) => {
    const dispatch = {
      id: `DSP-${Date.now()}`,
      reportId,
      responseType,
      note,
      createdAt: new Date().toISOString(),
    };
    setOperationalData((current) => ({
      ...current,
      dispatches: [dispatch, ...current.dispatches],
      reports: current.reports.map((report) => report.id === reportId
        ? { ...report, status: 'Assigned', dispatchHistory: [...report.dispatchHistory, dispatch] }
        : report),
    }));
  };

  const handleSignOut = async () => {
    let signOutMessage = '';
    try {
      const { error } = await supabase.auth.signOut();
      if (error) signOutMessage = 'The Supabase session could not be cleared. Contact an administrator if you used a signed-in account.';
    } catch (error) {
      console.error('Unable to clear the Supabase session.', error);
      signOutMessage = 'The Supabase session could not be cleared. Contact an administrator if you used a signed-in account.';
    }

    try {
      window.localStorage.removeItem(dashboardStorageKey);
    } catch (error) {
      console.error('Unable to clear the local profile.', error);
      signOutMessage = `${signOutMessage} The saved profile could not be removed from this browser.`.trim();
    }

    setProfile({ name: '', picture: '' });
    setSignOutError(signOutMessage);
    setProfileOpen(false);
    setProfileModalOpen(false);
    setAnnouncementModalOpen(false);
    setSignedOut(true);
  };

  if (signedOut) {
    return (
      <main className="logout-screen">
        <div className="brand-logo">{renderIcon('shield', 24)}</div>
        <h1>Signed out</h1>
        <p>Your local dashboard session has ended.</p>
        <p>This app does not currently include a sign-in screen.</p>
        {signOutError && <p className="logout-error" role="alert">{signOutError}</p>}
      </main>
    );
  }

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
                  <button type="button" className="dropdown-row danger" onClick={handleSignOut}>
                    {renderIcon('logout', 16)} Sign out
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
              announcementLoading={announcementLoading}
              announcementError={announcementError}
              onRetryAnnouncements={() => { setAnnouncementLoading(true); setAnnouncementError(''); setAnnouncementRetry((value) => value + 1); }}
              onNavigate={navigateTo}
              onSelectReport={selectReport}
              onAnnounce={() => { setFormError(''); setAnnouncementModalOpen(true); }}
            />
          )}
          {activeNav === 'reports' && (
            <ReportsView
              reports={operationalData.reports}
              loading={reportsLoading}
              error={reportsError}
              onRetry={() => { setReportsLoading(true); setReportsError(''); setReportsRetry((value) => value + 1); }}
              selectedReportId={selectedReportId}
              onSelectReport={setSelectedReportId}
              onCreateReport={createReport}
              author={profile.name}
            />
          )}
          {activeNav === 'dispatch' && (
            <DispatchView reports={operationalData.reports} dispatches={operationalData.dispatches} onDispatch={dispatchResponse} />
          )}
          {activeNav === 'residents' && <ResidentsView residents={operationalData.residents} />}
          {activeNav === 'messages' && (
            <MessagesView conversations={operationalData.conversations} onReply={replyToConversation} />
          )}
          {activeNav === 'announcements' && (
            <AnnouncementsView announcements={announcements} loading={announcementLoading} error={announcementError} onRetry={() => { setAnnouncementLoading(true); setAnnouncementError(''); setAnnouncementRetry((value) => value + 1); }} onAnnounce={() => { setFormError(''); setAnnouncementModalOpen(true); }} />
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
            <p className="muted">Announcements are shared with everyone using this dashboard.</p>
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
              <button type="submit" className="btn btn-maroon" disabled={postingAnnouncement}>{postingAnnouncement ? 'Posting…' : 'Post announcement'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Official;

