import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileSettings } from "@/components/account/profile-settings";
import { RoleDashboard } from "@/components/role-dashboard";
import { requireRolePage } from "@/lib/auth/require-role-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { role, email, fullName, avatarUrl } = await requireRolePage(["resident", "official", "admin"]);
  if (role === "admin") redirect("/admin/profile");
  return <RoleDashboard role={role} fullName={fullName} title="Your account" subtitle="Update your name, photo and password.">
    <ProfileSettings email={email} initialName={fullName} initialAvatarUrl={avatarUrl} embedded />
  </RoleDashboard>;
}
