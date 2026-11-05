import { supabase } from './supabaseClient';

const profileColumns = 'user_id, name, picture, updated_at';
const sharedProfileColumns = 'id, name, picture, updated_at';
const settingsColumns = 'id, emergency_phone, call_center_phone, updated_at';

export async function getOrInitializeSharedDashboardProfile() {
  const { data: existing, error: readError } = await supabase
    .from('dashboard_settings')
    .select(sharedProfileColumns)
    .eq('id', 'main')
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return existing;

  const { error: insertError } = await supabase
    .from('dashboard_settings')
    .upsert({ id: 'main' }, { onConflict: 'id', ignoreDuplicates: true });

  if (insertError) throw insertError;

  const { data: profile, error: profileError } = await supabase
    .from('dashboard_settings')
    .select(sharedProfileColumns)
    .eq('id', 'main')
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error('The shared profile was not available after initialization.');
  return profile;
}

export async function saveSharedDashboardProfile({ name, picture }) {
  const { data, error } = await supabase
    .from('dashboard_settings')
    .upsert({ id: 'main', name, picture, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select(sharedProfileColumns)
    .single();

  if (error) throw error;
  return data;
}

export async function getOrInitializeDashboardProfile(user) {
  if (!user?.id) throw new Error('Sign in before loading your profile.');

  const { data: existing, error: readError } = await supabase
    .from('dashboard_profiles')
    .select(profileColumns)
    .eq('user_id', user.id)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return existing;

  const name = user.user_metadata?.full_name?.trim()
    || user.email?.split('@')[0]?.trim()
    || 'Official User';
  const { error: insertError } = await supabase
    .from('dashboard_profiles')
    .upsert({ user_id: user.id, name, picture: '' }, { onConflict: 'user_id', ignoreDuplicates: true });

  if (insertError) throw insertError;

  const { data: profile, error: profileError } = await supabase
    .from('dashboard_profiles')
    .select(profileColumns)
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error('Your profile was not available after initialization.');
  return profile;
}

export async function saveDashboardProfile({ userId, name, picture }) {
  const { data, error } = await supabase
    .from('dashboard_profiles')
    .upsert({ user_id: userId, name, picture, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select(profileColumns)
    .single();

  if (error) throw error;
  return data;
}

export async function getOrInitializeDashboardContacts() {
  const { data: existing, error: readError } = await supabase
    .from('dashboard_settings')
    .select(settingsColumns)
    .eq('id', 'main')
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return existing;

  const { error: insertError } = await supabase
    .from('dashboard_settings')
    .upsert({ id: 'main' }, { onConflict: 'id', ignoreDuplicates: true });

  if (insertError) throw insertError;

  const { data: settings, error: settingsError } = await supabase
    .from('dashboard_settings')
    .select(settingsColumns)
    .eq('id', 'main')
    .maybeSingle();

  if (settingsError) throw settingsError;
  if (!settings) throw new Error('Shared contact settings were not available after initialization.');
  return settings;
}

export async function saveDashboardContacts({ emergencyPhone, callCenterPhone }) {
  const { data, error } = await supabase
    .from('dashboard_settings')
    .update({
      emergency_phone: emergencyPhone,
      call_center_phone: callCenterPhone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'main')
    .select(settingsColumns)
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToDashboardContacts(onUpdate, onError) {
  const channel = supabase
    .channel('shared-dashboard-contacts')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'dashboard_settings',
      filter: 'id=eq.main',
    }, ({ new: settings }) => onUpdate(settings))
    .subscribe((status) => {
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        onError?.(new Error(`Shared contact updates are unavailable (${status.toLowerCase().replaceAll('_', ' ')}).`));
      }
    });

  return () => { supabase.removeChannel(channel); };
}
