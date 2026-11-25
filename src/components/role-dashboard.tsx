"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import type { AppRole } from "@/lib/auth/roles";
import { getRoleDashboardPath } from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const roleLabels: Record<AppRole, string> = {
  admin: "Administrator",
  official: "Barangay Official",
  resident: "Resident",
};

/** Header + navigation shared by the resident and official pages. */
export function RoleDashboard({ role, fullName, title, subtitle, children }: {
  role: Exclude<AppRole, "admin">;
  fullName: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const home = getRoleDashboardPath(role) ?? "/";

  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      const { error: signOutError } = await createSupabaseBrowserClient().auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/login");
      router.refresh();
    } catch {
      setError("We couldn't sign you out. Please try again.");
      setSigningOut(false);
    }
  }

  const heading = title ?? (fullName ? `Welcome, ${fullName.split(" ")[0]}` : "Welcome to AlertBarangay");
  const description = subtitle ?? (role === "resident"
    ? "Report an emergency, follow your reports and read barangay announcements."
    : "Review incoming incidents and update their response status.");

  return <div className="role-shell">
    <header className="role-header">
      <Link href={home} className="brand-lockup role-brand">
        <span className="brand-badge"><ShieldCheck size={20} /></span>
        <span><strong>AlertBarangay</strong><small>{roleLabels[role].toUpperCase()}</small></span>
      </Link>
      <nav className="role-nav" aria-label="Main navigation">
        <Link href={home} className={pathname === home ? "active" : undefined} aria-current={pathname === home ? "page" : undefined}><LayoutDashboard size={15} /><span>Dashboard</span></Link>
        <Link href="/account" className={pathname === "/account" ? "active" : undefined} aria-current={pathname === "/account" ? "page" : undefined}><UserRound size={15} /><span>Account</span></Link>
        <button type="button" onClick={() => void signOut()} disabled={signingOut}><LogOut size={15} /><span>{signingOut ? "Signing out…" : "Sign out"}</span></button>
      </nav>
    </header>
    <main className="role-main">
      <div className="page-wrap">
        {error && <div className="inline-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
        <div className="page-heading">
          <div>
            <div className="eyebrow">{roleLabels[role].toUpperCase()}</div>
            <h1>{heading}</h1>
            <p className="subtitle">{description}</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  </div>;
}
