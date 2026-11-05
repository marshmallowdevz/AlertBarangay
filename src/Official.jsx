import { useEffect, useState } from 'react';
import './Official.css';
import { configError, isConfigured } from './supabaseClient';
import { initialConversations, initialResidents } from './dashboardData';
import OverviewView from './OverviewView';
import ResidentsView from './ResidentsView';
import MessagesView from './MessagesView';
import DispatchView from './DispatchView';
import AnnouncementsView from './AnnouncementsView';
import { createAnnouncement, listAnnouncements, subscribeToAnnouncements } from './announcementService';
import Icon from './Icon';
import { dispatchReport, listReports } from './reportService';
import {
  getOrInitializeDashboardContacts,
  getOrInitializeDashboardProfile,
  getOrInitializeSharedDashboardProfile,
  saveDashboardContacts,
  saveDashboardProfile,
  saveSharedDashboardProfile,
  subscribeToDashboardContacts,
} from './dashboardSettingsService';
import { listNotifications, subscribeToNotifications } from './notificationService';
import NotificationsView from './NotificationsView';

const renderIcon = (name, size = 18) => <Icon name={name} size={size} />;

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'overview', badge: null },
  { id: 'announcements', label: 'Announcements', icon: 'bell', badge: null },
  { id: 'dispatch', label: 'Dispatch', icon: 'dispatch', badge: '4' },
  { id: 'residents', label: 'Residents', icon: 'residents', badge: null },
  { id: 'messages', label: 'Messages', icon: 'messages', badge: '3' },
  { id: 'notifications', label: 'Notifications', icon: 'bell', badge: null },
];

const defaultContacts = { emergency_phone: '911', call_center_phone: '0917-123-4567' };
const defaultSharedProfile = { name: 'Captain Dela Cruz', picture: '' };

function getFallbackProfile(user) {
  if (!user) return defaultSharedProfile;
  const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
  const emailName = typeof user.email === 'string' ? user.email.split('@')[0].trim() : '';
  return {
    name: metadataName || emailName || 'Official User',
    picture: '',
  };
}

function toTelHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function mergeAnnouncements(current, incoming) {
  const unique = new Map([...current, ...incoming].map((announcement) => [announcement.id, announcement]));
  return [...unique.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function Official({ user, onSignOut }) {
  const [activeNav, setActiveNav] = useState('overview');
  const [operationalData, setOperationalData] = useState({
    reports: [],
    residents: initialResidents,
    conversations: initialConversations,
    dispatches: [],
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(() => getFallbackProfile(user));
  const [sharedContacts, setSharedContacts] = useState(defaultContacts);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementLoading, setAnnouncementLoading] = useState(isConfigured);
  const [announcementError, setAnnouncementError] = useState(isConfigured ? '' : configError);
  const [announcementRetry, setAnnouncementRetry] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(isConfigured);
  const [notificationsError, setNotificationsError] = useState(isConfigured ? '' : configError);
  const [notificationsRetry, setNotificationsRetry] = useState(0);
  const [profileError, setProfileError] = useState(isConfigured ? '' : configError);
  const [contactsError, setContactsError] = useState(isConfigured ? '' : configError);
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [contactsSaving, setContactsSaving] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState(() => getFallbackProfile(user).name);
  const [profilePictureDraft, setProfilePictureDraft] = useState('');
  const [emergencyPhoneDraft, setEmergencyPhoneDraft] = useState(defaultContacts.emergency_phone);
  const [callCenterPhoneDraft, setCallCenterPhoneDraft] = useState(defaultContacts.call_center_phone);
  const [contactsFormError, setContactsFormError] = useState('');
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
    if (!isConfigured) return () => { active = false; };

    const unsubscribeContacts = subscribeToDashboardContacts(
      (settings) => {
        if (active) {
          setSharedContacts((current) => !current.updated_at || new Date(settings.updated_at) >= new Date(current.updated_at) ? settings : current);
          setContactsError('');
        }
      },
      (error) => { if (active) setContactsError(error.message); },
    );

    const loadProfile = user ? getOrInitializeDashboardProfile(user) : getOrInitializeSharedDashboardProfile();
    loadProfile
      .then((savedProfile) => {
        if (!active) return;
        const nextProfile = { name: savedProfile.name, picture: savedProfile.picture };
        setProfile(nextProfile);
        setProfileNameDraft(nextProfile.name);
        setProfilePictureDraft(nextProfile.picture);
        setProfileError('');
      })
      .catch((error) => {
        console.error('Unable to load the personal profile.', error);
        if (active) setProfileError(`Your profile could not be loaded: ${error.message || 'Check your Supabase connection.'}`);
      });

    getOrInitializeDashboardContacts()
      .then((settings) => {
        if (active) {
          setSharedContacts((current) => !current.updated_at || new Date(settings.updated_at) >= new Date(current.updated_at) ? settings : current);
          setContactsError('');
        }
      })
      .catch((error) => {
        console.error('Unable to load shared contact settings.', error);
        if (active) setContactsError(`Shared contacts could not be loaded: ${error.message || 'Check your Supabase connection.'}`);
      });

    return () => {
      active = false;
      unsubscribeContacts();
    };
  }, [user]);

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
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!isConfigured) return () => { active = false; };
    const mergeNotifications = (incoming) => setNotifications((current) => {
      const unique = new Map([...current, ...incoming].map((item) => [item.id, item]));
      return [...unique.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
    });
    const unsubscribe = subscribeToNotifications(
      (notification) => { if (active) mergeNotifications([notification]); },
      (error) => { if (active) setNotificationsError(error.message); },
    );
    listNotifications()
      .then((rows) => { if (active) mergeNotifications(rows); })
      .catch((error) => {
        console.error('Unable to load shared notifications.', error);
        if (active) setNotificationsError(error.message || 'Notifications could not be loaded.');
      })
      .finally(() => { if (active) setNotificationsLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, [notificationsRetry]);

  const openProfileEditor = () => {
    setProfileNameDraft(profile.name);
    setProfilePictureDraft(profile.picture);
    setFormError('');
    setProfileModalOpen(true);
    setProfileOpen(false);
  };

  const openContactsEditor = () => {
    setEmergencyPhoneDraft(sharedContacts.emergency_phone || defaultContacts.emergency_phone);
    setCallCenterPhoneDraft(sharedContacts.call_center_phone || defaultContacts.call_center_phone);
    setContactsFormError('');
    setContactsModalOpen(true);
    setProfileOpen(false);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const name = profileNameDraft.trim();
    if (!name) {
      setFormError('Enter a name before saving your profile.');
      return;
    }

    const nextProfile = { name, picture: profilePictureDraft };
    setProfileSaving(true);
    try {
      const savedProfile = user
        ? await saveDashboardProfile({ userId: user.id, ...nextProfile })
        : await saveSharedDashboardProfile(nextProfile);
      const persistedProfile = { name: savedProfile.name, picture: savedProfile.picture };
      setProfileError('');
      setProfile(persistedProfile);
      setProfileModalOpen(false);
    } catch (error) {
      console.error('Unable to save the personal profile.', error);
      setFormError(`Your profile could not be saved: ${error.message || 'Check your Supabase connection.'}`);
    } finally {
      setProfileSaving(false);
    }
  };

  const saveContacts = async (event) => {
    event.preventDefault();
    const emergencyPhone = emergencyPhoneDraft.trim();
    const callCenterPhone = callCenterPhoneDraft.trim();
    if (!emergencyPhone || !callCenterPhone) {
      setContactsFormError('Enter both the emergency line and call center phone numbers.');
      return;
    }

    setContactsSaving(true);
    setContactsFormError('');
    try {
      const savedContacts = await saveDashboardContacts({ emergencyPhone, callCenterPhone });
      setSharedContacts(savedContacts);
      setContactsError('');
      setContactsModalOpen(false);
    } catch (error) {
      console.error('Unable to save shared contact settings.', error);
      setContactsFormError(`Shared contacts could not be saved: ${error.message || 'Check your Supabase connection.'}`);
    } finally {
      setContactsSaving(false);
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
      setFormError(`The announcement could not be shared: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const navigateTo = (view) => setActiveNav(view);

  const replyToConversation = (conversationId, body) => {
    const sentAt = new Date().toISOString();
    setOperationalData((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === conversationId
        ? { ...conversation, messages: [...conversation.messages, { id: `reply-${Date.now()}`, sender: profile.name, body, createdAt: sentAt }] }
        : conversation),
    }));
  };

  const dispatchResponse = async ({ reportId, responseType, note }) => {
    const report = operationalData.reports.find((item) => item.id === reportId);
    if (!report) throw new Error('That incident could not be found. Refresh the dashboard and try again.');
    await dispatchReport({ reportId: report.databaseId, responseType, note });
    const rows = await listReports();
    setOperationalData((current) => ({ ...current, reports: rows }));
  };

  return (
    <div className="app">
      {sidebarOpen && <button type="button" className="overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">{renderIcon('shield', 24)}</div>
          <div>
            <strong>AlertBarangay</strong>
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
          <a href={toTelHref(sharedContacts.emergency_phone)}>
            {renderIcon('phone', 16)}
            {sharedContacts.emergency_phone}
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
                  <small>{user ? 'Personal profile' : 'Shared profile'}</small>
                </span>
                {renderIcon('chevron', 16)}
              </button>

              {profileOpen && (
                <div className="dropdown profile-dropdown">
                  <button type="button" className="dropdown-row" onClick={openProfileEditor}>
                    {renderIcon('settings', 16)} Edit profile
                  </button>
                  <button type="button" className="dropdown-row" onClick={openContactsEditor}>
                    {renderIcon('phone', 16)} Edit shared contacts
                  </button>
                  {onSignOut && (
                    <button type="button" className="dropdown-row" onClick={() => {
                      setProfileOpen(false);
                      onSignOut().catch((error) => setProfileError(`Unable to sign out: ${error.message || 'Try again.'}`));
                    }}>
                      {renderIcon('x', 16)} Sign out
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content" aria-live="polite">
          {profileError && <div className="card form-error" role="alert">{profileError}</div>}
          {contactsError && <div className="card form-error" role="alert">{contactsError}</div>}
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
              announcements={announcements}
              announcementLoading={announcementLoading}
              announcementError={announcementError}
              onRetryAnnouncements={isConfigured ? () => { setAnnouncementLoading(true); setAnnouncementError(''); setAnnouncementRetry((value) => value + 1); } : undefined}
              onNavigate={navigateTo}
              onAnnounce={() => { setFormError(''); setAnnouncementModalOpen(true); }}
              contacts={sharedContacts}
            />
          )}
          {activeNav === 'dispatch' && (
            <DispatchView reports={operationalData.reports} dispatches={operationalData.reports.flatMap((report) => report.dispatchHistory.filter((event) => event.eventType === 'dispatched').map((event) => ({ ...event, reportId: report.id }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))} onDispatch={dispatchResponse} />
          )}
          {activeNav === 'residents' && <ResidentsView residents={operationalData.residents} />}
          {activeNav === 'messages' && (
            <MessagesView conversations={operationalData.conversations} onReply={replyToConversation} />
          )}
          {activeNav === 'announcements' && (
            <AnnouncementsView announcements={announcements} loading={announcementLoading} error={announcementError} onRetry={isConfigured ? () => { setAnnouncementLoading(true); setAnnouncementError(''); setAnnouncementRetry((value) => value + 1); } : undefined} onAnnounce={() => { setFormError(''); setAnnouncementModalOpen(true); }} />
          )}
          {activeNav === 'notifications' && (
            <NotificationsView notifications={notifications} loading={notificationsLoading} error={notificationsError} onRetry={isConfigured ? () => { setNotificationsLoading(true); setNotificationsError(''); setNotificationsRetry((value) => value + 1); } : undefined} />
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
            <p className="muted">{user ? 'Your profile is saved to your official account. Shared contacts are edited separately.' : 'Profile changes are shared with everyone using this dashboard.'}</p>
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
              <button type="submit" className="btn btn-maroon" disabled={profileSaving}>{profileSaving ? 'Saving...' : 'Save profile'}</button>
            </div>
          </form>
        </div>
      )}

      {contactsModalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setContactsModalOpen(false);
        }}>
          <form className="modal" role="dialog" aria-modal="true" aria-labelledby="contacts-modal-title" onSubmit={saveContacts}>
            <h2 id="contacts-modal-title">Edit shared contacts</h2>
            <p className="muted">These phone numbers are shared with everyone using this dashboard.</p>
            <label>
              Emergency line
              <input type="tel" value={emergencyPhoneDraft} maxLength={40} onChange={(event) => setEmergencyPhoneDraft(event.target.value)} required />
            </label>
            <label>
              Call center support
              <input type="tel" value={callCenterPhoneDraft} maxLength={40} onChange={(event) => setCallCenterPhoneDraft(event.target.value)} required />
            </label>
            {contactsFormError && <p className="form-error" role="alert">{contactsFormError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setContactsModalOpen(false)} disabled={contactsSaving}>Cancel</button>
              <button type="submit" className="btn btn-maroon" disabled={contactsSaving}>{contactsSaving ? 'Saving...' : 'Save contacts'}</button>
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

