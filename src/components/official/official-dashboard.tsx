"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MapPin, RotateCcw, Search, Siren, Truck, UserRound } from "lucide-react";
import { AnnouncementsFeed } from "@/components/announcements-feed";
import { IncidentMedia } from "@/components/incident-media";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  describeLocation, formatDate, incidentColumns, incidentStatuses, mapLink, statusLabels, timeAgo, typeLabels,
  type Incident, type IncidentStatus,
} from "@/lib/incidents";

type Filter = "open" | IncidentStatus | "all";

export function OfficialDashboard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [reporters, setReporters] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.from("incidents").select(incidentColumns).order("created_at", { ascending: false }).limit(200)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setLoadError("Incidents could not be loaded right now. Please try again later.");
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

  // Reporter names (needs migration 0007; without it the names simply stay hidden).
  const missingReporterIds = useMemo(() => [...new Set((incidents ?? [])
    .map((item) => item.reporter_id)
    .filter((id): id is string => Boolean(id) && !(id! in reporters)))], [incidents, reporters]);

  useEffect(() => {
    if (!missingReporterIds.length) return;
    let active = true;
    supabase.from("profiles").select("id, full_name").in("id", missingReporterIds)
      .then(({ data }) => {
        if (!active) return;
        const names: Record<string, string> = Object.fromEntries(missingReporterIds.map((id) => [id, ""]));
        for (const row of data ?? []) names[row.id as string] = (row.full_name as string) || "";
        setReporters((current) => ({ ...current, ...names }));
      });
    return () => { active = false; };
  }, [supabase, missingReporterIds]);

  async function setStatus(incident: Incident, status: IncidentStatus) {
    setUpdating(incident.id); setActionError("");
    const { data, error } = await supabase.from("incidents").update({ status }).eq("id", incident.id).select(incidentColumns).maybeSingle();
    setUpdating(null);
    if (error || !data) {
      setActionError(`Could not update ${incident.eid}. Your account may not have permission yet; ask an administrator to apply the latest database migrations.`);
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

  const needle = query.trim().toLowerCase();
  const visible = (incidents ?? []).filter((item) => {
    const statusMatch = filter === "all" ? true : filter === "open" ? item.status !== "resolved" : item.status === filter;
    if (!statusMatch) return false;
    if (!needle) return true;
    const reporter = item.reporter_id ? reporters[item.reporter_id] ?? "" : "";
    return [item.eid, item.description, typeLabels[item.type], item.location_text ?? "", reporter].join(" ").toLowerCase().includes(needle);
  });

  const metricCards = [
    { key: "pending" as const, label: "Pending", Icon: Siren },
    { key: "responding" as const, label: "Responding", Icon: Truck },
    { key: "resolved" as const, label: "Resolved", Icon: CheckCircle2 },
  ];

  return <div className="role-grid official">
    <div>
      <section className="overview-card" aria-label="Incident summary">
        <div className="metrics-grid three">
          {metricCards.map(({ key, label, Icon }) => <button key={key} type="button" className={`metric metric-button ${filter === key ? "active" : ""}`} onClick={() => setFilter(filter === key ? "open" : key)} aria-pressed={filter === key}>
            <div className="metric-label"><Icon />{label}</div><div className="metric-value">{counts[key]}</div>
          </button>)}
        </div>
      </section>

      <section className="panel role-panel" aria-labelledby="incidents-heading">
        <div className="panel-header">
          <div className="panel-heading"><h2 className="section-title" id="incidents-heading">Incidents</h2><p>Newest first. New reports arrive live.</p></div>
          <div className="filters">
            <div className="search-wrap"><Search size={15} /><input className="search-input" aria-label="Search incidents" placeholder="Search ID, place, reporter…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            <select className="filter-select" aria-label="Filter incidents" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="open">Open (pending + responding)</option>
              {incidentStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
              <option value="all">All</option>
            </select>
          </div>
        </div>
        <div className="role-panel-body">
          {loadError && <div className="inline-error" role="alert">{loadError}</div>}
          {actionError && <div className="inline-error" role="alert">{actionError}</div>}
          {!loadError && incidents === null && <><div className="skeleton" /><div className="skeleton" /></>}
          {incidents && visible.length === 0 && <div className="empty-inline"><CheckCircle2 size={18} /><p>{needle ? "No incidents match your search." : "No incidents in this view."}</p></div>}
          {visible.length > 0 && <ul className="incident-list">
            {visible.map((item) => {
              const link = mapLink(item);
              const reporter = item.reporter_id ? reporters[item.reporter_id] : "";
              return <li key={item.id} className={`incident-item ${item.status === "pending" ? "attention" : ""}`}>
                <div className="incident-item-top"><strong>{typeLabels[item.type]} · {item.eid}</strong><span className={`incident-status ${item.status}`}>{statusLabels[item.status]}</span></div>
                <p>{item.description}</p>
                <div className="incident-meta">
                  <span title={formatDate(item.created_at)}>{timeAgo(item.created_at)}</span>
                  <span><MapPin size={11} /> {link ? <a href={link} target="_blank" rel="noreferrer">{describeLocation(item)}</a> : describeLocation(item)}</span>
                  {reporter && <span><UserRound size={11} /> {reporter}</span>}
                </div>
                <div className="incident-actions">
                  <IncidentMedia incident={item} />
                  {item.status === "pending" && <button type="button" className="button primary small-button" disabled={updating === item.id} onClick={() => void setStatus(item, "responding")}><Truck size={14} />Mark responding</button>}
                  {item.status !== "resolved" && <button type="button" className="button secondary small-button" disabled={updating === item.id} onClick={() => void setStatus(item, "resolved")}><CheckCircle2 size={14} />Mark resolved</button>}
                  {item.status === "resolved" && <button type="button" className="button secondary small-button" disabled={updating === item.id} onClick={() => void setStatus(item, "responding")}><RotateCcw size={14} />Reopen</button>}
                </div>
              </li>;
            })}
          </ul>}
        </div>
      </section>
    </div>
    <div className="role-side"><AnnouncementsFeed /></div>
  </div>;
}
