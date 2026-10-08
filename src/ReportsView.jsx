import { useState } from 'react';
import './Official.css';

export default function ReportsView({ reports, selectedReportId, onSelectReport, onCreateReport }) {
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [draft, setDraft] = useState({ type: 'Medical', severity: 'Medium', location: '', description: '' });
  const selectedReport = reports.find((report) => report.id === selectedReportId);

  const submitReport = (event) => {
    event.preventDefault();
    if (!draft.location.trim() || !draft.description.trim()) {
      setFormError('Enter the incident location and description.');
      return;
    }
    onCreateReport({ ...draft, location: draft.location.trim(), description: draft.description.trim() });
    setDraft({ type: 'Medical', severity: 'Medium', location: '', description: '' });
    setFormOpen(false);
    setFormError('');
  };

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div><h2>Reports</h2><p className="muted">Sample incident reports for this dashboard preview.</p></div>
          <button type="button" className="btn btn-maroon" onClick={() => setFormOpen(true)}>+ New report</button>
        </div>
        {reports.length === 0 ? <p className="empty">No reports to show.</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Location</th><th>Reported</th></tr></thead>
              <tbody>{reports.map((report) => (
                <tr key={report.id} className={selectedReportId === report.id ? 'selected-row' : ''}>
                  <td><button type="button" className="table-link" aria-pressed={selectedReportId === report.id} onClick={() => onSelectReport(report.id)}>{report.type} · {report.id}</button></td>
                  <td><span className={`pill ${report.severity === 'High' ? 'sev-high' : report.severity === 'Medium' ? 'sev-medium' : 'sev-low'}`}>{report.severity}</span></td>
                  <td><span className={`pill ${report.status === 'In progress' ? 'st-inprogress' : report.status === 'Resolved' ? 'st-resolved' : 'st-pending'}`}>{report.status}</span></td>
                  <td>{report.location}</td><td>{report.time}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {selectedReport && (
        <section className="card">
          <div className="card-head"><h2>Report {selectedReport.id}</h2><span className="pill sev-medium">{selectedReport.type}</span></div>
          <p><strong>Location:</strong> {selectedReport.location}</p>
          <p className="muted">{selectedReport.description}</p>
          <p className="muted">Status: {selectedReport.status} · Severity: {selectedReport.severity}</p>
        </section>
      )}

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}>
          <form className="modal" role="dialog" aria-modal="true" aria-labelledby="new-report-title" onSubmit={submitReport}>
            <h2 id="new-report-title">Create a report</h2>
            <p className="muted">This report is added to the sample dashboard for this session.</p>
            <label>Incident type<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option>Medical</option><option>Fire</option><option>Rescue</option><option>Flooding</option><option>Power</option><option>Other</option></select></label>
            <label>Severity<select value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value })}><option>Low</option><option>Medium</option><option>High</option></select></label>
            <label>Location<input value={draft.location} maxLength={160} onChange={(event) => setDraft({ ...draft, location: event.target.value })} required /></label>
            <label>Description<textarea rows="4" maxLength={1000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} required /></label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>Cancel</button><button type="submit" className="btn btn-maroon">Save report</button></div>
          </form>
        </div>
      )}
    </>
  );
}
