import type { ReactNode } from 'react';

type DesktopRouteSectionProps = {
  overview: ReactNode;
  onReset?: () => void;
};

export function DesktopRouteSection({ overview, onReset }: Readonly<DesktopRouteSectionProps>) {
  return (
    <div className="sidebar-section state-route">
      {/* <div className="route-header">
        <span className="sidebar-title">Shortest route</span>
      </div> */}

      <div className="sidebar-scroll">
        <div className="sidebar-tab-content active">
          {overview}

          {onReset && (
            <button
              className="cta-btn"
              type="button"
              onClick={onReset}>
              Plan new route
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
