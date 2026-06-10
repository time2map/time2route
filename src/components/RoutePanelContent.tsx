import type { ReactNode } from 'react';

type RoutePanelContentProps = {
  routeBuilt: boolean;
  planner: ReactNode;
  overview: ReactNode;
};

export function RoutePanelContent({
  routeBuilt,
  planner,
  overview
}: Readonly<RoutePanelContentProps>) {
  if (routeBuilt) {
    return (
      <>
        {planner}
        <div className="sidebar-mobile-route">{overview}</div>
      </>
    );
  }

  return planner;
}
