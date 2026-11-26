import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import './Official.css';
import LoadingIndicator from './LoadingIndicator';

// Labangon, Cebu City. Used until at least one report has GPS coordinates.
const DEFAULT_CENTER = [10.3005, 123.8851];
const finished = ['Resolved', 'Closed', 'Done'];
const statusStyle = {
  Pending: { color: '#B42318', label: 'Pending' },
  'In progress': { color: '#B54708', label: 'Responding' },
  Resolved: { color: '#067647', label: 'Resolved' },
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

/** Live OpenStreetMap view of reports that have GPS coordinates. */
export default function MapView({ reports, loading, error }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const leafletRef = useRef(null);
  const fittedRef = useRef(false);
  const [showResolved, setShowResolved] = useState(false);
  const [mapError, setMapError] = useState('');

  const visible = useMemo(() => reports.filter((report) => showResolved || !finished.includes(report.status)), [reports, showResolved]);
  const located = useMemo(() => visible.filter((report) => Number.isFinite(report.lat) && Number.isFinite(report.lng)), [visible]);
  const unlocated = visible.length - located.length;

  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((module) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const L = module.default ?? module;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true }).setView(DEFAULT_CENTER, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      // The map may be created while the card is still settling its size.
      window.setTimeout(() => map.invalidateSize(), 150);
    }).catch(() => { if (!cancelled) setMapError('The map could not be loaded. Check your connection and try again.'); });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    located.forEach((report) => {
      const style = statusStyle[report.status] ?? statusStyle.Pending;
      L.circleMarker([report.lat, report.lng], {
        radius: 9, color: '#ffffff', weight: 2, fillColor: style.color, fillOpacity: 0.95,
      })
        .bindPopup(`<strong>${escapeHtml(report.id)} · ${escapeHtml(report.type)}</strong><br>${escapeHtml(style.label)} · ${escapeHtml(report.time)}<br>${escapeHtml(report.description)}<br><a href="https://www.google.com/maps/dir/?api=1&destination=${report.lat},${report.lng}" target="_blank" rel="noreferrer">Directions</a>`)
        .bindTooltip(`${escapeHtml(report.id)} · ${escapeHtml(report.type)} (${escapeHtml(style.label)})`)
        .addTo(layer);
    });
    if (located.length && !fittedRef.current) {
      map.fitBounds(L.latLngBounds(located.map((report) => [report.lat, report.lng])), { padding: [40, 40], maxZoom: 17 });
      fittedRef.current = true;
    }
  }, [located, mapError]);

  return (
    <section className="card">
      <div className="card-head">
        <div><h2>Live incident map</h2><p className="muted">Reports with GPS locations. New reports and status changes appear automatically.</p></div>
        <label className="inline-toggle"><input type="checkbox" checked={showResolved} onChange={(event) => setShowResolved(event.target.checked)} /> Show resolved</label>
      </div>
      <ul className="map-legend" aria-label="Map legend">
        {Object.values(statusStyle).filter((style) => showResolved || style.label !== 'Resolved').map((style) => (
          <li key={style.label}><span className="map-dot" style={{ background: style.color }} aria-hidden="true" />{style.label}</li>
        ))}
      </ul>
      {loading && <LoadingIndicator message="Loading reports…" />}
      {(error || mapError) && <p className="form-error" role="alert">{error || mapError}</p>}
      <div ref={containerRef} className="incident-map" role="region" aria-label="Map of incident reports" />
      <p className="muted map-footnote">
        {located.length} report{located.length === 1 ? '' : 's'} on the map
        {unlocated > 0 && ` · ${unlocated} without GPS (typed address only), see Incident reports`}
      </p>
    </section>
  );
}
