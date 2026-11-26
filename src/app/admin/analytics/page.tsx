import type { Metadata } from "next";
import { ReportAnalyticsPanel } from "@/components/analytics/report-analytics";

export const metadata: Metadata = { title: "Report analytics" };

export default function AdminAnalyticsPage() {
  return <>
    <div className="topline"><div className="breadcrumb"><strong>Analytics</strong></div></div>
    <div className="page-heading"><div><div className="eyebrow">INCIDENT REPORTS</div><h1>Report analytics</h1><p className="subtitle">Incident types, response times and hotspots across the barangay.</p></div></div>
    <ReportAnalyticsPanel />
  </>;
}
