import './Official.css';
import LoadingIndicator from './LoadingIndicator';
import Icon from './Icon';

const icon = (name) => <Icon name={name} />;

const responseTypes = [
  { label: 'Fire', icon: 'fire' },
  { label: 'Rescue', icon: 'dispatch' },
  { label: 'Department of Public Services', icon: 'trash' },
  { label: 'Visayan Electric', icon: 'electric' },
  { label: 'MCWD', icon: 'water' },
  { label: 'DPWH', icon: 'road' },
  { label: 'CCDRRMO', icon: 'alert' },
];

function toTelHref(phone = '') {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export default function OverviewView({ onNavigate, contacts, onManageContacts, reports = [], reportsLoading, reportsError, onRetryReports }) {
  const communityContacts = (contacts.emergency_contacts || []).filter((contact) => contact.id !== 'emergency-line');
  const activeReports = reports.filter((report) => !['Resolved', 'Closed'].includes(report.status));
  const copyPhone = async (phone) => {
    try { await navigator.clipboard.writeText(phone); } catch { window.prompt('Copy this phone number', phone); }
  };
  return (
    <div className="overview-card-grid">
      <div className="overview-main-column">
        <section className="card">
        <div className="card-head"><h2>{icon('response')} Response types</h2><button type="button" className="link-btn" onClick={() => onNavigate('dispatch')}>Open dispatch</button></div>
        <div className="type-grid">
          {responseTypes.map(({ label, icon: typeIcon }) => (
            <button key={label} type="button" className="type-tile" onClick={() => onNavigate('dispatch')}>
              {icon(typeIcon)}<span>{label}</span>
            </button>
          ))}
        </div>
        </section>

        <section className="card overview-reports-card">
          <div className="card-head"><div><h2>{icon('dispatch')} Incident reports</h2><p className="muted">{activeReports.length} open report{activeReports.length === 1 ? '' : 's'}</p></div><button type="button" className="link-btn" onClick={() => onNavigate('reports')}>View all reports</button></div>
          {reportsLoading && <LoadingIndicator message="Loading incident reports…" />}
          {reportsError && <div className="error-row"><p className="form-error" role="alert">{reportsError}</p>{onRetryReports && <button type="button" className="link-btn" onClick={onRetryReports}>Retry</button>}</div>}
          {!reportsLoading && !reportsError && activeReports.length === 0 && <p className="empty">There are no open incident reports.</p>}
          {!reportsLoading && !reportsError && activeReports.slice(0, 3).map((report) => <article className="overview-report-item" key={report.databaseId ?? report.id}>
            <div><strong>{report.id}</strong><span className={`status-pill status-${report.status.toLowerCase().replaceAll(' ', '-')}`}>{report.status}</span></div>
            <p>{report.type} · {report.location}</p>
          </article>)}
        </section>
      </div>

      <div className="overview-side-column">
        <section className="card">
        <div className="card-head"><h2>{icon('phone')} Who to call</h2><button type="button" className="btn btn-outline" onClick={onManageContacts}>{icon('settings')} Manage contacts</button></div>
        {communityContacts.length ? <div className="community-contact-list">
          {communityContacts.map((contact) => <article className="community-contact" key={contact.id}>
            <strong>{contact.name}</strong><p>{contact.phone}</p>
            <div className="community-contact-actions">
              <a className="btn btn-outline" href={toTelHref(contact.phone)}>{icon('phone')} Call</a>
              <button type="button" className="btn btn-outline" onClick={() => copyPhone(contact.phone)}>{icon('copy')} Copy</button>
            </div>
          </article>)}
        </div> : <p className="empty">No barangay contacts have been added yet.</p>}
        </section>
      </div>
    </div>
  );
}
