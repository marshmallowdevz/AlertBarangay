import { useMemo, useState } from 'react';
import './Official.css';
import { ReportMessages } from '@/components/messages/report-messages';

const finished = ['Resolved', 'Closed', 'Done'];

/**
 * One private thread per incident report, between barangay staff and the
 * resident who filed it. Residents are never shown by name, email or phone.
 */
export default function MessagesView({ reports, userId }) {
  const [showClosed, setShowClosed] = useState(false);
  const threads = useMemo(
    () => reports.filter((report) => report.incidentId && (showClosed || !finished.includes(report.status))),
    [reports, showClosed],
  );
  const [activeId, setActiveId] = useState('');
  const active = threads.find((report) => report.incidentId === activeId) ?? threads[0];

  return (
    <section className="card">
      <div className="card-head">
        <div><h2>Messages</h2><p className="muted">Message the resident who filed a report. Your phone number and email stay private, and so do theirs.</p></div>
        <label className="inline-toggle"><input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)} /> Show resolved reports</label>
      </div>
      {!userId ? <p className="empty">Sign in with your official account to message residents.</p>
        : threads.length === 0 ? <p className="empty">{showClosed ? 'No reports yet.' : 'No open reports. Turn on “Show resolved reports” to see older threads.'}</p> : (
          <div className="message-layout">
            <nav className="conversation-list" aria-label="Report threads">
              {threads.map((report) => (
                <button type="button" key={report.incidentId} aria-current={active?.incidentId === report.incidentId ? 'true' : undefined} className={`conversation-button ${active?.incidentId === report.incidentId ? 'active' : ''}`} onClick={() => setActiveId(report.incidentId)}>
                  <strong>{report.id} · {report.type}</strong>
                  <small>{report.status} · {report.location}</small>
                </button>
              ))}
            </nav>
            {active && (
              <div className="message-thread">
                <h3>{active.id} · {active.type}</h3>
                <p className="muted">{active.description}</p>
                <ReportMessages key={active.incidentId} incidentId={active.incidentId} viewerId={userId} viewer="staff" />
              </div>
            )}
          </div>
        )}
    </section>
  );
}
