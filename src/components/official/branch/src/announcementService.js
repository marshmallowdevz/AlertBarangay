import { supabase } from './supabaseClient';

const announcementColumns = 'id, title, body, created_at, is_published, published_at';

export async function listAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select(announcementColumns)
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, author: 'Barangay', is_archived: false }));
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

export async function deleteAnnouncement(id) {
  const { data, error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No announcement was deleted. It may already be gone, or the latest announcement permissions migration has not been applied.');
}

export async function updateAnnouncement({ id, title, body }) {
  const { data, error } = await supabase
    .from('announcements')
    .update({ title, body })
    .eq('id', id)
    .select(announcementColumns)
    .single();

  if (error) throw error;
  return data;
}

export async function archiveAnnouncement(id, isArchived) {
  const { data, error } = await supabase
    .from('announcements')
    .update({ is_archived: isArchived })
    .eq('id', id)
    .select(announcementColumns)
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToAnnouncements(onInsert, onUpdate, onDelete, onError) {
  const channel = supabase
    .channel('public-announcements')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, ({ new: announcement }) => { if (announcement.is_published) onInsert({ ...announcement, author: 'Barangay', is_archived: false }); })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'announcements' }, ({ new: announcement }) => { if (announcement.is_published) onUpdate({ ...announcement, author: 'Barangay', is_archived: false }); })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, ({ old: announcement }) => onDelete(announcement.id))
    .subscribe((status) => {
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        onError?.(new Error(`Announcement updates are unavailable (${status.toLowerCase().replaceAll('_', ' ')}).`));
      }
    });

  return () => { supabase.removeChannel(channel); };
}
