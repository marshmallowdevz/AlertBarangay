"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CircleHelp, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminSidebar({ email, collapsed, onToggle }: { email: string; collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/login"); router.refresh();
  }

  return <aside className="sidebar" id="admin-navigation">
    <div className="sidebar-header">
      <Link href="/admin" className="brand-lockup" aria-label="AlertBarangay Overview"><span className="brand-badge"><ShieldCheck size={22} /></span><span className="brand-text"><strong>AlertBarangay</strong><small>ADMIN PORTAL</small></span></Link>
      <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-controls="admin-navigation" aria-expanded={!collapsed} title={collapsed ? "Expand navigation" : "Collapse navigation"}><Menu size={19} /></button>
    </div>
    <div className="nav-caption">WORKSPACE</div>
    <nav className="side-nav" aria-label="Main navigation">
      <Link href="/admin" title="Overview" aria-label="Overview" className={`nav-link ${pathname === "/admin" ? "active" : ""}`}><LayoutDashboard size={18} /><span className="nav-label">Overview</span></Link>
      <Link href="/admin/users" title="User management" aria-label="User management" className={`nav-link ${pathname.startsWith("/admin/users") ? "active" : ""}`}><Users size={18} /><span className="nav-label">User management</span></Link>
      <span title="Announcements" className="nav-link disabled-link"><Bell size={18} /><span className="nav-label">Announcements</span></span>
    </nav>
    <div className="sidebar-spacer" />
    <div className="nav-caption">PREFERENCES</div>
    <nav className="side-nav"><span title="Settings" className="nav-link disabled-link"><Settings size={18} /><span className="nav-label">Settings</span></span><span title="Help center" className="nav-link disabled-link"><CircleHelp size={18} /><span className="nav-label">Help center</span></span></nav>
    <div className="sidebar-divider" />
    <div className="account-chip" title={email}><span className="avatar admin-avatar">{email.slice(0, 1).toUpperCase()}</span><span className="account-info"><strong>Administrator</strong><small>{email}</small></span></div>
    <button className="signout-link" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={15} /><span className="nav-label">Sign out</span></button>
  </aside>;
}
