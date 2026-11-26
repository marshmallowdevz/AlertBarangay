"use client";

import { useEffect } from "react";

/** Registers /sw.js in production builds (offline shell + notification clicks). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}

/** Drops cached pages so the next person on a shared device can't see them. */
export function clearOfflinePages() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.controller?.postMessage({ type: "clear-pages" });
}

/** Shows a system notification through the service worker when possible. */
export async function showDeviceNotification(title: string, body: string, url = "/dashboard") {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return false;
  try {
    const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (registration) {
      await registration.showNotification(title, { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url } });
    } else {
      new Notification(title, { body, icon: "/icons/icon-192.png" });
    }
    return true;
  } catch {
    return false;
  }
}
