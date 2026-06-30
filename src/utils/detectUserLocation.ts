import { getUserLocationByGeoapifyIp, type UserIpLocation } from './geoapifyLocation';

export type BrowserLocation = {
  source: 'browser';
  lat: number;
  lng: number;
  accuracy: number;
};

export type { UserIpLocation };

export type UserLocation = BrowserLocation | UserIpLocation;

const locate = (options: PositionOptions) =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

export async function getBrowserGeolocationPosition(): Promise<GeolocationPosition> {
  if (!('geolocation' in navigator)) {
    throw new Error('Browser geolocation is not supported');
  }

  try {
    return await locate({
      enableHighAccuracy: false,
      timeout: 15_000,
      maximumAge: 5 * 60 * 1000
    });
  } catch (firstError) {
    console.warn('Default geolocation failed, retrying with high accuracy', firstError);

    return locate({
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0
    });
  }
}

function getBrowserLocation(): Promise<BrowserLocation> {
  return getBrowserGeolocationPosition().then((position) => ({
    source: 'browser',
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracy: position.coords.accuracy
  }));
}

export function isApproximateUserLocation(
  location: UserLocation
): location is UserIpLocation {
  return location.source === 'geoapify-ip';
}

export type DetectUserLocationOptions = {
  /** When false (default), only browser geolocation is used. */
  allowGeoapifyFallback?: boolean;
};

export async function detectUserLocation(
  options: DetectUserLocationOptions = {}
): Promise<UserLocation> {
  const { allowGeoapifyFallback = false } = options;

  try {
    return await getBrowserLocation();
  } catch (browserError) {
    if (!allowGeoapifyFallback) {
      throw browserError;
    }

    console.warn('Browser geolocation failed, fallback to Geoapify:', browserError);

    try {
      return await getUserLocationByGeoapifyIp();
    } catch (geoapifyError) {
      throw geoapifyError instanceof Error ? geoapifyError : browserError;
    }
  }
}
