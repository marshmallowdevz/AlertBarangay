import type { Metadata } from "next";
import { RoleDashboard } from "@/components/role-dashboard";
import { ResidentSafety } from "@/components/resident/resident-safety";
import { requireRolePage } from "@/lib/auth/require-role-page";

export const metadata: Metadata = { title: "Safety and contacts" };
export const dynamic = "force-dynamic";

export default async function ResidentSafetyPage() {
  const { userId, fullName } = await requireRolePage("resident");
  return <RoleDashboard role="resident" userId={userId} fullName={fullName}>
    <ResidentSafety />
  </RoleDashboard>;
}
