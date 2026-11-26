/** Shimmering placeholder shown by loading.tsx files while a page streams in. */
export function PageSkeleton({ label = "Loading…", cards = 3, withHeader = true }: { label?: string; cards?: number; withHeader?: boolean }) {
  return <div className="page-skeleton" role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{label}</span>
    {withHeader && <div className="page-skeleton-header" aria-hidden="true">
      <span className="skeleton skeleton-line short" />
      <span className="skeleton skeleton-line title" />
      <span className="skeleton skeleton-line medium" />
    </div>}
    <div className="page-skeleton-grid" aria-hidden="true">
      {Array.from({ length: cards }, (_, index) => <span key={index} className="skeleton skeleton-card" />)}
    </div>
    <span className="skeleton skeleton-panel" aria-hidden="true" />
  </div>;
}

/** Full-page skeleton for role pages that render their own header (resident/official). */
export function RolePageSkeleton({ label }: { label?: string }) {
  return <div className="role-shell">
    <header className="role-header" aria-hidden="true">
      <span className="skeleton skeleton-line brand" />
      <span className="skeleton skeleton-line nav" />
    </header>
    <main className="role-main"><div className="page-wrap"><PageSkeleton label={label} /></div></main>
  </div>;
}
