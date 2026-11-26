import type { Metadata } from "next";
import { RoleDashboard } from "@/components/role-dashboard";
import { ResidentAssistant } from "@/components/resident/resident-assistant";
import { ResidentDashboard } from "@/components/resident/resident-dashboard";
import { requireRolePage } from "@/lib/auth/require-role-page";

export const metadata: Metadata = { title: "Resident dashboard" };

export const dynamic = "force-dynamic";

export default async function ResidentDashboardPage() {
  const { userId, fullName } = await requireRolePage("resident");
  return <RoleDashboard role="resident" userId={userId} fullName={fullName}>
    <ResidentDashboard userId={userId} />
    <ResidentAssistant firstName={fullName.split(" ")[0] ?? ""} />
  </RoleDashboard>;
}
