import type { ReactNode } from 'react';

type SidebarTab = 'overview' | 'places';

type DesktopRouteSectionProps = {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  overview: ReactNode;
  places: ReactNode;
};

export function DesktopRouteSection({
  activeTab,
  onTabChange,
  overview,
  places
}: Readonly<DesktopRouteSectionProps>) {
  return (
    <div className="sidebar-section state-route">
      <div className="route-header">
        <span className="sidebar-title">Shortest route</span>
      </div>

      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => onTabChange('overview')}
          type="button">
          Overview
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'places' ? 'active' : ''}`}
          onClick={() => onTabChange('places')}
          type="button">
          Places
        </button>
      </div>

      <div className="sidebar-scroll">
        {activeTab === 'overview' ? (
          <div className="sidebar-tab-content active">{overview}</div>
        ) : (
          <div className="sidebar-tab-content active">{places}</div>
        )}
      </div>
    </div>
  );
}
