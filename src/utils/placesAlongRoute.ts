import type { RawPlace } from '../api/secrchPlacesAlongRoute';
import { getDistanceAlongPolylineMeters, polylineLengthMeters } from './routePolyline';
import type { ActivityMode, InterestingPlace, LatLng, PlaceCandidate } from './types';

const EXCLUDED_PRIMARY_TYPES = new Set(['cafe', 'restaurant']);
const MAX_PLACES = 20;
const TARGET_PLACE_COUNT = 10;
/** Used only when the primary corridor filter returns no places. */
const FALLBACK_MAX_DISTANCE_M = 2000;

const WALK_BASE_DISTANCE_M = 450;
const BIKE_BASE_DISTANCE_M = 800;
const WALK_MAX_DISTANCE_M = 1200;
const BIKE_MAX_DISTANCE_M = 2000;
/** Below this route length, use base corridor width only. */
const ROUTE_SCALE_START_KM = 12;
/** At this length and beyond, use max corridor width. */
const ROUTE_SCALE_END_KM = 80;

function shouldShowPlace(place: Pick<InterestingPlace, 'primaryType'>): boolean {
  if (!place.primaryType) {
    return true;
  }

  return !EXCLUDED_PRIMARY_TYPES.has(place.primaryType);
}

/** Max distance from route polyline for a place to be included (scales up on long routes). */
export function getMaxDistanceFromRouteMeters(
  routeLengthMeters: number,
  activityMode: ActivityMode
): number {
  const base = activityMode === 'bike' ? BIKE_BASE_DISTANCE_M : WALK_BASE_DISTANCE_M;
  const max = activityMode === 'bike' ? BIKE_MAX_DISTANCE_M : WALK_MAX_DISTANCE_M;
  const routeKm = Math.max(routeLengthMeters, 0) / 1000;

  if (routeKm <= ROUTE_SCALE_START_KM) {
    return base;
  }

  const spanKm = ROUTE_SCALE_END_KM - ROUTE_SCALE_START_KM;
  const t = spanKm > 0 ? Math.min(1, (routeKm - ROUTE_SCALE_START_KM) / spanKm) : 1;
  return Math.round(base + (max - base) * t);
}

export function filterPlacesNearRoute(params: {
  places: RawPlace[];
  routePath: LatLng[];
  activityMode: ActivityMode;
}): InterestingPlace[] {
  const { places, routePath, activityMode } = params;

  if (places.length === 0 || routePath.length < 2) {
    return [];
  }

  const routeLengthMeters = polylineLengthMeters(routePath);
  const maxDistanceM = getMaxDistanceFromRouteMeters(routeLengthMeters, activityMode);

  const candidates = places.map((place) => rawPlaceToCandidate(place, routePath));

  const selected = selectPlacesNearRoute(candidates, maxDistanceM);

  return finalizeInterestingPlaces(selected, routePath);
}

function selectPlacesNearRoute(
  candidates: PlaceCandidate[],
  maxDistanceM: number
): PlaceCandidate[] {
  const eligible = candidates.filter(shouldShowPlace);
  const inCorridor = eligible
    .filter((place) => place.distanceToRouteM <= maxDistanceM)
    .sort((first, second) => first.distanceToRouteM - second.distanceToRouteM);

  if (inCorridor.length > 0) {
    return inCorridor;
  }

  return eligible
    .filter((place) => place.distanceToRouteM <= FALLBACK_MAX_DISTANCE_M)
    .sort((first, second) => first.distanceToRouteM - second.distanceToRouteM)
    .slice(0, TARGET_PLACE_COUNT);
}

function rawPlaceToCandidate(place: RawPlace, routePath: LatLng[]): PlaceCandidate {
  const position = {
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0
  };

  return {
    id: place.id,
    name: place.displayName?.text ?? 'Place',
    position,
    primaryType: place.primaryType,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    photos: place.photos,
    distanceToRouteM: getDistanceToPolylineMeters(position, routePath),
    score: 0
  };
}

/** Recompute distance/order metrics for existing places after the route path changes. */
export function updateInterestingPlacesAlongRoute(
  places: InterestingPlace[],
  routePath: LatLng[]
): InterestingPlace[] {
  if (routePath.length < 2 || places.length === 0) {
    return places;
  }

  return places.map((place) => {
    const position = { lat: place.lat, lng: place.lng };
    return {
      ...place,
      distanceToRouteM: Math.round(getDistanceToPolylineMeters(position, routePath)),
      routeOrderM: Math.round(getDistanceAlongPolylineMeters(position, routePath))
    };
  });
}

function finalizeInterestingPlaces(
  candidates: PlaceCandidate[],
  routePath: LatLng[]
): InterestingPlace[] {
  return candidates
    .slice()
    .sort((first, second) => first.distanceToRouteM - second.distanceToRouteM)
    .slice(0, MAX_PLACES)
    .map((place) => ({
      id: place.id,
      name: place.name,
      lat: place.position.lat,
      lng: place.position.lng,
      primaryType: place.primaryType,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      photos: place.photos,
      distanceToRouteM: Math.round(place.distanceToRouteM),
      routeOrderM: Math.round(getDistanceAlongPolylineMeters(place.position, routePath)),
      score: place.score
    }));
}

export function getDistanceToPolylineMeters(point: LatLng, path: LatLng[]): number {
  if (path.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length - 1; i += 1) {
    const distance = distancePointToSegmentMeters(point, path[i], path[i + 1]);
    if (distance < minDistance) minDistance = distance;
  }
  return minDistance;
}

function distancePointToSegmentMeters(point: LatLng, segmentStart: LatLng, segmentEnd: LatLng): number {
  const origin = point;
  const p = toLocalMeters(point, origin);
  const a = toLocalMeters(segmentStart, origin);
  const b = toLocalMeters(segmentEnd, origin);

  const ab = {
    x: b.x - a.x,
    y: b.y - a.y
  };
  const ap = {
    x: p.x - a.x,
    y: p.y - a.y
  };

  const abLengthSquared = ab.x * ab.x + ab.y * ab.y;
  if (abLengthSquared === 0) {
    return Math.sqrt(ap.x * ap.x + ap.y * ap.y);
  }

  const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / abLengthSquared));

  const closest = {
    x: a.x + ab.x * t,
    y: a.y + ab.y * t
  };

  const dx = p.x - closest.x;
  const dy = p.y - closest.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function toLocalMeters(point: LatLng, origin: LatLng) {
  const earthRadiusM = 6371000;
  const latRad = degreesToRadians(origin.lat);
  return {
    x: degreesToRadians(point.lng - origin.lng) * earthRadiusM * Math.cos(latRad),
    y: degreesToRadians(point.lat - origin.lat) * earthRadiusM
  };
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}
