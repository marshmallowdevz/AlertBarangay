import "server-only";

import { redirect } from "next/navigation";
import { getRoleDashboardPath, isAppRole, type AppRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server-side check for role pages. The proxy already routes by role, but this
 * also refuses disabled accounts and keeps working if the proxy is bypassed.
 */
export async function requireRolePage(role: AppRole) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role,is_active,full_name").eq("id", user.id).maybeSingle();
  if (!profile || !profile.is_active || !isAppRole(profile.role)) redirect("/login?notice=role");
  if (profile.role !== role) redirect(getRoleDashboardPath(profile.role) ?? "/login?notice=role");
  return { userId: user.id, email: user.email ?? "", fullName: (profile.full_name as string) || "" };
}
