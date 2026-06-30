import type { UserLocation } from '../../utils/detectUserLocation';
import { isApproximateUserLocation } from '../../utils/detectUserLocation';

function createUserLocationMarkerElement(isApproximate: boolean): HTMLDivElement {
  const element = document.createElement('div');
  element.className = `user-location-marker${isApproximate ? ' user-location-marker--approximate' : ''}`;
  element.innerHTML = `
    <div class="user-location-marker-pulse" aria-hidden="true"></div>
    <div class="user-location-marker-dot" aria-hidden="true"></div>
  `;
  element.title = isApproximate ? 'My location (approximate)' : 'My location';
  return element;
}

export async function ensureUserLocationMarker(
  map: google.maps.Map,
  userLocation: UserLocation,
  markerRef: { current: google.maps.marker.AdvancedMarkerElement | null }
): Promise<google.maps.marker.AdvancedMarkerElement> {
  const position = { lat: userLocation.lat, lng: userLocation.lng };
  const isApproximate = isApproximateUserLocation(userLocation);

  if (markerRef.current) {
    markerRef.current.map = map;
    markerRef.current.position = position;
    markerRef.current.title = isApproximate ? 'My location (approximate)' : 'My location';
    return markerRef.current;
  }

  const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
  const element = createUserLocationMarkerElement(isApproximate);

  const marker = new AdvancedMarkerElement({
    map,
    position,
    title: element.title,
    zIndex: 50
  });
  marker.append(element);
  markerRef.current = marker;
  return marker;
}
