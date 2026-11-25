import Link from "next/link";
import { Activity, ArrowRight, Mail, MessageCircle, ShieldCheck } from "lucide-react";

export function SettingsPage({ email, maintenanceMode }: { email: string; maintenanceMode: boolean }) {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || email;
  return <div className="page-wrap">
    <div className="topline"><div className="breadcrumb"><strong>Settings</strong></div></div>
    <div className="page-heading"><div><h1>Settings</h1><p className="subtitle">Manage your dashboard preferences and find support.</p></div></div>
    <div className="settings-card-list">
      <Link href="/admin/settings/maintenance" className="settings-card maintenance-entry-card" aria-label="Open Maintenance mode settings">
        <div className="settings-card-icon"><Activity size={21} /></div>
        <div className="settings-card-content"><div className="eyebrow">SYSTEM</div><h2>Maintenance mode</h2><p>Control site-wide availability and the maintenance message shown to residents and officials.</p></div>
        <div className="maintenance-entry-trailing"><span className={`maintenance-state-pill ${maintenanceMode ? "enabled" : "live"}`}>{maintenanceMode ? "Enabled" : "Live"}</span><ArrowRight size={18} /></div>
      </Link>
      <section className="settings-card" aria-labelledby="support-heading" id="support">
        <div className="settings-card-icon"><MessageCircle size={21} /></div>
        <div className="settings-card-content"><div className="eyebrow">SUPPORT</div><h2 id="support-heading">Contact AlertBarangay support</h2><p>If you need help with dashboard access or account details, contact your barangay administrator.</p>
          <a className="support-email" href={`mailto:${supportEmail}`}><Mail size={16} /><span><small>Support contact</small><strong>{supportEmail}</strong></span></a>
          <div className="settings-note"><ShieldCheck size={15} />Account and access requests are handled by an administrator.</div>
        </div>
      </section>
    </div>
  </div>;
}
