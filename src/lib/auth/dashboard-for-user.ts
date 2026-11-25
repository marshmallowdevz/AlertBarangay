import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoleDashboardPath } from "@/lib/auth/roles";

export type DashboardResult = { ok: true; destination: string } | { ok: false; message: string };

/**
 * Looks up the signed-in user's real role in public.profiles and returns the
 * dashboard path for it. Only id and role are read, so this works even on a
 * database that does not have the is_active column yet.
 */
export async function dashboardForUser(supabase: SupabaseClient, userId: string): Promise<DashboardResult> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false, message: "We couldn't read your account role. Please try again in a moment." };
  const destination = getRoleDashboardPath(profile?.role);
  if (!destination) return { ok: false, message: "This account has no role yet. Contact your barangay administrator." };
  return { ok: true, destination };
}
