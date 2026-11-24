import { AccountOverview } from "@/components/admin/account-overview";
import { getAdminUserDirectory } from "@/lib/admin/user-directory";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const { metrics } = await getAdminUserDirectory();
  return <AccountOverview metrics={metrics} />;
}
