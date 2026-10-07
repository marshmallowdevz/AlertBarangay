import { useState } from 'react';
import './App.css';
import { configError, isConfigured } from './supabaseClient';

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
  { label: 'Active teams', value: '7', change: '2 on standby', tone: 'maroon', icon: 'shield' },
  { label: 'Response time', value: '8m', change: 'Down 2 min', tone: 'gold', icon: 'clock' },
];

const alertRows = [
  { id: 'AB-2401', type: 'Fire', severity: 'High', status: 'In progress', location: 'Purok 2, San Roque', time: '8 minutes ago' },
  { id: 'AB-2398', type: 'Medical', severity: 'Medium', status: 'Assigned', location: 'Barangay Hall', time: '18 minutes ago' },
  { id: 'AB-2395', type: 'Flooding', severity: 'High', status: 'Monitoring', location: 'River Road', time: '31 minutes ago' },
  { id: 'AB-2392', type: 'Power', severity: 'Low', status: 'Resolved', location: 'Sitio Kalayaan', time: '1 hour ago' },
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

const profileItems = ['Edit profile', 'Account settings', 'Sign out'];

function App() {
  const [activeNav, setActiveNav] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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
            <h1>Barangay Operations Dashboard</h1>
            <p>Tuesday, 7:45 AM • Good morning, Captain Dela Cruz</p>
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
                <span className="avatar">{renderIcon('residents', 20)}</span>
                <span className="profile-text">
                  <strong>Captain Dela Cruz</strong>
                  <small>Barangay Admin</small>
                </span>
                {renderIcon('chevron', 16)}
              </button>

              {profileOpen && (
                <div className="dropdown profile-dropdown">
                  {profileItems.map((item) => (
                    <button key={item} type="button" className={`dropdown-row ${item === 'Sign out' ? 'danger' : ''}`}>
                      {item === 'Sign out' ? renderIcon('logout', 16) : item === 'Account settings' ? renderIcon('settings', 16) : renderIcon('dot', 16)}
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content" aria-live="polite">
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
                    {alertRows.map((row) => (
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
                <h2>{renderIcon('bell', 18)} Community notices</h2>
                <button type="button" className="link-btn">
                  {renderIcon('plus', 14)} Add
                </button>
              </div>

              <div className="stack">
                <div className="list-item unread">
                  <strong>Utility outage update</strong>
                  <small>Power restoration in Sitio Del Pilar expected before 10:00 AM.</small>
                </div>
                <div className="list-item">
                  <strong>Barangay meeting</strong>
                  <small>Community preparedness review is scheduled for 4:00 PM today.</small>
                </div>
                <div className="list-item">
                  <strong>Health and safety</strong>
                  <small>Distribution of bottled water and hygiene kits is ongoing at the gym.</small>
                </div>
              </div>
            </section>
          </div>

          <div className="footer">© 2026 AlertBarangay • Built for faster local emergency coordination</div>
        </div>
      </main>
    </div>
  );
}

export default App;

