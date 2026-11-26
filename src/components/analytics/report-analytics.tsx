"use client";

import { useEffect, useState } from "react";
import { BarChart3, Clock3, FileWarning, MapPin, RefreshCw, Table2 } from "lucide-react";
import { errorMessage, fetchJson } from "@/lib/fetch-json";
import { formatDuration, type ReportAnalytics } from "@/lib/analytics";
import { LoadingButton } from "@/components/ui/loading-button";

const typeNames: Record<string, string> = {
  fire: "Fire", medical: "Medical", flood: "Flood", crime: "Crime", accident: "Accident", other: "Other",
  electrical_hazard: "Electrical hazard", garbage_collection: "Garbage", road_damage: "Road damage", water_problems: "Water problem",
};
const statusNames: Record<string, string> = { pending: "Pending", responding: "Responding", resolved: "Resolved" };
const ranges = [7, 30, 90, 365] as const;
const typeName = (type: string) => typeNames[type] ?? type;

function shortDate(date: string) {
  return new Date(`${date}T00:00:00+08:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" });
}

/** Counts, response times and hotspots for barangay staff. */
export function ReportAnalyticsPanel({ compact = false }: { compact?: boolean }) {
  const [days, setDays] = useState<(typeof ranges)[number]>(30);
  const [data, setData] = useState<ReportAnalytics | null>(null);
  const [historyAvailable, setHistoryAvailable] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchJson<{ analytics: ReportAnalytics; historyAvailable: boolean }>(`/api/official/analytics?days=${days}`)
      .then((body) => { if (active) { setData(body.analytics); setHistoryAvailable(body.historyAvailable); setError(""); } })
      .catch((cause) => { if (active) setError(errorMessage(cause, "Report analytics could not be loaded.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days, reload]);

  function changeRange(next: (typeof ranges)[number]) {
    setLoading(true);
    setDays(next);
  }

  const maxType = Math.max(1, ...(data?.byType.map((item) => item.count) ?? [1]));
  const maxDay = Math.max(1, ...(data?.daily.map((item) => item.count) ?? [1]));
  const hovered = hoverDay != null ? data?.daily[hoverDay] : null;
  // Label roughly six dates on the time axis whatever the range.
  const labelEvery = data ? Math.max(1, Math.ceil(data.daily.length / 6)) : 1;

  return <div className={`analytics ${compact ? "compact" : ""}`}>
    <div className="analytics-toolbar" role="group" aria-label="Date range">
      {ranges.map((range) => <button key={range} type="button" className={`analytics-range ${days === range ? "active" : ""}`} aria-pressed={days === range} onClick={() => changeRange(range)} disabled={loading && days === range}>
        {range === 365 ? "12 months" : `${range} days`}
      </button>)}
      <LoadingButton type="button" className="button secondary analytics-refresh" loading={loading} loadingText="Loading…" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>
        <RefreshCw size={14} aria-hidden="true" />Refresh
      </LoadingButton>
    </div>

    {error && <div className="inline-error" role="alert">{error}</div>}
    {!data && loading && !error && <div className="analytics-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>}

    {data && <>
      <div className="analytics-tiles">
        <div className="stat-tile"><span><FileWarning size={15} aria-hidden="true" />Reports</span><strong>{data.total}</strong><small>last {data.rangeDays === 365 ? "12 months" : `${data.rangeDays} days`}</small></div>
        <div className="stat-tile"><span><FileWarning size={15} aria-hidden="true" />Still open</span><strong>{data.open}</strong><small>{data.resolved} resolved</small></div>
        <div className="stat-tile"><span><Clock3 size={15} aria-hidden="true" />Median time to respond</span><strong>{historyAvailable ? formatDuration(data.response.medianFirstResponseMinutes) : "—"}</strong><small>{historyAvailable ? `${data.response.respondedCount} reports responded to` : "Needs status history (migration 20261125011318)"}</small></div>
        <div className="stat-tile"><span><Clock3 size={15} aria-hidden="true" />Median time to resolve</span><strong>{historyAvailable ? formatDuration(data.response.medianResolveMinutes) : "—"}</strong><small>{historyAvailable ? `${data.response.resolvedCount} reports resolved` : "Needs status history"}</small></div>
      </div>

      <div className="analytics-grid">
        <section className="panel analytics-card" aria-labelledby="analytics-daily">
          <div className="analytics-card-head">
            <h2 id="analytics-daily" className="section-title"><BarChart3 size={15} aria-hidden="true" />Reports per day</h2>
            <button type="button" className="link-button" onClick={() => setShowTable((value) => !value)} aria-pressed={showTable}><Table2 size={13} aria-hidden="true" />{showTable ? "Show chart" : "Show table"}</button>
          </div>
          {showTable
            ? <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th scope="col">Date</th><th scope="col">Reports</th></tr></thead>
              <tbody>{data.daily.slice().reverse().map((day) => <tr key={day.date}><td>{shortDate(day.date)}</td><td>{day.count}</td></tr>)}</tbody></table></div>
            : <div className="analytics-columns-wrap">
              <div className="analytics-tooltip" aria-live="polite">{hovered ? <><strong>{shortDate(hovered.date)}</strong> · {hovered.count} report{hovered.count === 1 ? "" : "s"}</> : <span className="muted-text">Hover or tap a bar for details</span>}</div>
              <div className="analytics-columns" onMouseLeave={() => setHoverDay(null)} role="img" aria-label={`Reports per day over the last ${data.rangeDays} days. Busiest day: ${Math.max(...data.daily.map((d) => d.count))} reports.`}>
                {data.daily.map((day, index) => <button key={day.date} type="button" className={`analytics-column ${hoverDay === index ? "hover" : ""}`}
                  onMouseEnter={() => setHoverDay(index)} onFocus={() => setHoverDay(index)} onClick={() => setHoverDay(index)}
                  aria-label={`${shortDate(day.date)}: ${day.count} reports`}>
                  <span style={{ height: `${(day.count / maxDay) * 100}%` }} />
                </button>)}
              </div>
              <div className="analytics-axis">{data.daily.map((day, index) => <span key={day.date}>{index % labelEvery === 0 ? shortDate(day.date) : ""}</span>)}</div>
            </div>}
        </section>

        <section className="panel analytics-card" aria-labelledby="analytics-types">
          <div className="analytics-card-head"><h2 id="analytics-types" className="section-title"><BarChart3 size={15} aria-hidden="true" />Reports by type</h2></div>
          {data.byType.length === 0 ? <p className="empty-text">No reports in this period.</p> : <ul className="analytics-bars">
            {data.byType.map((item) => <li key={item.type} title={`${typeName(item.type)}: ${item.count} reports`}>
              <span className="analytics-bar-label">{typeName(item.type)}</span>
              <span className="analytics-bar-track"><span className="analytics-bar" style={{ width: `${(item.count / maxType) * 100}%` }} /></span>
              <span className="analytics-bar-value">{item.count}</span>
            </li>)}
          </ul>}
        </section>

        <section className="panel analytics-card" aria-labelledby="analytics-response">
          <div className="analytics-card-head"><h2 id="analytics-response" className="section-title"><Clock3 size={15} aria-hidden="true" />Response time by type</h2></div>
          {!historyAvailable ? <p className="empty-text">Response times need the status history table (migration 20261125011318).</p>
            : data.response.byType.length === 0 ? <p className="empty-text">No reports have been responded to in this period.</p>
              : <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th scope="col">Type</th><th scope="col">Median time to respond</th><th scope="col">Reports</th></tr></thead>
                <tbody>{data.response.byType.map((row) => <tr key={row.type}><td>{typeName(row.type)}</td><td>{formatDuration(row.medianFirstResponseMinutes)}</td><td>{row.count}</td></tr>)}</tbody></table></div>}
          <ul className="analytics-status-row" aria-label="Reports by status">
            {data.byStatus.map((row) => <li key={row.status}><span className={`incident-status ${row.status}`}>{statusNames[row.status]}</span> {row.count}</li>)}
          </ul>
        </section>

        <section className="panel analytics-card" aria-labelledby="analytics-hotspots">
          <div className="analytics-card-head"><h2 id="analytics-hotspots" className="section-title"><MapPin size={15} aria-hidden="true" />Hotspots</h2></div>
          <p className="field-hint">Places with two or more GPS reports within about one block (~110 m).{data.withoutGps ? ` ${data.withoutGps} report(s) had no GPS and aren't counted.` : ""}</p>
          {data.hotspots.length === 0 ? <p className="empty-text">No repeated locations in this period.</p>
            : <div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th scope="col">Location</th><th scope="col">Reports</th><th scope="col">Types</th><th scope="col"><span className="sr-only">Map</span></th></tr></thead>
              <tbody>{data.hotspots.map((spot) => <tr key={`${spot.lat},${spot.lng}`}><td>{spot.label}</td><td>{spot.count}</td><td>{spot.types.map(typeName).join(", ")}</td>
                <td><a href={`https://www.google.com/maps?q=${spot.lat},${spot.lng}`} target="_blank" rel="noreferrer">Map</a></td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </>}
  </div>;
}
