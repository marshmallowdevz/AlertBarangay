import './Official.css';

const labels = {
  report_created: 'Report',
  report_dispatched: 'Dispatch',
  announcement_published: 'Announcement',
};

export default function NotificationsView({ notifications, loading, error, onRetry }) {
  return (
    <section className="card">
      <div className="card-head">
        <div><h2>Shared notifications</h2><p className="muted">Recent reports, response assignments, and announcements.</p></div>
        <button type="button" className="btn btn-outline" onClick={onRetry} disabled={loading || !onRetry}>Refresh</button>
      </div>
      {loading && <p className="muted" role="status">Loading notifications...</p>}
      {error && <p className="form-error" role="alert">Notifications could not be loaded: {error}</p>}
      {!loading && !error && notifications.length === 0 && <p className="empty">No notifications yet.</p>}
      <div className="stack">
        {notifications.map((item) => (
          <article key={item.id} className="list-item">
            <small>{labels[item.type] ?? 'Update'} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</small>
            <strong>{item.title}</strong>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
