import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUuid, jsonError } from "@/lib/http";
import { isUserBanned } from "@/lib/auth/is-user-banned";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return jsonError("Authentication required.", 401);
  if (isUserBanned(user.banned_until)) return jsonError("This account is inactive.", 403);

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Incident status authorization lookup failed", { code: profileError.code, message: profileError.message });
    return jsonError("Unable to verify incident response access.", 500);
  }
  if (!profile || !["admin", "official"].includes(profile.role) || profile.is_active === false) {
    return jsonError("An active barangay official account is required to update incidents.", 403);
  }

  const { id } = await params;
  if (!isUuid(id)) return jsonError("Invalid incident ID.", 400);

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Provide a valid incident status.", 400);
  }
  if (body.status !== "responding" && body.status !== "resolved") {
    return jsonError("Incident status must be responding or resolved.", 400);
  }

  const { data: incident, error } = await admin
    .from("incidents")
    .update({ status: body.status })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) {
    console.error("Incident status update failed", { code: error.code, message: error.message });
    return jsonError("Unable to update this incident. Please try again.", 500);
  }
  if (!incident) return jsonError("This incident no longer exists or could not be updated.", 404);

  return Response.json({ incident }, { headers: { "Cache-Control": "no-store" } });
}
