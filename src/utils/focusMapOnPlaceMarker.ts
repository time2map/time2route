type LatLngLiteral = google.maps.LatLngLiteral;

const DEFAULT_MIN_ZOOM = 16;

type MapOptionsWithPadding = google.maps.MapOptions & {
  padding?: google.maps.Padding;
};

function applyMapViewportPadding(map: google.maps.Map, padding: google.maps.Padding): void {
  map.setOptions({ padding } as MapOptionsWithPadding);
}

/**
 * How far to pan the map up after centering, so the marker sits below the
 * viewport center (popup fits above, like the reference mobile layout).
 */
export function computePlaceMarkerPanDownPx(
  map: google.maps.Map,
  basePadding: google.maps.Padding
): number {
  const mapHeight = map.getDiv().getBoundingClientRect().height;
  const top = basePadding.top ?? 0;
  const bottom = basePadding.bottom ?? 0;
  const visibleHeight = Math.max(200, mapHeight - top - bottom);
  const isMobile = globalThis.window.matchMedia('(max-width: 768px)').matches;
  const ratio = isMobile ? 0.15 : 0.17;

  return Math.round(Math.min(visibleHeight * ratio, isMobile ? 120 : 150));
}

export function focusMapOnPlaceMarker(
  map: google.maps.Map,
  position: LatLngLiteral,
  options: {
    basePadding: google.maps.Padding;
    minZoom?: number;
  }
): void {
  applyMapViewportPadding(map, options.basePadding);

  const targetZoom = Math.max(map.getZoom() ?? 0, options.minZoom ?? DEFAULT_MIN_ZOOM);
  const shiftPx = computePlaceMarkerPanDownPx(map, options.basePadding);
  let shifted = false;

  const shiftMarkerBelowCenter = () => {
    if (shifted || shiftPx <= 0) return;
    shifted = true;
    map.panBy(0, -shiftPx);
  };

  map.setZoom(targetZoom);
  map.panTo(position);

  google.maps.event.addListenerOnce(map, 'idle', shiftMarkerBelowCenter);
  globalThis.window.setTimeout(shiftMarkerBelowCenter, 220);
}

export function restoreMapViewportPadding(
  map: google.maps.Map,
  basePadding: google.maps.Padding
): void {
  applyMapViewportPadding(map, basePadding);
}
