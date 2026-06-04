import { resolvePlaceCategory } from './poiTypes';
import type { InterestingPlace } from './types';

export type RouteStopCategoryVariant = 'nature' | 'culture' | 'poi';

export function resolveRouteStopCategoryVariant(
  place: InterestingPlace | undefined
): RouteStopCategoryVariant {
  const category = place ? resolvePlaceCategory(place).category : 'point_of_interest';
  if (category === 'nature') return 'nature';
  if (category === 'culture') return 'culture';
  return 'poi';
}

export function resolveRouteStopCategoryColor(place: InterestingPlace | undefined): string {
  return resolvePlaceCategory(
    place ?? { id: '', name: '', lat: 0, lng: 0, primaryType: 'point_of_interest' }
  ).color;
}

/** CSS classes for `.rp-stop-icon` — category ring + matching core when added manually. */
export function resolveRouteStopIconClass(
  stopId: string,
  place: InterestingPlace | undefined,
  alongRoutePlaceIds: ReadonlySet<string>
): string {
  const variant = resolveRouteStopCategoryVariant(place);
  const base = `stop-${variant}`;
  if (!alongRoutePlaceIds.has(stopId)) {
    return `${base} stop-added`;
  }
  return base;
}
