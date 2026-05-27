import type { ElevationProfilePoint, ElevationStats, RoutePathPoint } from "./types"

let elevationServicePromise: Promise<google.maps.ElevationService> | null = null
const elevationStatsCache = new Map<string, ElevationStats>()

type ElevationRequestOptions = {
  samples?: number
  distanceMeters?: number | null
  encodedPolyline?: string | null
}

export async function getRouteElevationStats(
  routePath: RoutePathPoint[],
  options: ElevationRequestOptions = {},
): Promise<ElevationStats> {
  if (!routePath || routePath.length < 2) {
    throw new Error('Route path must contain at least 2 points')
  }

  const normalizedPath = routePath.map(toLatLngLiteral)
  const distanceMeters =
    options.distanceMeters ?? estimatePathDistanceMeters(normalizedPath)
  const safeSamples = clampElevationSamples(
    options.samples ?? chooseElevationSamples(distanceMeters),
  )
  const cacheKey = getElevationCacheKey(options.encodedPolyline, safeSamples, normalizedPath)
  const cachedStats = elevationStatsCache.get(cacheKey)
  if (cachedStats) {
    return cachedStats
  }

  const elevationService = await getElevationService()
  const response = await elevationService.getElevationAlongPath({
    path: normalizedPath,
    samples: safeSamples,
  })

  const results = response.results
  if (!results || results.length < 2) {
    throw new Error('Elevation data is empty')
  }

  const fullProfile = buildElevationProfile(results)
  const chartProfile = simplifyElevationProfile(fullProfile, {
    minDistanceKm: 0.08,
    elevationDeltaM: 6,
    maxPoints: 10,
  })
  const stats = calculateElevationStats(fullProfile, chartProfile)
  elevationStatsCache.set(cacheKey, stats)
  return stats
}

export function getElevationInsight(stats: ElevationStats): string {
  if (stats.difficulty === 'Easy') {
    return 'The route is mostly flat, suitable for walking and easy jogging.'
  }
  if (stats.difficulty === 'Moderate') {
    return 'There are noticeable climbs, but the route is still comfortable for active walks or workouts.'
  }
  return 'The route is hilly with significant elevation gain, best for prepared users.'
}

function toLatLngLiteral(point: RoutePathPoint): google.maps.LatLngLiteral {
  const anyPoint = point as {
    lat: number | (() => number)
    lng: number | (() => number)
  }

  if (
    typeof anyPoint.lat === 'function' &&
    typeof anyPoint.lng === 'function'
  ) {
    return { lat: anyPoint.lat(), lng: anyPoint.lng() }
  }
  return {
    lat: Number(anyPoint.lat),
    lng: Number(anyPoint.lng),
  }
}

async function getElevationService(): Promise<google.maps.ElevationService> {
  elevationServicePromise ??= google.maps
    .importLibrary('elevation')
    .then((library) => {
      const { ElevationService } = library as google.maps.ElevationLibrary
      return new ElevationService()
    })

  return elevationServicePromise
}

function clampElevationSamples(samples: number): number {
  return clamp(Math.round(samples), 2, 512)
}

function chooseElevationSamples(distanceMeters: number): number {
  const km = Math.max(distanceMeters, 0) / 1000

  if (km <= 3) return 64
  if (km <= 10) return 128
  if (km <= 30) return 256
  return 512
}

function getElevationCacheKey(
  encodedPolyline: string | null | undefined,
  samples: number,
  path: google.maps.LatLngLiteral[],
): string {
  if (encodedPolyline) {
    return `${encodedPolyline}:${samples}`
  }

  const first = path[0]
  const last = path.at(-1)
  return `${first?.lat ?? 0},${first?.lng ?? 0}:${last?.lat ?? 0},${last?.lng ?? 0}:${path.length}:${samples}`
}

function estimatePathDistanceMeters(path: google.maps.LatLngLiteral[]): number {
  if (path.length < 2) return 0

  let distanceMeters = 0
  for (let i = 1; i < path.length; i += 1) {
    distanceMeters += haversineDistanceMeters(path[i - 1], path[i])
  }
  return distanceMeters
}

function buildElevationProfile(
  results: google.maps.ElevationResult[],
): ElevationProfilePoint[] {
  let distanceMeters = 0

  return results.map((result, index) => {
    const currentLocation = result.location
    if (!currentLocation) {
      throw new Error('Elevation result location is missing')
    }

    const current = {
      lat: currentLocation.lat(),
      lng: currentLocation.lng(),
    }

    if (index > 0) {
      const prevLocation = results[index - 1].location
      if (!prevLocation) {
        throw new Error('Previous elevation result location is missing')
      }
      const prev = { lat: prevLocation.lat(), lng: prevLocation.lng() }
      distanceMeters += haversineDistanceMeters(prev, current)
    }

    return {
      distanceKm: round(distanceMeters / 1000, 3),
      elevationM: round(result.elevation, 1),
      lat: current.lat,
      lng: current.lng,
      resolutionM: result.resolution,
    }
  })
}

function calculateElevationStats(
  fullProfile: ElevationProfilePoint[],
  chartProfile: ElevationProfilePoint[],
): ElevationStats {
  let totalAscentM = 0
  let totalDescentM = 0

  for (let i = 1; i < fullProfile.length; i += 1) {
    const diff = fullProfile[i].elevationM - fullProfile[i - 1].elevationM
    if (diff > 0) totalAscentM += diff
    else totalDescentM += Math.abs(diff)
  }

  const elevations = fullProfile.map((point) => point.elevationM)
  const minElevationM = Math.min(...elevations)
  const maxElevationM = Math.max(...elevations)
  const totalDistanceKm = fullProfile.at(-1)?.distanceKm ?? 0

  return {
    totalDistanceKm: round(totalDistanceKm, 2),
    totalAscentM: Math.round(totalAscentM),
    totalDescentM: Math.round(totalDescentM),
    minElevationM: Math.round(minElevationM),
    maxElevationM: Math.round(maxElevationM),
    startElevationM: Math.round(fullProfile[0].elevationM),
    finishElevationM: Math.round(fullProfile.at(-1)?.elevationM ?? 0),
    difficulty: getDifficulty(totalAscentM, totalDistanceKm),
    profile: chartProfile,
  }
}

function simplifyElevationProfile(
  profile: ElevationProfilePoint[],
  options: {
    minDistanceKm: number
    elevationDeltaM: number
    maxPoints: number
  },
): ElevationProfilePoint[] {
  if (profile.length <= 2) return profile

  const { minDistanceKm, elevationDeltaM, maxPoints } = options
  const simplified: ElevationProfilePoint[] = [profile[0]]
  let lastKept = profile[0]

  for (let i = 1; i < profile.length - 1; i += 1) {
    const prev = profile[i - 1]
    const current = profile[i]
    const next = profile[i + 1]

    const deltaFromLastKeptKm = current.distanceKm - lastKept.distanceKm
    const deltaFromLastKeptM = Math.abs(current.elevationM - lastKept.elevationM)

    const prevDiff = current.elevationM - prev.elevationM
    const nextDiff = next.elevationM - current.elevationM
    const isTurningPoint = prevDiff !== 0 && nextDiff !== 0 && prevDiff * nextDiff < 0

    const hasStrongChange =
      deltaFromLastKeptKm >= minDistanceKm &&
      deltaFromLastKeptM >= elevationDeltaM

    if (isTurningPoint || hasStrongChange) {
      simplified.push(current)
      lastKept = current
    }
  }

  const lastPoint = profile.at(-1)
  if (lastPoint) simplified.push(lastPoint)

  return capElevationProfile(simplified, maxPoints)
}

function capElevationProfile(
  profile: ElevationProfilePoint[],
  maxPoints: number,
): ElevationProfilePoint[] {
  if (profile.length <= maxPoints) return profile

  const lastIndex = profile.length - 1
  const keepIndices = new Set<number>([0, lastIndex])

  let minIndex = 0
  let maxIndex = 0
  for (let i = 1; i < profile.length; i += 1) {
    if (profile[i].elevationM < profile[minIndex].elevationM) minIndex = i
    if (profile[i].elevationM > profile[maxIndex].elevationM) maxIndex = i
  }
  keepIndices.add(minIndex)
  keepIndices.add(maxIndex)

  const candidates: { index: number; score: number }[] = []
  for (let i = 1; i < lastIndex; i += 1) {
    if (keepIndices.has(i)) continue

    const prev = profile[i - 1]
    const current = profile[i]
    const next = profile[i + 1]
    const prevDiff = current.elevationM - prev.elevationM
    const nextDiff = next.elevationM - current.elevationM
    const isTurningPoint = prevDiff !== 0 && nextDiff !== 0 && prevDiff * nextDiff < 0
    const score = isTurningPoint
      ? Math.abs(prevDiff) + Math.abs(nextDiff)
      : Math.abs(prevDiff)

    candidates.push({ index: i, score })
  }

  candidates.sort((a, b) => b.score - a.score)
  for (const candidate of candidates) {
    if (keepIndices.size >= maxPoints) break
    keepIndices.add(candidate.index)
  }

  return [...keepIndices]
    .sort((a, b) => a - b)
    .map((index) => profile[index])
}

function getDifficulty(
  totalAscentM: number,
  totalDistanceKm: number,
): 'Easy' | 'Moderate' | 'Challenging' {
  const ascentPerKm = totalAscentM / Math.max(totalDistanceKm, 0.1)
  if (totalAscentM < 50 && ascentPerKm < 15) return 'Easy'
  if (totalAscentM < 150 && ascentPerKm < 35) return 'Moderate'
  return 'Challenging'
}

function haversineDistanceMeters(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
): number {
  const earthRadiusM = 6371000
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const deltaLat = toRadians(b.lat - a.lat)
  const deltaLng = toRadians(b.lng - a.lng)

  const sinLat = Math.sin(deltaLat / 2)
  const sinLng = Math.sin(deltaLng / 2)
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))

  return earthRadiusM * c
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}
