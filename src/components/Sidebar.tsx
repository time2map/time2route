import { useEffect, useMemo, useRef } from 'react';
import type { ExpandedSheetSnap } from '../utils/mobileRouteSheetSnap';
import type { SearchHistoryEntry } from '../utils/searchHistory';
import { getSidebarViewModel } from '../utils/getSidebarViewModel';
import type { ActivityMode, ElevationStats, InterestingPlace } from '../utils/types';
import { DesktopRouteSection } from './DesktopRouteSection';
import { MobileRouteSheet } from './MobileRouteSheet';
import { RouteOverview } from './RouteOverview';
import { RoutePanelContent } from './RoutePanelContent';
import { RoutePlannerForm } from './RoutePlannerForm';
import { SidebarLogo } from './SidebarLogo';
import type { PlaceAutocompleteSelection } from '../api/placeAutocomplete';
import { useMediaQuery } from '../hooks/useMediaQuery';

const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

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
  mapPickTarget: 'start' | 'destination' | null;
  onRemoveStop: (placeId: string) => void;
  onStopHover?: (placeId: string | null) => void;
  onStopClick?: (placeId: string) => void;
  onRoutePointsClick?: () => void;
  hoveredStopId?: string | null;
  onElevationPointHover?: (index: number | null) => void;
  onElevationChartFocusChange?: (focused: boolean) => void;
  onElevationPointClick?: (index: number) => void;
  isOnline?: boolean;
  mobileSheetSnap: ExpandedSheetSnap;
  isMobileSheetExpanded: boolean;
  onMobileSheetExpandedChange: (expanded: boolean) => void;
  onMobileSheetSnapChange: (snap: ExpandedSheetSnap) => void;
  onSearchHistorySelect?: (entry: SearchHistoryEntry) => void;
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
    mapPickTarget,
    onRemoveStop,
    onStopHover,
    onStopClick,
    onRoutePointsClick,
    hoveredStopId,
    onElevationPointHover,
    onElevationChartFocusChange,
    onElevationPointClick,
    isOnline = true,
    mobileSheetSnap,
    isMobileSheetExpanded,
    onMobileSheetExpandedChange,
    onMobileSheetSnapChange,
    onSearchHistorySelect
  } = props;

  const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);
  const werePlannerFieldsFilledRef = useRef(false);

  useEffect(() => {
    if (!isMobile || routeBuilt || selectedPlace) {
      werePlannerFieldsFilledRef.current = false;
      return;
    }

    const bothFieldsFilled = Boolean(from.trim() && to.trim());
    const becameFilled = bothFieldsFilled && !werePlannerFieldsFilledRef.current;
    werePlannerFieldsFilledRef.current = bothFieldsFilled;

    if (becameFilled) {
      onMobileSheetSnapChange('intermediate');
      onMobileSheetExpandedChange(true);
    }
  }, [
    from,
    isMobile,
    onMobileSheetExpandedChange,
    onMobileSheetSnapChange,
    routeBuilt,
    selectedPlace,
    to
  ]);

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
    mapPickTarget,
    onSwapLocations,
    routeBuilt,
    routeStops: routeIntermediates,
    routePlaces: routePlacesForStops,
    routePath: routeInfo.routePath,
    alongRoutePlaceIds,
    onRemoveStop,
    onStopHover,
    onStopClick,
    onRoutePointsClick,
    hoveredStopId,
    selectedStopId: selectedPlace,
    onPlanNewRoute: onReset,
    isOnline,
    onCollapseMobileSheet: isMobile
      ? () => {
          onMobileSheetSnapChange('peek');
          onMobileSheetExpandedChange(true);
        }
      : undefined,
    onSearchHistorySelect,
    onExpandMobileSheetForInput: isMobile
      ? () => {
          onMobileSheetSnapChange('penultimate');
          onMobileSheetExpandedChange(true);
        }
      : undefined
  };

  const mobilePlanner = (
    <RoutePlannerForm
      variant="mobile"
      {...plannerFormProps}
      mobileSheetSnap={mobileSheetSnap}
      isMobileSheetExpanded={isMobileSheetExpanded}
    />
  );

  const mobileOverview = (
    <RouteOverview
      variant="mobile"
      {...routeOverviewProps}
      onReset={onReset}
    />
  );

  if (isMobile) {
    return (
      <aside className={`sidebar${routeBuilt ? ' sidebar--route-built' : ''}`}>
        <MobileRouteSheet
          expanded={isMobileSheetExpanded || Boolean(selectedPlace)}
          expandedSnap={selectedPlace ? 'markerSelected' : mobileSheetSnap}
          title={viewModel.sheetTitle}
          onExpandedChange={onMobileSheetExpandedChange}
          onSnapChange={onMobileSheetSnapChange}
          onReset={onReset}>
          <RoutePanelContent
            routeBuilt={routeBuilt}
            planner={mobilePlanner}
            overview={mobileOverview}
          />
        </MobileRouteSheet>
      </aside>
    );
  }

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
    </aside>
  );
}
