import { useMemo, useState } from 'react';
import { getSidebarViewModel } from '../utils/getSidebarViewModel';
import type { ActivityMode, ElevationStats, InterestingPlace } from '../utils/types';
import { DesktopRouteSection } from './DesktopRouteSection';
import { MobileRouteSheet } from './MobileRouteSheet';
import { RouteOverview } from './RouteOverview';
import { RoutePlannerForm } from './RoutePlannerForm';
import { SidebarLogo } from './SidebarLogo';
import type { PlaceAutocompleteSelection } from '../api/placeAutocomplete';

type SidebarProps = {
  routeBuilt: boolean;
  mode: ActivityMode;
  selectedPlace: string | null;
  routeInfo: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    distance: string;
    duration: string;
    elevation: ElevationStats | null;
    interestingPlaces: InterestingPlace[];
    routePath: Array<{ lat: number; lng: number }>;
    errorMessage?: string;
  };
  routeIntermediates: Array<{ id: string; lat: number; lng: number }>;
  routePlacesForStops: InterestingPlace[];
  from: string;
  to: string;
  map?: google.maps.Map | null;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onFromPlaceSelect?: (place: PlaceAutocompleteSelection) => void;
  onToPlaceSelect?: (place: PlaceAutocompleteSelection) => void;
  onSwapLocations: () => void;
  onModeChange: (value: ActivityMode) => void;
  onBuildRoute: () => void;
  onReset: () => void;
  onMapPickFocusTarget: (target: 'start' | 'destination') => void;
  onMapPickCancel: () => void;
  onRemoveStop: (placeId: string) => void;
  onStopHover?: (placeId: string | null) => void;
  hoveredStopId?: string | null;
  onElevationPointHover?: (index: number | null) => void;
  onElevationChartFocusChange?: (focused: boolean) => void;
  onElevationPointClick?: (index: number) => void;
};

export function Sidebar(props: Readonly<SidebarProps>) {
  const {
    routeBuilt,
    mode,
    selectedPlace,
    routeInfo,
    routeIntermediates,
    routePlacesForStops,
    from,
    to,
    map,
    onFromChange,
    onToChange,
    onFromPlaceSelect,
    onToPlaceSelect,
    onSwapLocations,
    onModeChange,
    onBuildRoute,
    onReset,
    onMapPickFocusTarget,
    onMapPickCancel,
    onRemoveStop,
    onStopHover,
    hoveredStopId,
    onElevationPointHover,
    onElevationChartFocusChange,
    onElevationPointClick
  } = props;

  const [isMobileSheetExpanded, setIsMobileSheetExpanded] = useState(true);

  const alongRoutePlaceIds = useMemo(
    () => new Set(routeInfo.interestingPlaces.map((place) => place.id)),
    [routeInfo.interestingPlaces]
  );

  const viewModel = getSidebarViewModel({
    routeBuilt,
    mode,
    from,
    to,
    routeInfo
  });

  const routeOverviewProps = {
    from: viewModel.from,
    to: viewModel.to,
    mode: viewModel.mode,
    modeLabel: viewModel.modeLabel,
    bestForValue: viewModel.bestForValue,
    placesLabel: viewModel.placesLabel,
    elevationBadgeLabel: viewModel.elevationBadgeLabel,
    bestForLabel: viewModel.bestForLabel,
    showRouteSkeleton: viewModel.showRouteSkeleton,
    showRouteError: viewModel.showRouteError,
    errorMessage: routeInfo.errorMessage,
    routeInfo,
    elevationPoints: viewModel.elevationPoints,
    elevationInsight: viewModel.elevationInsight,
    onElevationPointHover,
    onElevationChartFocusChange,
    onElevationPointClick
  };

  const plannerFormProps = {
    from,
    to,
    mode,
    map,
    onFromChange,
    onToChange,
    onFromPlaceSelect,
    onToPlaceSelect,
    onModeChange,
    onBuildRoute,
    onMapPickFocusTarget,
    onMapPickCancel,
    onSwapLocations,
    routeBuilt,
    routeStops: routeIntermediates,
    routePlaces: routePlacesForStops,
    routePath: routeInfo.routePath,
    alongRoutePlaceIds,
    onRemoveStop,
    onStopHover,
    hoveredStopId,
    onPlanNewRoute: onReset
  };

  return (
    <aside className={`sidebar${routeBuilt ? ' sidebar--route-built' : ''}`}>
      <SidebarLogo />

      <RoutePlannerForm
        variant="desktop"
        {...plannerFormProps}
      />

      {routeBuilt && (
        <DesktopRouteSection
          overview={
            <RouteOverview
              variant="desktop"
              {...routeOverviewProps}
            />
          }
          onReset={onReset}
        />
      )}

      <MobileRouteSheet
        expanded={isMobileSheetExpanded || Boolean(selectedPlace)}
        expandedSnap={selectedPlace ? 'middle' : 'intermediate'}
        routeBuilt={routeBuilt}
        title={viewModel.sheetTitle}
        onExpandedChange={setIsMobileSheetExpanded}
        planner={
          <RoutePlannerForm
            variant="mobile"
            {...plannerFormProps}
          />
        }
        overview={
          <RouteOverview
            variant="mobile"
            {...routeOverviewProps}
            onReset={onReset}
          />
        }
      />

    </aside>
  );
}
