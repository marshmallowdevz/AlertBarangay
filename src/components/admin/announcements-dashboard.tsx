"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { errorMessage, fetchJson } from "@/lib/fetch-json";
import { Bell, CircleAlert, Edit3, Plus, Send, Trash2, X } from "lucide-react";

type Announcement = { id: string; title: string; body: string; is_published: boolean; created_at: string; updated_at: string; published_at: string | null };
type Draft = { title: string; body: string; is_published: boolean };
const emptyDraft: Draft = { title: "", body: "", is_published: false };
const fetchAnnouncements = () => fetchJson<{ announcements?: Announcement[] }>("/api/admin/announcements");

export function AnnouncementsDashboard() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems((await fetchAnnouncements()).announcements ?? []); }
    catch (cause) { setError(errorMessage(cause, "Unable to load announcements.")); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAnnouncements()
      .then((result) => { if (active) setItems(result.announcements ?? []); })
      .catch((cause) => { if (active) setError(errorMessage(cause, "Unable to load announcements.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function openCreate() { setEditing(null); setDraft(emptyDraft); setError(""); setFormOpen(true); }
  function openEdit(item: Announcement) { setEditing(item); setDraft({ title: item.title, body: item.body, is_published: item.is_published }); setError(""); setFormOpen(true); }
  function closeForm() { if (!saving) { setEditing(null); setDraft(emptyDraft); setError(""); setFormOpen(false); } }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(editing ? `/api/admin/announcements/${editing.id}` : "/api/admin/announcements", {
        method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save announcement.");
      setEditing(null); setDraft(emptyDraft); setFormOpen(false); setToast(editing ? "Announcement updated." : "Announcement created.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save announcement."); }
    finally { setSaving(false); }
  }

  async function remove(item: Announcement) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    const response = await fetch(`/api/admin/announcements/${item.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to delete announcement."); return; }
    setToast("Announcement deleted."); void load();
  }

  async function togglePublish(item: Announcement) {
    const response = await fetch(`/api/admin/announcements/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: item.title, body: item.body, is_published: !item.is_published }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error || "Unable to update announcement."); return; }
    setToast(item.is_published ? "Announcement unpublished." : "Announcement published to connected dashboards."); void load();
  }

  return <div className="page-wrap">
    <div className="topline"><div className="breadcrumb"><strong>Announcements</strong></div></div>
    <div className="page-heading"><div><div className="eyebrow">COMMUNITY UPDATES</div><h1>Announcements</h1><p className="subtitle">Create updates and publish them for connected AlertBarangay dashboards.</p></div><button type="button" className="button primary" onClick={openCreate}><Plus size={16} />New announcement</button></div>
    {toast && <div role="status" className="toast announcement-toast">{toast}<button onClick={() => setToast("")} aria-label="Dismiss message"><X size={14} /></button></div>}
    {error && !editing && <div className="inline-error announcement-error"><CircleAlert size={15} />{error}<button onClick={() => void load()}>Try again</button></div>}
    {loading ? <div className="loading-state"><div className="skeleton" /><div className="skeleton" /></div> : error ? null : items.length ? <div className="announcement-list">{items.map((item) => <article className="announcement-card" key={item.id}>
      <div className="announcement-card-top"><span className={`announcement-status ${item.is_published ? "published" : "draft"}`}><span />{item.is_published ? "Published" : "Draft"}</span><time>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(item.created_at))}</time></div>
      <h2>{item.title}</h2><p className="announcement-body">{item.body}</p>
      <div className="announcement-card-actions"><button className="button secondary" onClick={() => openEdit(item)}><Edit3 size={14} />Edit</button><button className="button secondary" onClick={() => void togglePublish(item)}>{item.is_published ? "Unpublish" : <><Send size={14} />Publish</>}</button><button className="button danger-ghost" onClick={() => void remove(item)}><Trash2 size={14} />Delete</button></div>
    </article>)}</div> : <div className="empty-state announcement-empty"><div className="empty-icon"><Bell size={20} /></div><strong>No announcements yet</strong><p>Share an update with your community by creating your first announcement.</p><button className="button primary" style={{ marginTop: 14 }} onClick={openCreate}><Plus size={15} />Create announcement</button></div>}
    {formOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}><section className="modal announcement-modal" role="dialog" aria-modal="true" aria-labelledby="announcement-dialog-title"><form onSubmit={(event) => void save(event)}>
      <div className="modal-head"><div><h2 id="announcement-dialog-title">{editing ? "Edit announcement" : "New announcement"}</h2><p>Write a clear update for the community.</p></div><button type="button" className="close-button" onClick={closeForm} aria-label="Close"><X size={17} /></button></div>
      <div className="modal-body announcement-form"><label className="field"><span>Title</span><input required maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Barangay assembly schedule" /></label><label className="field"><span>Announcement</span><textarea required maxLength={10000} rows={7} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} placeholder="Share the details residents need to know…" /></label><label className="publish-check"><input type="checkbox" checked={draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} /><span><strong>Publish now</strong><small>Make this announcement available to connected dashboards.</small></span></label>{error && <div className="inline-error">{error}</div>}</div>
      <div className="modal-foot"><button type="button" className="button secondary" onClick={closeForm} disabled={saving}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create announcement"}</button></div>
    </form></section></div>}
  </div>;
}
