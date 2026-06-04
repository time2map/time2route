import { useCallback, useEffect, useRef } from 'react';
import { getRouteStrokeColor } from '../../utils/googleRouteLayer';
import { slicePolylineAtDistanceMeters } from '../../utils/routePolyline';
import type { ActivityMode } from '../../utils/types';

type UseRouteProgressHighlightParams = {
  map: google.maps.Map | null;
  isReady: boolean;
  mode: ActivityMode;
  elevationChartFocused: boolean;
  highlightedRouteDistanceKm: number | null;
  lastRoutePathRef: React.RefObject<google.maps.LatLngLiteral[]>;
};

export function useRouteProgressHighlight({
  map,
  isReady,
  mode,
  elevationChartFocused,
  highlightedRouteDistanceKm,
  lastRoutePathRef
}: UseRouteProgressHighlightParams) {
  const routeTraveledPolylineRef = useRef<google.maps.Polyline | null>(null);
  const routeRemainingPolylineRef = useRef<google.maps.Polyline | null>(null);

  const clear = useCallback(() => {
    if (routeTraveledPolylineRef.current) {
      routeTraveledPolylineRef.current.setMap(null);
      routeTraveledPolylineRef.current = null;
    }
    if (routeRemainingPolylineRef.current) {
      routeRemainingPolylineRef.current.setMap(null);
      routeRemainingPolylineRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!map || !isReady) return;

    clear();

    const routePath = lastRoutePathRef.current;
    if (
      !elevationChartFocused ||
      highlightedRouteDistanceKm == null ||
      !Number.isFinite(highlightedRouteDistanceKm) ||
      !routePath ||
      routePath.length < 2
    ) {
      return;
    }

    const { traveled, remaining } = slicePolylineAtDistanceMeters(
      routePath,
      highlightedRouteDistanceKm * 1000
    );
    const routeColor = getRouteStrokeColor(mode);

    if (traveled.length >= 2) {
      routeTraveledPolylineRef.current = new google.maps.Polyline({
        map,
        path: traveled,
        strokeColor: '#fcfdff',
        strokeOpacity: 1,
        strokeWeight: 8,
        zIndex: 10
      });
    }

    if (remaining.length >= 2) {
      routeRemainingPolylineRef.current = new google.maps.Polyline({
        map,
        path: remaining,
        strokeColor: routeColor,
        strokeOpacity: 0.28,
        strokeWeight: 6,
        zIndex: 4
      });
    }
  }, [
    clear,
    elevationChartFocused,
    highlightedRouteDistanceKm,
    isReady,
    lastRoutePathRef,
    map,
    mode
  ]);

  useEffect(() => () => clear(), [clear]);

  return { clearRouteProgressHighlight: clear };
}
