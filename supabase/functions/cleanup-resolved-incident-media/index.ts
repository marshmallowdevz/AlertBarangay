import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-cron-secret",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cleanupSecret = Deno.env.get("INCIDENT_CLEANUP_SECRET");
  const suppliedSecret = request.headers.get("x-cron-secret");
  if (!supabaseUrl || !serviceRoleKey || !cleanupSecret || suppliedSecret !== cleanupSecret) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: incidents, error: queryError } = await supabase
    .from("incidents")
    .select("id, media_path, media_type, media_paths, media_types")
    .eq("status", "resolved")
    .lt("created_at", cutoff)
    .not("media_path", "is", null);

  if (queryError) {
    return Response.json({ error: queryError.message }, { status: 500, headers: corsHeaders });
  }

  let cleaned = 0;
  let failed = 0;
  for (const incident of incidents || []) {
    const mediaPaths = Array.isArray(incident.media_paths) && incident.media_paths.length
      ? incident.media_paths
      : [incident.media_path].filter(Boolean);
    const paths = mediaPaths.flatMap((path) => [path, `${path}.thumb`]);

    const { error: removeError } = await supabase.storage.from("incident-media").remove(paths);
    if (removeError) {
      console.error("Could not remove old incident media", incident.id, removeError.message);
      failed += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("incidents")
      .update({ media_path: null, media_type: null, media_paths: [], media_types: [] })
      .eq("id", incident.id);
    if (updateError) {
      console.error("Could not clear old incident media path", incident.id, updateError.message);
      failed += 1;
      continue;
    }
    cleaned += 1;
  }

  return Response.json({ cleaned, failed }, { headers: corsHeaders });
});
