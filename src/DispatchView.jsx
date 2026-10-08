import { useState } from 'react';
import './Official.css';

const responseTypes = ['Medical', 'Fire', 'Rescue', 'Evacuation'];

export default function DispatchView({ reports, dispatches, onDispatch }) {
  const dispatchableReports = reports.filter((report) => !['Resolved', 'Closed'].includes(report.status));
  const [reportId, setReportId] = useState(dispatchableReports[0]?.id ?? '');
  const [responseType, setResponseType] = useState('Medical');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const submitDispatch = (event) => {
    event.preventDefault();
    if (!reportId || !responseType) {
      setFormError('Choose an open report and a response type before dispatching.');
      return;
    }
    const selectedReport = dispatchableReports.find((report) => report.id === reportId);
    if (!selectedReport) {
      setFormError('That report is no longer available for dispatch.');
      return;
    }
    onDispatch({ reportId, responseType, note: note.trim() });
    setConfirmation(`${responseType} response assigned to ${selectedReport.id}.`);
    setNote('');
    setFormError('');
  };

  return (
    <div className="dispatch-grid">
      <section className="card">
        <div className="card-head"><div><h2>Dispatch a response</h2><p className="muted">Choose the response needed for an open sample report.</p></div></div>
        {dispatchableReports.length === 0 ? <p className="empty">There are no open reports to dispatch.</p> : (
          <form className="settings-form" onSubmit={submitDispatch}>
            <label>Report<select value={reportId} onChange={(event) => setReportId(event.target.value)} required>
              {dispatchableReports.map((report) => <option key={report.id} value={report.id}>{report.id} · {report.type} · {report.location}</option>)}
            </select></label>
            <label>Response type<select value={responseType} onChange={(event) => setResponseType(event.target.value)} required>
              {responseTypes.map((type) => <option key={type}>{type}</option>)}
            </select></label>
            <label>Dispatch note (optional)<textarea rows="4" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add instructions for the responding team" /></label>
            {formError && <p className="form-error" role="alert">{formError}</p>}
            {confirmation && <p className="form-notice" role="status">{confirmation}</p>}
            <button type="submit" className="btn btn-maroon">Dispatch response</button>
          </form>
        )}
      </section>
      <section className="card">
        <div className="card-head"><div><h2>Recent dispatches</h2><p className="muted">Sample dispatch actions are kept for this session.</p></div></div>
        <div className="stack">
          {dispatches.length === 0 ? <p className="empty">No responses dispatched yet.</p> : dispatches.map((dispatch) => (
            <article key={dispatch.id} className="list-item">
              <strong>{dispatch.responseType} · {dispatch.reportId}</strong>
              {dispatch.note && <p>{dispatch.note}</p>}
              <small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dispatch.createdAt))}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
