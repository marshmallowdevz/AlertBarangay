import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  if (!profile?.is_active || profile.role !== "admin") redirect("/login?notice=admin");

  return <div className="app-shell"><AdminSidebar email={user.email ?? ""} /><main className="main-content">{children}</main></div>;
}
