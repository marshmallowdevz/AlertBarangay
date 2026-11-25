import { describe, expect, it } from "vitest";
import { checkMediaFile, describeLocation, mapLink, timeAgo } from "@/lib/incidents";

const fakeFile = (type: string, sizeMb: number) => ({ type, size: sizeMb * 1024 * 1024 }) as File;

describe("checkMediaFile", () => {
  it("accepts photos and videos within the storage limits", () => {
    expect(checkMediaFile(fakeFile("image/jpeg", 4.9))).toBeNull();
    expect(checkMediaFile(fakeFile("video/mp4", 14.9))).toBeNull();
  });

  it("rejects oversized or unsupported files", () => {
    expect(checkMediaFile(fakeFile("image/png", 5.1))).toMatch(/5 MB/);
    expect(checkMediaFile(fakeFile("video/webm", 16))).toMatch(/15 MB/);
    expect(checkMediaFile(fakeFile("application/pdf", 1))).toMatch(/JPG/);
    expect(checkMediaFile(fakeFile("image/svg+xml", 1))).not.toBeNull();
  });
});

describe("locations", () => {
  it("prefers GPS for map links and falls back to the typed address", () => {
    expect(mapLink({ lat: 10.7, lng: 122.56 })).toBe("https://www.google.com/maps?q=10.7,122.56");
    expect(mapLink({ lat: null, lng: null, location_text: "Rizal St & Luna" })).toBe("https://www.google.com/maps/search/?api=1&query=Rizal%20St%20%26%20Luna");
    expect(mapLink({ lat: null, lng: null })).toBeNull();
  });

  it("describes the location for people", () => {
    expect(describeLocation({ lat: null, lng: null, location_text: "Near the chapel" })).toBe("Near the chapel");
    expect(describeLocation({ lat: 10.123456, lng: 122.5, location_text: null })).toBe("GPS 10.12346, 122.50000");
    expect(describeLocation({ lat: null, lng: null })).toBe("No location given");
  });
});

describe("timeAgo", () => {
  const now = Date.parse("2026-11-25T12:00:00Z");
  it("uses short relative times for recent reports", () => {
    expect(timeAgo("2026-11-25T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-11-25T11:45:00Z", now)).toBe("15 min ago");
    expect(timeAgo("2026-11-25T09:00:00Z", now)).toBe("3 h ago");
  });
});
