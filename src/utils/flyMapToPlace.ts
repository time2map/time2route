type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6371000;
/** Rough viewport around a searched place (city / neighborhood scale). */
const DEFAULT_AREA_RADIUS_M = 3200;

function boundsAroundPoint(lat: number, lng: number, radiusM: number): google.maps.LatLngBounds {
  const latDelta = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const lngDelta = latDelta / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
  const bounds = new google.maps.LatLngBounds();
  bounds.extend({ lat: lat - latDelta, lng: lng - lngDelta });
  bounds.extend({ lat: lat + latDelta, lng: lng + lngDelta });
  return bounds;
}

function getMapAreaSearchFitPadding(map: google.maps.Map): google.maps.Padding {
  const isMobile = globalThis.window.matchMedia('(max-width: 768px)').matches;

  if (!isMobile) {
    return { top: 72, right: 32, bottom: 48, left: 32 };
  }

  const mapHeight = map.getDiv().getBoundingClientRect().height;
  const sheetElement = document.querySelector('.sidebar-mobile-sheet') as HTMLElement | null;
  const sheetHeight = sheetElement?.getBoundingClientRect().height ?? 0;
  const bottomPadding = Math.min(Math.max(sheetHeight + 24, 120), Math.round(mapHeight * 0.55));

  return { top: 72, right: 16, bottom: bottomPadding, left: 16 };
}

export function flyMapToPlace(map: google.maps.Map, place: LatLng, radiusM = DEFAULT_AREA_RADIUS_M): void {
  const bounds = boundsAroundPoint(place.lat, place.lng, radiusM);
  map.fitBounds(bounds, getMapAreaSearchFitPadding(map));

  const maxZoom = 14;
  const listener = map.addListener('idle', () => {
    listener.remove();
    const zoom = map.getZoom();
    if (zoom != null && zoom > maxZoom) {
      map.setZoom(maxZoom);
    }
  });
}
