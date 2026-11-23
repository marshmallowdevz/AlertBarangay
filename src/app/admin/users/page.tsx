import { redirect } from "next/navigation";
import { UsersDashboard } from "@/components/admin/users-dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function UsersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || profile.role !== "admin") redirect("/login?notice=admin");

  return <UsersDashboard currentUserId={user.id} />;
}
