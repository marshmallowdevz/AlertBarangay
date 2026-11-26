"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { toast } from "@/lib/ui/toast";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
}

/** True while the browser reports a connection (always true on the server). */
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

export function OfflineBanner() {
  const { t } = useI18n();
  const online = useOnline();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) wasOffline.current = true;
    else if (wasOffline.current) { wasOffline.current = false; toast.success(t("offline.back")); }
  }, [online, t]);

  if (online) return null;
  return <div className="offline-banner" role="status"><WifiOff size={16} aria-hidden="true" />{t("offline.banner")}</div>;
}
