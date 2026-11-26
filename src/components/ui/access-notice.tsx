"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/ui/toast";

const notices: Record<string, string> = {
  forbidden: "You don't have access to that page, so we brought you to your own dashboard.",
};

/**
 * Shows a toast when the proxy redirected the user here because they tried to
 * open another role's area (?notice=forbidden), then cleans up the URL.
 */
export function AccessNotice() {
  const params = useSearchParams();
  const notice = params.get("notice");

  useEffect(() => {
    if (!notice || !notices[notice]) return;
    toast.error(notices[notice]);
    // Drop ?notice from the address bar without re-requesting the page
    // (Next.js keeps its router in sync with window.history).
    const url = new URL(window.location.href);
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [notice]);

  return null;
}
