import "server-only";

import { jsonError } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminAccessFailure = {
  ok: false;
  status: number;
  reason: "unauthenticated" | "not_admin" | "verification_failed";
};

export function adminAccessResponse(access: AdminAccessFailure) {
  const message = access.reason === "unauthenticated"
    ? "Authentication required."
    : access.reason === "not_admin"
      ? "The authenticated account is not an active administrator."
      : "Administrator access could not be verified. Check the server logs.";
  return jsonError(message, access.status);
}

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.warn("[admin-auth] request denied: unauthenticated", {
      error: authError?.message ?? null,
    });
    return { ok: false as const, status: 401, reason: "unauthenticated" as const };
  }

  // Use the server-only admin client for the profile lookup so authorization
  // does not depend on a caller's profiles SELECT policy being configured.
  let profile: { id: string; role: string } | null = null;
  let profileReadFailed = false;
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      profileReadFailed = true;
      console.error("[admin-auth] profile lookup failed", {
        userId: user.id,
        code: error.code,
        message: error.message,
      });
    } else {
      profile = data;
    }
  } catch (error) {
    profileReadFailed = true;
    console.error("[admin-auth] profile lookup could not run", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown error",
    });
  }

  if (profileReadFailed) {
    return { ok: false as const, status: 500, reason: "verification_failed" as const };
  }

  const isBanned = Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now());
  if (profile?.role === "admin" && !isBanned) {
    return { ok: true as const, actor: user };
  }

  console.warn("[admin-auth] request denied: role check did not confirm admin", {
    userId: user.id,
    profileRole: profile?.role ?? null,
    isBanned,
  });
  return { ok: false as const, status: 403, reason: "not_admin" as const };
}
