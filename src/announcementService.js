import { supabase } from './supabaseClient';

const announcementColumns = 'id, title, body, author, created_at, is_archived';

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
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, ({ new: announcement }) => onInsert(announcement))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'announcements' }, ({ new: announcement }) => onUpdate(announcement))
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, ({ old: announcement }) => onDelete(announcement.id))
    .subscribe((status) => {
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        onError?.(new Error(`Announcement updates are unavailable (${status.toLowerCase().replaceAll('_', ' ')}).`));
      }
    });

  return () => { supabase.removeChannel(channel); };
}
