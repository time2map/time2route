export function RouteSummarySkeleton() {
  return (
    <div
      className="route-summary"
      aria-hidden="true">
      <div className="stat-card route-summary-skeleton-card full">
        <div className="skeleton-label-row">
          <span className="skeleton-icon" />
          <span className="skeleton-line skeleton-label" />
        </div>
        <span className="skeleton-line skeleton-value" />
      </div>
      <div className="stat-card route-summary-skeleton-card">
        <div className="skeleton-label-row">
          <span className="skeleton-icon" />
          <span className="skeleton-line skeleton-label" />
        </div>
        <span className="skeleton-line skeleton-value" />
        <span className="skeleton-line skeleton-sub" />
      </div>
      <div className="stat-card route-summary-skeleton-card">
        <div className="skeleton-label-row">
          <span className="skeleton-icon" />
          <span className="skeleton-line skeleton-label" />
        </div>
        <span className="skeleton-line skeleton-value" />
        <span className="skeleton-line skeleton-sub" />
      </div>
      <div className="stat-card route-summary-skeleton-card">
        <div className="skeleton-label-row">
          <span className="skeleton-icon" />
          <span className="skeleton-line skeleton-label" />
        </div>
        <span className="skeleton-line skeleton-value" />
      </div>
    </div>
  );
}
