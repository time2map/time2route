import { getRouteFitPadding } from './getRouteFitPadding';
import type { LatLng } from '../../utils/types';

export function fitMapToRoutePath(map: google.maps.Map, routePath: LatLng[]) {
  if (routePath.length < 2) {
    return;
  }

  const bounds = new google.maps.LatLngBounds();
  routePath.forEach((point) => {
    bounds.extend(point);
  });
  map.fitBounds(bounds, getRouteFitPadding(map));
}
