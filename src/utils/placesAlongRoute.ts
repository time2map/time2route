import type { RawPlace } from '../api/secrchPlacesAlongRoute';
import type { ActivityMode, InterestingPlace, LatLng, PlaceCandidate } from './types';

const EXCLUDED_PRIMARY_TYPES = new Set(['cafe', 'restaurant']);

function shouldShowPlace(place: Pick<InterestingPlace, 'primaryType'>): boolean {
  if (!place.primaryType) {
    return true;
  }

  return !EXCLUDED_PRIMARY_TYPES.has(place.primaryType);
}

export function filterPlacesNearRoute(params: {
  places: RawPlace[];
  routePath: LatLng[];
  activityMode: ActivityMode;
}): InterestingPlace[] {
  const { places, routePath, activityMode } = params;

  const maxDistanceM = activityMode === 'bike' ? 400 : 220;

  const candidates: PlaceCandidate[] = places
    .map((place) => {
      const position = {
        lat: place.location?.latitude ?? 0,
        lng: place.location?.longitude ?? 0
      };

      const distanceToRouteM = getDistanceToPolylineMeters(position, routePath);
      return {
        id: place.id,
        name: place.displayName?.text ?? 'Place',
        position,
        primaryType: place.primaryType,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        photos: place.photos,
        distanceToRouteM,
        score: 0
      };
    })
    .filter((place) => place.distanceToRouteM <= maxDistanceM)
    .filter(shouldShowPlace)
    .sort((first, second) => first.distanceToRouteM - second.distanceToRouteM)
    .slice(0, 20);

  return candidates.map((place) => ({
    id: place.id,
    name: place.name,
    lat: place.position.lat,
    lng: place.position.lng,
    primaryType: place.primaryType,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    photos: place.photos,
    distanceToRouteM: Math.round(place.distanceToRouteM),
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
