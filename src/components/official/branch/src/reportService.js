import { supabase } from './supabaseClient';
import { fetchJson } from '@/lib/fetch-json';

const typeNames = {
  fire: 'Fire',
  medical: 'Medical',
  flood: 'Flooding',
  crime: 'Crime',
  accident: 'Accident',
  electrical_hazard: 'Electrical Hazard',
  garbage_collection: 'Garbage Collection',
  road_damage: 'Road Damage',
  water_problems: 'Water Problems',
  other: 'Other',
};

function toReport(row) {
  const status = row.status === 'responding' ? 'In progress' : row.status === 'resolved' ? 'Resolved' : 'Pending';
  const location = row.location_text
    || (row.lat != null && row.lng != null ? `GPS ${Number(row.lat).toFixed(5)}, ${Number(row.lng).toFixed(5)}` : 'Location not provided');
  return {
    id: row.eid,
    eid: row.eid,
    incidentId: row.id,
    databaseId: `incident:${row.id}`,
    type: typeNames[row.type] || 'Other',
    severity: ['fire', 'flood', 'crime', 'accident'].includes(row.type) ? 'High' : 'Medium',
    status,
    location,
    description: row.description,
    author: 'Resident',
    created_at: row.created_at,
    media_path: row.media_path ?? row.media_paths?.[0] ?? null,
    media_type: row.media_type ?? row.media_types?.[0] ?? null,
    media_paths: Array.isArray(row.media_paths) ? row.media_paths : [],
    media_types: Array.isArray(row.media_types) ? row.media_types : [],
    time: new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.created_at)),
    dispatchHistory: [],
  };
}

export async function listReportHistory() { return []; }

export async function listReports() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const { data, error } = await supabase
      .from('incidents')
      // location_text was added after the base incidents table. Select all
      // available columns so older databases still load reports successfully.
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal);
    if (error) {
      if (controller.signal.aborted) throw new Error('Incident reports timed out. Check your connection and retry.');
      throw new Error(error.message || 'The incident report query failed.');
    }
    return (data ?? []).map(toReport);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Incident reports timed out. Check your connection and retry.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function listDispatches() {
  const { dispatches } = await fetchJson('/api/official/dispatches');
  return (dispatches ?? []).map((dispatch) => ({
    id: dispatch.id,
    responseType: dispatch.response_type,
    reportTitle: dispatch.incident?.description || dispatch.incident?.type || 'Incident',
    note: dispatch.note,
    createdAt: dispatch.created_at,
  }));
}

async function updateIncidentStatus(reportId, status) {
  const incidentId = reportId.startsWith('incident:') ? reportId.slice('incident:'.length) : reportId;
  const { incident } = await fetchJson(`/api/official/incidents/${incidentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return toReport(incident);
}

export async function dispatchReport({ reportId, responseType, note }) {
  const incidentId = reportId.startsWith('incident:') ? reportId.slice('incident:'.length) : reportId;
  const { dispatch } = await fetchJson('/api/official/dispatches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incidentId, responseType, note }),
  });
  return dispatch;
}

export async function markReportDone({ reportId }) {
  return updateIncidentStatus(reportId, 'resolved');
}
