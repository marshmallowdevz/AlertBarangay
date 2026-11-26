import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoleDashboardPath, isAppRole, type AppRole } from "@/lib/auth/roles";

export type DashboardResult = { ok: true; role: AppRole; destination: string } | { ok: false; message: string };

/**
 * Looks up the signed-in user's real role in public.profiles and returns the
 * dashboard path for it. The role always comes from the database, never from
 * anything the browser or sign-up form supplied.
 */
export async function dashboardForUser(supabase: SupabaseClient, userId: string): Promise<DashboardResult> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false, message: "We couldn't read your account role. Please try again in a moment." };
  if (profile?.is_active === false) return { ok: false, message: "This account has been disabled. Contact your barangay administrator." };
  const role = profile?.role;
  const destination = getRoleDashboardPath(role);
  if (!isAppRole(role) || !destination) return { ok: false, message: "This account has no role yet. Contact your barangay administrator." };
  return { ok: true, role, destination };
}
