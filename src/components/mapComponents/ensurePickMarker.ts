export async function ensurePickMarker(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  pickMarkerRef: { current: google.maps.marker.AdvancedMarkerElement | null },
  pickPinElRef: { current: HTMLDivElement | null }
): Promise<void> {
  if (pickMarkerRef.current) {
    pickMarkerRef.current.position = position;
    return;
  }

  const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
  const pinEl = document.createElement('div');
  pinEl.className = 'map-pick-pin';
  pinEl.innerHTML = `<div class="map-pick-pin-dot"></div><div class="map-pick-pin-pulse"></div>`;

  const marker = new AdvancedMarkerElement({
    map,
    position
  });
  marker.append(pinEl);
  pickMarkerRef.current = marker;
  pickPinElRef.current = pinEl;
}
