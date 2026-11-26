import { computeAnalytics, type AnalyticsIncident, type StatusChange } from "@/lib/analytics";
import { requireStaffApi } from "@/lib/auth/require-staff-api";
import { jsonError } from "@/lib/http";

const allowedRanges = [7, 30, 90, 365];
const PAGE = 1000;
const MAX_ROWS = 10_000;

export async function GET(request: Request) {
  const access = await requireStaffApi();
  if ("response" in access) return access.response;

  const requested = Number(new URL(request.url).searchParams.get("days"));
  const days = allowedRanges.includes(requested) ? requested : 30;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const incidents: AnalyticsIncident[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await access.admin.from("incidents").select("*")
      .gte("created_at", since).order("created_at", { ascending: true }).range(from, from + PAGE - 1);
    if (error) {
      console.error("Analytics incident lookup failed", { code: error.code, message: error.message });
      return jsonError("Report analytics could not be loaded.", 500);
    }
    incidents.push(...((data ?? []) as AnalyticsIncident[]).map((row) => ({
      id: row.id, type: row.type, status: row.status, lat: row.lat, lng: row.lng, location_text: row.location_text ?? null, created_at: row.created_at,
    })));
    if (!data || data.length < PAGE) break;
  }

  let history: StatusChange[] = [];
  let historyAvailable = true;
  const ids = incidents.map((item) => item.id);
  for (let index = 0; index < ids.length; index += 200) {
    const { data, error } = await access.admin.from("incident_status_history")
      .select("incident_id,new_status,created_at").in("incident_id", ids.slice(index, index + 200));
    if (error) {
      // Older databases without the history table still get counts and hotspots.
      historyAvailable = false;
      history = [];
      break;
    }
    history.push(...((data ?? []) as StatusChange[]));
  }

  return Response.json(
    { analytics: computeAnalytics(incidents, history, days), historyAvailable },
    { headers: { "Cache-Control": "no-store" } },
  );
}
