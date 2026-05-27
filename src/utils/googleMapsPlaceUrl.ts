import type { InterestingPlace } from './types';

export function getGoogleMapsPlaceUrl(place: InterestingPlace): string {
  const searchParams = new URLSearchParams({
    api: '1',
    query: `${place.lat},${place.lng}`,
    query_place_id: place.id
  });

  return `https://www.google.com/maps/search/?${searchParams.toString()}`;
}
