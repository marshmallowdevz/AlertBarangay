import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUserBanned } from "@/lib/auth/is-user-banned";
import { jsonError } from "@/lib/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** For API routes that only active officials and admins may call. */
export async function requireStaffApi() {
  const sessionClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return { response: jsonError("Authentication required.", 401) };
  if (isUserBanned(user.banned_until)) return { response: jsonError("This account is inactive.", 403) };

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("Staff authorization lookup failed", { code: error.code, message: error.message });
    return { response: jsonError("Unable to verify your access right now.", 500) };
  }
  if (!profile || !["admin", "official"].includes(profile.role) || profile.is_active === false) {
    return { response: jsonError("An active barangay official account is required.", 403) };
  }
  return { admin, user, role: profile.role as "admin" | "official" };
}
