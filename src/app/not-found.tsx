import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return <main className="status-page">
    <div className="status-card">
      <span className="status-icon"><Compass size={22} /></span>
      <h1>Page not found</h1>
      <p>The page you were looking for doesn&apos;t exist or has moved.</p>
      <div className="status-actions"><Link className="button primary" href="/">Go to start</Link></div>
    </div>
  </main>;
}
