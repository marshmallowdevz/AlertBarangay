import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

// Gets the phone's GPS position. Uses the native plugin inside the APK
// and the normal browser location on the laptop.
export async function getPosition() {
  if (Capacitor.isNativePlatform()) {
    const perm = await Geolocation.requestPermissions();
    if (perm.location !== "granted" && perm.coarseLocation !== "granted") {
      throw new Error("Location permission denied");
    }
    return Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });
  }
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
    })
  );
}

// Turns coordinates into words, e.g. "Rizal Street, San Pedro, Iloilo City, Iloilo".
// Uses OpenStreetMap's free Nominatim service (no API key needed).
export async function reverseGeocode(lat, lon) {
  const url =
    "https://nominatim.openstreetmap.org/reverse" +
    `?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=en`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Address lookup failed");

  const data = await res.json();
  const a = data.address || {};

  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const area =
    a.suburb || a.neighbourhood || a.quarter || a.village || a.hamlet || "";
  const city = a.city || a.town || a.municipality || a.city_district || "";
  const province = a.state || a.province || a.region || "";

  const parts = [street, area, city, province].filter(Boolean);
  const unique = [...new Set(parts)];

  return unique.length ? unique.join(", ") : data.display_name || "";
}

// One call for the button: returns { address, latitude, longitude }.
// If the street name can't be found, address is "" so the form can ask
// the resident to type it (we never show raw numbers to the user).
export async function getCurrentAddress() {
  const pos = await getPosition();
  const { latitude, longitude } = pos.coords;

  const address = await reverseGeocode(latitude, longitude).catch(() => "");

  return { address, latitude, longitude };
}