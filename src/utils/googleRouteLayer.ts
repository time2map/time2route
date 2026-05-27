import type { BuildRouteParameters, BuiltRouteResult, RouteActivityMode } from "./types"

const activityToTravelMode: Record<RouteActivityMode, 'WALKING' | 'BICYCLING'> = {
  walk: 'WALKING',
  bike: 'BICYCLING',
}

let activeRoutePolylines: google.maps.Polyline[] = []
let routesLibraryPromise: Promise<google.maps.RoutesLibrary> | null = null
let geometryLibraryPromise: Promise<google.maps.GeometryLibrary> | null = null

function loadRoutesLibrary() {
  routesLibraryPromise ??= google.maps.importLibrary('routes') as Promise<google.maps.RoutesLibrary>
  return routesLibraryPromise
}

function loadGeometryLibrary() {
  geometryLibraryPromise ??= google.maps.importLibrary('geometry') as Promise<google.maps.GeometryLibrary>
  return geometryLibraryPromise
}

function fitMapToPath(map: google.maps.Map, path: google.maps.LatLngLiteral[]) {
  const bounds = new google.maps.LatLngBounds()

  path.forEach((point) => {
    bounds.extend(point)
  })

  map.fitBounds(bounds)
}

function getRouteStrokeColor(activityMode: RouteActivityMode) {
  return activityMode === 'bike' ? '#5aaab8' : '#e06b65'
}

export function clearRouteFromMap() {
  activeRoutePolylines.forEach((polyline) => {
    polyline.setMap(null)
  })
  activeRoutePolylines = []
}

export async function buildAndDrawRoute({
  map,
  origin,
  destination,
  activityMode = 'walk',
  fitBounds = true,
  intermediates = [],
}: BuildRouteParameters): Promise<BuiltRouteResult> {
  const { Route } = await loadRoutesLibrary()

  const response = await Route.computeRoutes({
    origin,
    destination,
    intermediates: intermediates.map((point) => ({
      location: point,
    })),
    travelMode: activityToTravelMode[activityMode],
    fields: [
      'path',
      'distanceMeters',
      'durationMillis',
    ],
  });

  const route = response.routes?.[0]
  if (!route) {
    throw new Error('Route not found')
  }

  const routePath =
    route.path?.map((point) => ({
      lat: point.lat,
      lng: point.lng,
    })) ?? []

  if (routePath.length < 2) {
    throw new Error('Route path is empty')
  }

  const { encoding } = await loadGeometryLibrary()
  const encodedPolyline = encoding.encodePath(routePath)

  const polyline = new google.maps.Polyline({
    path: routePath,
    map,
    strokeColor: getRouteStrokeColor(activityMode),
    strokeOpacity: 0.95,
    strokeWeight: 6,
  })

  clearRouteFromMap()
  activeRoutePolylines = [polyline]

  if (fitBounds) {
    fitMapToPath(map, routePath)
  }

  return {
    route,
    distanceMeters: route.distanceMeters ?? null,
    durationMillis: route.durationMillis ?? null,
    path: route.path ?? null,
    encodedPolyline,
    warnings: [],
  }
}

export function formatDistance(distanceMeters: number | null): string {
  if (distanceMeters == null) return '—'
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`
  return `${(distanceMeters / 1000).toFixed(1)} km`
}

export function formatDuration(durationMillis: number | null): string {
  if (durationMillis == null) return '—'

  const totalMinutes = Math.round(durationMillis / 1000 / 60)
  if (totalMinutes < 60) return `${totalMinutes} min`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours} h ${minutes} min`
}
