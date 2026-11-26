import { supabase } from './supabaseClient';

const profileColumns = 'id, full_name, avatar_url';
const sharedProfileColumns = 'id, full_name, avatar_url';
const settingsColumns = 'id, emergency_phone, call_center_phone, emergency_contacts, updated_at';

export async function getOrInitializeSharedDashboardProfile() {
  return { id: 'main', name: 'Barangay Official', picture: '' };
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
  const { data, error } = await supabase.from('profiles').select(profileColumns).eq('id', user.id).maybeSingle();
  if (error) throw error;
  return {
    user_id: user.id,
    name: data?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Official User',
    picture: data?.avatar_url || '',
  };
}

export async function saveDashboardProfile({ userId, name, picture }) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: name, avatar_url: picture || null })
    .eq('id', userId)
    .select(profileColumns)
    .single();

  if (error) throw error;
  return { name: data.full_name, picture: data.avatar_url || '' };
}

export async function getOrInitializeDashboardContacts() {
  const defaults = { id: 'main', emergency_phone: '911', call_center_phone: '0917-123-4567', emergency_contacts: [
    { id: 'emergency-line', name: 'Emergency line', phone: '911' },
    { id: 'call-center', name: 'Call center support', phone: '0917-123-4567' },
  ] };
  try {
    const saved = window.localStorage.getItem('alertBarangay.officialContacts');
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  } catch {
    return defaults;
  }
}

export async function saveDashboardContacts({ emergencyPhone, callCenterPhone, emergencyContacts }) {
  const settings = { id: 'main', emergency_phone: emergencyPhone, call_center_phone: callCenterPhone, emergency_contacts: emergencyContacts, updated_at: new Date().toISOString() };
  window.localStorage.setItem('alertBarangay.officialContacts', JSON.stringify(settings));
  return settings;
}

export function subscribeToDashboardContacts(onUpdate, onError) {
  return () => {};
}
