"use client";

import { useSyncExternalStore } from "react";

export type ToastKind = "success" | "error" | "info";
export type ToastItem = { id: number; kind: ToastKind; message: string };

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function dismissToast(id: number) {
  items = items.filter((item) => item.id !== id);
  emit();
}

function push(kind: ToastKind, message: string, durationMs = kind === "error" ? 7000 : 4500) {
  // Don't stack the same message twice (e.g. a retry that fails the same way).
  const existing = items.find((item) => item.message === message && item.kind === kind);
  if (existing) dismissToast(existing.id);
  const id = nextId++;
  items = [...items.slice(-3), { id, kind, message }];
  emit();
  if (typeof window !== "undefined") window.setTimeout(() => dismissToast(id), durationMs);
  return id;
}

/** App-wide toast notifications. Render <Toaster /> once (root layout). */
export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const empty: ToastItem[] = [];

export function useToasts() {
  return useSyncExternalStore(subscribe, () => items, () => empty);
}

/** Turns fetch/Supabase failures into wording a resident can act on. */
export function friendlyNetworkError(cause: unknown, fallback = "Something went wrong. Please try again.") {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "You appear to be offline. Check your connection and try again.";
  if (cause instanceof DOMException && (cause.name === "TimeoutError" || cause.name === "AbortError")) {
    return "The server is taking too long to respond. Please try again.";
  }
  if (cause instanceof TypeError && /fetch|network/i.test(cause.message)) return "We couldn't reach the server. Check your connection and try again.";
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
