"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** True while the action runs: the button is disabled and shows a spinner. */
  loading: boolean;
  /** Text shown next to the spinner while loading, e.g. "Signing in…". */
  loadingText: ReactNode;
  children: ReactNode;
};

/**
 * Submit/action button with a built-in pending state. While `loading` is true
 * it is disabled (no double submits), marked aria-busy, and shows a spinner
 * with `loadingText`. Keeps whatever className the caller passes, so it fits
 * every existing button style (.button.primary, .submit, …).
 */
export function LoadingButton({ loading, loadingText, children, disabled, className, type = "submit", ...rest }: LoadingButtonProps) {
  return <button
    {...rest}
    type={type}
    className={[className, "loading-button", loading ? "is-loading" : ""].filter(Boolean).join(" ")}
    disabled={loading || disabled}
    aria-busy={loading || undefined}
  >
    {loading ? <><LoaderCircle className="spin" size={15} aria-hidden="true" /><span>{loadingText}</span></> : children}
  </button>;
}
