import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getRoleDashboardPath, isAppRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile || profile.is_active === false || !isAppRole(profile.role)) redirect("/login?notice=role");
  if (profile.role !== "admin") redirect(getRoleDashboardPath(profile.role) ?? "/login?notice=role");

  return <AdminShell email={user.email ?? ""} fullName={profile?.full_name ?? ""} avatarUrl={profile?.avatar_url ?? ""}>{children}</AdminShell>;
}
