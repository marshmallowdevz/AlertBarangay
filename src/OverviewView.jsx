import './Official.css';

const iconMap = { report: '⚠', dispatch: '🚨', residents: '👥', messages: '💬', response: '🛡', fire: '🔥', location: '📍', phone: '☎', calendar: '🗓', bell: '🔔', plus: '+' };
const icon = (name) => <span aria-hidden="true">{iconMap[name] ?? '•'}</span>;

const responseTypes = [
  { label: 'Medical', icon: 'response' },
  { label: 'Fire', icon: 'fire' },
  { label: 'Rescue', icon: 'dispatch' },
  { label: 'Evacuation', icon: 'location' },
];

const checklist = [
  'Reconfirm family contact list for priority households.',
  'Verify backup generators and radio check with purok captains.',
  'Review weather advisories and flood-prone routes.',
];

export default function OverviewView({ reports, announcements, announcementLoading, announcementError, onNavigate, onSelectReport, onAnnounce }) {
  const openReports = reports.filter((report) => !['Resolved', 'Closed'].includes(report.status)).length;
  const resolvedReports = reports.filter((report) => report.status === 'Resolved').length;

  return (
    <>
      <section className="stats" aria-label="Incident summary">
        {[
          { label: 'Open incidents', value: openReports, icon: 'report', view: 'reports' },
          { label: 'Resolved', value: resolvedReports, icon: 'report', view: 'reports' },
        ].map((stat) => (
          <button key={stat.label} type="button" className="stat-card stat-card-button" onClick={() => onNavigate(stat.view)}>
            <span className="stat-icon">{icon(stat.icon)}</span>
            <span className="stat-text"><strong>{stat.value}</strong><b>{stat.label}</b><small>View reports</small></span>
          </button>
        ))}
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h2>{icon('dispatch')} Incident feed</h2>
            <button type="button" className="btn btn-outline" onClick={() => onNavigate('reports')}>{icon('plus')} Reports</button>
          </div>
          <p className="muted">Sample incident records for dashboard preview.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Location</th><th>Time</th></tr></thead>
              <tbody>
                {reports.slice(0, 4).map((report) => (
                  <tr key={report.id}>
                    <td><button type="button" className="table-link" onClick={() => onSelectReport(report.id)}>{report.type} · {report.id}</button></td>
                    <td><span className={`pill ${report.severity === 'High' ? 'sev-high' : report.severity === 'Medium' ? 'sev-medium' : 'sev-low'}`}>{report.severity}</span></td>
                    <td><span className={`pill ${report.status === 'In progress' ? 'st-inprogress' : report.status === 'Resolved' ? 'st-resolved' : 'st-pending'}`}>{report.status}</span></td>
                    <td>{report.location}</td><td>{report.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="link-btn" onClick={() => onNavigate('reports')}>View all reports</button>
        </section>

        <div className="side-col">
          <section className="card">
            <div className="card-head"><h2>{icon('response')} Response types</h2><button type="button" className="link-btn" onClick={() => onNavigate('dispatch')}>Open dispatch</button></div>
            <div className="type-grid">
              {responseTypes.map(({ label, icon: typeIcon }) => (
                <button key={label} type="button" className="type-tile" onClick={() => onNavigate('dispatch')}>
                  {icon(typeIcon)}<span>{label}</span>
                </button>
              ))}
            </div>
            <a className="hotline" href="tel:09171234567">
              {icon('phone')}<span><strong>0917-123-4567</strong><small>Call center support</small></span>
            </a>
          </section>

          <section className="card">
            <div className="card-head"><h2>{icon('calendar')} Today&apos;s checklist</h2></div>
            <ul className="reminder">{checklist.map((item) => <li key={item}>{item}</li>)}</ul>
            <div className="motto">Prepared communities respond faster together.</div>
          </section>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>{icon('bell')} Community announcements</h2>
          <button type="button" className="btn btn-outline" onClick={onAnnounce}>{icon('plus')} Announce</button>
        </div>
        <div className="stack">
          {announcementLoading && <p className="muted" role="status">Loading announcements…</p>}
          {announcementError && <p className="form-error" role="alert">{announcementError}</p>}
          {!announcementLoading && !announcementError && announcements.length === 0 ? <p className="empty">No announcements have been posted yet.</p> : announcements.slice(0, 3).map((item) => (
            <article key={item.id} className="list-item announcement-item">
              <strong>{item.title}</strong><p>{item.body}</p>
              <small>Posted by {item.author} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at ?? item.createdAt))}</small>
            </article>
          ))}
        </div>
        <button type="button" className="link-btn" onClick={() => onNavigate('announcements')}>View announcements</button>
      </section>
    </>
  );
}
