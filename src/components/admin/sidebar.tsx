"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, CircleHelp, LayoutDashboard, Settings, ShieldCheck, Users } from "lucide-react";

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return <aside className="sidebar">
    <Link href="/admin/users" className="brand-lockup"><span className="brand-badge"><ShieldCheck size={22} /></span><span><strong>AlertBarangay</strong><small>ADMIN PORTAL</small></span></Link>
    <div className="nav-caption">WORKSPACE</div>
    <nav className="side-nav" aria-label="Main navigation">
      <Link href="/admin" className={`nav-link ${pathname === "/admin" ? "active" : ""}`}><LayoutDashboard size={18} />Overview</Link>
      <Link href="/admin/users" className={`nav-link ${pathname.startsWith("/admin/users") ? "active" : ""}`}><Users size={18} />User management</Link>
      <span className="nav-link disabled-link"><Bell size={18} />Announcements</span>
    </nav>
    <div className="sidebar-spacer" />
    <div className="nav-caption">PREFERENCES</div>
    <nav className="side-nav"><span className="nav-link disabled-link"><Settings size={18} />Settings</span><span className="nav-link disabled-link"><CircleHelp size={18} />Help center</span></nav>
    <div className="sidebar-divider" />
    <div className="account-chip" aria-label="Preview profile"><span className="avatar admin-avatar">P</span><span className="account-info"><strong>Preview profile</strong><small>{email || "No active session"}</small></span><ChevronDown size={16} /></div>
  </aside>;
}
