const locate = (options: PositionOptions) =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

export async function getCurrentPosition(): Promise<GeolocationPosition> {
  if (!('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported in this browser.');
  }

  try {
    return await locate({
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 5 * 60 * 1000
    });
  } catch (firstError) {
    console.warn('Default geolocation failed, retrying with high accuracy', firstError);

    return locate({
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    });
  }
}

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
  const position = await getCurrentPosition();
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  const address = await reverseGeocodeAddress(lat, lng);
  const name = address.split(',')[0]?.trim() || address;

  return { lat, lng, address, name };
}
