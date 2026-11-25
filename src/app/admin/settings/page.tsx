import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsPage } from "@/components/admin/settings-page";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let maintenanceMode = false;
  try {
    const { data } = await createSupabaseAdminClient().from("system_settings").select("maintenance_mode").eq("id", 1).maybeSingle();
    maintenanceMode = data?.maintenance_mode ?? false;
  } catch (error) {
    console.error("Could not load maintenance mode for Settings", error);
  }
  return <SettingsPage email={user?.email ?? ""} maintenanceMode={maintenanceMode} />;
}
