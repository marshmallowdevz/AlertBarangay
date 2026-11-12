import { useState } from 'react';
import './Official.css';
import LoadingIndicator from './LoadingIndicator';
import AnnouncementActionsMenu from './AnnouncementActionsMenu';

function formatCreatedAt(announcement) {
  const createdAt = announcement.created_at ?? announcement.createdAt;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(createdAt));
}

export default function AnnouncementsView({ announcements, loading, error, onRetry, onAnnounce, onEdit, onDelete, onArchive, busyAnnouncementId, actionError }) {
  const [showArchived, setShowArchived] = useState(false);
  const visibleAnnouncements = announcements.filter((item) => Boolean(item.is_archived) === showArchived);

  return (
    <section className="card">
      <div className="card-head">
        <div><h2>Community announcements</h2><p className="muted">Posts are shared with everyone using this dashboard.</p></div>
        <button type="button" className="btn btn-maroon" onClick={onAnnounce}>+ Announce</button>
      </div>
      <div className="announcement-filters" aria-label="Announcement filter">
        <button type="button" className={`chip ${!showArchived ? 'active' : ''}`} aria-pressed={!showArchived} onClick={() => setShowArchived(false)}>Active</button>
        <button type="button" className={`chip ${showArchived ? 'active' : ''}`} aria-pressed={showArchived} onClick={() => setShowArchived(true)}>Archived</button>
      </div>
      {loading && <LoadingIndicator message="Loading announcements…" />}
      {error && <div className="error-row"><p className="form-error" role="alert">{error}</p>{onRetry && <button type="button" className="btn btn-outline" onClick={onRetry} disabled={loading}>Retry</button>}</div>}
      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {!loading && !error && visibleAnnouncements.length === 0 && <p className="empty">{showArchived ? 'No archived announcements.' : 'No announcements have been posted yet.'}</p>}
      <div className="stack">
        {visibleAnnouncements.map((announcement) => (
          <article key={announcement.id} className="list-item announcement-item">
            <div className="announcement-heading">
              <strong>{announcement.title}</strong>
              {onEdit && <AnnouncementActionsMenu announcement={announcement} onEdit={onEdit} onDelete={onDelete} onArchive={onArchive} busy={busyAnnouncementId === announcement.id} />}
            </div>
            <p>{announcement.body}</p>
            <small>Posted by {announcement.author} · {formatCreatedAt(announcement)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
