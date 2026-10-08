import './Official.css';

function formatCreatedAt(announcement) {
  const createdAt = announcement.created_at ?? announcement.createdAt;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(createdAt));
}

export default function AnnouncementsView({ announcements, loading, error, onRetry, onAnnounce }) {
  return (
    <section className="card">
      <div className="card-head">
        <div><h2>Community announcements</h2><p className="muted">Posts are shared with everyone using this dashboard.</p></div>
        <button type="button" className="btn btn-maroon" onClick={onAnnounce}>+ Announce</button>
      </div>
      {loading && <p className="muted" role="status">Loading announcements…</p>}
      {error && <div className="error-row"><p className="form-error" role="alert">{error}</p><button type="button" className="btn btn-outline" onClick={onRetry} disabled={loading}>Retry</button></div>}
      {!loading && !error && announcements.length === 0 && <p className="empty">No announcements have been posted yet.</p>}
      <div className="stack">
        {announcements.map((announcement) => (
          <article key={announcement.id} className="list-item announcement-item">
            <strong>{announcement.title}</strong>
            <p>{announcement.body}</p>
            <small>Posted by {announcement.author} · {formatCreatedAt(announcement)}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
