import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { resolveAppRole } from "@/lib/auth/resolve-app-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const resolution = await resolveAppRole(supabase, user.id);
  if (!resolution.ok) redirect("/login?notice=role");
  if (resolution.role !== "admin") redirect(resolution.destination);

  return <div className="app-shell"><AdminSidebar email={user.email ?? ""} /><main className="main-content">{children}</main></div>;
}
