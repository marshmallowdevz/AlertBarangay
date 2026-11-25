import { RoleDashboard } from "@/components/role-dashboard";
import { ResidentDashboard } from "@/components/resident/resident-dashboard";
import { requireRolePage } from "@/lib/auth/require-role-page";

export const dynamic = "force-dynamic";

export default async function ResidentDashboardPage() {
  const { userId, fullName } = await requireRolePage("resident");
  return <RoleDashboard role="resident" fullName={fullName}>
    <ResidentDashboard userId={userId} />
  </RoleDashboard>;
}
