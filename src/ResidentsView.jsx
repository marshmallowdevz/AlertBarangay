import { useMemo, useState } from 'react';
import './Official.css';

export default function ResidentsView({ residents }) {
  const [query, setQuery] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const filteredResidents = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return residents.filter((resident) => `${resident.name} ${resident.purok} ${resident.address} ${resident.phone}`.toLocaleLowerCase().includes(search));
  }, [query, residents]);
  const selectedResident = residents.find((resident) => resident.id === selectedResidentId);

  return (
    <>
      <section className="card">
        <div className="card-head"><div><h2>Registered residents</h2><p className="muted">Sample resident records; this view is not connected to a live registry.</p></div></div>
        <label className="search-field">Search by name, purok, address, or phone<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search residents" /></label>
        <div className="resident-list">
          {filteredResidents.length === 0 ? <p className="empty">No residents match that search.</p> : filteredResidents.map((resident) => (
            <button type="button" key={resident.id} className={`resident-row ${selectedResidentId === resident.id ? 'selected' : ''}`} onClick={() => setSelectedResidentId(resident.id)}>
              <span className="resident-avatar" aria-hidden="true">{resident.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
              <span><strong>{resident.name}</strong><small>{resident.purok} · {resident.address}</small></span>
              <span className="resident-phone">{resident.phone}</span>
            </button>
          ))}
        </div>
      </section>
      {selectedResident && <section className="card"><div className="card-head"><h2>{selectedResident.name}</h2></div><p>{selectedResident.purok}</p><p className="muted">{selectedResident.address}</p><p><a href={`tel:${selectedResident.phone}`}>{selectedResident.phone}</a></p></section>}
    </>
  );
}
