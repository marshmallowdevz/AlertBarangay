import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isUuid, jsonError } from "@/lib/http";
import { isUserBanned } from "@/lib/auth/is-user-banned";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const responseTypes = ["Fire", "Rescue", "Department of Public Services", "Visayan Electric", "MCWD", "DPWH", "CCDRRMO"];

async function getActiveStaff() {
  const sessionClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return { response: jsonError("Authentication required.", 401) };
  if (isUserBanned(user.banned_until)) return { response: jsonError("This account is inactive.", 403) };

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (error) {
    console.error("Dispatch history authorization lookup failed", { code: error.code, message: error.message });
    return { response: jsonError("Unable to verify dispatch access.", 500) };
  }
  if (!profile || !["admin", "official"].includes(profile.role) || profile.is_active === false) {
    return { response: jsonError("An active barangay official account is required.", 403) };
  }
  return { admin, sessionClient, user };
}

export async function GET() {
  const access = await getActiveStaff();
  if ("response" in access) return access.response;

  const { data, error } = await access.admin.from("incident_dispatches")
    .select("id,response_type,note,created_at,incident:incidents!inner(eid,type,description,location_text,lat,lng)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("Dispatch history lookup failed", { code: error.code, message: error.message });
    const migrationMissing = error.code === "42P01" || error.code === "PGRST205";
    return jsonError(migrationMissing
      ? "Dispatch history is not set up yet. Apply migration 202611260001_incident_dispatch_history.sql."
      : "Unable to load recent dispatches.", 500);
  }
  return Response.json({ dispatches: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const access = await getActiveStaff();
  if ("response" in access) return access.response;

  let body: { incidentId?: unknown; responseType?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Provide valid dispatch details.", 400);
  }
  const incidentId = typeof body.incidentId === "string" ? body.incidentId : "";
  const responseType = typeof body.responseType === "string" ? body.responseType : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!isUuid(incidentId)) return jsonError("Choose a valid incident to dispatch.", 400);
  if (!responseTypes.includes(responseType)) return jsonError("Choose a valid response type.", 400);
  if (note.length > 500) return jsonError("Dispatch notes must be 500 characters or fewer.", 400);

  const { data, error } = await access.sessionClient.rpc("dispatch_incident_response", {
    p_incident_id: incidentId,
    p_response_type: responseType,
    p_note: note,
  });
  if (error) {
    console.error("Incident dispatch failed", { code: error.code, message: error.message });
    const migrationMissing = error.code === "42883" || error.code === "PGRST202" || error.code === "42P01";
    return jsonError(migrationMissing
      ? "Dispatch history is not set up yet. Apply migration 202611260001_incident_dispatch_history.sql."
      : error.message || "Unable to dispatch this response.", migrationMissing ? 503 : 500);
  }
  return Response.json({ dispatch: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
