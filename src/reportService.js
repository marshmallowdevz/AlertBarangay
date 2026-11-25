import { supabase } from './supabaseClient';

const reportColumns = 'id, report_code, type, severity, status, location, description, author, media_urls, created_at';
const historyColumns = 'id, report_id, event_type, previous_status, new_status, response_type, note, actor_label, created_at';
const incidentColumns = 'id, eid, type, description, lat, lng, status, media_path, media_type, media_paths, media_types, reporter_id, created_at';

const incidentTypeLabels = {
  fire: 'Fire',
  medical: 'Medical',
  flood: 'Flooding',
  crime: 'Crime',
  accident: 'Accident',
  other: 'Other',
  electrical_hazard: 'Electrical Hazard',
  garbage_collection: 'Garbage Collection',
  road_damage: 'Road Damage',
  water_problems: 'Water Problems',
};

function toHistory(row) {
  return {
    id: row.id,
    reportId: row.report_id,
    eventType: row.event_type ?? 'status_changed',
    oldStatus: row.previous_status,
    newStatus: row.new_status ?? row.status,
    responseType: row.response_type,
    note: row.note,
    actorLabel: row.actor_label,
    createdAt: row.created_at,
  };
}

function isMissingRelation(error) {
  return ['42P01', 'PGRST205'].includes(error?.code)
    || /relation .* does not exist|could not find the table .* in the schema cache/i.test(error?.message || '');
}

function isMissingHistoryColumns(error) {
  return ['42703', 'PGRST204'].includes(error?.code)
    || /column .* does not exist|could not find .* column .* in the schema cache/i.test(error?.message || '');
}

async function allowMissingRelation(query) {
  const result = await query;
  return isMissingRelation(result.error) ? { data: [], error: null } : result;
}

function toReport(row, history = []) {
  return {
    ...row,
    id: row.report_code,
    databaseId: row.id,
    mediaItems: (Array.isArray(row.media_urls) ? row.media_urls : row.media_urls ? [row.media_urls] : [])
      .filter(Boolean)
      .map((url) => ({ url, type: /\.(mp4|mov|webm|3gp)(\?|$)/i.test(url) ? 'video' : 'image' })),
    time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.created_at)),
    dispatchHistory: history,
  };
}

function toIncidentReport(row, history = [], mediaItems = [], author = 'Resident') {
  const statusLabels = { pending: 'Pending', responding: 'In progress', resolved: 'Resolved' };
  return {
    id: row.eid,
    databaseId: row.id,
    type: incidentTypeLabels[row.type] ?? row.type,
    severity: null,
    status: statusLabels[row.status] ?? row.status,
    location: `${Number(row.lat).toFixed(6)}, ${Number(row.lng).toFixed(6)}`,
    description: row.description,
    author,
    created_at: row.created_at,
    time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.created_at)),
    source: 'incident',
    mediaItems,
    dispatchHistory: history,
  };
}

export async function listReportHistory(reportIds) {
  if (!reportIds.length) return [];
  const extended = await supabase
    .from('report_history')
    .select(historyColumns)
    .in('report_id', reportIds)
    .order('created_at', { ascending: true });

  if (!extended.error) return (extended.data ?? []).map(toHistory);
  if (!isMissingHistoryColumns(extended.error)) throw extended.error;

  const legacy = await supabase.from('report_history')
    .select('id, report_id, status, created_at')
    .in('report_id', reportIds)
    .order('created_at', { ascending: true });
  if (legacy.error) throw legacy.error;
  return (legacy.data ?? []).map(toHistory);
}

export async function listReports() {
  const [reportsResult, incidentsResult] = await Promise.all([
    supabase.from('reports').select(reportColumns).order('created_at', { ascending: false }),
    supabase.from('incidents').select(incidentColumns).order('created_at', { ascending: false }),
  ]);

  if (reportsResult.error) throw reportsResult.error;
  if (incidentsResult.error) throw incidentsResult.error;

  const rows = reportsResult.data ?? [];
  const incidents = incidentsResult.data ?? [];
  const incidentIds = incidents.map((incident) => incident.id);
  const reporterIds = [...new Set(incidents.map((incident) => incident.reporter_id).filter(Boolean))];
  const [history, incidentDispatchesResult, incidentStatusResult, profilesResult] = await Promise.all([
    listReportHistory(rows.map((row) => row.id)),
    incidentIds.length
      ? allowMissingRelation(supabase.from('incident_dispatches')
        .select('id, incident_id, response_type, note, created_at')
        .in('incident_id', incidentIds)
        .order('created_at', { ascending: true }))
      : Promise.resolve({ data: [], error: null }),
    incidentIds.length
      ? allowMissingRelation(supabase.from('incident_status_history')
        .select('id, incident_id, previous_status, new_status, actor_role, actor_id, created_at')
        .in('incident_id', incidentIds)
        .order('created_at', { ascending: true }))
      : Promise.resolve({ data: [], error: null }),
    reporterIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', reporterIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (incidentDispatchesResult.error) throw incidentDispatchesResult.error;
  if (incidentStatusResult.error) throw incidentStatusResult.error;
  if (profilesResult.error) console.warn('Reporter names could not be loaded for the officials dashboard.', profilesResult.error);

  const mediaPaths = [...new Set(incidents.flatMap((incident) => {
    const paths = Array.isArray(incident.media_paths) && incident.media_paths.length
      ? incident.media_paths
      : incident.media_path ? [incident.media_path] : [];
    return paths.filter((path) => path && !/^https?:\/\//i.test(path));
  }))];
  const mediaUrls = new Map();
  if (mediaPaths.length) {
    const { data, error } = await supabase.storage.from('incident-media').createSignedUrls(mediaPaths, 3600);
    if (error) {
      console.warn('Incident attachments could not be signed for the officials dashboard.', error);
    } else {
      for (const item of data ?? []) {
        if (item.path && item.signedUrl) mediaUrls.set(item.path, item.signedUrl);
      }
    }
  }

  const historyByReport = new Map();
  for (const event of history) {
    const events = historyByReport.get(event.reportId) ?? [];
    events.push(event);
    historyByReport.set(event.reportId, events);
  }
  const incidentStatusLabels = { pending: 'Pending', responding: 'In progress', resolved: 'Resolved' };
  const incidentHistoryById = new Map();
  for (const event of incidentStatusResult.data ?? []) {
    const events = incidentHistoryById.get(event.incident_id) ?? [];
    events.push({
      id: event.id,
      eventType: event.previous_status ? 'status_changed' : 'created',
      newStatus: incidentStatusLabels[event.new_status] ?? event.new_status,
      actorLabel: event.actor_role === 'admin' ? 'Barangay admin'
        : event.actor_role === 'official' ? 'Barangay official' : 'Resident',
      createdAt: event.created_at,
    });
    incidentHistoryById.set(event.incident_id, events);
  }
  for (const event of incidentDispatchesResult.data ?? []) {
    const events = incidentHistoryById.get(event.incident_id) ?? [];
    events.push({
      id: event.id,
      eventType: 'dispatched',
      responseType: event.response_type,
      note: event.note,
      actorLabel: 'Barangay official',
      createdAt: event.created_at,
    });
    incidentHistoryById.set(event.incident_id, events);
  }
  for (const events of incidentHistoryById.values()) {
    events.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
  }
  const reporterNames = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]));

  return [
    ...rows.map((row) => toReport(row, historyByReport.get(row.id) ?? [])),
    ...incidents.map((incident) => {
      const paths = Array.isArray(incident.media_paths) && incident.media_paths.length
        ? incident.media_paths
        : incident.media_path ? [incident.media_path] : [];
      const types = Array.isArray(incident.media_types) && incident.media_types.length
        ? incident.media_types
        : incident.media_type ? [incident.media_type] : [];
      const mediaItems = paths.map((path, index) => ({
        url: /^https?:\/\//i.test(path) ? path : mediaUrls.get(path) ?? '',
        type: types[index] === 'video' ? 'video' : 'image',
      })).filter((item) => item.url);
      return toIncidentReport(
        incident,
        incidentHistoryById.get(incident.id) ?? [],
        mediaItems,
        reporterNames.get(incident.reporter_id) || 'Resident',
      );
    }),
  ].sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
}

export async function dispatchReport({ reportId, responseType, note }) {
  const { data, error } = await supabase.rpc('dispatch_report', {
    p_report_id: reportId,
    p_response_type: responseType,
    p_note: note,
  });

  if (error) throw error;
  return toHistory(data);
}

export async function dispatchIncident({ incidentId, responseType, note }) {
  const { data, error } = await supabase.rpc('dispatch_incident', {
    p_incident_id: incidentId,
    p_response_type: responseType,
    p_note: note,
  });

  if (error) throw error;
  return data;
}

export async function resolveIncident({ incidentId }) {
  const { data, error } = await supabase.from('incidents')
    .update({ status: 'resolved' })
    .eq('id', incidentId)
    .neq('status', 'resolved')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('This incident is already resolved or is no longer available.');
  return data;
}

export function subscribeToIncidents(onChange, onError) {
  const channel = supabase
    .channel('dashboard-incidents')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, onChange)
    .subscribe((status) => {
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        onError?.(new Error(`Incident updates are unavailable (${status.toLowerCase().replaceAll('_', ' ')}).`));
      }
    });

  return () => { supabase.removeChannel(channel); };
}
