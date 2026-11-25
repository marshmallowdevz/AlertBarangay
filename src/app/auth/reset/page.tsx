"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { dashboardForUser } from "@/lib/auth/dashboard-for-user";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import "../../login/login.css";

type Stage = "checking" | "ready" | "invalid";

/**
 * Landing page for the "reset your password" email link. The Supabase browser
 * client exchanges the one-time code in the URL for a session automatically;
 * the person then picks a new password and goes to their dashboard.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [stage, setStage] = useState<Stage>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser()
      .then(({ data: { user } }) => { if (active) setStage(user ? "ready" : "invalid"); })
      .catch(() => { if (active) setStage("invalid"); });
    return () => { active = false; };
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) { setError("Use a password with at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    const { data, error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError || !data.user) { setBusy(false); setError(updateError?.message ?? "Your password could not be changed. Request a new link."); return; }
    const result = await dashboardForUser(supabase, data.user.id);
    if (!result.ok) { setBusy(false); setError(result.message); return; }
    router.replace(result.destination);
    router.refresh();
  }

  return <main className="ab-login is-auth reset-page">
    <section className="sign-in-panel" aria-labelledby="reset-title">
      <div className="form-wrap">
        <p className="eyebrow">Account recovery</p>
        <h1 id="reset-title">Choose a new password</h1>
        {stage === "checking" && <p className="intro">Checking your reset link…</p>}
        {stage === "invalid" && <>
          <p className="intro">This reset link is invalid or has expired. Links only work once, and only in the browser where you asked for them.</p>
          <a className="submit" href="/login#reset">Request a new link</a>
        </>}
        {stage === "ready" && <form onSubmit={(event) => void submit(event)} noValidate>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="confirm-new-password">Confirm new password</label>
            <input id="confirm-new-password" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button className="submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
          <p className="form-message" role="alert" data-visible={error ? "true" : undefined}>{error}</p>
        </form>}
      </div>
    </section>
  </main>;
}
