import { useState } from 'react';
import { usePlacePhotoCache } from '../hooks/usePlacePhotoCache';
import { getSidebarViewModel } from '../utils/getSidebarViewModel';
import { getGoogleMapsPlaceUrl } from '../utils/googleMapsPlaceUrl';
import type { ActivityMode, ElevationStats, InterestingPlace } from '../utils/types';
import { DesktopRouteSection } from './DesktopRouteSection';
import { MobileRouteSheet } from './MobileRouteSheet';
import { PlacesPanel } from './PlacesPanel';
import { RouteOverview } from './RouteOverview';
import { RoutePlannerForm } from './RoutePlannerForm';
import { SidebarLogo } from './SidebarLogo';

type SidebarTab = 'overview' | 'places';

type SidebarProps = {
  routeBuilt: boolean;
  mode: ActivityMode;
  activeTab: SidebarTab;
  selectedPlace: string | null;
  routeInfo: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    distance: string;
    duration: string;
    elevation: ElevationStats | null;
    interestingPlaces: InterestingPlace[];
    errorMessage?: string;
  };
  routeIntermediates: Array<{ id: string; lat: number; lng: number }>;
  from: string;
  to: string;
  mapPickMode: boolean;
  mapPickTarget: 'start' | 'destination' | null;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onModeChange: (value: ActivityMode) => void;
  onBuildRoute: () => void;
  onTabChange: (tab: SidebarTab) => void;
  onSelectPlace: (placeId: string) => void;
  onAddPlaceToRoute: (place: InterestingPlace) => void;
  onRemovePlaceFromRoute: (placeId: string) => void;
  onReset: () => void;
  onMapPickToggle: () => void;
  onMapPickFocusTarget: (target: 'start' | 'destination') => void;
};

export function Sidebar(props: Readonly<SidebarProps>) {
  const {
    routeBuilt,
    mode,
    activeTab,
    selectedPlace,
    routeInfo,
    routeIntermediates,
    from,
    to,
    mapPickMode,
    mapPickTarget,
    onFromChange,
    onToChange,
    onModeChange,
    onBuildRoute,
    onTabChange,
    onSelectPlace,
    onAddPlaceToRoute,
    onRemovePlaceFromRoute,
    onReset,
    onMapPickToggle,
    onMapPickFocusTarget
  } = props;

  const [isMobileSheetExpanded, setIsMobileSheetExpanded] = useState(true);
  const placePhotoCache = usePlacePhotoCache(selectedPlace, routeInfo.interestingPlaces);

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
    elevationInsight: viewModel.elevationInsight
  };

  const plannerFormProps = {
    from,
    to,
    mode,
    mapPickMode,
    mapPickTarget,
    onFromChange,
    onToChange,
    onModeChange,
    onBuildRoute,
    onMapPickToggle,
    onMapPickFocusTarget,
    onSwapLocations: () => {
      onFromChange(to);
      onToChange(from);
    }
  };

  const placesPanel = (
    <PlacesPanel
      places={viewModel.sortedInterestingPlaces}
      selectedPlace={selectedPlace}
      routeIntermediates={routeIntermediates}
      photoCache={placePhotoCache}
      showPlaceholder={viewModel.showPlacesPlaceholder}
      placeholderMessage={viewModel.placesPlaceholderMessage}
      placeholderText={viewModel.placesPlaceholderText}
      onSelectPlace={onSelectPlace}
      onAddToRoute={(placeId) => {
        const place = routeInfo.interestingPlaces.find((item) => item.id === placeId);
        if (!place) return;

        onAddPlaceToRoute(place);
      }}
      onRemoveFromRoute={onRemovePlaceFromRoute}
      onOpenInGoogleMaps={(placeId) => {
        const place = routeInfo.interestingPlaces.find((item) => item.id === placeId);
        if (!place) return;

        window.open(getGoogleMapsPlaceUrl(place), '_blank', 'noreferrer');
      }}
    />
  );

  return (
    <aside className="sidebar">
      <SidebarLogo />

      <RoutePlannerForm variant="desktop" {...plannerFormProps} />

      {routeBuilt && (
        <DesktopRouteSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          overview={<RouteOverview variant="desktop" {...routeOverviewProps} />}
          places={placesPanel}
        />
      )}

      <MobileRouteSheet
        expanded={isMobileSheetExpanded || Boolean(selectedPlace)}
        expandedSnap={selectedPlace ? 'middle' : 'intermediate'}
        routeBuilt={routeBuilt}
        activeTab={activeTab}
        title={viewModel.sheetTitle}
        onExpandedChange={setIsMobileSheetExpanded}
        planner={<RoutePlannerForm variant="mobile" {...plannerFormProps} />}
        overview={<RouteOverview variant="mobile" {...routeOverviewProps} onReset={onReset} />}
        places={placesPanel}
        onTabChange={onTabChange}
      />
    </aside>
  );
}
