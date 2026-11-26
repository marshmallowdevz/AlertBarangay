"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LoadingButton } from "@/components/ui/loading-button";
import { dashboardForUser } from "@/lib/auth/dashboard-for-user";
import { portalAllowsRole, wrongPortalMessage, type PortalChoice } from "@/lib/auth/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toast } from "@/lib/ui/toast";
import "./login.css";

type Screen = "landing" | "auth";
type Mode = "sign-in" | "sign-up" | "reset";
// Two sign-in tabs: Resident, and Barangay Official (staff). Admin accounts
// sign in through the Barangay Official tab. The account's real role in
// public.profiles must match the tab, otherwise sign-in is refused.
type Message = { kind: "error" | "success"; text: string } | null;

// Requests that hang longer than this show a timeout message instead of spinning forever.
const AUTH_TIMEOUT_MS = 20_000;

class AuthTimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new AuthTimeoutError()), AUTH_TIMEOUT_MS);
    promise.then((value) => { window.clearTimeout(timer); resolve(value); }, (error) => { window.clearTimeout(timer); reject(error); });
  });
}

const portalCopy: Record<PortalChoice, { eyebrow: string; intro: string }> = {
  resident: { eyebrow: "Resident portal", intro: "Sign in to report incidents and follow advisories." },
  official: { eyebrow: "Barangay official portal", intro: "Sign in to manage reports and respond to incidents." },
};

const noticeMessages: Record<string, string> = {
  role: "Your account doesn't have an active role yet. Contact your barangay administrator.",
  signin: "Please sign in to continue.",
  unavailable: "We couldn't verify your account right now. Please sign in again.",
};

function initialHash() {
  if (typeof window === "undefined") return "";
  return ["#signin", "#signup", "#reset"].includes(window.location.hash) ? window.location.hash : "";
}

function initialNotice() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("notice");
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
  // Read the #signin / #signup hash on first render. The first paint is the
  // "checking session" placeholder, so this cannot cause a hydration mismatch.
  const [screen, setScreen] = useState<Screen>(() => (initialHash() || initialNotice() ? "auth" : "landing"));
  const [mode, setMode] = useState<Mode>(() => (initialHash() === "#signup" ? "sign-up" : initialHash() === "#reset" ? "reset" : "sign-in"));
  const [portal, setPortal] = useState<PortalChoice>("resident");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  // Keeps the button in its loading state while the dashboard loads after sign-in.
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  // Already signed in (or refreshing while signed in)? Go straight to the right dashboard.
  useEffect(() => {
    let active = true;
    const notice = initialNotice();

    async function resume() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active && notice) setMessage({ kind: notice === "signin" ? "success" : "error", text: noticeMessages[notice] ?? noticeMessages.role });
        return;
      }
      const result = await dashboardForUser(supabase, user.id);
      if (!active) return;
      if (result.ok && notice !== "role") {
        router.replace(result.destination);
        router.refresh();
        return;
      }
      // Signed in but a dashboard sent them back (no role or disabled): sign out cleanly.
      await supabase.auth.signOut();
      if (active) setMessage({ kind: "error", text: result.ok ? (noticeMessages[notice!] ?? noticeMessages.role) : result.message });
    }

    resume()
      .catch(() => {
        if (!active) return;
        const text = "We couldn't check your session. Check your connection and try again.";
        setMessage({ kind: "error", text });
        toast.error(text);
      })
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, [router]);

  // Follow #signin / #signup / #reset links clicked while already on this page.
  useEffect(() => {
    const onHashChange = () => {
      const hash = initialHash();
      if (!hash) return;
      setScreen("auth");
      setMode(hash === "#signup" ? "sign-up" : hash === "#reset" ? "reset" : "sign-in");
      setMessage(null);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function openAuth(nextMode: Mode) {
    setMode(nextMode); setScreen("auth"); setMessage(null);
    window.history.replaceState(null, "", nextMode === "sign-up" ? "#signup" : nextMode === "reset" ? "#reset" : "#signin");
  }

  function backToLanding() {
    setScreen("landing"); setMode("sign-in"); setMessage(null);
    window.history.replaceState(null, "", window.location.pathname);
  }

  function choosePortal(next: PortalChoice) {
    setPortal(next);
    setMessage(null);
  }

  function toggleMode() {
    openAuth(mode === "sign-in" ? "sign-up" : "sign-in");
    setPassword("");
    setConfirm(""); setShowConfirm(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const cleanEmail = email.trim();
    if (mode === "reset") {
      if (!cleanEmail) { setMessage({ kind: "error", text: "Enter the email address of your account." }); return; }
    } else if (!cleanEmail || !password) { setMessage({ kind: "error", text: "Please enter your email and password." }); return; }

    const supabase = createSupabaseBrowserClient();
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: `${window.location.origin}/auth/reset` });
        // Same message either way, so this form cannot be used to discover which emails have accounts.
        if (error && error.status === 0) { setMessage({ kind: "error", text: "We couldn't reach the sign-in service. Check your connection." }); return; }
        setMessage({ kind: "success", text: "If an account exists for that email, a reset link is on its way. Open it on this device." });
        return;
      }
      if (mode === "sign-up") {
        if (fullName.trim().length < 2) { setMessage({ kind: "error", text: "Please enter your full name." }); return; }
        if (password.length < 8) { setMessage({ kind: "error", text: "Use a password with at least 8 characters." }); return; }
        if (password !== confirm) { setMessage({ kind: "error", text: "Passwords do not match." }); return; }
        // Public sign-up only ever creates resident accounts. Only the name is
        // sent; the database trigger assigns role = 'resident' and ignores any
        // role a browser might try to smuggle into the sign-up metadata.
        const { data, error } = await withTimeout(supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: fullName.trim() }, emailRedirectTo: `${window.location.origin}/login` },
        }));
        if (error) {
          setMessage({ kind: "error", text: error.status === 0 ? "We couldn't reach the sign-up service. Check your connection." : error.message });
          return;
        }
        if (!data.session || !data.user) {
          setMessage({ kind: "success", text: "Your resident account was created. Check your email for a confirmation link, then sign in." });
          setMode("sign-in"); setPortal("resident"); setPassword(""); setConfirm("");
          return;
        }
        const result = await withTimeout(dashboardForUser(supabase, data.user.id));
        if (!result.ok || result.role !== "resident") {
          await supabase.auth.signOut();
          setMessage({ kind: "error", text: result.ok ? "Public sign-up is for residents only." : result.message });
          return;
        }
        toast.success("Welcome to AlertBarangay!");
        router.replace(result.destination);
        router.refresh();
        return;
      }

      const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email: cleanEmail, password }));
      if (error || !data.user) {
        const text = error?.status === 0 ? "We couldn't reach the sign-in service. Check your connection." : "Wrong email or password.";
        setMessage({ kind: "error", text });
        if (error?.status === 0) toast.error(text);
        return;
      }
      const result = await withTimeout(dashboardForUser(supabase, data.user.id));
      if (!result.ok) {
        await supabase.auth.signOut();
        setMessage({ kind: "error", text: result.message });
        return;
      }
      // The chosen tab must match the account's real role (from profiles.role).
      // Wrong portal: sign straight back out and say which tab to use.
      if (!portalAllowsRole(portal, result.role)) {
        await supabase.auth.signOut();
        const text = wrongPortalMessage(portal, result.role);
        setMessage({ kind: "error", text });
        toast.error(text);
        return;
      }
      setRedirecting(true);
      router.replace(result.destination);
      router.refresh();
    } catch (cause) {
      const text = cause instanceof AuthTimeoutError
        ? "The server is taking too long to respond. Please try again."
        : typeof navigator !== "undefined" && navigator.onLine === false
          ? "You appear to be offline. Check your connection and try again."
          : "Something went wrong. Check your connection and try again.";
      setMessage({ kind: "error", text });
      toast.error(text);
    } finally {
      setBusy(false);
    }
  }

  if (checkingSession) {
    return <main className="ab-login is-landing" aria-busy="true"><p className="sr-only">Checking your session…</p></main>;
  }

  const signingUp = mode === "sign-up";
  const resetting = mode === "reset";
  const copy = portalCopy[portal];
  const heading = signingUp ? "Create Your Resident Account" : resetting ? "Reset your password" : "Hello Welcome Back!";
  const eyebrow = signingUp ? "Resident sign-up" : resetting ? "Forgot password" : copy.eyebrow;
  const intro = signingUp
    ? "Sign-up is for residents only. Barangay official accounts are created by your barangay administrator."
    : resetting ? "Enter your email and we'll send you a link to choose a new password." : copy.intro;

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
          <p className="welcome-subtitle">Residents can sign up. Officials sign in with the account from their administrator.</p>
          <div className="welcome-actions">
            <button className="welcome-button" type="button" onClick={() => { setPortal("resident"); openAuth("sign-up"); }}>Sign Up as Resident</button>
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
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="form-title" tabIndex={-1}>{heading}</h1>
        <p className="intro">{intro}</p>

        <form onSubmit={(event) => void submit(event)} noValidate>
          {mode === "sign-in" && <fieldset className="roles">
            <legend>I am signing in as</legend>
            <label><input type="radio" name="role" value="resident" checked={portal === "resident"} onChange={() => choosePortal("resident")} /><span className="chip">Resident</span></label>
            <label><input type="radio" name="role" value="official" checked={portal === "official"} onChange={() => choosePortal("official")} /><span className="chip">Barangay Official</span></label>
          </fieldset>}

          {signingUp && <div className="field">
            <label htmlFor="full-name">Full name</label>
            <input id="full-name" type="text" placeholder="Juan Dela Cruz" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>}
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          {!resetting && <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete={signingUp ? "new-password" : "current-password"} show={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
          {mode === "sign-in" && <button type="button" className="forgot-link" onClick={() => openAuth("reset")}>Forgot password?</button>}
          {signingUp && <PasswordField id="confirm-password" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />}

          <LoadingButton
            className="submit"
            loading={busy || redirecting}
            loadingText={redirecting ? "Opening your dashboard…" : signingUp ? "Creating account…" : resetting ? "Sending link…" : "Signing in…"}
          >
            {signingUp ? "Sign Up" : resetting ? "Send reset link" : "Sign In"} <span aria-hidden="true">&rarr;</span>
          </LoadingButton>
          <p className="form-message" role="status" aria-live="polite" data-kind={message?.kind} data-visible={message ? "true" : undefined}>{message?.text}</p>
        </form>

        {mode === "sign-in" && portal === "official"
          ? <p className="mode-prompt official-note">
            <span>Official accounts are created by your barangay administrator. There is no public sign-up for officials.</span>
          </p>
          : <p className="mode-prompt">
            <span>{mode === "sign-in" ? "New resident?" : resetting ? "Remembered it?" : "Already have an account?"}</span>
            <button className="mode-toggle" type="button" onClick={toggleMode} disabled={busy}>{mode === "sign-in" ? "Create a resident account" : "Sign in"}</button>
          </p>}
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
