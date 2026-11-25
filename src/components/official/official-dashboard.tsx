"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MapPin, Siren, Truck } from "lucide-react";
import { AnnouncementsFeed } from "@/components/announcements-feed";
import { IncidentMedia } from "@/components/incident-media";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  formatDate, incidentColumns, incidentStatuses, mapLink, statusLabels, typeLabels,
  type Incident, type IncidentStatus,
} from "@/lib/incidents";

type Filter = "open" | IncidentStatus | "all";

export function OfficialDashboard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("open");
  const [updating, setUpdating] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.from("incidents").select(incidentColumns).order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setLoadError("Incidents could not be loaded. Ask an administrator to apply the incidents migration.");
        else setIncidents((data ?? []) as Incident[]);
      });

    // New reports and status changes from other officials show up live.
    const channel = supabase.channel("official-incidents")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, (payload) => {
        const row = payload.new as Incident;
        if (!row?.id) return;
        setIncidents((current) => {
          const list = current ?? [];
          return list.some((item) => item.id === row.id)
            ? list.map((item) => (item.id === row.id ? row : item))
            : [row, ...list];
        });
      })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [supabase]);

  async function setStatus(incident: Incident, status: IncidentStatus) {
    setUpdating(incident.id); setActionError("");
    const { data, error } = await supabase.from("incidents").update({ status }).eq("id", incident.id).select(incidentColumns).maybeSingle();
    setUpdating(null);
    if (error || !data) {
      setActionError(`Could not update ${incident.eid}. Your account may not have permission. Ask an administrator to apply the security migration.`);
      return;
    }
    setIncidents((current) => (current ?? []).map((item) => (item.id === incident.id ? data as Incident : item)));
  }

  const counts = useMemo(() => {
    const list = incidents ?? [];
    return {
      pending: list.filter((item) => item.status === "pending").length,
      responding: list.filter((item) => item.status === "responding").length,
      resolved: list.filter((item) => item.status === "resolved").length,
    };
  }, [incidents]);

  const visible = (incidents ?? []).filter((item) =>
    filter === "all" ? true : filter === "open" ? item.status !== "resolved" : item.status === filter);

  return <div className="role-grid official">
    <div>
      <section className="overview-card" aria-label="Incident summary">
        <div className="metrics-grid three">
          <div className="metric"><div className="metric-label"><Siren />Pending</div><div className="metric-value">{counts.pending}</div></div>
          <div className="metric"><div className="metric-label"><Truck />Responding</div><div className="metric-value">{counts.responding}</div></div>
          <div className="metric"><div className="metric-label"><CheckCircle2 />Resolved</div><div className="metric-value">{counts.resolved}</div></div>
        </div>
      </section>

      <section className="panel role-panel" aria-labelledby="incidents-heading">
        <div className="panel-header">
          <div className="panel-heading"><h2 className="section-title" id="incidents-heading">Incidents</h2><p>Newest first. Updates arrive live.</p></div>
          <select className="filter-select" aria-label="Filter incidents" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="open">Open (pending + responding)</option>
            {incidentStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            <option value="all">All</option>
          </select>
        </div>
        <div className="role-panel-body">
          {loadError && <div className="inline-error" role="alert">{loadError}</div>}
          {actionError && <div className="inline-error" role="alert">{actionError}</div>}
          {!loadError && incidents === null && <><div className="skeleton" /><div className="skeleton" /></>}
          {incidents && visible.length === 0 && <p className="muted">No incidents in this view.</p>}
          {visible.length > 0 && <ul className="incident-list">
            {visible.map((item) => <li key={item.id} className="incident-item">
              <div className="incident-item-top"><strong>{typeLabels[item.type]} · {item.eid}</strong><span className={`incident-status ${item.status}`}>{statusLabels[item.status]}</span></div>
              <p>{item.description}</p>
              <small>{formatDate(item.created_at)} · <a href={mapLink(item.lat, item.lng)} target="_blank" rel="noreferrer"><MapPin size={11} /> Open location</a></small>
              <div className="incident-actions">
                <IncidentMedia incident={item} />
                {item.status === "pending" && <button type="button" className="button primary small-button" disabled={updating === item.id} onClick={() => void setStatus(item, "responding")}><Truck size={14} />Mark responding</button>}
                {item.status !== "resolved" && <button type="button" className="button secondary small-button" disabled={updating === item.id} onClick={() => void setStatus(item, "resolved")}><CheckCircle2 size={14} />Mark resolved</button>}
                {item.status === "resolved" && <button type="button" className="button secondary small-button" disabled={updating === item.id} onClick={() => void setStatus(item, "responding")}>Reopen</button>}
              </div>
            </li>)}
          </ul>}
        </div>
      </section>
    </div>
    <div className="role-side"><AnnouncementsFeed /></div>
  </div>;
}
