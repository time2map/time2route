import { haversineDistanceMeters } from './routePolyline';

export const ROUTE_ENDPOINT_MATCH_TOLERANCE_M = 40;

export type RouteEndpointCoords = {
  lat: number;
  lng: number;
};

export function areRouteEndpointsEqual(
  a: RouteEndpointCoords | null | undefined,
  b: RouteEndpointCoords | null | undefined,
  toleranceMeters = ROUTE_ENDPOINT_MATCH_TOLERANCE_M
): boolean {
  if (!a || !b) {
    return false;
  }

  if (
    !Number.isFinite(a.lat) ||
    !Number.isFinite(a.lng) ||
    !Number.isFinite(b.lat) ||
    !Number.isFinite(b.lng)
  ) {
    return false;
  }

  return haversineDistanceMeters(a, b) <= toleranceMeters;
}
