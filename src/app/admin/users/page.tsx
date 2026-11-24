import { redirect } from "next/navigation";
import { UsersDashboard } from "@/components/admin/users-dashboard";
import { resolveAppRole } from "@/lib/auth/resolve-app-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UsersPageProps = { searchParams: Promise<{ role?: string; status?: string; group?: string }> };

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const resolution = await resolveAppRole(supabase, user.id);
  if (!resolution.ok) redirect("/login?notice=role");
  if (resolution.role !== "admin") redirect(resolution.destination);

  const role = ["admin", "official", "resident"].includes(params.role ?? "") ? params.role! : "all";
  const status = ["active", "disabled"].includes(params.status ?? "") ? params.status! : "all";
  const group = ["residents", "officials"].includes(params.group ?? "") ? params.group as "residents" | "officials" : "all";
  return <UsersDashboard currentUserId={user.id} initialFilters={{ role, status, group }} />;
}
