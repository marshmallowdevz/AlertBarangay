import './Official.css';
import LoadingIndicator from './LoadingIndicator';
import AnnouncementActionsMenu from './AnnouncementActionsMenu';
import Icon from './Icon';

const icon = (name) => <Icon name={name} />;

const responseTypes = [
  { label: 'Medical', icon: 'response' },
  { label: 'Fire', icon: 'fire' },
  { label: 'Rescue', icon: 'dispatch' },
  { label: 'Evacuation', icon: 'location' },
];

function toTelHref(phone = '') {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export default function OverviewView({ announcements, announcementLoading, announcementError, onRetryAnnouncements, onNavigate, onAnnounce, onEditAnnouncement, onDeleteAnnouncement, onArchiveAnnouncement, busyAnnouncementId, announcementActionError, contacts }) {
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
          {announcementLoading && <LoadingIndicator message="Loading announcements…" />}
          {announcementError && <div className="error-row"><p className="form-error" role="alert">{announcementError}</p>{onRetryAnnouncements && <button type="button" className="link-btn" onClick={onRetryAnnouncements} disabled={announcementLoading}>Retry</button>}</div>}
          {announcementActionError && <p className="form-error" role="alert">{announcementActionError}</p>}
          {!announcementLoading && !announcementError && announcements.filter((item) => !item.is_archived).length === 0 && <p className="empty">No announcements have been posted yet.</p>}
          {announcements.filter((item) => !item.is_archived).slice(0, 3).map((item) => (
            <article key={item.id} className="list-item announcement-item">
              <div className="announcement-heading">
                <strong>{item.title}</strong>
                {onEditAnnouncement && <AnnouncementActionsMenu announcement={item} onEdit={onEditAnnouncement} onDelete={onDeleteAnnouncement} onArchive={onArchiveAnnouncement} busy={busyAnnouncementId === item.id} />}
              </div>
              <p>{item.body}</p>
              <small>Posted by {item.author} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.created_at ?? item.createdAt))}</small>
            </article>
          ))}
        </div>
        <button type="button" className="link-btn" onClick={() => onNavigate('announcements')}>View all announcements</button>
      </section>

      <section className="card">
        <div className="card-head"><h2>{icon('response')} Response types</h2><button type="button" className="link-btn" onClick={() => onNavigate('dispatch')}>Open dispatch</button></div>
        <div className="type-grid">
          {responseTypes.map(({ label, icon: typeIcon }) => (
            <button key={label} type="button" className="type-tile" onClick={() => onNavigate('dispatch')}>
              {icon(typeIcon)}<span>{label}</span>
            </button>
          ))}
        </div>
        <a className="hotline" href={toTelHref(contacts.call_center_phone)}>{icon('phone')}<span><strong>{contacts.call_center_phone}</strong><small>Call center support</small></span></a>
      </section>
    </>
  );
}
