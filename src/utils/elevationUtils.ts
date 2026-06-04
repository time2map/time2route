import type { ElevationProfilePoint, ElevationStats, RoutePathPoint } from './types';
import { pointAlongPolylineAtDistanceMeters, polylineLengthMeters } from './routePolyline';

let elevationServicePromise: Promise<google.maps.ElevationService> | null = null;
const elevationStatsCache = new Map<string, ElevationStats>();
/** Bump when chart profile sampling changes so cached routes refresh. */
const ELEVATION_PROFILE_CACHE_VERSION = 4;
/** Google Elevation path limit is 512 vertices; long polylines also break URL length limits. */
const ELEVATION_PATH_VERTEX_LIMITS = [128, 64, 32] as const;

type ElevationRequestOptions = {
  samples?: number;
  distanceMeters?: number | null;
  encodedPolyline?: string | null;
};

export async function getRouteElevationStats(
  routePath: RoutePathPoint[],
  options: ElevationRequestOptions = {}
): Promise<ElevationStats> {
  if (!routePath || routePath.length < 2) {
    throw new Error('Route path must contain at least 2 points');
  }

  const normalizedPath = routePath.map(toLatLngLiteral);
  const distanceMeters = options.distanceMeters ?? polylineLengthMeters(normalizedPath);
  const safeSamples = clampElevationSamples(options.samples ?? chooseElevationSamples(distanceMeters));
  const cacheKey = getElevationCacheKey(options.encodedPolyline, safeSamples, normalizedPath);
  const cachedStats = elevationStatsCache.get(cacheKey);
  if (cachedStats) {
    return cachedStats;
  }

  const elevationService = await getElevationService();
  const response = await requestElevationAlongPath(elevationService, normalizedPath, safeSamples);

  const results = response.results;
  if (!results || results.length < 2) {
    throw new Error('Elevation data is empty');
  }

  const fullProfile = buildElevationProfile(results, normalizedPath);
  const chartProfile = simplifyElevationProfile(fullProfile, {
    minDistanceKm: 0.04,
    elevationDeltaM: 4,
    maxPoints: 48
  });
  const stats = calculateElevationStats(fullProfile, chartProfile);
  elevationStatsCache.set(cacheKey, stats);
  return stats;
}

export function getElevationInsight(stats: ElevationStats): string {
  if (stats.difficulty === 'Easy') {
    return 'The route is mostly flat, suitable for walking and easy jogging.';
  }
  if (stats.difficulty === 'Moderate') {
    return 'There are noticeable climbs, but the route is still comfortable for active walks or workouts.';
  }
  return 'The route is hilly with significant elevation gain, best for prepared users.';
}

function toLatLngLiteral(point: RoutePathPoint): google.maps.LatLngLiteral {
  const anyPoint = point as {
    lat: number | (() => number);
    lng: number | (() => number);
  };

  if (typeof anyPoint.lat === 'function' && typeof anyPoint.lng === 'function') {
    return { lat: anyPoint.lat(), lng: anyPoint.lng() };
  }
  return {
    lat: Number(anyPoint.lat),
    lng: Number(anyPoint.lng)
  };
}

async function getElevationService(): Promise<google.maps.ElevationService> {
  elevationServicePromise ??= google.maps.importLibrary('elevation').then((library) => {
    const { ElevationService } = library as google.maps.ElevationLibrary;
    return new ElevationService();
  });

  return elevationServicePromise;
}

function clampElevationSamples(samples: number): number {
  return clamp(Math.round(samples), 2, 512);
}

function buildElevationRequestPath(
  path: google.maps.LatLngLiteral[],
  maxVertices: number
): google.maps.LatLngLiteral[] {
  if (path.length <= maxVertices) {
    return path;
  }

  const totalMeters = polylineLengthMeters(path);
  if (totalMeters <= 0 || path.length < 2) {
    return path;
  }

  const vertexCount = Math.min(Math.max(maxVertices, 2), 512);
  const lastIndex = vertexCount - 1;

  return Array.from({ length: vertexCount }, (_, index) =>
    pointAlongPolylineAtDistanceMeters(path, (index / lastIndex) * totalMeters)
  );
}

function isElevationInvalidRequestError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('INVALID_REQUEST') || message.includes('414');
}

async function requestElevationAlongPath(
  elevationService: google.maps.ElevationService,
  fullPath: google.maps.LatLngLiteral[],
  samples: number
) {
  let lastError: unknown = null;

  for (const maxVertices of ELEVATION_PATH_VERTEX_LIMITS) {
    const requestPath = buildElevationRequestPath(fullPath, maxVertices);

    try {
      return await elevationService.getElevationAlongPath({
        path: requestPath,
        samples
      });
    } catch (error: unknown) {
      lastError = error;
      if (!isElevationInvalidRequestError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Elevation along path request failed');
}

function chooseElevationSamples(distanceMeters: number): number {
  const km = Math.max(distanceMeters, 0) / 1000;

  if (km <= 3) return 64;
  if (km <= 10) return 128;
  if (km <= 30) return 256;
  return 512;
}

function getElevationCacheKey(
  encodedPolyline: string | null | undefined,
  samples: number,
  path: google.maps.LatLngLiteral[]
): string {
  if (encodedPolyline) {
    return `v${ELEVATION_PROFILE_CACHE_VERSION}:${encodedPolyline}:${samples}`;
  }

  const first = path[0];
  const last = path.at(-1);
  return `v${ELEVATION_PROFILE_CACHE_VERSION}:${first?.lat ?? 0},${first?.lng ?? 0}:${last?.lat ?? 0},${last?.lng ?? 0}:${path.length}:${samples}`;
}

function buildElevationProfile(
  results: google.maps.ElevationResult[],
  routePath: google.maps.LatLngLiteral[]
): ElevationProfilePoint[] {
  const totalRouteMeters = polylineLengthMeters(routePath);
  const lastSampleIndex = Math.max(results.length - 1, 1);

  return results.map((result, index) => {
    const distanceMeters = (index / lastSampleIndex) * totalRouteMeters;
    const location = pointAlongPolylineAtDistanceMeters(routePath, distanceMeters);

    return {
      distanceKm: round(distanceMeters / 1000, 3),
      elevationM: round(result.elevation, 1),
      lat: location.lat,
      lng: location.lng,
      resolutionM: result.resolution
    };
  });
}

function calculateElevationStats(
  fullProfile: ElevationProfilePoint[],
  chartProfile: ElevationProfilePoint[]
): ElevationStats {
  let totalAscentM = 0;
  let totalDescentM = 0;

  for (let i = 1; i < fullProfile.length; i += 1) {
    const diff = fullProfile[i].elevationM - fullProfile[i - 1].elevationM;
    if (diff > 0) totalAscentM += diff;
    else totalDescentM += Math.abs(diff);
  }

  const elevations = fullProfile.map((point) => point.elevationM);
  const minElevationM = Math.min(...elevations);
  const maxElevationM = Math.max(...elevations);
  const totalDistanceKm = fullProfile.at(-1)?.distanceKm ?? 0;

  return {
    totalDistanceKm: round(totalDistanceKm, 2),
    totalAscentM: Math.round(totalAscentM),
    totalDescentM: Math.round(totalDescentM),
    minElevationM: Math.round(minElevationM),
    maxElevationM: Math.round(maxElevationM),
    startElevationM: Math.round(fullProfile[0].elevationM),
    finishElevationM: Math.round(fullProfile.at(-1)?.elevationM ?? 0),
    difficulty: getDifficulty(totalAscentM, totalDistanceKm),
    profile: chartProfile
  };
}

function simplifyElevationProfile(
  profile: ElevationProfilePoint[],
  options: {
    minDistanceKm: number;
    elevationDeltaM: number;
    maxPoints: number;
  }
): ElevationProfilePoint[] {
  if (profile.length <= 2) return profile;

  const { minDistanceKm, elevationDeltaM, maxPoints } = options;
  const simplified: ElevationProfilePoint[] = [profile[0]];
  let lastKept = profile[0];

  for (let i = 1; i < profile.length - 1; i += 1) {
    const prev = profile[i - 1];
    const current = profile[i];
    const next = profile[i + 1];

    const deltaFromLastKeptKm = current.distanceKm - lastKept.distanceKm;
    const deltaFromLastKeptM = Math.abs(current.elevationM - lastKept.elevationM);

    const prevDiff = current.elevationM - prev.elevationM;
    const nextDiff = next.elevationM - current.elevationM;
    const isTurningPoint = prevDiff !== 0 && nextDiff !== 0 && prevDiff * nextDiff < 0;

    const hasStrongChange = deltaFromLastKeptKm >= minDistanceKm && deltaFromLastKeptM >= elevationDeltaM;

    if (isTurningPoint || hasStrongChange) {
      simplified.push(current);
      lastKept = current;
    }
  }

  const lastPoint = profile.at(-1);
  if (lastPoint) simplified.push(lastPoint);

  return capElevationProfile(simplified, maxPoints);
}

function capElevationProfile(profile: ElevationProfilePoint[], maxPoints: number): ElevationProfilePoint[] {
  if (profile.length <= maxPoints) return profile;

  const lastIndex = profile.length - 1;
  const keepIndices = new Set<number>([0, lastIndex]);

  let minIndex = 0;
  let maxIndex = 0;
  for (let i = 1; i < profile.length; i += 1) {
    if (profile[i].elevationM < profile[minIndex].elevationM) minIndex = i;
    if (profile[i].elevationM > profile[maxIndex].elevationM) maxIndex = i;
  }
  keepIndices.add(minIndex);
  keepIndices.add(maxIndex);

  const candidates: { index: number; score: number }[] = [];
  for (let i = 1; i < lastIndex; i += 1) {
    if (keepIndices.has(i)) continue;

    const prev = profile[i - 1];
    const current = profile[i];
    const next = profile[i + 1];
    const prevDiff = current.elevationM - prev.elevationM;
    const nextDiff = next.elevationM - current.elevationM;
    const isTurningPoint = prevDiff !== 0 && nextDiff !== 0 && prevDiff * nextDiff < 0;
    const score = isTurningPoint ? Math.abs(prevDiff) + Math.abs(nextDiff) : Math.abs(prevDiff);

    candidates.push({ index: i, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    if (keepIndices.size >= maxPoints) break;
    keepIndices.add(candidate.index);
  }

  return [...keepIndices].sort((a, b) => a - b).map((index) => profile[index]);
}

function getDifficulty(totalAscentM: number, totalDistanceKm: number): 'Easy' | 'Moderate' | 'Challenging' {
  const ascentPerKm = totalAscentM / Math.max(totalDistanceKm, 0.1);
  if (totalAscentM < 50 && ascentPerKm < 15) return 'Easy';
  if (totalAscentM < 150 && ascentPerKm < 35) return 'Moderate';
  return 'Challenging';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
