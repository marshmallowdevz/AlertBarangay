"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { errorMessage, fetchJson } from "@/lib/fetch-json";
import { ArrowLeft, CheckCircle2, CircleAlert, Clock3, LoaderCircle, Save, ShieldCheck, Wrench } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";

type Settings = { maintenance_mode: boolean; maintenance_message: string; updated_at: string; updated_by: string | null };
const fetchSettings = () => fetchJson<Settings>("/api/admin/settings/maintenance");
const defaultMessage = "AlertBarangay is currently undergoing scheduled maintenance. Please check back shortly.";

export function MaintenanceSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState(defaultMessage);
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [confirmEnable, setConfirmEnable] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await fetchSettings(); setSettings(result); setMessage(result.maintenance_message); }
    catch (cause) { setError(errorMessage(cause, "Unable to load maintenance settings.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    fetchSettings()
      .then((result) => { if (active) { setSettings(result); setMessage(result.maintenance_message); } })
      .catch((cause) => { if (active) setError(errorMessage(cause, "Unable to load maintenance settings.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function saveMode(enabled: boolean) {
    setSavingMode(true); setError(""); setConfirmEnable(false);
    try {
      const response = await fetch("/api/admin/settings/maintenance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maintenance_mode: enabled }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update maintenance mode.");
      setSettings(result); setMessage(result.maintenance_message); setToast(enabled ? "Maintenance mode is now active." : "Your site is live again.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update maintenance mode."); }
    finally { setSavingMode(false); }
  }

  async function saveMessage() {
    setSavingMessage(true); setError("");
    try {
      const response = await fetch("/api/admin/settings/maintenance", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ maintenance_message: message }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save the maintenance message.");
      setSettings(result); setMessage(result.maintenance_message); setToast("Maintenance message saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save the maintenance message."); }
    finally { setSavingMessage(false); }
  }

  const enabled = settings?.maintenance_mode ?? false;
  return <div className="page-wrap">
    <div className="topline"><div className="breadcrumb"><Link href="/admin/settings">Settings</Link><span className="crumb-dot">/</span><strong>Maintenance mode</strong></div></div>
    <div className="page-heading maintenance-page-heading"><div><div className="eyebrow">SYSTEM</div><h1>Maintenance mode</h1><p className="subtitle">Temporarily pause resident and official access while keeping admin controls available.</p></div></div>
    <Link href="/admin/settings" className="maintenance-back-link"><ArrowLeft size={15} />Back to Settings</Link>
    {toast && <div className="toast maintenance-toast" role="status"><CheckCircle2 size={16} />{toast}</div>}
    {error && <div className="inline-error maintenance-error" role="alert"><CircleAlert size={15} />{error}<button type="button" onClick={() => void load()}>Try again</button></div>}
    {loading ? <div className="loading-state maintenance-loading"><div className="skeleton" /></div> : <section className="maintenance-card" aria-labelledby="maintenance-control-heading">
      <div className="maintenance-card-header"><span className="maintenance-icon-badge"><Wrench size={20} /></span><div><div className="eyebrow">SITE AVAILABILITY</div><h2 id="maintenance-control-heading">Maintenance controls</h2><p>Choose whether residents and officials can access the site.</p></div></div>
      <div className={`maintenance-status-banner ${enabled ? "is-enabled" : "is-live"}`}><span className="maintenance-status-dot" /><div><strong>{enabled ? "Maintenance Mode Active" : "Site is Live"}</strong><small>{enabled ? "Public and dashboard pages show the maintenance screen." : "All users can access their AlertBarangay dashboards."}</small></div><span className={`maintenance-state-pill ${enabled ? "enabled" : "live"}`}>{enabled ? "Enabled" : "Live"}</span></div>
      <div className="maintenance-toggle-row"><div><strong>Maintenance mode</strong><p>Admins can continue to access the portal and turn this off.</p></div><button type="button" role="switch" aria-checked={enabled} aria-label="Maintenance mode" className={`maintenance-switch ${enabled ? "on" : ""}`} disabled={savingMode} onClick={() => enabled ? void saveMode(false) : setConfirmEnable(true)}><span /></button></div>
      <div className="maintenance-message-section"><div className="maintenance-message-heading"><div><strong>Maintenance error message</strong><p>This message appears on the 503 page for visitors.</p></div><span>{message.length}/2000</span></div><textarea rows={4} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} disabled={savingMessage} /><LoadingButton type="button" className="button primary" onClick={() => void saveMessage()} loading={savingMessage} loadingText="Saving…" disabled={!message.trim()}><Save size={15} />Save message</LoadingButton></div>
      <div className="maintenance-card-footer"><Clock3 size={14} />{settings?.updated_at ? `Last updated ${new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(settings.updated_at))}` : "Settings are ready"}</div>
    </section>}
    {savingMode && <div className="maintenance-saving-indicator"><LoaderCircle className="spin" size={15} />Updating site availability…</div>}
    {confirmEnable && <div className="modal-backdrop" role="presentation"><section className="modal maintenance-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="maintenance-confirm-heading"><div className="modal-head"><div><h2 id="maintenance-confirm-heading">Turn on maintenance mode?</h2><p>Residents and officials will see the maintenance page until an admin turns this off.</p></div></div><div className="modal-body"><div className="maintenance-confirm-note"><ShieldCheck size={17} />Admin pages and sign-in will remain available.</div></div><div className="modal-foot"><button type="button" className="button secondary" onClick={() => setConfirmEnable(false)}>Cancel</button><button type="button" className="button primary" onClick={() => void saveMode(true)}>Enable maintenance</button></div></section></div>}
  </div>;
}
