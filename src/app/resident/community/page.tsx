import type { Metadata } from "next";
import { RoleDashboard } from "@/components/role-dashboard";
import { ResidentCommunityFeed } from "@/components/resident/community-feed";
import { requireRolePage } from "@/lib/auth/require-role-page";

export const metadata: Metadata = { title: "Resident community" };
export const dynamic = "force-dynamic";

export default async function ResidentCommunityPage() {
  const { userId, fullName } = await requireRolePage("resident");
  return <RoleDashboard role="resident" userId={userId} fullName={fullName}>
    <ResidentCommunityFeed userId={userId} fullName={fullName} />
  </RoleDashboard>;
}
