import type { Metadata } from "next";
import { ProfileSettings } from "@/components/account/profile-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your profile" };

export default async function AdminProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name,avatar_url").eq("id", user.id).maybeSingle()
    : { data: null };
  return <ProfileSettings email={user?.email ?? ""} initialName={profile?.full_name ?? ""} initialAvatarUrl={profile?.avatar_url ?? ""} />;
}
