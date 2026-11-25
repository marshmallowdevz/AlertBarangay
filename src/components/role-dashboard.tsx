"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import type { AppRole } from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const roleLabels: Record<AppRole, string> = {
  admin: "Administrator",
  official: "Barangay Official",
  resident: "Resident",
};

export function RoleDashboard({ role, fullName, children }: { role: Exclude<AppRole, "admin">; fullName: string; children: ReactNode }) {
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
      {error && <div className="inline-error" role="alert" style={{ marginBottom: 16 }}>{error}</div>}
      <div className="page-heading">
        <div>
          <div className="eyebrow">{roleLabels[role].toUpperCase()} DASHBOARD</div>
          <h1>{fullName ? `Welcome, ${fullName.split(" ")[0]}` : "Welcome to AlertBarangay"}</h1>
          <p className="subtitle">{role === "resident"
            ? "Report an emergency, follow your reports and read barangay announcements."
            : "Review incoming incidents and update their response status."}</p>
        </div>
      </div>
      {children}
    </div>
  </main>;
}
