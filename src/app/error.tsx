"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="status-page">
    <div className="status-card">
      <span className="status-icon"><TriangleAlert size={22} /></span>
      <h1>Something went wrong</h1>
      <p>This page hit an unexpected problem. Your data is safe. Try again, or go back to the start.</p>
      {error.digest && <small>Reference: {error.digest}</small>}
      <div className="status-actions">
        <button type="button" className="button primary" onClick={reset}><RotateCcw size={15} />Try again</button>
        <Link className="button secondary" href="/">Go to start</Link>
      </div>
    </div>
  </main>;
}
