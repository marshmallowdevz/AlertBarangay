import { supabase } from './supabaseClient';

const announcementColumns = 'id, title, body, author, created_at';

export async function listAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select(announcementColumns)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createAnnouncement({ title, body, author }) {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ title, body, author })
    .select(announcementColumns)
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToAnnouncements(onInsert, onError) {
  const channel = supabase
    .channel('public-announcements')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, ({ new: announcement }) => onInsert(announcement))
    .subscribe((status) => {
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        onError?.(new Error(`Announcement updates are unavailable (${status.toLowerCase().replaceAll('_', ' ')}).`));
      }
    });

  return () => { supabase.removeChannel(channel); };
}
