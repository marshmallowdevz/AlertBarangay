import { supabase } from './supabaseClient';

const reportColumns = 'id, report_code, type, severity, status, location, description, author, created_at';

function toReport(row) {
  return {
    ...row,
    id: row.report_code,
    databaseId: row.id,
    time: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.created_at)),
    dispatchHistory: [],
  };
}

export async function listReports() {
  const { data, error } = await supabase
    .from('reports')
    .select(reportColumns)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toReport);
}

export async function createReport({ type, severity, location, description, author }) {
  const { data, error } = await supabase
    .from('reports')
    .insert({ type, severity, location, description, author })
    .select(reportColumns)
    .single();

  if (error) throw error;
  return toReport(data);
}
