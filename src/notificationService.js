import { supabase } from './supabaseClient';

const notificationColumns = 'id, event_type, title, body, report_id, announcement_id, created_at';

function toNotification(row) {
  return {
    id: row.id,
    type: row.event_type,
    title: row.title,
    body: row.body,
    reportId: row.report_id,
    announcementId: row.announcement_id,
    createdAt: row.created_at,
  };
}

export async function listNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select(notificationColumns)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []).map(toNotification);
}

export function subscribeToNotifications(onInsert, onError) {
  const channel = supabase
    .channel('public-notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, ({ new: row }) => onInsert(toNotification(row)))
    .subscribe((status) => {
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        onError?.(new Error(`Notification updates are unavailable (${status.toLowerCase().replaceAll('_', ' ')}).`));
      }
    });

  return () => { supabase.removeChannel(channel); };
}
