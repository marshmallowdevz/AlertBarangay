import { supabase } from './supabaseClient';

const typeNames = {
  fire: 'Fire', medical: 'Medical', flood: 'Flooding', crime: 'Other', accident: 'Other', other: 'Other',
};

function toReport(row) {
  const status = row.status === 'responding' ? 'In progress' : row.status === 'resolved' ? 'Resolved' : 'Pending';
  const location = row.location_text
    || (row.lat != null && row.lng != null ? `GPS ${Number(row.lat).toFixed(5)}, ${Number(row.lng).toFixed(5)}` : 'Location not provided');
  return {
    id: row.eid,
    databaseId: `incident:${row.id}`,
    type: typeNames[row.type] || 'Other',
    severity: ['fire', 'flood', 'crime', 'accident'].includes(row.type) ? 'High' : 'Medium',
    status,
    location,
    description: row.description,
    author: 'Resident',
    created_at: row.created_at,
    time: new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.created_at)),
    dispatchHistory: [],
  };
}

export async function listReportHistory() { return []; }

export async function listReports() {
  const { data, error } = await supabase
    .from('incidents')
    // location_text was added after the base incidents table. Select all
    // available columns so older databases still load reports successfully.
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'The incident report query failed.');
  return (data ?? []).map(toReport);
}

async function updateIncidentStatus(reportId, status) {
  const incidentId = reportId.startsWith('incident:') ? reportId.slice('incident:'.length) : reportId;
  const { data, error } = await supabase
    .from('incidents')
    .update({ status })
    .eq('id', incidentId)
    .select('*')
    .single();
  if (error) throw new Error(error.message || 'The incident status update failed.');
  return toReport(data);
}

export async function dispatchReport({ reportId }) {
  return updateIncidentStatus(reportId, 'responding');
}

export async function markReportDone({ reportId }) {
  return updateIncidentStatus(reportId, 'resolved');
}
