export type LatLngLiteral = google.maps.LatLngLiteral

export function haversineDistanceMeters(a: LatLngLiteral, b: LatLngLiteral): number {
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

/** Distance from route start along the polyline to the closest point on the path. */
export function getDistanceAlongPolylineMeters(
  point: LatLngLiteral,
  path: LatLngLiteral[]
): number {
  if (path.length === 0) {
    return 0;
  }
  if (path.length === 1) {
    return haversineDistanceMeters(point, path[0]);
  }

  let bestAlongMeters = 0;
  let bestDistanceMeters = Number.POSITIVE_INFINITY;
  let accumulatedMeters = 0;

  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    const segmentMeters = haversineDistanceMeters(start, end);
    const projection = projectPointOntoSegment(point, start, end);

    if (projection.distanceMeters < bestDistanceMeters) {
      bestDistanceMeters = projection.distanceMeters;
      bestAlongMeters = accumulatedMeters + projection.t * segmentMeters;
    }

    accumulatedMeters += segmentMeters;
  }

  return bestAlongMeters;
}

function projectPointOntoSegment(
  point: LatLngLiteral,
  segmentStart: LatLngLiteral,
  segmentEnd: LatLngLiteral
): { t: number; distanceMeters: number } {
  const origin = point;
  const p = toLocalMeters(point, origin);
  const a = toLocalMeters(segmentStart, origin);
  const b = toLocalMeters(segmentEnd, origin);

  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const abLengthSquared = ab.x * ab.x + ab.y * ab.y;

  if (abLengthSquared === 0) {
    const distanceMeters = Math.sqrt(ap.x * ap.x + ap.y * ap.y);
    return { t: 0, distanceMeters };
  }

  const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / abLengthSquared));
  const closest = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  const dx = p.x - closest.x;
  const dy = p.y - closest.y;
  return { t, distanceMeters: Math.sqrt(dx * dx + dy * dy) };
}

function toLocalMeters(point: LatLngLiteral, origin: LatLngLiteral) {
  const earthRadiusM = 6371000;
  const latRad = (origin.lat * Math.PI) / 180;
  return {
    x: ((point.lng - origin.lng) * Math.PI) / 180 * earthRadiusM * Math.cos(latRad),
    y: ((point.lat - origin.lat) * Math.PI) / 180 * earthRadiusM
  };
}

export function polylineLengthMeters(path: LatLngLiteral[]): number {
  if (path.length < 2) return 0

  let distanceMeters = 0
  for (let index = 1; index < path.length; index += 1) {
    distanceMeters += haversineDistanceMeters(path[index - 1], path[index])
  }
  return distanceMeters
}

/** Position on a polyline at the given distance from the start (linear segment interpolation). */
export function pointAlongPolylineAtDistanceMeters(
  path: LatLngLiteral[],
  targetMeters: number
): LatLngLiteral {
  if (path.length === 0) {
    throw new Error('Route path is empty')
  }
  if (path.length === 1 || targetMeters <= 0) {
    return { lat: path[0].lat, lng: path[0].lng }
  }

  const totalMeters = polylineLengthMeters(path)
  const clampedTarget = Math.min(Math.max(targetMeters, 0), totalMeters)

  let accumulatedMeters = 0
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1]
    const end = path[index]
    const segmentMeters = haversineDistanceMeters(start, end)

    if (accumulatedMeters + segmentMeters >= clampedTarget) {
      const segmentProgress =
        segmentMeters > 0 ? (clampedTarget - accumulatedMeters) / segmentMeters : 0
      return {
        lat: start.lat + segmentProgress * (end.lat - start.lat),
        lng: start.lng + segmentProgress * (end.lng - start.lng)
      }
    }

    accumulatedMeters += segmentMeters
  }

  const last = path[path.length - 1]
  return { lat: last.lat, lng: last.lng }
}

/** Split a route polyline at a distance from the start (for progress-style map highlight). */
export function slicePolylineAtDistanceMeters(
  path: LatLngLiteral[],
  targetMeters: number
): { traveled: LatLngLiteral[]; remaining: LatLngLiteral[] } {
  if (path.length < 2) {
    return { traveled: [...path], remaining: [] }
  }

  const totalMeters = polylineLengthMeters(path)
  const clampedMeters = Math.min(Math.max(targetMeters, 0), totalMeters)

  if (clampedMeters <= 0) {
    return { traveled: [], remaining: [...path] }
  }

  if (clampedMeters >= totalMeters) {
    return { traveled: [...path], remaining: [] }
  }

  const splitPoint = pointAlongPolylineAtDistanceMeters(path, clampedMeters)
  const traveled: LatLngLiteral[] = [path[0]]
  const remaining: LatLngLiteral[] = [splitPoint]
  let accumulatedMeters = 0
  let splitAddedToTraveled = false

  for (let index = 1; index < path.length; index += 1) {
    const segmentMeters = haversineDistanceMeters(path[index - 1], path[index])
    const segmentEndMeters = accumulatedMeters + segmentMeters

    if (segmentEndMeters < clampedMeters) {
      traveled.push(path[index])
    } else if (accumulatedMeters < clampedMeters) {
      if (!splitAddedToTraveled) {
        traveled.push(splitPoint)
        splitAddedToTraveled = true
      }
      remaining.push(path[index])
    } else {
      remaining.push(path[index])
    }

    accumulatedMeters = segmentEndMeters
  }

  if (!splitAddedToTraveled) {
    traveled.push(splitPoint)
  }

  return { traveled, remaining }
}

/** Polyline vertices covering a distance window along the route (for map fitBounds). */
export function getRouteSegmentAroundDistanceMeters(
  path: LatLngLiteral[],
  centerDistanceM: number,
  radiusM: number
): LatLngLiteral[] {
  if (path.length === 0) return []
  if (path.length === 1) return [{ lat: path[0].lat, lng: path[0].lng }]

  const totalMeters = polylineLengthMeters(path)
  const startM = Math.max(0, centerDistanceM - radiusM)
  const endM = Math.min(totalMeters, centerDistanceM + radiusM)

  const startPoint = pointAlongPolylineAtDistanceMeters(path, startM)
  const endPoint = pointAlongPolylineAtDistanceMeters(path, endM)
  const segment: LatLngLiteral[] = [startPoint]
  let accumulatedMeters = 0

  for (let index = 1; index < path.length; index += 1) {
    const segmentMeters = haversineDistanceMeters(path[index - 1], path[index])
    const previousMeters = accumulatedMeters
    accumulatedMeters += segmentMeters

    if (accumulatedMeters > startM && previousMeters < endM) {
      segment.push(path[index])
    }
  }

  const last = segment.at(-1)
  if (!last || last.lat !== endPoint.lat || last.lng !== endPoint.lng) {
    segment.push(endPoint)
  }

  return segment.length >= 2 ? segment : [startPoint, endPoint]
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}
