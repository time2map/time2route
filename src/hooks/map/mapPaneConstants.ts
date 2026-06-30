export const DEFAULT_MAP_CENTER: google.maps.LatLngLiteral = { lat: 52.3676, lng: 4.9041 };

/** Above place markers (max 300) and user location (50). */
export const MAP_PICK_MARKER_Z_INDEX = 1000;

/** Dev fallback when VITE_GOOGLE_MAPS_MAP_ID is unset; required for Advanced Markers. */
export const DEMO_GOOGLE_MAP_ID = '4504f8b37365c3d0';

export function resolveGoogleMapId(configured?: string): string {
  const trimmed = configured?.trim();
  return trimmed || DEMO_GOOGLE_MAP_ID;
}
