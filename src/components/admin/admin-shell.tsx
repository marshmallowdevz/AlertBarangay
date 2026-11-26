"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { AccessNotice } from "@/components/ui/access-notice";

export function AdminShell({ email, fullName, avatarUrl, children }: { email: string; fullName: string; avatarUrl: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const syncToViewport = () => setCollapsed(media.matches);
    syncToViewport();
    media.addEventListener("change", syncToViewport);
    return () => media.removeEventListener("change", syncToViewport);
  }, []);

  return <div className={`app-shell admin-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <AdminSidebar email={email} fullName={fullName} avatarUrl={avatarUrl} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
    {!collapsed && <button type="button" className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setCollapsed(true)} />}
    <Suspense fallback={null}><AccessNotice /></Suspense>
    <main className="main-content"><AdminTopbar email={email} initialName={fullName} initialAvatarUrl={avatarUrl} />{children}</main>
  </div>;
}
