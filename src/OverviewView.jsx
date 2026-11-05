import './Official.css';
import Icon from './Icon';

const icon = (name) => <Icon name={name} />;

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

export default function OverviewView({ announcements, announcementLoading, announcementError, onRetryAnnouncements, onNavigate, onAnnounce }) {
  return (
    <>
      <section className="card announcement-feature">
        <div className="card-head">
          <div>
            <h2>{icon('bell')} Community announcements</h2>
            <p className="muted">Important updates for the community, shared by barangay officials.</p>
          </div>
          <button type="button" className="btn btn-maroon" onClick={onAnnounce}>{icon('plus')} Post announcement</button>
        </div>
        <div className="stack">
          {announcementLoading && <p className="muted" role="status">Loading announcements…</p>}
          {announcementError && <div className="error-row"><p className="form-error" role="alert">{announcementError}</p>{onRetryAnnouncements && <button type="button" className="link-btn" onClick={onRetryAnnouncements} disabled={announcementLoading}>Retry</button>}</div>}
          {!announcementLoading && !announcementError && announcements.length === 0 && <p className="empty">No announcements have been posted yet.</p>}
          {announcements.slice(0, 3).map((item) => (
            <article key={item.id} className="list-item announcement-item">
              <strong>{item.title}</strong><p>{item.body}</p>
              <small>Posted by {item.author} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at ?? item.createdAt))}</small>
            </article>
          ))}
        </div>
        <button type="button" className="link-btn" onClick={() => onNavigate('announcements')}>View all announcements</button>
      </section>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><h2>{icon('response')} Response types</h2><button type="button" className="link-btn" onClick={() => onNavigate('dispatch')}>Open dispatch</button></div>
          <div className="type-grid">
            {responseTypes.map(({ label, icon: typeIcon }) => (
              <button key={label} type="button" className="type-tile" onClick={() => onNavigate('dispatch')}>
                {icon(typeIcon)}<span>{label}</span>
              </button>
            ))}
          </div>
          <a className="hotline" href="tel:09171234567">{icon('phone')}<span><strong>0917-123-4567</strong><small>Call center support</small></span></a>
        </section>

        <section className="card">
          <div className="card-head"><h2>{icon('calendar')} Today&apos;s checklist</h2></div>
          <ul className="reminder">{checklist.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="motto">Prepared communities respond faster together.</div>
        </section>
      </div>
    </>
  );
}
