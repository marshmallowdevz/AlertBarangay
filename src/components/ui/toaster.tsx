"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { dismissToast, useToasts } from "@/lib/ui/toast";

const icons = { success: CheckCircle2, error: CircleAlert, info: Info };

export function Toaster() {
  const toasts = useToasts();
  return <div className="app-toaster" aria-live="polite" aria-relevant="additions">
    {toasts.map((item) => {
      const Icon = icons[item.kind];
      return <div key={item.id} className={`app-toast ${item.kind}`} role={item.kind === "error" ? "alert" : "status"}>
        <Icon size={16} aria-hidden="true" />
        <span>{item.message}</span>
        <button type="button" aria-label="Dismiss notification" onClick={() => dismissToast(item.id)}><X size={14} /></button>
      </div>;
    })}
  </div>;
}
