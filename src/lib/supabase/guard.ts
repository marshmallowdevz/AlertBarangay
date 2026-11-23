import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, status: 401 };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();
  if (error || !profile || !profile.is_active || profile.role !== "admin") {
    return { ok: false as const, status: 403 };
  }

  return { ok: true as const, actor: user, supabase };
}
