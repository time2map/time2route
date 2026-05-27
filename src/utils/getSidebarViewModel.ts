import { getElevationInsight } from './elevationUtils';
import type { ActivityMode, ElevationStats, InterestingPlace } from './types';

type SidebarViewModelInput = {
  routeBuilt: boolean;
  mode: ActivityMode;
  from: string;
  to: string;
  routeInfo: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    elevation: ElevationStats | null;
    interestingPlaces: InterestingPlace[];
    errorMessage?: string;
  };
};

export function getSidebarViewModel({
  routeBuilt,
  mode,
  from,
  to,
  routeInfo
}: SidebarViewModelInput) {
  let modeLabel = 'cycling';
  let bestForValue = 'Cycling';
  if (mode === 'walk') {
    modeLabel = 'walking';
    bestForValue = 'Walking';
  }

  const sortedInterestingPlaces = [...routeInfo.interestingPlaces].sort(
    (firstPlace, secondPlace) =>
      (secondPlace.rating ?? Number.NEGATIVE_INFINITY) - (firstPlace.rating ?? Number.NEGATIVE_INFINITY)
  );

  const placesCount = routeInfo.interestingPlaces.length;
  const placesLabel = `${placesCount} interesting place${placesCount === 1 ? '' : 's'}`;
  const elevationBadgeLabel = routeInfo.elevation
    ? `${routeInfo.elevation.difficulty} elevation`
    : 'Elevation data unavailable';
  const bestForLabel = `Best for: ${bestForValue}`;
  const showRouteSkeleton =
    routeBuilt && Boolean(from.trim()) && Boolean(to.trim()) && routeInfo.status === 'loading';
  const showRouteError = routeInfo.status === 'error';
  const showPlacesPlaceholder =
    showRouteError || (routeInfo.status === 'ready' && sortedInterestingPlaces.length === 0);
  const placesPlaceholderMessage = showRouteError
    ? (routeInfo.errorMessage ?? 'Route not found')
    : 'No places found';
  const placesPlaceholderText = showRouteError
    ? 'Try another start point or destination.'
    : 'Try another route to discover places along the way.';
  const elevationPoints =
    routeInfo.elevation?.profile.map((point) => ({
      distanceKm: point.distanceKm,
      elevationM: point.elevationM
    })) ?? [];
  const elevationInsight = routeInfo.elevation
    ? getElevationInsight(routeInfo.elevation)
    : 'Elevation data will be available after route build.';
  const sheetTitle = routeBuilt ? 'Shortest route' : 'Plan your route';

  return {
    from,
    to,
    mode,
    modeLabel,
    bestForValue,
    placesLabel,
    elevationBadgeLabel,
    bestForLabel,
    showRouteSkeleton,
    showRouteError,
    showPlacesPlaceholder,
    placesPlaceholderMessage,
    placesPlaceholderText,
    elevationPoints,
    elevationInsight,
    sheetTitle,
    sortedInterestingPlaces
  };
}
