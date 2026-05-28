import type { InterestingPlace, PlaceCategory, PlaceCategoryMeta } from './types';

export const PLACE_CATEGORY_META: Record<PlaceCategory, PlaceCategoryMeta> = {
  nature: {
    category: 'nature',
    color: 'var(--green)',
    label: 'Park / nature'
  },
  culture: {
    category: 'culture',
    color: 'var(--red)',
    label: 'Museum / attraction'
  },
  point_of_interest: {
    category: 'point_of_interest',
    color: 'var(--amber)',
    label: 'Point of interest'
  }
};

export const NATURE_PRIMARY_TYPES = new Set([
  'park',
  'city_park',
  'national_park',
  'state_park',
  'wildlife_park',
  'wildlife_refuge',
  'garden',
  'botanical_garden',
  'dog_park',
  'picnic_ground',
  'hiking_area',
  'marina',
  'beach'
]);

export const CULTURE_PRIMARY_TYPES = new Set([
  'museum',
  'art_museum',
  'history_museum',
  'art_gallery',
  // 'tourist_attraction',
  'historical_landmark',
  'historical_place',
  'cultural_landmark',
  'monument',
  'sculpture',
  'castle',
  'fountain',
  'observation_deck',
  'plaza',
  'church',
  'place_of_worship',
  'cathedral',
  'synagogue',
  'mosque',
  'hindu_temple',
  'performing_arts_theater',
  'opera_house',
  'concert_hall',
  'cultural_center',
  'visitor_center',
  'library'
]);

export function resolvePlaceCategory(place: InterestingPlace): PlaceCategoryMeta {
  const primaryType = place.primaryType;

  if (!primaryType) {
    return PLACE_CATEGORY_META.point_of_interest;
  }

  if (NATURE_PRIMARY_TYPES.has(primaryType)) {
    return PLACE_CATEGORY_META.nature;
  }

  if (CULTURE_PRIMARY_TYPES.has(primaryType)) {
    return PLACE_CATEGORY_META.culture;
  }

  return PLACE_CATEGORY_META.point_of_interest;
}