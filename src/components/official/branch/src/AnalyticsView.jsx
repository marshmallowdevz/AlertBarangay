import './Official.css';
import { ReportAnalyticsPanel } from '@/components/analytics/report-analytics';

export default function AnalyticsView() {
  return (
    <section className="card">
      <div className="card-head"><div><h2>Report analytics</h2><p className="muted">Incident types, response times and hotspots.</p></div></div>
      <ReportAnalyticsPanel compact />
    </section>
  );
}
