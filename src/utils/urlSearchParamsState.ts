export function replaceUrlSearchParams(mutator: (params: URLSearchParams) => void): void {
  if (typeof globalThis.history?.replaceState !== 'function') {
    return;
  }

  const url = new URL(globalThis.location.href);
  mutator(url.searchParams);

  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`;

  if (next === current) {
    return;
  }

  globalThis.history.replaceState(globalThis.history.state, '', next);
}

function parseCoordinate(value: string | null): number | null {
  if (value == null) {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseUrlCoordinate(value: string | null): number | null {
  return parseCoordinate(value);
}

export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

export function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}
