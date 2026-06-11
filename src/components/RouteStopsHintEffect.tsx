import { useEffect, useRef } from 'react';
import { useErrorToast } from '../context/ErrorToastContext';
import { markRouteStopsHintDismissed, wasRouteStopsHintDismissed } from '../utils/routeStopsHint';
import { isMobileViewport } from '../utils/mobileRouteSheetSnap';

const MOBILE_ROUTE_STOPS_HINT_TITLE = 'Places near the route';
const MOBILE_ROUTE_STOPS_HINT_MESSAGE =
  'Click on a place to add it to your route or explore the route details in the bottom panel.';

const DESKTOP_ROUTE_STOPS_HINT_TITLE = 'Customize your route';
const DESKTOP_ROUTE_STOPS_HINT_MESSAGE =
  'You can modify the route by adding stops, please click on the location to add a stop';

type RouteStopsHintEffectProps = {
  routeBuilt: boolean;
  routeStatus: 'idle' | 'loading' | 'ready' | 'error';
  interestingPlacesCount: number;
  onHintActiveChange: (active: boolean) => void;
};

export function RouteStopsHintEffect({
  routeBuilt,
  routeStatus,
  interestingPlacesCount,
  onHintActiveChange
}: Readonly<RouteStopsHintEffectProps>) {
  const { showErrorToast } = useErrorToast();
  const didShowRef = useRef(false);

  useEffect(() => {
    if (!routeBuilt || routeStatus !== 'ready' || interestingPlacesCount === 0) {
      return;
    }

    if (wasRouteStopsHintDismissed() || didShowRef.current) {
      return;
    }

    didShowRef.current = true;
    markRouteStopsHintDismissed();
    onHintActiveChange(true);

    const isMobile = isMobileViewport();

    showErrorToast({
      variant: 'success',
      title: isMobile ? MOBILE_ROUTE_STOPS_HINT_TITLE : DESKTOP_ROUTE_STOPS_HINT_TITLE,
      message: isMobile ? MOBILE_ROUTE_STOPS_HINT_MESSAGE : DESKTOP_ROUTE_STOPS_HINT_MESSAGE,
      autoHideMs: 12000
    });
  }, [interestingPlacesCount, onHintActiveChange, routeBuilt, routeStatus, showErrorToast]);

  return null;
}
