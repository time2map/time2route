import { detectUserLocation, isApproximateUserLocation } from './detectUserLocation';
import { formatGeoapifyAddress } from './geoapifyLocation';

export { getBrowserGeolocationPosition as getCurrentPosition } from './detectUserLocation';

export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string> {
  const geocoder = new google.maps.Geocoder();
  const response = await geocoder.geocode({ location: { lat, lng } });
  const formatted = response.results[0]?.formatted_address;

  if (!formatted) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  return formatted;
}

export async function resolveCurrentLocationAddress() {
  const userLocation = await detectUserLocation({ allowGeoapifyFallback: true });
  const { lat, lng } = userLocation;

  if (isApproximateUserLocation(userLocation)) {
    const address = formatGeoapifyAddress(userLocation);
    const name =
      userLocation.city || userLocation.region || address.split(',')[0]?.trim() || address;

    return { lat, lng, address, name, source: userLocation.source };
  }

  const address = await reverseGeocodeAddress(lat, lng);
  const name = address.split(',')[0]?.trim() || address;

  return { lat, lng, address, name, source: userLocation.source };
}
