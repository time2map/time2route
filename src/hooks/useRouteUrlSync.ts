import { useEffect } from 'react';
import type { ActivityMode } from '../utils/types';
import { clearRouteEndpointsFromUrl, writeRouteEndpointsToUrl } from '../utils/routeUrlState';

type RouteEndpointPoint = {
  lat: number;
  lng: number;
  address: string;
};

type UseRouteUrlSyncParams = {
  routeBuilt: boolean;
  from: string;
  to: string;
  startPoint: RouteEndpointPoint | null;
  destinationPoint: RouteEndpointPoint | null;
  mode: ActivityMode;
};

export function useRouteUrlSync({
  routeBuilt,
  from,
  to,
  startPoint,
  destinationPoint,
  mode
}: UseRouteUrlSyncParams) {
  useEffect(() => {
    if (!routeBuilt) {
      clearRouteEndpointsFromUrl();
      return;
    }

    const origin = from.trim();
    const destination = to.trim();
    if (!origin || !destination) {
      return;
    }

    writeRouteEndpointsToUrl({
      from: origin,
      to: destination,
      fromLat: startPoint?.lat,
      fromLng: startPoint?.lng,
      toLat: destinationPoint?.lat,
      toLng: destinationPoint?.lng,
      mode
    });
  }, [destinationPoint, from, mode, routeBuilt, startPoint, to]);
}
