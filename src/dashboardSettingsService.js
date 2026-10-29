import { supabase } from './supabaseClient';

const settingsColumns = 'id, name, picture, updated_at';

export async function getDashboardSettings() {
  const { data, error } = await supabase
    .from('dashboard_settings')
    .select(settingsColumns)
    .eq('id', 'main')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getOrInitializeDashboardSettings(initial) {
  const existing = await getDashboardSettings();
  if (existing) return existing;

  const { error: insertError } = await supabase
    .from('dashboard_settings')
    .upsert({ id: 'main', name: initial.name, picture: initial.picture }, { onConflict: 'id', ignoreDuplicates: true });

  if (insertError) throw insertError;
  const settings = await getDashboardSettings();
  if (!settings) throw new Error('Dashboard profile was not available after initialization.');
  return settings;
}

export async function saveDashboardSettings({ name, picture }) {
  const { data, error } = await supabase
    .from('dashboard_settings')
    .upsert({ id: 'main', name, picture, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select(settingsColumns)
    .single();

  if (error) throw error;
  return data;
}
