"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import type { AppRole } from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const roleLabels: Record<AppRole, string> = {
  admin: "Administrator",
  official: "Barangay Official",
  resident: "Resident",
};

export function RoleDashboard({ role }: { role: Exclude<AppRole, "admin"> }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

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

  return <main className="main-content" style={{ marginLeft: 0, minHeight: "100vh" }}>
    <div className="page-wrap">
      <div className="topline">
        <div className="brand-lockup" style={{ padding: 0 }}>
          <span className="brand-badge"><ShieldCheck size={22} /></span>
          <span><strong>AlertBarangay</strong><small>{roleLabels[role].toUpperCase()}</small></span>
        </div>
        <button className="button secondary" onClick={() => void signOut()} disabled={signingOut}>
          <LogOut size={15} />{signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
      <section className="overview-card" aria-label={`${roleLabels[role]} dashboard`}>
        <div className="eyebrow">{roleLabels[role].toUpperCase()} DASHBOARD</div>
        <h1 className="section-title">Welcome to AlertBarangay</h1>
        <p className="subtitle">You are signed in as a {roleLabels[role].toLowerCase()}.</p>
      </section>
      {error && <div className="inline-error" role="alert">{error}</div>}
    </div>
  </main>;
}
