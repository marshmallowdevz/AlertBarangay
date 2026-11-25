"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Landmark, ShieldCheck } from "lucide-react";
import { appRoleErrorMessage, resolveAppRole, RoleResolutionError } from "@/lib/auth/resolve-app-role";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    async function resumeSession() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) {
        if (active) setCheckingSession(false);
        return;
      }

      const resolution = await resolveAppRole(supabase, user.id);
      if (!resolution.ok) {
        await supabase.auth.signOut();
        if (active) {
          setError(appRoleErrorMessage(resolution.reason));
          setCheckingSession(false);
        }
        return;
      }

      if (active) {
        router.replace(resolution.destination);
        router.refresh();
      }
    }

    void resumeSession().catch((cause) => {
      if (active) {
        setError(cause instanceof RoleResolutionError
          ? "We couldn't read your role profile. Apply migration 202611250001_profiles_self_read_policy.sql and confirm your profile row exists."
          : "We couldn't check your session. Check your connection and try again.");
        setCheckingSession(false);
      }
    });

    return () => { active = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const supabase = createSupabaseBrowserClient();
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.status === 0 ? "We couldn't reach the sign-in service. Check your connection and try again." : "We couldn't sign you in. Check your email and password.");
        return;
      }

      const resolution = await resolveAppRole(supabase, data.user.id, data.session.access_token);
      if (!resolution.ok) {
        await supabase.auth.signOut();
        setError(appRoleErrorMessage(resolution.reason));
        return;
      }

      router.replace(resolution.destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof RoleResolutionError
        ? "You signed in, but we couldn't read your role profile. Apply migration 202611250001_profiles_self_read_policy.sql and confirm your profile row exists."
        : "We couldn't reach the sign-in service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) return <main className="login-page" aria-label="Checking your session">
    <section className="login-panel"><p className="muted">Checking your session…</p></section>
  </main>;

  return <main className="login-page">
    <section className="login-panel">
      <div className="brand-badge login-badge"><Landmark size={23} /></div>
      <div className="eyebrow">ALERTBARANGAY</div>
      <h1>Welcome back</h1>
      <p className="muted">Sign in to continue to your barangay dashboard.</p>
      <form className="login-form" onSubmit={submit}>
        <label>Email address<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@barangay.gov.ph" /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" /></label>
        {error && <div className="inline-error" role="alert">{error}</div>}
        <button className="button primary login-submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<ArrowRight size={17} /></button>
      </form>
      <div className="login-footnote"><ShieldCheck size={16} /> Administrator access is verified securely.</div>
    </section>
    <aside className="login-aside"><div className="aside-mark"><Landmark size={26} /></div><span>ALERTBARANGAY</span><h2>Better connected.<br />Safer together.</h2><p>Sign in to access your local community dashboard.</p><div className="aside-decoration" /></aside>
  </main>;
}
