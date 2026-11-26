"use client";

import { useRouter } from "next/navigation";
import Official from "./src/Official";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { clearOfflinePages } from "@/components/ui/service-worker";

export function BranchOfficialDashboard({ user }: { user: { id: string; email: string; fullName: string } }) {
  const router = useRouter();

  async function signOut() {
    clearOfflinePages();
    const { error } = await createSupabaseBrowserClient().auth.signOut();
    if (error) throw error;
    router.replace("/login");
    router.refresh();
  }

  return <Official
    user={{ id: user.id, email: user.email, user_metadata: { full_name: user.fullName }, app_metadata: { barangay_role: "official" } }}
    onSignOut={signOut}
  />;
}
