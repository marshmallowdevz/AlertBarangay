import { useMemo, useState } from 'react';
import './Official.css';

const reportTypes = ['Medical', 'Fire', 'Rescue', 'Flooding', 'Power', 'Other'];
const reportStatuses = ['Pending', 'Assigned', 'In progress', 'Monitoring', 'Resolved', 'Closed'];
const reportSeverities = ['Low', 'Medium', 'High'];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function ReportsView({ reports, loading, error, onRetry }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All categories');
  const [status, setStatus] = useState('All statuses');
  const [severity, setSeverity] = useState('All severities');

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return reports.filter((report) => {
      const searchable = [report.id, report.type, report.severity, report.status, report.location, report.description, report.author]
        .filter(Boolean).join(' ').toLocaleLowerCase();
      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (type === 'All categories' || report.type === type)
        && (status === 'All statuses' || report.status === status)
        && (severity === 'All severities' || report.severity === severity);
    });
  }, [reports, query, type, status, severity]);

  return (
    <section className="card">
      <div className="card-head">
        <div><h2>Incident reports</h2><p className="muted">Review submitted incidents and their response history.</p></div>
        <span className="badge">{filteredReports.length} shown</span>
      </div>
      <div className="report-filters" role="search">
        <label className="search-field">Search reports
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, location, or details" />
        </label>
        <label>Category<select value={type} onChange={(event) => setType(event.target.value)}><option>All categories</option>{reportTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option>All statuses</option>{reportStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Severity<select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>All severities</option>{reportSeverities.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      {loading && <p className="muted" role="status">Loading incident reports…</p>}
      {error && <div className="error-row"><p className="form-error" role="alert">{error}</p><button type="button" className="btn btn-outline" onClick={onRetry} disabled={loading}>Retry</button></div>}
      {!loading && !error && filteredReports.length === 0 && <p className="empty">{reports.length ? 'No reports match these filters.' : 'No incident reports have been submitted yet.'}</p>}
      <div className="stack">
        {!error && filteredReports.map((report) => (
          <details key={report.databaseId ?? report.id} className="list-item report-record">
            <summary>
              <span><strong>{report.id}</strong><small>{report.type} · {report.location}</small></span>
              <span className={`status-pill status-${report.status.toLowerCase().replaceAll(' ', '-')}`}>{report.status}</span>
              <span className={`severity-label severity-${report.severity.toLowerCase()}`}>{report.severity}</span>
            </summary>
            <p>{report.description}</p>
            <small>Reported by {report.author || 'Resident'} · {formatDate(report.created_at)}</small>
            <h3>History</h3>
            {report.dispatchHistory?.length ? (
              <ol className="report-history">
                {report.dispatchHistory.map((event) => (
                  <li key={event.id}>
                    <strong>{event.eventType === 'dispatched' ? `${event.responseType} response assigned` : `Status: ${event.newStatus || 'Submitted'}`}</strong>
                    {event.note && <p>{event.note}</p>}
                    <small>{formatDate(event.createdAt)}</small>
                  </li>
                ))}
              </ol>
            ) : <p className="muted">No history is available for this report.</p>}
          </details>
        ))}
      </div>
    </section>
  );
}
