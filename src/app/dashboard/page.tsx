import { redirect } from "next/navigation";
import { requireRolePage } from "@/lib/auth/require-role-page";
import { getRoleDashboardPath } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/** Old shared /dashboard link: send every account to its own role dashboard. */
export default async function DashboardRedirectPage() {
  const { role } = await requireRolePage(["resident", "official", "admin"]);
  redirect(getRoleDashboardPath(role) ?? "/login?notice=role");
}
