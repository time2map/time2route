import { getDistanceAlongPolylineMeters } from './routePolyline';
import type { LatLng, RouteIntermediatePoint } from './types';

export function resolveRouteStopOrderMeters(
  stop: RouteIntermediatePoint,
  routePath: LatLng[] | undefined
): number {
  if (typeof stop.routeOrderM === 'number') {
    return stop.routeOrderM;
  }

  if (!routePath || routePath.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  return getDistanceAlongPolylineMeters({ lat: stop.lat, lng: stop.lng }, routePath);
}

/** Stops ordered from start of the route (smallest distance along the polyline first). */
export function sortRouteStopsByPath(
  stops: RouteIntermediatePoint[],
  routePath: LatLng[] | undefined
): RouteIntermediatePoint[] {
  if (stops.length <= 1) {
    return stops;
  }

  const canSortAlongPath = routePath && routePath.length >= 2;
  if (!canSortAlongPath) {
    const allHaveOrder = stops.every((stop) => typeof stop.routeOrderM === 'number');
    if (!allHaveOrder) {
      return stops;
    }
    return [...stops].sort((a, b) => (a.routeOrderM ?? 0) - (b.routeOrderM ?? 0));
  }

  return [...stops].sort(
    (first, second) =>
      resolveRouteStopOrderMeters(first, routePath) - resolveRouteStopOrderMeters(second, routePath)
  );
}
