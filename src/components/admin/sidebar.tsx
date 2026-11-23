"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Settings, ShieldCheck, Users } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/login"); router.refresh();
  }

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
    <button className="account-chip" onClick={signOut} aria-label={`Sign out ${email}`}><span className="avatar admin-avatar">{email.slice(0, 1).toUpperCase()}</span><span className="account-info"><strong>Administrator</strong><small>{email}</small></span><ChevronDown size={16} /></button>
    <button className="signout-link" onClick={signOut}><LogOut size={15} /> Sign out</button>
  </aside>;
}
