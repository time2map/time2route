import {
  isValidLatitude,
  isValidLongitude,
  parseUrlCoordinate,
  replaceUrlSearchParams
} from './urlSearchParamsState';

export const MAP_URL_PARAM_LAT = 'lat';
export const MAP_URL_PARAM_LNG = 'lng';
export const MAP_URL_PARAM_ZOOM = 'zoom';

export type MapViewportUrlState = {
  lat: number;
  lng: number;
  zoom: number;
};

export function readMapViewportFromUrl(
  search = globalThis.location?.search ?? ''
): MapViewportUrlState | null {
  const params = new URLSearchParams(search);
  const lat = parseUrlCoordinate(params.get(MAP_URL_PARAM_LAT));
  const lng = parseUrlCoordinate(params.get(MAP_URL_PARAM_LNG));
  const zoom = parseUrlCoordinate(params.get(MAP_URL_PARAM_ZOOM));

  if (lat == null || lng == null || zoom == null) {
    return null;
  }

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
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
  replaceUrlSearchParams((params) => {
    params.set(MAP_URL_PARAM_LAT, viewport.lat.toFixed(6));
    params.set(MAP_URL_PARAM_LNG, viewport.lng.toFixed(6));
    params.set(MAP_URL_PARAM_ZOOM, String(Math.round(viewport.zoom * 100) / 100));
  });
}
