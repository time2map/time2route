import type { RawPlace } from '../api/secrchPlacesAlongRoute';
import { getDistanceAlongPolylineMeters, polylineLengthMeters } from './routePolyline';
import type { ActivityMode, InterestingPlace, LatLng, PlaceCandidate } from './types';

const EXCLUDED_PRIMARY_TYPES = new Set(['cafe', 'restaurant']);
const MAX_PLACES = 20;
/** If fewer pass the corridor filter, top up from the full API list. */
const MIN_FILTERED_BEFORE_SUPPLEMENT = 5;
const TARGET_PLACE_COUNT = 10;
/** Max distance for places added from the full API pool (supplement / no-filter fallback). */
const MAX_POOL_PLACE_DISTANCE_M = 700;

const WALK_BASE_DISTANCE_M = 220;
const BIKE_BASE_DISTANCE_M = 400;
const WALK_MAX_DISTANCE_M = 750;
const BIKE_MAX_DISTANCE_M = 1400;
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

  const filtered = candidates
    .filter((place) => place.distanceToRouteM <= maxDistanceM)
    .filter(shouldShowPlace);

  const selected = selectPlacesAfterFilter(filtered, candidates);

  return finalizeInterestingPlaces(selected, routePath);
}

function selectPlacesAfterFilter(
  filtered: PlaceCandidate[],
  candidates: PlaceCandidate[]
): PlaceCandidate[] {
  if (filtered.length === 0) {
    return candidates.filter((place) => place.distanceToRouteM <= MAX_POOL_PLACE_DISTANCE_M);
  }

  if (filtered.length < MIN_FILTERED_BEFORE_SUPPLEMENT) {
    return supplementPlacesFromPool(filtered, candidates, TARGET_PLACE_COUNT);
  }

  return filtered;
}

/** Add closest unselected places from the full pool until the target count (or pool exhausted). */
function supplementPlacesFromPool(
  selected: PlaceCandidate[],
  pool: PlaceCandidate[],
  targetCount: number
): PlaceCandidate[] {
  const selectedIds = new Set(selected.map((place) => place.id));
  const result = [...selected];

  const extras = pool
    .filter(
      (place) =>
        !selectedIds.has(place.id) && place.distanceToRouteM <= MAX_POOL_PLACE_DISTANCE_M
    )
    .sort((first, second) => first.distanceToRouteM - second.distanceToRouteM);

  for (const place of extras) {
    if (result.length >= targetCount) {
      break;
    }
    result.push(place);
    selectedIds.add(place.id);
  }

  return result;
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

function getDistanceToPolylineMeters(point: LatLng, path: LatLng[]): number {
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
