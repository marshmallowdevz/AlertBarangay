import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileSettings } from "@/components/account/profile-settings";
import { RoleDashboard } from "@/components/role-dashboard";
import { requireRolePage } from "@/lib/auth/require-role-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { role, userId, email, fullName, avatarUrl } = await requireRolePage(["resident", "official", "admin"]);
  if (role === "admin") redirect("/admin/profile");
  return <RoleDashboard role={role} userId={role === "resident" ? userId : undefined} fullName={fullName} title="Your account" subtitle="Update your name, photo and password.">
    <ProfileSettings email={email} initialName={fullName} initialAvatarUrl={avatarUrl} embedded />
  </RoleDashboard>;
}
