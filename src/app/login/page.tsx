"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getRoleDashboardPath } from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import "./login.css";

type Screen = "landing" | "auth";
type Mode = "sign-in" | "sign-up";
// Admin is intentionally not offered: admins pick either chip and are still
// routed to the admin dashboard, because routing uses profiles.role only.
type PortalChoice = "resident" | "official";
type Message = { kind: "error" | "success"; text: string } | null;

const portalCopy: Record<PortalChoice, { eyebrow: string; intro: string }> = {
  resident: { eyebrow: "Resident portal", intro: "Sign in to report incidents and follow advisories." },
  official: { eyebrow: "Barangay official portal", intro: "Sign in to manage reports and respond to incidents." },
};

const noticeMessages: Record<string, string> = {
  role: "Your account doesn't have an active role yet. Contact your barangay administrator.",
};

/**
 * Looks up the signed-in user's real role in public.profiles and returns the
 * dashboard path for it. The chip the user tapped on the form is ignored.
 */
async function dashboardForUser(supabase: SupabaseClient, userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false as const, message: "We couldn't read your account role. Please try again in a moment." };
  const destination = getRoleDashboardPath(profile?.role);
  if (!destination) return { ok: false as const, message: "This account has no role yet. Contact your barangay administrator." };
  return { ok: true as const, destination };
}

function ShieldIcon() {
  return <svg viewBox="0 0 32 32" fill="none"><path d="M16 3 27 7.5v8.1c0 7.4-4.8 11.5-11 14.4C9.8 27.1 5 23 5 15.6V7.5L16 3Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" /></svg>;
}

function CardWaves() {
  return <svg className="card-waves" viewBox="0 0 460 150" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 55C80 15 130 102 230 62S370 12 460 50v100H0Z" />
    <path d="M0 85C90 35 150 122 250 82s150-48 210-12v80H0Z" />
    <path d="M0 112c85-38 155 36 245 11s155-43 215-15v42H0Z" />
  </svg>;
}

function PasswordField({ id, label, value, onChange, autoComplete, show, onToggle }: {
  id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: string; show: boolean; onToggle: () => void;
}) {
  return <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="password-wrap">
      <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} minLength={8} required value={value} onChange={(e) => onChange(e.target.value)} />
      <button className="password-toggle" type="button" data-visible={show} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={onToggle}>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.7" /><path className="eye-slash" d="m3 3 18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
    </div>
  </div>;
}

export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [screen, setScreen] = useState<Screen>("landing");
  const [mode, setMode] = useState<Mode>("sign-in");
  const [portal, setPortal] = useState<PortalChoice>("resident");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  // Already signed in (or refreshing while signed in)? Go straight to the right dashboard.
  useEffect(() => {
    let active = true;
    const notice = new URLSearchParams(window.location.search).get("notice");
    if (window.location.hash === "#signin" || window.location.hash === "#signup" || notice) {
      setScreen("auth");
      if (window.location.hash === "#signup") setMode("sign-up");
    }

    async function resume() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active && notice) setMessage({ kind: "error", text: noticeMessages[notice] ?? noticeMessages.role });
        return;
      }
      const result = await dashboardForUser(supabase, user.id);
      if (!active) return;
      if (result.ok && !notice) {
        router.replace(result.destination);
        router.refresh();
        return;
      }
      // Signed in but a dashboard sent them back (no role or disabled): sign out cleanly.
      await supabase.auth.signOut();
      if (active) setMessage({ kind: "error", text: result.ok ? (noticeMessages[notice!] ?? noticeMessages.role) : result.message });
    }

    resume()
      .catch(() => { if (active) setMessage({ kind: "error", text: "We couldn't check your session. Check your connection and try again." }); })
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, [router]);

  function openAuth(nextMode: Mode) {
    setMode(nextMode); setScreen("auth"); setMessage(null);
    window.history.replaceState(null, "", nextMode === "sign-up" ? "#signup" : "#signin");
  }

  function backToLanding() {
    setScreen("landing"); setMode("sign-in"); setMessage(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  function toggleMode() {
    openAuth(mode === "sign-in" ? "sign-up" : "sign-in");
    setConfirm(""); setShowConfirm(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) { setMessage({ kind: "error", text: "Please enter your email and password." }); return; }

    const supabase = createSupabaseBrowserClient();
    setBusy(true);
    try {
      if (mode === "sign-up") {
        if (fullName.trim().length < 2) { setMessage({ kind: "error", text: "Please enter your full name." }); return; }
        if (password.length < 8) { setMessage({ kind: "error", text: "Use a password with at least 8 characters." }); return; }
        if (password !== confirm) { setMessage({ kind: "error", text: "Passwords do not match." }); return; }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) { setMessage({ kind: "error", text: error.message }); return; }
        if (!data.session || !data.user) {
          setMessage({ kind: "success", text: "Your account was created. Check your email for a confirmation link, then sign in." });
          setMode("sign-in"); setPassword(""); setConfirm("");
          return;
        }
        const result = await dashboardForUser(supabase, data.user.id);
        if (!result.ok) { setMessage({ kind: "error", text: result.message }); return; }
        router.replace(result.destination);
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error || !data.user) {
        setMessage({ kind: "error", text: error?.status === 0 ? "We couldn't reach the sign-in service. Check your connection." : "Wrong email or password." });
        return;
      }
      const result = await dashboardForUser(supabase, data.user.id);
      if (!result.ok) {
        await supabase.auth.signOut();
        setMessage({ kind: "error", text: result.message });
        return;
      }
      // Route by the account's real role, whatever chip was highlighted.
      router.replace(result.destination);
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Something went wrong. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return <main className="ab-login is-landing" aria-busy="true"><p className="sr-only">Checking your session…</p></main>;
  }

  const signingUp = mode === "sign-up";
  const copy = portalCopy[portal];

  return <main className={`ab-login ${screen === "auth" ? "is-auth" : "is-landing"}`} data-auth-mode={screen === "auth" ? mode : undefined}>
    <section className="landing-screen" aria-label="Welcome to Alert Barangay">
      <div className="landing-copy">
        <div className="landing-message">
          <h1>Report. Respond.<br />Protect your barangay.</h1>
          <p>One platform connecting residents and barangay officials for faster, clearer emergency response.</p>
        </div>
        <div className="waves" aria-hidden="true"><span /><span /><span /></div>
      </div>
      <div className="landing-welcome-wrap">
        <section className="landing-welcome" aria-labelledby="welcome-title">
          <span className="welcome-mark" aria-hidden="true"><ShieldIcon /></span>
          <p className="welcome-brand">AlertBarangay</p>
          <h2 id="welcome-title">Get Started</h2>
          <p className="welcome-subtitle">Start with sign up or sign in</p>
          <div className="welcome-actions">
            <button className="welcome-button" type="button" onClick={() => openAuth("sign-up")}>Sign Up</button>
            <button className="welcome-button" type="button" onClick={() => openAuth("sign-in")}>Sign In</button>
          </div>
          <CardWaves />
        </section>
      </div>
    </section>

    <section className="sign-in-panel" aria-labelledby="form-title">
      <div className="form-wrap">
        <button className="auth-back" type="button" aria-label="Back to welcome" onClick={backToLanding}>&larr;</button>
        <span className="auth-mark" aria-hidden="true"><ShieldIcon /></span>
        <p className="eyebrow">{signingUp ? "Create your account" : copy.eyebrow}</p>
        <h1 id="form-title" tabIndex={-1}>{signingUp ? "Create Your Account" : "Hello Welcome Back!"}</h1>
        <p className="intro">{signingUp ? "Sign-ups are for residents. Barangay official accounts are created by an administrator." : copy.intro}</p>

        <form onSubmit={(event) => void submit(event)} noValidate>
          {!signingUp && <fieldset className="roles">
            <legend>I am signing in as</legend>
            <label><input type="radio" name="role" value="resident" checked={portal === "resident"} onChange={() => setPortal("resident")} /><span className="chip">Resident</span></label>
            <label><input type="radio" name="role" value="official" checked={portal === "official"} onChange={() => setPortal("official")} /><span className="chip">Barangay Official</span></label>
          </fieldset>}

          {signingUp && <div className="field">
            <label htmlFor="full-name">Full name</label>
            <input id="full-name" type="text" placeholder="Juan Dela Cruz" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>}
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete={signingUp ? "new-password" : "current-password"} show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          {signingUp && <PasswordField id="confirm-password" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />}

          <button className="submit" type="submit" disabled={busy}>
            {busy ? (signingUp ? "Creating account…" : "Signing in…") : <>{signingUp ? "Sign Up" : "Sign In"} <span aria-hidden="true">&rarr;</span></>}
          </button>
          <p className="form-message" role="status" aria-live="polite" data-kind={message?.kind} data-visible={message ? "true" : undefined}>{message?.text}</p>
        </form>

        <p className="mode-prompt">
          <span>{signingUp ? "Already have an account?" : "New to Alert Barangay?"}</span>
          <button className="mode-toggle" type="button" onClick={toggleMode}>{signingUp ? "Sign in" : "Create an account"}</button>
        </p>
      </div>
      <CardWaves />
    </section>

    <aside className="hero-panel" aria-label="Alert Barangay">
      <div className="hero-content">
        <h2 className="hero-title">Report. Respond.<br />Protect your barangay.</h2>
        <p className="hero-subtitle">One platform connecting residents and barangay officials for faster, clearer emergency response.</p>
      </div>
      <div className="waves" aria-hidden="true"><span /><span /><span /></div>
    </aside>
  </main>;
}
