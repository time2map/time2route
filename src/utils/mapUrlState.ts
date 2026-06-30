export const MAP_URL_PARAM_LAT = 'lat';
export const MAP_URL_PARAM_LNG = 'lng';
export const MAP_URL_PARAM_ZOOM = 'zoom';

export type MapViewportUrlState = {
  lat: number;
  lng: number;
  zoom: number;
};

function parseCoordinate(value: string | null): number | null {
  if (value == null) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readMapViewportFromUrl(
  search = globalThis.location?.search ?? ''
): MapViewportUrlState | null {
  const params = new URLSearchParams(search);
  const lat = parseCoordinate(params.get(MAP_URL_PARAM_LAT));
  const lng = parseCoordinate(params.get(MAP_URL_PARAM_LNG));
  const zoom = parseCoordinate(params.get(MAP_URL_PARAM_ZOOM));

  if (lat == null || lng == null || zoom == null) {
    return null;
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  if (zoom < 0 || zoom > 22) {
    return null;
  }

  return { lat, lng, zoom };
}

export function hasMapViewportInUrl(search = globalThis.location?.search ?? ''): boolean {
  return readMapViewportFromUrl(search) != null;
}

export function writeMapViewportToUrl(viewport: MapViewportUrlState): void {
  if (typeof globalThis.history?.replaceState !== 'function') {
    return;
  }

  const url = new URL(globalThis.location.href);
  url.searchParams.set(MAP_URL_PARAM_LAT, viewport.lat.toFixed(6));
  url.searchParams.set(MAP_URL_PARAM_LNG, viewport.lng.toFixed(6));
  url.searchParams.set(MAP_URL_PARAM_ZOOM, String(Math.round(viewport.zoom * 100) / 100));

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;

  if (next === current) {
    return;
  }

  globalThis.history.replaceState(globalThis.history.state, '', next);
}
