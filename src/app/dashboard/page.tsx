import { RoleDashboard } from "@/components/role-dashboard";
import { OfficialDashboard } from "@/components/official/official-dashboard";
import { requireRolePage } from "@/lib/auth/require-role-page";

export const dynamic = "force-dynamic";

export default async function OfficialDashboardPage() {
  const { fullName } = await requireRolePage("official");
  return <RoleDashboard role="official" fullName={fullName}>
    <OfficialDashboard />
  </RoleDashboard>;
}
