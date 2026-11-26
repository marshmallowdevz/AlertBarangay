import type { Metadata } from "next";
import { RoleDashboard } from "@/components/role-dashboard";
import { ResidentLiveMap } from "@/components/resident/resident-live-map";
import { requireRolePage } from "@/lib/auth/require-role-page";

export const metadata: Metadata = { title: "Resident live map" };
export const dynamic = "force-dynamic";

export default async function ResidentMapPage() {
  const { userId, fullName } = await requireRolePage("resident");
  return <RoleDashboard role="resident" userId={userId} fullName={fullName}>
    <ResidentLiveMap userId={userId} />
  </RoleDashboard>;
}
