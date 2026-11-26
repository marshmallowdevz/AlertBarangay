"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const pathname = usePathname();
  const router = useRouter();
  const notice = params.get("notice");

  useEffect(() => {
    if (!notice || !notices[notice]) return;
    toast.error(notices[notice]);
    const next = new URLSearchParams(params.toString());
    next.delete("notice");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [notice, params, pathname, router]);

  return null;
}
