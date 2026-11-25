import "server-only";

import { redirect } from "next/navigation";
import { getRoleDashboardPath, isAppRole, type AppRole } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Server-side check for role pages. The proxy already routes by role, but this
 * also refuses disabled accounts and keeps working if the proxy is bypassed.
 */
export async function requireRolePage(role: AppRole | AppRole[]) {
  const allowed = Array.isArray(role) ? role : [role];
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile || profile.is_active === false || !isAppRole(profile.role)) redirect("/login?notice=role");
  if (!allowed.includes(profile.role)) redirect(getRoleDashboardPath(profile.role) ?? "/login?notice=role");
  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role as AppRole,
    fullName: (profile.full_name as string) || "",
    avatarUrl: (profile.avatar_url as string) || "",
  };
}
