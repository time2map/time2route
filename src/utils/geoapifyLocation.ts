export type UserIpLocation = {
  source: 'geoapify-ip';
  ip: string | null;
  lat: number;
  lng: number;
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  timezone: string | null;
  isApproximate: true;
};

type GeoapifyIpInfoResponse = {
  ip?: string;
  city?: {
    name?: string;
  };
  country?: {
    name?: string;
    iso_code?: string;
  };
  subdivisions?: Array<{
    name?: string;
    iso_code?: string;
  }>;
  location?: {
    latitude?: number;
    longitude?: number;
    time_zone?: string;
  };
};

/** Set VITE_GEOAPIFY_IP_ENABLED=false in .env to skip API calls during development. */
export function isGeoapifyIpEnabled(): boolean {
  return import.meta.env.VITE_GEOAPIFY_IP_ENABLED !== 'false';
}

function parseGeoapifyCoordinates(lat: unknown, lng: unknown): { lat: number; lng: number } {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    throw new Error('Geoapify did not return valid coordinates');
  }

  return { lat, lng };
}

export function formatGeoapifyAddress(location: UserIpLocation): string {
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
}

export async function getUserLocationByGeoapifyIp(): Promise<UserIpLocation> {
  if (!isGeoapifyIpEnabled()) {
    throw new Error('Geoapify IP geolocation is disabled (VITE_GEOAPIFY_IP_ENABLED=false)');
  }

  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY as string | undefined;

  if (!apiKey) {
    throw new Error('VITE_GEOAPIFY_API_KEY is not set');
  }

  const url = new URL('https://api.geoapify.com/v1/ipinfo');
  url.searchParams.set('apiKey', apiKey);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Geoapify IP Geolocation failed: ${response.status}`);
  }

  const data: GeoapifyIpInfoResponse = await response.json();

  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  const coordinates = parseGeoapifyCoordinates(lat, lng);

  return {
    source: 'geoapify-ip',
    ip: data.ip ?? null,
    lat: coordinates.lat,
    lng: coordinates.lng,
    city: data.city?.name ?? null,
    region: data.subdivisions?.[0]?.name ?? null,
    country: data.country?.name ?? null,
    countryCode: data.country?.iso_code ?? null,
    timezone: data.location?.time_zone ?? null,
    isApproximate: true
  };
}
