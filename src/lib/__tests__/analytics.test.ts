import { describe, expect, it } from "vitest";
import { computeAnalytics, formatDuration, median } from "@/lib/analytics";

const base = "2026-11-20T00:00:00.000Z";
const at = (minutes: number) => new Date(new Date(base).getTime() + minutes * 60000).toISOString();

describe("report analytics", () => {
  it("computes medians", () => {
    expect(median([])).toBeNull();
    expect(median([5, 1, 3])).toBe(3);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("counts types, response times and hotspots", () => {
    const incidents = [
      { id: "a", type: "fire", status: "resolved", lat: 10.30001, lng: 123.88001, location_text: "Rizal St.", created_at: at(0) },
      { id: "b", type: "fire", status: "responding", lat: 10.30004, lng: 123.88004, created_at: at(10) },
      { id: "c", type: "flood", status: "pending", lat: null, lng: null, created_at: at(20) },
    ];
    const history = [
      { incident_id: "a", new_status: "responding", created_at: at(6) },
      { incident_id: "a", new_status: "resolved", created_at: at(60) },
      { incident_id: "b", new_status: "responding", created_at: at(20) },
    ];
    const result = computeAnalytics(incidents, history, 7, new Date(at(30)));
    expect(result.total).toBe(3);
    expect(result.open).toBe(2);
    expect(result.byType[0]).toEqual({ type: "fire", count: 2 });
    expect(result.response.medianFirstResponseMinutes).toBe(8);
    expect(result.response.medianResolveMinutes).toBe(60);
    expect(result.hotspots).toHaveLength(1);
    expect(result.hotspots[0]).toMatchObject({ count: 2, label: "Rizal St." });
    expect(result.withoutGps).toBe(1);
    expect(result.daily).toHaveLength(7);
    expect(result.daily.reduce((sum, day) => sum + day.count, 0)).toBe(3);
  });

  it("formats durations", () => {
    expect(formatDuration(null)).toBe("No data yet");
    expect(formatDuration(42)).toBe("42 min");
    expect(formatDuration(150)).toBe("2.5 h");
    expect(formatDuration(60 * 72)).toBe("3 days");
  });
});
