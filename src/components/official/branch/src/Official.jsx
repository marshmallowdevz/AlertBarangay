'use client';

import { useEffect, useRef, useState } from 'react';
import './Official.css';
import * as supabaseClientModule from './supabaseClient';
import { configError, isConfigured } from './supabaseClient';
import { initialConversations, initialResidents } from './dashboardData';
import OverviewView from './OverviewView';
import ResidentsView from './ResidentsView';
import MessagesView from './MessagesView';
import DispatchView from './DispatchView';
import AnnouncementsView from './AnnouncementsView';
import { archiveAnnouncement, createAnnouncement, deleteAnnouncement, listAnnouncements, subscribeToAnnouncements, updateAnnouncement } from './announcementService';
import Icon from './Icon';
import { dispatchReport, listDispatches, listReports, markReportDone } from './reportService';
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
import ReportsView from './ReportsView';
import LoadingIndicator from './LoadingIndicator';

// Works whether or not supabaseClient.js exports a `supabase` object.
const supabase = supabaseClientModule.supabase;

const renderIcon = (name, size = 18) => <Icon name={name} size={size} />;

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'reports', label: 'Incident reports', icon: 'dispatch' },
  { id: 'announcements', label: 'Announcements', icon: 'bell' },
  { id: 'dispatch', label: 'Dispatch', icon: 'dispatch' },
  { id: 'residents', label: 'Residents', icon: 'residents' },
  { id: 'messages', label: 'Messages', icon: 'messages' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
];

const defaultContacts = {
  emergency_phone: '911',
  call_center_phone: '0917-123-4567',
  emergency_contacts: [
    { id: 'emergency-line', name: 'Emergency line', phone: '911' },
    { id: 'call-center', name: 'Call center support', phone: '0917-123-4567' },
  ],
};
const defaultSharedProfile = { name: 'Captain Dela Cruz', picture: '' };
const themeStorageKey = 'alertBarangay.theme';
const sidebarStorageKey = 'alertBarangay.sidebarHidden';
const themeModes = ['system', 'light', 'dark'];
const finishedStatuses = ['Resolved', 'Closed', 'Done'];

function readThemeMode() {
  try {
    const savedMode = window.localStorage.getItem(themeStorageKey);
    return themeModes.includes(savedMode) ? savedMode : 'system';
  } catch {
    return 'system';
  }
}

function readSidebarHidden() {
  try { return window.localStorage.getItem(sidebarStorageKey) === 'true'; } catch { return false; }
}

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
  const [sidebarHidden, setSidebarHidden] = useState(readSidebarHidden);
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState(readThemeMode);
  const themeToggleRef = useRef(null);
  const [profile, setProfile] = useState(() => getFallbackProfile(user));
  const [sharedContacts, setSharedContacts] = useState(defaultContacts);
  const [announcements, setAnnouncements] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(isConfigured);
  const [reportsError, setReportsError] = useState(isConfigured ? '' : configError);
  const [reportsRetry, setReportsRetry] = useState(0);
  const [dispatchesError, setDispatchesError] = useState('');
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
  const [busyAnnouncementId, setBusyAnnouncementId] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [contactsSaving, setContactsSaving] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [contactsModalOpen, setContactsModalOpen] = useState(false);
  const [announcementModalOpen, setAnnouncementModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementActionError, setAnnouncementActionError] = useState('');
  const [profileNameDraft, setProfileNameDraft] = useState(() => getFallbackProfile(user).name);
  const [profilePictureDraft, setProfilePictureDraft] = useState('');
  const [emergencyPhoneDraft, setEmergencyPhoneDraft] = useState(defaultContacts.emergency_phone);
  const [callCenterPhoneDraft, setCallCenterPhoneDraft] = useState(defaultContacts.call_center_phone);
  const [emergencyContactDrafts, setEmergencyContactDrafts] = useState(defaultContacts.emergency_contacts);
  const [contactsFormError, setContactsFormError] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [formError, setFormError] = useState('');
  const [now, setNow] = useState(null);
  const dispatchCount = operationalData.reports.filter((report) => !finishedStatuses.includes(report.status)).length;

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolvedTheme = themeMode === 'system' ? (mediaQuery?.matches ? 'dark' : 'light') : themeMode;
      document.documentElement.dataset.theme = resolvedTheme;
    };

    applyTheme();
    if (themeMode !== 'system' || !mediaQuery) return undefined;
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
    mediaQuery.addListener(applyTheme);
    return () => mediaQuery.removeListener(applyTheme);
  }, [themeMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(themeStorageKey, themeMode);
    } catch (error) {
      console.warn('Unable to save the theme preference in this browser.', error);
    }
  }, [themeMode]);

  useEffect(() => {
    try { window.localStorage.setItem(sidebarStorageKey, String(sidebarHidden)); }
    catch (error) { console.warn('Unable to save the sidebar preference in this browser.', error); }
  }, [sidebarHidden]);

  useEffect(() => {
    setNow(new Date());
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
        // The current schema keeps shared emergency contacts out of official
        // write access. Retain the branch dashboard's built-in hotline defaults.
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
      (announcement) => { if (active) setAnnouncements((current) => mergeAnnouncements(current, [announcement])); },
      (id) => { if (active) setAnnouncements((current) => current.filter((announcement) => announcement.id !== id)); },
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

  // Reload reports on first load, on retry, and whenever the signed-in user changes
  // (reports are protected by RLS, so they come back empty until a session exists).
  useEffect(() => {
    let active = true;
    if (!isConfigured) return () => { active = false; };

    listReports()
      .then((rows) => { if (active) { setOperationalData((current) => ({ ...current, reports: rows })); setReportsError(''); } })
      .catch((error) => {
        console.error('Unable to load shared reports.', error);
        if (active) setReportsError(error.message || 'Incident reports could not be loaded.');
      })
      .finally(() => { if (active) setReportsLoading(false); });

    listDispatches()
      .then((dispatches) => { if (active) { setOperationalData((current) => ({ ...current, dispatches })); setDispatchesError(''); } })
      .catch((error) => {
        console.error('Unable to load recent dispatches.', error);
        if (active) setDispatchesError(error.message || 'Recent dispatches could not be loaded.');
      });

    return () => { active = false; };
  }, [reportsRetry, user]);

  // Live updates: refresh the list whenever a report or its history changes.
  useEffect(() => {
    if (!isConfigured || !supabase?.channel) return undefined;
    let active = true;
    const refresh = () => {
      listReports()
        .then((rows) => { if (active) setOperationalData((current) => ({ ...current, reports: rows })); })
        .catch((error) => console.error('Unable to refresh reports after a live change.', error));
    };
    const refreshDispatches = () => {
      listDispatches()
        .then((dispatches) => { if (active) { setOperationalData((current) => ({ ...current, dispatches })); setDispatchesError(''); } })
        .catch((error) => { if (active) setDispatchesError(error.message || 'Recent dispatches could not be loaded.'); });
    };
    const channel = supabase
      .channel('official-reports-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_dispatches' }, refreshDispatches)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!isConfigured) return () => { active = false; };
    const mergeNotifications = (incoming) => setNotifications((current) => {
      const unique = new Map([...current, ...incoming].map((item) => [item.id, item]));
      return [...unique.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50);
    });
    const unsubscribe = subscribeToNotifications(
      (notification) => {
        if (!active) return;
        mergeNotifications([notification]);
        if (['report_created', 'report_dispatched'].includes(notification.type)) {
          listReports()
            .then((rows) => { if (active) setOperationalData((current) => ({ ...current, reports: rows })); })
            .catch((error) => console.error('Unable to refresh reports after a live notification.', error));
        }
      },
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
    setEmergencyContactDrafts(sharedContacts.emergency_contacts || defaultContacts.emergency_contacts);
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
    if (!emergencyPhone) {
      setContactsFormError('Enter the emergency line phone number.');
      return;
    }
    if (emergencyContactDrafts.some((contact) => !contact.name.trim() || !contact.phone.trim())) {
      setContactsFormError('Enter a service name and phone number for every barangay contact.');
      return;
    }

    setContactsSaving(true);
    setContactsFormError('');
    try {
      const savedContacts = await saveDashboardContacts({ emergencyPhone, callCenterPhone, emergencyContacts: emergencyContactDrafts });
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
      const announcement = editingAnnouncement
        ? await updateAnnouncement({ id: editingAnnouncement.id, title, body })
        : await createAnnouncement({ title, body, author: profile.name });
      setAnnouncements((current) => mergeAnnouncements(current, [announcement]));
      setAnnouncementTitle('');
      setAnnouncementBody('');
      setEditingAnnouncement(null);
      setFormError('');
      setAnnouncementModalOpen(false);
    } catch (error) {
      console.error(editingAnnouncement ? 'Unable to edit shared announcement.' : 'Unable to post shared announcement.', error);
      setFormError(`The announcement could not be ${editingAnnouncement ? 'updated' : 'shared'}: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const removeAnnouncement = async (announcement) => {
    if (!window.confirm(`Delete “${announcement.title}”? This cannot be undone.`)) return;
    setBusyAnnouncementId(announcement.id);
    setAnnouncementActionError('');
    try {
      await deleteAnnouncement(announcement.id);
      setAnnouncements((current) => current.filter((item) => item.id !== announcement.id));
    } catch (error) {
      console.error('Unable to delete shared announcement.', error);
      setAnnouncementActionError(`The announcement could not be deleted: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setBusyAnnouncementId('');
    }
  };

  const editAnnouncement = (announcement) => {
    setAnnouncementActionError('');
    setEditingAnnouncement(announcement);
    setAnnouncementTitle(announcement.title);
    setAnnouncementBody(announcement.body);
    setFormError('');
    setAnnouncementModalOpen(true);
  };

  const changeAnnouncementArchiveState = async (announcement) => {
    const isArchived = !announcement.is_archived;
    setBusyAnnouncementId(announcement.id);
    setAnnouncementActionError('');
    try {
      const updated = await archiveAnnouncement(announcement.id, isArchived);
      setAnnouncements((current) => mergeAnnouncements(current, [updated]));
    } catch (error) {
      console.error('Unable to update announcement archive state.', error);
      setAnnouncementActionError(`The announcement could not be ${isArchived ? 'archived' : 'restored'}: ${error.message || 'An unexpected error occurred.'}`);
    } finally {
      setBusyAnnouncementId('');
    }
  };

  const openAnnouncementComposer = () => {
    setAnnouncementActionError('');
    setEditingAnnouncement(null);
    setAnnouncementTitle('');
    setAnnouncementBody('');
    setFormError('');
    setAnnouncementModalOpen(true);
  };

  // Announcements are managed through the administrator routes in the current app.
  const canManageAnnouncements = false;

  const navigateTo = (view) => setActiveNav(view);

  const replyToConversation = (conversationId, body) => {
    const sentAt = new Date().toISOString();
    setOperationalData((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === conversationId
        ? { ...conversation, messages: [...conversation.messages, { id: `reply-${Date.now()}`, sender: profile.name, senderRole: 'official', body, createdAt: sentAt }] }
        : conversation),
    }));
  };

  const dispatchResponse = async ({ reportId, responseType, note }) => {
    const report = operationalData.reports.find((item) => item.id === reportId);
    if (!report) throw new Error('That incident could not be found. Refresh the dashboard and try again.');
    const savedDispatch = await dispatchReport({ reportId: report.databaseId, responseType, note });
    const recentDispatch = {
      id: savedDispatch.id,
      responseType: savedDispatch.response_type,
      reportTitle: report.description || report.type,
      note: savedDispatch.note,
      createdAt: savedDispatch.created_at,
    };
    setOperationalData((current) => ({ ...current, dispatches: [recentDispatch, ...current.dispatches.filter((item) => item.id !== recentDispatch.id)] }));
    setDispatchesError('');
    const rows = await listReports();
    setOperationalData((current) => ({ ...current, reports: rows }));
  };

  const markDone = async ({ reportId, note }) => {
    const report = operationalData.reports.find((item) => item.id === reportId);
    if (!report) throw new Error('That incident could not be found. Refresh the dashboard and try again.');
    await markReportDone({ reportId: report.databaseId, note });
    const rows = await listReports();
    setOperationalData((current) => ({ ...current, reports: rows }));
  };

  return (
    <div className={`app ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      {sidebarOpen && <button type="button" className="overlay" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-logo">{renderIcon('shield', 24)}</div>
          <div>
            <strong>AlertBarangay</strong>
          </div>
        </div>
        <nav>
          {navItems.map(({ id, label, icon }) => {
            const badgeCount = id === 'dispatch' ? dispatchCount : 0;
            return (
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
                {badgeCount > 0 && <span className="badge">{badgeCount}</span>}
              </button>
            );
          })}
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
            <button type="button" className="icon-btn menu-btn" aria-label={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'} aria-expanded={!sidebarHidden} onClick={() => {
              if (window.matchMedia('(max-width: 900px)').matches) setSidebarOpen(true);
              else setSidebarHidden((hidden) => !hidden);
            }}>
              {renderIcon('menu', 20)}
            </button>
            <h1>Barangay Official</h1>
            <p>{now ? new Intl.DateTimeFormat('en-PH', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
              timeZone: 'Asia/Manila',
            }).format(now) : '\u00a0'}</p>
          </div>

          <div className="topbar-right">
            <div className="dropdown-wrap theme-control">
              <button
                type="button"
                className="theme-toggle"
                ref={themeToggleRef}
                aria-label={`Appearance: ${themeMode}`}
                aria-expanded={themeMenuOpen}
                aria-controls="appearance-menu"
                onClick={() => setThemeMenuOpen((open) => !open)}
              >
                {renderIcon(themeMode === 'system' ? 'system' : themeMode === 'dark' ? 'moon' : 'sun', 18)}
                <span>Appearance</span>
              </button>
              {themeMenuOpen && (
                <div
                  id="appearance-menu"
                  className="dropdown theme-menu"
                  role="group"
                  aria-label="Choose appearance"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      setThemeMenuOpen(false);
                      themeToggleRef.current?.focus();
                    }
                  }}
                >
                  {themeModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={themeMode === mode}
                      className={`theme-option ${themeMode === mode ? 'selected' : ''}`}
                      onClick={() => {
                        setThemeMode(mode);
                        setThemeMenuOpen(false);
                        themeToggleRef.current?.focus();
                      }}
                    >
                      {renderIcon(mode === 'system' ? 'system' : mode === 'dark' ? 'moon' : 'sun', 17)}
                      <span>{mode[0].toUpperCase() + mode.slice(1)}</span>
                      {themeMode === mode && <span className="theme-check" aria-hidden="true">✓</span>}
                    </button>
                  ))}
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
              announcements={announcements.filter((announcement) => !announcement.is_archived)}
              announcementLoading={announcementLoading}
              announcementError={announcementError}
              onRetryAnnouncements={isConfigured ? () => { setAnnouncementLoading(true); setAnnouncementError(''); setAnnouncementRetry((value) => value + 1); } : undefined}
              onNavigate={navigateTo}
              onAnnounce={canManageAnnouncements ? openAnnouncementComposer : undefined}
              onEditAnnouncement={canManageAnnouncements ? editAnnouncement : undefined}
              onDeleteAnnouncement={canManageAnnouncements ? removeAnnouncement : undefined}
              onArchiveAnnouncement={canManageAnnouncements ? changeAnnouncementArchiveState : undefined}
              busyAnnouncementId={busyAnnouncementId}
              announcementActionError={announcementActionError}
              contacts={sharedContacts}
              onManageContacts={openContactsEditor}
              reports={operationalData.reports}
              reportsLoading={reportsLoading}
              reportsError={reportsError}
              onRetryReports={() => { setReportsLoading(true); setReportsError(''); setReportsRetry((value) => value + 1); }}
            />
          )}
          {activeNav === 'reports' && (
            <ReportsView
              reports={operationalData.reports}
              loading={reportsLoading}
              error={reportsError}
              onRetry={() => { setReportsLoading(true); setReportsError(''); setReportsRetry((value) => value + 1); }}
              onMarkDone={markDone}
            />
          )}
          {activeNav === 'dispatch' && (
            <DispatchView reports={operationalData.reports} dispatches={operationalData.dispatches} dispatchesError={dispatchesError} onDispatch={dispatchResponse} />
          )}
          {activeNav === 'residents' && <ResidentsView residents={operationalData.residents} />}
          {activeNav === 'messages' && (
            <MessagesView conversations={operationalData.conversations} onReply={replyToConversation} />
          )}
          {activeNav === 'announcements' && (
            <AnnouncementsView announcements={announcements} loading={announcementLoading} error={announcementError} onRetry={isConfigured ? () => { setAnnouncementLoading(true); setAnnouncementError(''); setAnnouncementRetry((value) => value + 1); } : undefined} onAnnounce={canManageAnnouncements ? openAnnouncementComposer : undefined} onEdit={canManageAnnouncements ? editAnnouncement : undefined} onDelete={canManageAnnouncements ? removeAnnouncement : undefined} onArchive={canManageAnnouncements ? changeAnnouncementArchiveState : undefined} busyAnnouncementId={busyAnnouncementId} actionError={announcementActionError} canManage={canManageAnnouncements} />
          )}
          {activeNav === 'notifications' && (
            <NotificationsView notifications={notifications} loading={notificationsLoading} error={notificationsError} onRetry={isConfigured ? () => { setNotificationsLoading(true); setNotificationsError(''); setNotificationsRetry((value) => value + 1); } : undefined} />
          )}
          <div className="footer">© 2026 AlertBarangay. All rights reserved.</div>
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
              <button type="submit" className="btn btn-maroon" disabled={profileSaving}>{profileSaving ? <LoadingIndicator message="Saving..." compact /> : 'Save profile'}</button>
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
            <div className="contact-editor-heading">
              <strong>Who to call</strong>
              <button type="button" className="btn btn-outline btn-small" onClick={() => setEmergencyContactDrafts((contacts) => [...contacts, { id: crypto.randomUUID(), name: '', phone: '' }])}>Add number</button>
            </div>
            <p className="muted">These numbers appear in the community contact list.</p>
            {emergencyContactDrafts.map((contact) => (
              <div className="contact-editor-row" key={contact.id}>
                <label>Service name<input type="text" value={contact.name} maxLength={80} placeholder="e.g. Barangay Hall" onChange={(event) => setEmergencyContactDrafts((items) => items.map((item) => item.id === contact.id ? { ...item, name: event.target.value } : item))} required /></label>
                <label>Phone number<input type="tel" value={contact.phone} maxLength={40} onChange={(event) => setEmergencyContactDrafts((items) => items.map((item) => item.id === contact.id ? { ...item, phone: event.target.value } : item))} required /></label>
                <button type="button" className="btn btn-outline btn-small" aria-label={`Delete ${contact.name || 'contact'}`} onClick={() => setEmergencyContactDrafts((items) => items.filter((item) => item.id !== contact.id))}>Delete</button>
              </div>
            ))}
            {contactsFormError && <p className="form-error" role="alert">{contactsFormError}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setContactsModalOpen(false)} disabled={contactsSaving}>Cancel</button>
              <button type="submit" className="btn btn-maroon" disabled={contactsSaving}>{contactsSaving ? <LoadingIndicator message="Saving..." compact /> : 'Save contacts'}</button>
            </div>
          </form>
        </div>
      )}

      {announcementModalOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAnnouncementModalOpen(false);
        }}>
          <form className="modal" role="dialog" aria-modal="true" aria-labelledby="announcement-modal-title" onSubmit={postAnnouncement}>
            <h2 id="announcement-modal-title">{editingAnnouncement ? 'Edit announcement' : 'Post an announcement'}</h2>
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
              <button type="button" className="btn btn-outline" onClick={() => { setAnnouncementModalOpen(false); setEditingAnnouncement(null); }}>Cancel</button>
              <button type="submit" className="btn btn-maroon" disabled={postingAnnouncement}>{postingAnnouncement ? <LoadingIndicator message={editingAnnouncement ? 'Saving…' : 'Posting…'} compact /> : editingAnnouncement ? 'Save changes' : 'Post announcement'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Official;
