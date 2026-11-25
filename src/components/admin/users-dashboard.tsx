"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CircleAlert, Edit3, KeyRound, Plus, Search, Shield, Trash2, Users, X } from "lucide-react";
import type { ManagedUser, UserDraft, UserRole } from "@/types/user";

type UserGroup = "all" | "residents" | "officials";
type InitialFilters = { role: string; status: string; group: UserGroup };
type DialogState = { type: "create" } | { type: "edit"; user: ManagedUser } | { type: "password"; user: ManagedUser } | { type: "delete"; user: ManagedUser } | null;
const emptyDraft: UserDraft = { email: "", password: "", full_name: "", role: "resident", position: "", department: "" };
const previewUsers: ManagedUser[] = [
  { id: "preview-admin", email: "alex.reyes@example.test", full_name: "Alex Reyes", role: "admin", position: "Barangay Captain", department: "Administration", is_active: true, created_at: "2026-01-15T08:00:00.000Z", last_sign_in_at: "2026-11-20T08:00:00.000Z" },
  { id: "preview-official", email: "jamie.santos@example.test", full_name: "Jamie Santos", role: "official", position: "Health Officer", department: "Health & Safety", is_active: true, created_at: "2026-02-10T08:00:00.000Z", last_sign_in_at: "2026-11-18T08:00:00.000Z" },
  { id: "preview-resident", email: "taylor.cruz@example.test", full_name: "Taylor Cruz", role: "resident", position: null, department: null, is_active: true, created_at: "2026-03-05T08:00:00.000Z", last_sign_in_at: null },
  { id: "preview-disabled", email: "morgan.diaz@example.test", full_name: "Morgan Diaz", role: "resident", position: null, department: null, is_active: false, created_at: "2026-04-22T08:00:00.000Z", last_sign_in_at: "2026-08-03T08:00:00.000Z" },
];

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
}

function roleName(role: UserRole) { return role === "admin" ? "Admin" : role === "official" ? "Official" : "Resident"; }
function dateText(value: string) {
  return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export function UsersDashboard({ currentUserId, previewMode = false, initialFilters = { role: "all", status: "all", group: "all" } }: { currentUserId: string; previewMode?: boolean; initialFilters?: InitialFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<UserGroup>(initialFilters.group);
  const [role, setRole] = useState(initialFilters.role);
  const [status, setStatus] = useState(initialFilters.status);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [draft, setDraft] = useState<UserDraft>(emptyDraft);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeStatus, setActiveStatus] = useState(true);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    setGroup(initialFilters.group);
    setRole(initialFilters.role);
    setStatus(initialFilters.status);
  }, [initialFilters.group, initialFilters.role, initialFilters.status]);

  function syncFilters(next: InitialFilters) {
    const params = new URLSearchParams(window.location.search);
    for (const key of ["role", "status", "group"]) params.delete(key);
    if (next.role !== "all") params.set("role", next.role);
    if (next.status !== "all") params.set("status", next.status);
    if (next.group !== "all") params.set("group", next.group);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const loadUsers = useCallback(async () => {
    setLoading(true); setLoadError(""); setUsers([]);
    if (previewMode) {
      const query = search.trim().toLocaleLowerCase();
      const filteredUsers = previewUsers.filter((user) => {
        const matchesQuery = !query || `${user.email} ${user.full_name}`.toLocaleLowerCase().includes(query);
          const matchesGroup = group === "all" || (group === "residents" ? user.role === "resident" : user.role === "official" || user.role === "admin");
        const matchesRole = role === "all" || user.role === role;
        const matchesStatus = status === "all" || (status === "active" ? user.is_active : !user.is_active);
          return matchesQuery && matchesGroup && matchesRole && matchesStatus;
      });
      setUsers(filteredUsers);
      setLoading(false);
      return;
    }
    const params = new URLSearchParams();
    if (group !== "all") params.set("group", group);
    if (search.trim()) params.set("q", search.trim());
    if (role !== "all") params.set("role", role);
    if (status !== "all") params.set("status", status);
    try {
      const response = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load user accounts.");
      setUsers(body.users);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load user accounts.");
    } finally { setLoading(false); }
  }, [previewMode, search, group, role, status]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadUsers(); }, 220);
    return () => clearTimeout(timer);
  }, [loadUsers]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const visibleCount = users.length;
  const dialogTitle = useMemo(() => {
    if (!dialog) return "";
    return dialog.type === "create" ? "Create account" : dialog.type === "edit" ? "Edit user" : dialog.type === "password" ? "Set new password" : "Delete account";
  }, [dialog]);

  function openCreate() { setDraft(emptyDraft); setDialogError(""); setActiveStatus(true); setShowTemporaryPassword(false); setDialog({ type: "create" }); }
  function selectGroup(nextGroup: UserGroup) {
    const nextRole = nextGroup === "residents" ? "resident" : "all";
    setGroup(nextGroup);
    setRole(nextRole);
    syncFilters({ group: nextGroup, role: nextRole, status });
  }
  function clearFilters() {
    setGroup("all"); setRole("all"); setStatus("all");
    syncFilters({ group: "all", role: "all", status: "all" });
  }

  const activeFilterLabel = role !== "all"
    ? `Showing: ${role === "admin" ? "Admins" : role === "official" ? "Officials" : "Residents / users"}`
    : status !== "all" ? `Showing: ${status === "active" ? "Active accounts" : "Disabled accounts"}`
      : group !== "all" ? `Showing: ${group === "residents" ? "Residents" : "Officials & admins"}` : "";
  function openEdit(user: ManagedUser) {
    setDraft({ email: user.email, password: "", full_name: user.full_name, role: user.role, position: user.position ?? "", department: user.department ?? "" });
    setDialogError(""); setDialog({ type: "edit", user });
  }
  function closeDialog() { if (!saving) { setDialog(null); setDialogError(""); setPassword(""); setConfirmPassword(""); } }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!dialog || (dialog.type !== "create" && dialog.type !== "edit")) return;
    setSaving(true); setDialogError("");
    const creating = dialog.type === "create";
    const profileDraft = {
      ...draft,
      position: draft.role === "official" ? draft.position.trim() || null : null,
      department: draft.role === "official" ? draft.department.trim() || null : null,
    };
    try {
      const response = await fetch(creating ? "/api/admin/users" : `/api/admin/users/${dialog.user.id}`, {
        method: creating ? "POST" : "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creating ? profileDraft : { ...profileDraft, is_active: activeStatus }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to save this account.");
      setDialog(null); setDraft(emptyDraft); setActiveStatus(true); setShowTemporaryPassword(false);
      await loadUsers();
      setToast(creating ? "Account created successfully." : "User details updated.");
    } catch (error) { setDialogError(error instanceof Error ? error.message : "Unable to save this account."); }
    finally { setSaving(false); }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (dialog?.type !== "password") return;
    setSaving(true); setDialogError("");
    try {
      const response = await fetch(`/api/admin/users/${dialog.user.id}/password`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, confirmPassword }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to reset password.");
      setDialog(null); setPassword(""); setConfirmPassword(""); setToast("Password updated successfully.");
    } catch (error) { setDialogError(error instanceof Error ? error.message : "Unable to reset password."); }
    finally { setSaving(false); }
  }

  async function deleteUser() {
    if (dialog?.type !== "delete") return;
    setSaving(true); setDialogError("");
    try {
      const response = await fetch(`/api/admin/users/${dialog.user.id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to delete account.");
      setDialog(null); setToast("Account deleted."); void loadUsers();
    } catch (error) { setDialogError(error instanceof Error ? error.message : "Unable to delete account."); }
    finally { setSaving(false); }
  }

  useEffect(() => { if (dialog?.type === "edit") setActiveStatus(dialog.user.is_active); }, [dialog]);

  return <div className="page-wrap">
    <div className="topline"><div className="breadcrumb"><strong>User management</strong></div></div>
    <div className="page-heading"><div><div className="eyebrow">ADMINISTRATION</div><h1>User management</h1><p className="subtitle">Create accounts and manage access to the AlertBarangay dashboard.</p></div><button className="button primary" onClick={openCreate} disabled={previewMode}><Plus size={16} strokeWidth={2.5} />Create account</button></div>
    <div className="notice"><Shield size={18} /><div><strong>{previewMode ? "Preview mode — sample data" : "Account access is managed centrally"}</strong><p>{previewMode ? "This page is showing local demo accounts. Account changes are disabled in preview mode." : "New accounts can sign in to connected AlertBarangay dashboards using their assigned email and password."}</p></div></div>
    <section className="panel" aria-label="User accounts">
      <div role="tablist" aria-label="Account group" style={{ display: "flex", gap: 8, padding: "16px 20px 0" }}>
        <button type="button" role="tab" aria-selected={group === "all"} className={`button ${group === "all" ? "primary" : "secondary"}`} onClick={() => selectGroup("all")}>All accounts</button>
        <button type="button" role="tab" aria-selected={group === "residents"} className={`button ${group === "residents" ? "primary" : "secondary"}`} onClick={() => selectGroup("residents")}>Residents</button>
        <button type="button" role="tab" aria-selected={group === "officials"} className={`button ${group === "officials" ? "primary" : "secondary"}`} onClick={() => selectGroup("officials")}>Officials & admins</button>
      </div>
      {activeFilterLabel && <div className="active-filter-banner"><strong>{activeFilterLabel}</strong><button type="button" onClick={clearFilters}>Show all accounts</button></div>}
      <div className="panel-header"><div className="panel-heading"><h2 className="section-title">{group === "all" ? "All accounts" : group === "residents" ? "Residents" : "Officials and admins"}</h2><p>Review account details, roles, and access status.</p></div>
        <div className="filters"><div className="search-wrap"><Search size={15} /><input className="search-input" aria-label="Search users" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select className="filter-select" aria-label="Filter by role" value={role} onChange={(e) => { setRole(e.target.value); syncFilters({ group, role: e.target.value, status }); }}>
            {group === "all" && <option value="all">All roles</option>}
            {group === "officials" && <option value="all">All official roles</option>}
            {(group === "all" || group === "officials") && <option value="admin">Admins</option>}
            {(group === "all" || group === "officials") && <option value="official">Officials</option>}
            {(group === "all" || group === "residents") && <option value="resident">Residents</option>}
          </select>
          <select className="filter-select" aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); syncFilters({ group, role, status: e.target.value }); }}><option value="all">All status</option><option value="active">Active</option><option value="disabled">Disabled</option></select>
        </div>
      </div>
      {loading ? <div className="loading-state" aria-label="Loading user accounts"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div> : loadError ? <div className="empty-state"><div className="empty-icon"><CircleAlert size={20} /></div><strong>Couldn't load accounts</strong><p>{loadError}</p><button className="button secondary" style={{ marginTop: 14 }} onClick={() => void loadUsers()}>Try again</button></div> : users.length === 0 ? <div className="empty-state"><div className="empty-icon"><Users size={20} /></div><strong>{search || role !== "all" || status !== "all" ? "No matching accounts" : "No accounts yet"}</strong><p>{search || role !== "all" || status !== "all" ? "Try changing your filters or search terms." : "Create an account to get started."}</p>{!previewMode && !search && role === "all" && status === "all" && <button className="button primary" style={{ marginTop: 14 }} onClick={openCreate}><Plus size={15} />Create account</button>}</div> : <>
        <div className="table-scroll"><table className="user-table"><thead><tr><th>User</th><th>Role</th><th>Position / department</th><th>Status</th><th>Created</th><th>Last sign in</th><th aria-label="Actions" /></tr></thead><tbody>
          {users.map((user) => <tr key={user.id}><td><div className="user-cell"><span className="user-avatar">{initials(user.full_name, user.email)}</span><span><span className="user-name">{user.full_name || "Unnamed user"}</span><span className="user-email"><small className="user-email-label">Email</small>{user.email}</span></span></div></td>
            <td><span className={`role-pill ${user.role}`}>{roleName(user.role)}</span></td><td>{user.position || user.department ? [user.position, user.department].filter(Boolean).join(" · ") : <span className="muted">—</span>}</td>
            <td><span className={`status-pill ${user.is_active ? "active" : "disabled"}`}><span className="status-dot" />{user.is_active ? "Active" : "Disabled"}</span></td>
            <td>{dateText(user.created_at)}</td><td>{user.last_sign_in_at ? dateText(user.last_sign_in_at) : <span className="muted">Never</span>}</td>
            <td><div className="action-menu"><button className="row-action" aria-label={`Edit ${user.email}`} title="Edit user" disabled={previewMode} onClick={() => openEdit(user)}><Edit3 /></button><button className="row-action" aria-label={`Reset password for ${user.email}`} title="Reset password" disabled={previewMode} onClick={() => { setPassword(""); setConfirmPassword(""); setDialogError(""); setDialog({ type: "password", user }); }}><KeyRound /></button><button className="row-action" aria-label={`Delete ${user.email}`} title="Delete account" disabled={previewMode || user.id === currentUserId} onClick={() => { setDialogError(""); setDialog({ type: "delete", user }); }}><Trash2 /></button></div></td>
          </tr>)}
        </tbody></table></div><div className="table-footer"><span>Showing {visibleCount} account{visibleCount === 1 ? "" : "s"}</span><span>Sorted by creation date</span></div>
      </>}
    </section>

    {toast && <div className="toast" role="status">{toast}</div>}
    {dialog && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDialog(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <header className="modal-head"><div><h2 id="dialog-title">{dialogTitle}</h2><p>{dialog.type === "create" ? "Add a new person to the dashboard." : dialog.type === "edit" ? "Update this user's details and access." : dialog.type === "password" ? `Set a new sign-in password for ${dialog.user.email}.` : "This action permanently removes dashboard access."}</p></div><button className="close-button" aria-label="Close dialog" onClick={closeDialog}><X size={16} /></button></header>
      {(dialog.type === "create" || dialog.type === "edit") && <form onSubmit={saveUser}>
        <div className="modal-body"><div className="modal-subsection"><p className="modal-subsection-title">Account details</p><div className="form-grid">
          <Field label="Full name" full><input required maxLength={120} value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} placeholder="e.g. Maria Santos" /></Field>
          <Field label="Email address" full><input required type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="name@barangay.gov.ph" /></Field>
          {dialog.type === "create" && <div className="field full"><label htmlFor="temporary-password">Temporary password</label><div className="password-input-wrap"><input id="temporary-password" required minLength={8} type={showTemporaryPassword ? "text" : "password"} autoComplete="new-password" value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} placeholder="At least 8 characters" /><button type="button" className="password-toggle" aria-label={showTemporaryPassword ? "Hide temporary password" : "Show temporary password"} aria-pressed={showTemporaryPassword} onClick={() => setShowTemporaryPassword((shown) => !shown)}><i className={`fa-solid ${showTemporaryPassword ? "fa-eye" : "fa-eye-slash"}`} aria-hidden="true" /></button></div><span className="field-hint">Share this temporary password securely with the new account holder.</span></div>}
        </div></div><div className="modal-subsection"><p className="modal-subsection-title">Role & organization</p><div className="form-grid">
          <Field label="Role"><select value={draft.role} onChange={(e) => { const nextRole = e.target.value as UserRole; setDraft({ ...draft, role: nextRole, position: nextRole === "official" ? draft.position : "", department: nextRole === "official" ? draft.department : "" }); }}><option value="resident">Resident</option><option value="official">Official</option><option value="admin">Admin</option></select></Field>
          {dialog.type === "edit" && <Field label="Account status"><select value={String(activeStatus)} onChange={(e) => setActiveStatus(e.target.value === "true")}><option value="true">Active</option><option value="false">Disabled</option></select></Field>}
          {draft.role === "official" && <><Field label="Position"><input maxLength={120} value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} placeholder="e.g. Barangay Captain" /></Field>
          <Field label="Department"><input maxLength={120} value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} placeholder="e.g. Health & Safety" /></Field></>}
        </div></div>{dialogError && <div className="inline-error" role="alert">{dialogError}</div>}</div>
        <footer className="modal-foot"><button type="button" className="button secondary" onClick={closeDialog}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving…" : dialog.type === "create" ? "Create account" : "Save changes"}</button></footer>
      </form>}
      {dialog.type === "password" && <form onSubmit={resetPassword}><div className="modal-body"><Field label="New password" full><input type="password" autoFocus required minLength={12} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 12 characters" /></Field><Field label="Confirm new password" full><input type="password" required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter the new password" /><span className="field-hint">Use at least 12 characters. The new password takes effect immediately.</span></Field>{dialogError && <div className="inline-error" role="alert" style={{ marginTop: 13 }}>{dialogError}</div>}</div><footer className="modal-foot"><button type="button" className="button secondary" onClick={closeDialog}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Updating…" : "Set password"}</button></footer></form>}
      {dialog.type === "delete" && <><div className="modal-body"><p className="confirm-copy">You’re about to permanently delete <strong>{dialog.user.full_name || dialog.user.email}</strong> and remove their sign-in access. This cannot be undone.</p><div className="danger-note">This account will no longer be able to sign in to connected AlertBarangay dashboards.</div>{dialogError && <div className="inline-error" role="alert" style={{ marginTop: 13 }}>{dialogError}</div>}</div><footer className="modal-foot"><button className="button secondary" onClick={closeDialog}>Cancel</button><button className="button danger" disabled={saving} onClick={() => void deleteUser()}>{saving ? "Deleting…" : "Delete account"}</button></footer></>}
    </section></div>}
  </div>;
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`field ${full ? "full" : ""}`}><span>{label}</span>{children}</label>;
}
