import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { cleanUserMetadataLabel } from "@/lib/admin/user-labels";
import type { AccountMetrics, ManagedUser, UserRole } from "@/types/user";

export async function getAdminUserDirectory(): Promise<{ users: ManagedUser[]; metrics: AccountMetrics }> {
  const admin = createSupabaseAdminClient();
  const authUsers = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const profiles = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, role")
      .range(from, from + 999);
    if (error) throw error;
    profiles.push(...data);
    if (data.length < 1000) break;
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const users: ManagedUser[] = authUsers.map((user) => {
    const profile = profileById.get(user.id);
    return {
      id: user.id,
      email: user.email ?? "",
      full_name: profile?.full_name || user.user_metadata?.full_name || "",
      role: (profile?.role ?? "resident") as UserRole,
      position: cleanUserMetadataLabel(user.user_metadata?.position),
      is_active: !user.banned_until || new Date(user.banned_until).getTime() <= Date.now(),
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
    };
  });

  const metrics: AccountMetrics = {
    total: authUsers.length,
    admins: users.filter((user) => user.role === "admin").length,
    officials: users.filter((user) => user.role === "official").length,
    residents: users.filter((user) => user.role === "resident").length,
    active: users.filter((user) => user.is_active).length,
    disabled: users.filter((user) => !user.is_active).length,
  };
  return { users, metrics };
}
