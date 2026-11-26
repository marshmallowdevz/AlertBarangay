import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUserBanned } from "@/lib/auth/is-user-banned";
import { isUuid, jsonError } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Choose a valid incident report.", 400);

  const sessionClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await sessionClient.auth.getUser();
  if (authError || !user) return jsonError("Authentication required.", 401);
  if (isUserBanned(user.banned_until)) return jsonError("This account is inactive.", 403);

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return jsonError("Secure storage access is not configured on the server.", 503);
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Incident attachment authorization lookup failed", { code: profileError.code, message: profileError.message });
    return jsonError("Unable to verify incident attachment access.", 500);
  }
  if (!profile || !["admin", "official"].includes(profile.role) || profile.is_active === false) {
    return jsonError("An active barangay official account is required.", 403);
  }

  const { data: incident, error: incidentError } = await admin
    .from("incidents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (incidentError) {
    console.error("Incident attachment lookup failed", { code: incidentError.code, message: incidentError.message });
    return jsonError("Unable to load this incident's attachments.", 500);
  }
  if (!incident) return jsonError("Incident report not found.", 404);

  const paths: string[] = Array.isArray(incident.media_paths) && incident.media_paths.length
    ? incident.media_paths
    : incident.media_path ? [incident.media_path] : [];
  const types: string[] = Array.isArray(incident.media_types) && incident.media_types.length
    ? incident.media_types
    : incident.media_type ? [incident.media_type] : [];

  try {
    const attachments = await Promise.all(paths.map(async (path, index) => {
      const { data, error } = await admin.storage.from("incident-media").createSignedUrl(path, 600);
      if (error) throw error;
      return { path, type: types[index] === "video" ? "video" : "image", url: data.signedUrl };
    }));
    return Response.json({ attachments }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const error = cause as { code?: string; message?: string };
    console.error("Incident attachment signing failed", { code: error.code, message: error.message });
    return jsonError("Attachments could not be signed. Check the incident-media bucket and its objects.", 502);
  }
}
