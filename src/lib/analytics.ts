/** Report analytics computed on the server from incidents + status history. */

export type AnalyticsIncident = {
  id: string;
  type: string;
  status: string;
  lat: number | null;
  lng: number | null;
  location_text?: string | null;
  created_at: string;
};

export type StatusChange = { incident_id: string; new_status: string; created_at: string };

export type ReportAnalytics = {
  rangeDays: number;
  total: number;
  open: number;
  resolved: number;
  byType: { type: string; count: number }[];
  byStatus: { status: string; count: number }[];
  daily: { date: string; count: number }[];
  response: {
    /** Minutes from report to the first "responding" (or "resolved") change. */
    medianFirstResponseMinutes: number | null;
    medianResolveMinutes: number | null;
    respondedCount: number;
    resolvedCount: number;
    byType: { type: string; medianFirstResponseMinutes: number | null; count: number }[];
  };
  hotspots: { lat: number; lng: number; count: number; label: string; types: string[] }[];
  withoutGps: number;
};

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value * 10) / 10;
}

function minutesBetween(from: string, to: string) {
  return Math.max(0, (new Date(to).getTime() - new Date(from).getTime()) / 60000);
}

/** Manila calendar date (YYYY-MM-DD) for a timestamp. */
export function manilaDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/**
 * Hotspots group GPS reports into ~110 m cells (3 decimal places), which is
 * roughly a city block, and return the busiest cells.
 */
export function computeAnalytics(incidents: AnalyticsIncident[], history: StatusChange[], rangeDays: number, now = new Date()): ReportAnalytics {
  const countBy = (values: string[]) => {
    const counts = new Map<string, number>();
    values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    return counts;
  };

  const typeCounts = countBy(incidents.map((item) => item.type));
  const statusCounts = countBy(incidents.map((item) => item.status));

  const days: { date: string; count: number }[] = [];
  const dayCounts = countBy(incidents.map((item) => manilaDate(item.created_at)));
  for (let offset = rangeDays - 1; offset >= 0; offset -= 1) {
    const date = manilaDate(new Date(now.getTime() - offset * 86_400_000).toISOString());
    days.push({ date, count: dayCounts.get(date) ?? 0 });
  }

  const historyByIncident = new Map<string, StatusChange[]>();
  history.forEach((change) => {
    const list = historyByIncident.get(change.incident_id) ?? [];
    list.push(change);
    historyByIncident.set(change.incident_id, list);
  });

  const firstResponse: number[] = [];
  const resolve: number[] = [];
  const responseByType = new Map<string, number[]>();
  incidents.forEach((incident) => {
    const changes = (historyByIncident.get(incident.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const first = changes.find((change) => change.new_status === "responding" || change.new_status === "resolved");
    const done = changes.find((change) => change.new_status === "resolved");
    if (first) {
      const minutes = minutesBetween(incident.created_at, first.created_at);
      firstResponse.push(minutes);
      const list = responseByType.get(incident.type) ?? [];
      list.push(minutes);
      responseByType.set(incident.type, list);
    }
    if (done) resolve.push(minutesBetween(incident.created_at, done.created_at));
  });

  const cells = new Map<string, { lat: number; lng: number; count: number; label: string; types: Set<string> }>();
  let withoutGps = 0;
  incidents.forEach((incident) => {
    if (incident.lat == null || incident.lng == null) { withoutGps += 1; return; }
    const lat = Math.round(Number(incident.lat) * 1000) / 1000;
    const lng = Math.round(Number(incident.lng) * 1000) / 1000;
    const key = `${lat},${lng}`;
    const cell = cells.get(key) ?? { lat, lng, count: 0, label: "", types: new Set<string>() };
    cell.count += 1;
    cell.types.add(incident.type);
    if (!cell.label && incident.location_text) cell.label = incident.location_text;
    cells.set(key, cell);
  });

  return {
    rangeDays,
    total: incidents.length,
    open: incidents.filter((item) => item.status !== "resolved").length,
    resolved: statusCounts.get("resolved") ?? 0,
    byType: [...typeCounts].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    byStatus: ["pending", "responding", "resolved"].map((status) => ({ status, count: statusCounts.get(status) ?? 0 })),
    daily: days,
    response: {
      medianFirstResponseMinutes: median(firstResponse),
      medianResolveMinutes: median(resolve),
      respondedCount: firstResponse.length,
      resolvedCount: resolve.length,
      byType: [...responseByType].map(([type, values]) => ({ type, medianFirstResponseMinutes: median(values), count: values.length }))
        .sort((a, b) => (b.count - a.count)),
    },
    hotspots: [...cells.values()]
      .filter((cell) => cell.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((cell) => ({ lat: cell.lat, lng: cell.lng, count: cell.count, label: cell.label || `GPS ${cell.lat.toFixed(3)}, ${cell.lng.toFixed(3)}`, types: [...cell.types] })),
    withoutGps,
  };
}

/** "42 min", "3.5 h", "2.1 days". */
export function formatDuration(minutes: number | null) {
  if (minutes == null) return "No data yet";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
  return `${Math.round((hours / 24) * 10) / 10} days`;
}
