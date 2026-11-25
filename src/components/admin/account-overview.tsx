import Link from "next/link";
import { Building2, Check, CircleAlert, Shield, UserRound } from "lucide-react";
import type { AccountMetrics } from "@/types/user";

const cards = [
  { key: "admins", label: "Admins", icon: Shield, href: "/admin/users?role=admin" },
  { key: "officials", label: "Officials", icon: Building2, href: "/admin/users?role=official" },
  { key: "residents", label: "Residents / users", icon: UserRound, href: "/admin/users?role=resident" },
  { key: "active", label: "Active accounts", icon: Check, href: "/admin/users?status=active" },
  { key: "disabled", label: "Disabled accounts", icon: CircleAlert, href: "/admin/users?status=disabled" },
] as const;

export function AccountOverview({ metrics }: { metrics: AccountMetrics }) {
  return <div className="page-wrap">
    <div className="topline"><div className="breadcrumb"><strong>Overview</strong></div></div>
    <div className="page-heading"><div><div className="eyebrow">ADMINISTRATION</div><h1>Overview</h1><p className="subtitle">A live summary of AlertBarangay account access.</p></div></div>
    <section className="overview-card" aria-label="Account overview">
      <div className="overview-top"><h2 className="section-title">Account overview</h2><Link className="section-note overview-all-link" href="/admin/users">All registered accounts <span aria-hidden="true">→</span></Link></div>
      <div className="overview-total"><strong>{metrics.total.toLocaleString()}</strong><span>Total users created</span></div>
      <div className="metrics-grid">
        {cards.map(({ key, label, icon: Icon, href }) => <Link key={key} href={href} className="metric metric-link" aria-label={`View ${metrics[key]} ${label.toLowerCase()}`}>
          <div className="metric-label"><Icon />{label}</div><div className="metric-value">{metrics[key].toLocaleString()}</div>
        </Link>)}
      </div>
    </section>
  </div>;
}
