"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminSidebar({ email, fullName, avatarUrl, collapsed, onToggle }: { email: string; fullName: string; avatarUrl: string; collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/login"); router.refresh();
  }

  return <aside className="sidebar" id="admin-navigation">
    <div className="sidebar-header">
      <Link href="/admin/dashboard" className="brand-lockup" aria-label="AlertBarangay Overview"><span className="brand-badge"><ShieldCheck size={22} /></span><span className="brand-text"><strong>AlertBarangay</strong><small>ADMIN PORTAL</small></span></Link>
      <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} aria-controls="admin-navigation" aria-expanded={!collapsed} title={collapsed ? "Expand navigation" : "Collapse navigation"}><Menu size={19} /></button>
    </div>
    <nav className="side-nav" aria-label="Main navigation">
      <Link href="/admin/dashboard" title="Overview" aria-label="Overview" className={`nav-link ${pathname === "/admin/dashboard" ? "active" : ""}`}><LayoutDashboard size={18} /><span className="nav-label">Overview</span></Link>
      <Link href="/admin/users" title="User management" aria-label="User management" className={`nav-link ${pathname.startsWith("/admin/users") ? "active" : ""}`}><Users size={18} /><span className="nav-label">User management</span></Link>
      <Link href="/admin/announcements" title="Announcements" aria-label="Announcements" className={`nav-link ${pathname.startsWith("/admin/announcements") ? "active" : ""}`}><Bell size={18} /><span className="nav-label">Announcements</span></Link>
    </nav>
    <div className="sidebar-spacer" />
    <nav className="side-nav"><Link href="/admin/settings" title="Settings" aria-label="Settings" className={`nav-link ${pathname.startsWith("/admin/settings") ? "active" : ""}`}><Settings size={18} /><span className="nav-label">Settings</span></Link></nav>
    <div className="sidebar-divider" />
    <Link href="/admin/profile" className="account-chip" title="View and edit your profile" aria-label="View and edit your profile"><span className="avatar admin-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : (fullName.trim()[0] || email.slice(0, 1)).toUpperCase()}</span><span className="account-info"><strong>{fullName || "Administrator"}</strong><small>{email}</small></span></Link>
    <button className="signout-link" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut size={15} /><span className="nav-label">Sign out</span></button>
  </aside>;
}
