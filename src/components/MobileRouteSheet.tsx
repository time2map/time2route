import type { ReactNode } from 'react';

type SidebarTab = 'overview' | 'places';

type MobileRouteSheetProps = {
  expanded: boolean;
  routeBuilt: boolean;
  activeTab: SidebarTab;
  title: string;
  onExpandedChange: (expanded: boolean) => void;
  planner: ReactNode;
  overview: ReactNode;
  places: ReactNode;
  onTabChange: (tab: SidebarTab) => void;
};

export function MobileRouteSheet({
  expanded,
  routeBuilt,
  activeTab,
  title,
  onExpandedChange,
  planner,
  overview,
  places,
  onTabChange
}: Readonly<MobileRouteSheetProps>) {
  return (
    <div className={`sidebar-mobile-sheet ${expanded ? 'expanded' : ''}`}>
      <button
        className="sidebar-mobile-sheet-handle"
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        aria-label={expanded ? 'Collapse route sheet' : 'Expand route sheet'}>
        <span className="sidebar-mobile-sheet-handle-bar" />
      </button>

      <div className="sidebar-mobile-sheet-header">
        <span className="sidebar-mobile-sheet-title">{title}</span>
        <button
          className="sidebar-mobile-sheet-close"
          type="button"
          onClick={() => onExpandedChange(false)}
          aria-label="Close route sheet">
          ×
        </button>
      </div>

      <div className="sidebar-mobile-sheet-body">
        {!routeBuilt ? (
          planner
        ) : (
          <div className="sidebar-mobile-route">
            <div className="sidebar-mobile-tabs">
              <button
                className={`sidebar-mobile-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => onTabChange('overview')}
                type="button">
                Overview
              </button>
              <button
                className={`sidebar-mobile-tab ${activeTab === 'places' ? 'active' : ''}`}
                onClick={() => onTabChange('places')}
                type="button">
                Places
              </button>
            </div>

            {activeTab === 'overview' ? overview : places}
          </div>
        )}
      </div>
    </div>
  );
}
