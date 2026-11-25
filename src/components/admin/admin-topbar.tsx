"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronDown, LoaderCircle, LogOut, Moon, Monitor, Pencil, Sun, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Notification = { id: string; event_type: string; message: string; created_at: string; read_at: string | null };
type Theme = "system" | "light" | "dark";

export function AdminTopbar({ email, initialName, initialAvatarUrl }: { email: string; initialName: string; initialAvatarUrl: string }) {
  const router = useRouter();
  const [menu, setMenu] = useState<"notifications" | "appearance" | "profile" | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const avatarUrl = initialAvatarUrl;

  const loadNotifications = useCallback(async (offset = 0, append = false) => {
    try {
      const response = await fetch(`/api/admin/notifications?offset=${offset}`, { cache: "no-store" });
      if (!response.ok) return [] as Notification[];
      const body = await response.json();
      const received = (body.notifications ?? []) as Notification[];
      setNotifications((current) => append ? [...current.filter((item) => !received.some((newItem) => newItem.id === item.id)), ...received] : received);
      setUnreadCount(body.unreadCount ?? 0);
      setHasMore(Boolean(body.hasMore));
      return received;
    } catch { return [] as Notification[]; /* Keep the last known feed visible while offline. */ }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("alertbarangay-theme") as Theme | null;
    if (saved === "system" || saved === "light" || saved === "dark") setTheme(saved);
    const client = createSupabaseBrowserClient();
    const channel = client.channel("admin-notification-feed").on("postgres_changes", { event: "*", schema: "public", table: "admin_notifications" }, () => { void loadNotifications(); }).subscribe();
    void loadNotifications();
    return () => { void client.removeChannel(channel); };
  }, [loadNotifications]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.dataset.theme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  function chooseTheme(value: Theme) {
    setTheme(value);
    localStorage.setItem("alertbarangay-theme", value);
    setMenu(null);
  }

  async function markRead(rows: Notification[]) {
    const unread = rows.filter((item) => !item.read_at).map((item) => item.id);
    if (!unread.length) return;
    const response = await fetch("/api/admin/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: unread }) });
    if (!response.ok) return;
    const readAt = new Date().toISOString();
    setNotifications((items) => items.map((item) => unread.includes(item.id) ? { ...item, read_at: readAt } : item));
    setUnreadCount((count) => Math.max(0, count - unread.length));
  }

  async function toggleNotifications() {
    const next = menu === "notifications" ? null : "notifications";
    setMenu(next);
    if (next) {
      setLoading(true);
      const current = await loadNotifications(0, false);
      setLoading(false);
      await markRead(current);
    }
  }

  async function loadOlder() {
    setLoadingOlder(true);
    const rows = await loadNotifications(notifications.length, true);
    await markRead(rows);
    setLoadingOlder(false);
  }

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.replace("/login"); router.refresh();
  }

  return <div className="admin-topbar">
    <div className="topbar-actions">
      <div className="topbar-popover-wrap theme-wrap">
        <button type="button" className="theme-control" aria-label="Appearance" aria-expanded={menu === "appearance"} onClick={() => setMenu(menu === "appearance" ? null : "appearance")}>
          <Monitor size={15} /><span>Appearance</span>
        </button>
        {menu === "appearance" && <div className="topbar-popover appearance-popover" role="menu" aria-label="Appearance">
          {(["system", "light", "dark"] as const).map((value) => <button type="button" role="menuitemradio" aria-checked={theme === value} className={`appearance-option ${theme === value ? "selected" : ""}`} key={value} onClick={() => chooseTheme(value)}>
            {value === "system" ? <Sun size={15} /> : value === "light" ? <Sun size={15} /> : <Moon size={15} />}<span>{value === "system" ? "Use system" : value === "light" ? "Light mode" : "Dark mode"}</span>{theme === value && <Check size={14} />}
          </button>)}
        </div>}
      </div>
      <div className="topbar-popover-wrap">
        <button type="button" className="icon-button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-expanded={menu === "notifications"} onClick={() => void toggleNotifications()}>
          <Bell size={17} />{unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </button>
        {menu === "notifications" && <div className="topbar-popover notification-popover">
          <div className="popover-heading"><div><strong>Notifications</strong><small>{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</small></div><button className="popover-close" aria-label="Close notifications" onClick={() => setMenu(null)}><X size={16} /></button></div>
          {loading ? <div className="popover-empty"><LoaderCircle className="spin" size={17} /> Loading…</div> : notifications.length ? <><div className="notification-list">{notifications.map((item) => <div className={`notification-item ${item.read_at ? "read" : "unread"}`} key={item.id}><span className="notification-item-icon">{item.event_type === "account.created" ? "U" : "A"}</span><div><p>{item.message}</p><time>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time></div>{item.read_at && <Check size={14} className="read-check" />}</div>)}</div>{hasMore && <button className="load-older-button" type="button" disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? "Loading…" : "Load older notifications"}</button>}</> : <div className="popover-empty">No notifications yet.</div>}
        </div>}
      </div>
      <div className="topbar-popover-wrap">
        <button type="button" className="mini-avatar avatar-trigger" aria-label="Open profile menu" aria-expanded={menu === "profile"} onClick={() => setMenu(menu === "profile" ? null : "profile")}>{avatarUrl ? <img src={avatarUrl} alt="" /> : "AB"}</button>
        {menu === "profile" && <div className="topbar-popover profile-popover">
          <div className="profile-summary"><span className="profile-avatar">{avatarUrl ? <img src={avatarUrl} alt="" /> : "AB"}</span><span><strong>{initialName || "Administrator"}</strong><small>{email}</small></span></div><Link href="/admin/profile" className="profile-menu-item" onClick={() => setMenu(null)}><Pencil size={15} />Edit profile</Link><button className="profile-menu-item" onClick={() => void signOut()}><LogOut size={15} />Sign out</button>
        </div>}
      </div>
    </div>
  </div>;
}
