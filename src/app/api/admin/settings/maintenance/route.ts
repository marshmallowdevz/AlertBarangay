import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/http";
import { adminAccessResponse, requireAdmin } from "@/lib/supabase/guard";

const defaultMessage = "AlertBarangay is currently undergoing scheduled maintenance. Please check back shortly.";

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);
  const { data, error } = await createSupabaseAdminClient().from("system_settings")
    .select("maintenance_mode,maintenance_message,updated_at,updated_by").eq("id", 1).maybeSingle();
  if (error || !data) {
    console.error("Maintenance settings read failed", error);
    return jsonError("Unable to load maintenance settings. Apply migration 202611250004_maintenance_mode.sql and try again.", 500);
  }
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return adminAccessResponse(access);
  try {
    const body = await request.json();
    const updates: { maintenance_mode?: boolean; maintenance_message?: string; updated_at: string; updated_by: string } = {
      updated_at: new Date().toISOString(),
      updated_by: access.actor.id,
    };

    if (typeof body.maintenance_mode === "boolean") updates.maintenance_mode = body.maintenance_mode;
    else if (typeof body.maintenance_message === "string") {
      const message = body.maintenance_message.trim();
      if (!message || message.length > 2000) return jsonError("The maintenance message must be between 1 and 2,000 characters.", 400);
      updates.maintenance_message = message;
    } else return jsonError("Provide a maintenance mode value or message.", 400);

    const { data, error } = await createSupabaseAdminClient().from("system_settings").update(updates)
      .eq("id", 1).select("maintenance_mode,maintenance_message,updated_at,updated_by").single();
    if (error) throw error;
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Maintenance settings update failed", error);
    return jsonError("Unable to save maintenance settings. Apply migration 202611250004_maintenance_mode.sql and check the server logs.", 500);
  }
}
