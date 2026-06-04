import type { RawPlace } from './secrchPlacesAlongRoute';
import type { InterestingPlace } from '../utils/types';

const NEARBY_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.primaryType',
  'places.rating',
  'places.userRatingCount',
  'places.photos.name'
].join(',');

const PLACE_DETAIL_FIELDS = [
  'id',
  'displayName',
  'location',
  'rating',
  'userRatingCount',
  'photos',
  'primaryType'
] as const;

export function isSyntheticMapPickPlaceId(placeId: string): boolean {
  return placeId.startsWith('map-pick-');
}

function getPlaceDisplayName(place: google.maps.places.Place): string {
  const displayName = place.displayName;
  if (typeof displayName === 'string') {
    return displayName;
  }
  if (displayName && typeof displayName === 'object' && 'text' in displayName) {
    return String((displayName as { text?: string }).text ?? '');
  }
  return '';
}

function rawPlaceToInterestingPlace(
  raw: RawPlace,
  fallback: Pick<InterestingPlace, 'id' | 'name' | 'lat' | 'lng'>
): InterestingPlace {
  return {
    id: fallback.id,
    name: raw.displayName?.text?.trim() || fallback.name,
    lat: raw.location?.latitude ?? fallback.lat,
    lng: raw.location?.longitude ?? fallback.lng,
    primaryType: raw.primaryType,
    rating: raw.rating,
    userRatingCount: raw.userRatingCount,
    photos: raw.photos
  };
}

export async function fetchInterestingPlaceById(
  placeId: string,
  fallback: Pick<InterestingPlace, 'id' | 'name' | 'lat' | 'lng'>
): Promise<InterestingPlace> {
  const { Place } = (await google.maps.importLibrary('places')) as {
    Place: new (options: { id: string }) => google.maps.places.Place;
  };

  const place = new Place({ id: placeId });
  await place.fetchFields({ fields: [...PLACE_DETAIL_FIELDS] });

  const location = place.location;
  const photos =
    place.photos
      ?.map((photo) => {
        const name = (photo as google.maps.places.Photo & { name?: string }).name ?? '';
        return { name };
      })
      .filter((photo) => photo.name.length > 0) ?? [];

  return {
    id: fallback.id,
    name: getPlaceDisplayName(place).trim() || fallback.name,
    lat: location?.lat() ?? fallback.lat,
    lng: location?.lng() ?? fallback.lng,
    primaryType: place.primaryType ?? undefined,
    rating: typeof place.rating === 'number' ? place.rating : undefined,
    userRatingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
    photos: photos.length > 0 ? photos : undefined
  };
}

export async function fetchInterestingPlaceNearLocation(
  lat: number,
  lng: number,
  fallback: Pick<InterestingPlace, 'id' | 'name' | 'lat' | 'lng'>,
  apiKey: string
): Promise<InterestingPlace | null> {
  const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': NEARBY_FIELD_MASK
    },
    body: JSON.stringify({
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 50
        }
      },
      maxResultCount: 1,
      rankPreference: 'DISTANCE'
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { places?: RawPlace[] };
  const nearest = data.places?.[0];
  if (!nearest) {
    return null;
  }

  return rawPlaceToInterestingPlace(nearest, fallback);
}

export async function enrichInterestingPlace(
  fallback: InterestingPlace,
  apiKey?: string
): Promise<InterestingPlace> {
  const hasMedia =
    typeof fallback.rating === 'number' || (fallback.photos?.length ?? 0) > 0;
  if (hasMedia) {
    return fallback;
  }

  try {
    if (!isSyntheticMapPickPlaceId(fallback.id)) {
      return await fetchInterestingPlaceById(fallback.id, fallback);
    }

    if (!apiKey) {
      return fallback;
    }

    const nearby = await fetchInterestingPlaceNearLocation(
      fallback.lat,
      fallback.lng,
      fallback,
      apiKey
    );
    return nearby ?? fallback;
  } catch (error: unknown) {
    console.error(error);
    return fallback;
  }
}
