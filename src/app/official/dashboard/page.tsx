import type { Metadata } from "next";
import { BranchOfficialDashboard } from "@/components/official/branch/branch-official-dashboard";
import { requireRolePage } from "@/lib/auth/require-role-page";
import { Suspense } from "react";
import { AccessNotice } from "@/components/ui/access-notice";

export const metadata: Metadata = { title: "Official dashboard" };

export const dynamic = "force-dynamic";

export default async function OfficialDashboardPage() {
  const { userId, email, fullName } = await requireRolePage("official");
  return <>
    <Suspense fallback={null}><AccessNotice /></Suspense>
    <BranchOfficialDashboard user={{ id: userId, email, fullName }} />
  </>;
}
