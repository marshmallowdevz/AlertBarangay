import { supabase } from './supabaseClient';

const reportColumns = 'id, report_code, type, severity, status, location, description, author, created_at';
const historyColumns = 'id, report_id, event_type, previous_status, new_status, response_type, note, actor_label, created_at';

function toHistory(row) {
  return {
    id: row.id,
    reportId: row.report_id,
    eventType: row.event_type,
    oldStatus: row.previous_status,
    newStatus: row.new_status,
    responseType: row.response_type,
    note: row.note,
    actorLabel: row.actor_label,
    createdAt: row.created_at,
  };
}

function toReport(row, history = []) {
  return {
    ...row,
    id: row.report_code,
    databaseId: row.id,
    time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.created_at)),
    dispatchHistory: history,
  };
}

export async function listReportHistory(reportIds) {
  if (!reportIds.length) return [];
  const { data, error } = await supabase
    .from('report_history')
    .select(historyColumns)
    .in('report_id', reportIds)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toHistory);
}

export async function listReports() {
  const { data, error } = await supabase
    .from('reports')
    .select(reportColumns)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = data ?? [];
  const history = await listReportHistory(rows.map((row) => row.id));
  const historyByReport = new Map();
  for (const event of history) {
    const events = historyByReport.get(event.reportId) ?? [];
    events.push(event);
    historyByReport.set(event.reportId, events);
  }
  return rows.map((row) => toReport(row, historyByReport.get(row.id) ?? []));
}

export async function createReport({ type, severity, location, description, author }) {
  const { data, error } = await supabase
    .from('reports')
    .insert({ type, severity, location, description, author })
    .select(reportColumns)
    .single();

  if (error) throw error;
  const history = await listReportHistory([data.id]);
  return toReport(data, history);
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
