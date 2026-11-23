"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Landmark, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) { setError("We couldn't sign you in. Check your email and password."); setBusy(false); return; }
    router.replace("/admin/users"); router.refresh();
  }

  return <main className="login-page">
    <section className="login-panel">
      <div className="brand-badge login-badge"><Landmark size={23} /></div>
      <div className="eyebrow">ALERTBARANGAY ADMIN</div>
      <h1>Welcome back</h1>
      <p className="muted">Sign in to manage your barangay dashboard accounts.</p>
      <form className="login-form" onSubmit={submit}>
        <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@barangay.gov.ph" /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></label>
        {error && <div className="inline-error" role="alert">{error}</div>}
        <button className="button primary login-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<ArrowRight size={17} /></button>
      </form>
      <div className="login-footnote"><ShieldCheck size={16} /> Administrator access is verified securely.</div>
    </section>
    <aside className="login-aside"><div className="aside-mark"><Landmark size={26} /></div><span>ALERTBARANGAY</span><h2>Better connected.<br />Safer together.</h2><p>Manage trusted access to your local government dashboard.</p><div className="aside-decoration" /></aside>
  </main>;
}
