"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { formatDate } from "@/lib/incidents";

type Announcement = { id: string; title: string; body: string; published_at: string | null; created_at: string };

/** Published announcements written by admins (row security only returns published ones). */
export function AnnouncementsFeed() {
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    createSupabaseBrowserClient().from("announcements")
      .select("id,title,body,published_at,created_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(20)
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) setError("Announcements could not be loaded.");
        else setItems(data ?? []);
      });
    return () => { active = false; };
  }, []);

  return <section className="panel role-panel" aria-labelledby="announcements-heading">
    <div className="panel-header"><div className="panel-heading"><h2 className="section-title" id="announcements-heading">Announcements</h2><p>Updates from your barangay</p></div></div>
    <div className="role-panel-body">
      {error && <div className="inline-error" role="alert">{error}</div>}
      {!error && items === null && <div className="skeleton" />}
      {items?.length === 0 && <p className="muted">No announcements yet.</p>}
      {items && items.length > 0 && <ul className="feed-list">
        {items.map((item) => <li key={item.id} className="feed-item">
          <span className="feed-icon"><Megaphone size={15} /></span>
          <div><strong>{item.title}</strong><p>{item.body}</p><small>{formatDate(item.published_at ?? item.created_at)}</small></div>
        </li>)}
      </ul>}
    </div>
  </section>;
}
