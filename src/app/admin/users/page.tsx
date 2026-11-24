import { redirect } from "next/navigation";
import { UsersDashboard } from "@/components/admin/users-dashboard";
import { resolveAppRole } from "@/lib/auth/resolve-app-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function UsersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const resolution = await resolveAppRole(supabase, user.id);
  if (!resolution.ok) redirect("/login?notice=role");
  if (resolution.role !== "admin") redirect(resolution.destination);

  return <UsersDashboard currentUserId={user.id} />;
}
