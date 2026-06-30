import type { ActivityMode } from './types';
import {
  isValidLatitude,
  isValidLongitude,
  parseUrlCoordinate,
  replaceUrlSearchParams
} from './urlSearchParamsState';

export const ROUTE_URL_PARAM_FROM = 'from';
export const ROUTE_URL_PARAM_TO = 'to';
export const ROUTE_URL_PARAM_FROM_LAT = 'fromLat';
export const ROUTE_URL_PARAM_FROM_LNG = 'fromLng';
export const ROUTE_URL_PARAM_TO_LAT = 'toLat';
export const ROUTE_URL_PARAM_TO_LNG = 'toLng';
export const ROUTE_URL_PARAM_MODE = 'mode';

const ROUTE_URL_PARAM_KEYS = [
  ROUTE_URL_PARAM_FROM,
  ROUTE_URL_PARAM_TO,
  ROUTE_URL_PARAM_FROM_LAT,
  ROUTE_URL_PARAM_FROM_LNG,
  ROUTE_URL_PARAM_TO_LAT,
  ROUTE_URL_PARAM_TO_LNG,
  ROUTE_URL_PARAM_MODE
] as const;

export type RouteEndpointsUrlState = {
  from: string;
  to: string;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  mode?: ActivityMode;
};

export type RouteFormUrlInitialState = {
  from: string;
  to: string;
  startPoint: { lat: number; lng: number; address: string } | null;
  destinationPoint: { lat: number; lng: number; address: string } | null;
  mode: ActivityMode;
  shouldAutoBuild: boolean;
};

function parseEndpointPoint(
  address: string,
  lat: number | null,
  lng: number | null
): { lat: number; lng: number; address: string } | null {
  if (lat == null || lng == null || !isValidLatitude(lat) || !isValidLongitude(lng)) {
    return null;
  }

  return { lat, lng, address };
}

export function readRouteEndpointsFromUrl(
  search = globalThis.location?.search ?? ''
): RouteEndpointsUrlState | null {
  const params = new URLSearchParams(search);
  const from = params.get(ROUTE_URL_PARAM_FROM)?.trim() ?? '';
  const to = params.get(ROUTE_URL_PARAM_TO)?.trim() ?? '';

  if (!from || !to) {
    return null;
  }

  const fromLat = parseUrlCoordinate(params.get(ROUTE_URL_PARAM_FROM_LAT));
  const fromLng = parseUrlCoordinate(params.get(ROUTE_URL_PARAM_FROM_LNG));
  const toLat = parseUrlCoordinate(params.get(ROUTE_URL_PARAM_TO_LAT));
  const toLng = parseUrlCoordinate(params.get(ROUTE_URL_PARAM_TO_LNG));
  const modeParam = params.get(ROUTE_URL_PARAM_MODE);
  const mode = modeParam === 'bike' || modeParam === 'walk' ? modeParam : undefined;

  return {
    from,
    to,
    fromLat: fromLat ?? undefined,
    fromLng: fromLng ?? undefined,
    toLat: toLat ?? undefined,
    toLng: toLng ?? undefined,
    mode
  };
}

export function hasRouteEndpointsInUrl(search = globalThis.location?.search ?? ''): boolean {
  return readRouteEndpointsFromUrl(search) != null;
}

export function getInitialRouteFormStateFromUrl(): RouteFormUrlInitialState {
  const route = readRouteEndpointsFromUrl();

  if (!route) {
    return {
      from: '',
      to: '',
      startPoint: null,
      destinationPoint: null,
      mode: 'walk',
      shouldAutoBuild: false
    };
  }

  return {
    from: route.from,
    to: route.to,
    startPoint: parseEndpointPoint(route.from, route.fromLat ?? null, route.fromLng ?? null),
    destinationPoint: parseEndpointPoint(route.to, route.toLat ?? null, route.toLng ?? null),
    mode: route.mode ?? 'walk',
    shouldAutoBuild: true
  };
}

export function writeRouteEndpointsToUrl(state: RouteEndpointsUrlState): void {
  replaceUrlSearchParams((params) => {
    params.set(ROUTE_URL_PARAM_FROM, state.from);
    params.set(ROUTE_URL_PARAM_TO, state.to);

    if (state.fromLat != null && state.fromLng != null) {
      params.set(ROUTE_URL_PARAM_FROM_LAT, state.fromLat.toFixed(6));
      params.set(ROUTE_URL_PARAM_FROM_LNG, state.fromLng.toFixed(6));
    } else {
      params.delete(ROUTE_URL_PARAM_FROM_LAT);
      params.delete(ROUTE_URL_PARAM_FROM_LNG);
    }

    if (state.toLat != null && state.toLng != null) {
      params.set(ROUTE_URL_PARAM_TO_LAT, state.toLat.toFixed(6));
      params.set(ROUTE_URL_PARAM_TO_LNG, state.toLng.toFixed(6));
    } else {
      params.delete(ROUTE_URL_PARAM_TO_LAT);
      params.delete(ROUTE_URL_PARAM_TO_LNG);
    }

    if (state.mode) {
      params.set(ROUTE_URL_PARAM_MODE, state.mode);
    } else {
      params.delete(ROUTE_URL_PARAM_MODE);
    }
  });
}

export function clearRouteEndpointsFromUrl(): void {
  replaceUrlSearchParams((params) => {
    for (const key of ROUTE_URL_PARAM_KEYS) {
      params.delete(key);
    }
  });
}
