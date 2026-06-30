import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlaceAutocompleteSelection } from './api/placeAutocomplete';
import './AppLayout.css';
import './AppLayout.mobile.css';
import { MapPane } from './components/MapPane';
import { Sidebar } from './components/Sidebar';
import { OfflineNetworkNotifier } from './components/OfflineNetworkNotifier';
import { GreetingHintEffect } from './components/GreetingHintEffect';
import { RouteStopsHintEffect } from './components/RouteStopsHintEffect';
import { fitMapToRoutePath } from './hooks/map/fitMapToRoutePath';
import { useUserLocation } from './hooks/map/useUserLocation';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useErrorToast } from './context/ErrorToastContext';
import { useCustomRouteStopDetails } from './hooks/useCustomRouteStopDetails';
import { useRouteUrlSync } from './hooks/useRouteUrlSync';
import { getDistanceAlongPolylineMeters } from './utils/routePolyline';
import { sortRouteStopsByPath } from './utils/routeStopOrder';
import { blurRouteLocationInput } from './utils/locationInputs';
import { addSearchHistoryEntry } from './utils/searchHistory';
import { markGreetingCardDismissed } from './utils/greetingCard';
import { isMobileViewport, type ExpandedSheetSnap } from './utils/mobileRouteSheetSnap';
import { getInitialRouteFormStateFromUrl } from './utils/routeUrlState';
import { areRouteEndpointsEqual } from './utils/routeEndpoints';
import type { SearchHistoryEntry } from './utils/searchHistory';
import type { ActivityMode, ElevationStats, InterestingPlace, LatLng, RouteIntermediatePoint } from './utils/types';

type RouteInfo = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  distance: string;
  duration: string;
  elevation: ElevationStats | null;
  interestingPlaces: InterestingPlace[];
  routePath: LatLng[];
  errorMessage?: string;
};

type RouteEndpointPoint = {
  lat: number;
  lng: number;
  address: string;
  source?: 'current-location';
};

function isCurrentLocationPlace(place: PlaceAutocompleteSelection): boolean {
  return place.source === 'current-location' || place.id.startsWith('current-location-');
}

type MapPickTarget = 'start' | 'destination' | null;

const MAX_ROUTE_STOPS = 10;
const EMPTY_INTERMEDIATES: RouteIntermediatePoint[] = [];

function normalizeRouteStops(stops: RouteIntermediatePoint[]) {
  return stops.slice(0, MAX_ROUTE_STOPS);
}

const initialRouteFormState = getInitialRouteFormStateFromUrl();

function App() {
  const isOnline = useOnlineStatus();
  const { showErrorToast } = useErrorToast();
  const shouldAutoBuildRouteFromUrlRef = useRef(initialRouteFormState.shouldAutoBuild);
  const didAutoBuildRouteFromUrlRef = useRef(false);
  const [routeBuilt, setRouteBuilt] = useState(false);
  const [mode, setMode] = useState<ActivityMode>(initialRouteFormState.mode);
  const [buildNonce, setBuildNonce] = useState(0);
  const [builtRouteParams, setBuiltRouteParams] = useState<{
    origin: string;
    destination: string;
    mode: ActivityMode;
    intermediates: RouteIntermediatePoint[];
    refreshPlaces: boolean;
  } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [from, setFrom] = useState(initialRouteFormState.from);
  const [to, setTo] = useState(initialRouteFormState.to);
  const [startPoint, setStartPoint] = useState<RouteEndpointPoint | null>(initialRouteFormState.startPoint);
  const [destinationPoint, setDestinationPoint] = useState<RouteEndpointPoint | null>(
    initialRouteFormState.destinationPoint
  );
  const [mapPickMode, setMapPickMode] = useState(false);
  const [mapPickTarget, setMapPickTarget] = useState<MapPickTarget>(null);
  const [mobileExplicitMapPick, setMobileExplicitMapPick] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const { handleLocateUser, isLocating } = useUserLocation({
    mapRef,
    isReady: mapInstance !== null,
    autoLocateOnLoad: true
  });
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({
    status: 'idle',
    distance: '—',
    duration: '—',
    elevation: null,
    interestingPlaces: [],
    routePath: []
  });
  const [highlightedRouteDistanceKm, setHighlightedRouteDistanceKm] = useState<number | null>(
    null
  );
  const [isElevationChartFocused, setIsElevationChartFocused] = useState(false);
  const [routeChartZoomTarget, setRouteChartZoomTarget] = useState<{
    distanceKm: number;
    key: number;
  } | null>(null);
  const [mobileSheetSnap, setMobileSheetSnap] = useState<ExpandedSheetSnap>('peek');
  const [isMobileSheetExpanded, setIsMobileSheetExpanded] = useState(true);
  const [routeStopsHintActive, setRouteStopsHintActive] = useState(false);
  const [greetingHighlightActive, setGreetingHighlightActive] = useState(false);

  const dismissGreeting = useCallback(() => {
    markGreetingCardDismissed();
    setGreetingHighlightActive(false);
  }, []);

  const dismissRouteStopsHint = useCallback(() => {
    setRouteStopsHintActive(false);
  }, []);

  const showDuplicateEndpointError = useCallback(() => {
    showErrorToast({
      variant: 'error',
      title: 'Start and destination must differ',
      message: 'Choose two different locations for your route.'
    });
  }, [showErrorToast]);

  const hasDuplicateRouteEndpoints = useMemo(
    () => areRouteEndpointsEqual(startPoint, destinationPoint),
    [destinationPoint, startPoint]
  );

  const triggerRouteBuild = useCallback(
    (options?: { refreshPlaces?: boolean; recordHistory?: boolean }) => {
      if (!isOnline || hasDuplicateRouteEndpoints) return;

      const refreshPlaces = options?.refreshPlaces ?? true;
      const recordHistory = options?.recordHistory ?? true;

      if (recordHistory) {
        addSearchHistoryEntry({
          from,
          to,
          mode,
          fromLat: startPoint?.lat,
          fromLng: startPoint?.lng,
          toLat: destinationPoint?.lat,
          toLng: destinationPoint?.lng
        });
      }

      setBuiltRouteParams({
        origin: from,
        destination: to,
        mode,
        intermediates: [],
        refreshPlaces
      });
      setBuildNonce((previous) => previous + 1);
      setRouteBuilt(true);
      setHighlightedRouteDistanceKm(null);
      setIsElevationChartFocused(false);
      setRouteChartZoomTarget(null);
      setRouteInfo({
        status: 'loading',
        distance: '—',
        duration: '—',
        elevation: null,
        interestingPlaces: [],
        routePath: []
      });
      setMobileSheetSnap('peek');
      setIsMobileSheetExpanded(true);
    },
    [destinationPoint, from, hasDuplicateRouteEndpoints, isOnline, mode, startPoint, to]
  );

  const handleBuildRoute = useCallback(() => {
    triggerRouteBuild();
  }, [triggerRouteBuild]);

  useEffect(() => {
    if (!shouldAutoBuildRouteFromUrlRef.current || didAutoBuildRouteFromUrlRef.current || !isOnline) {
      return;
    }

    didAutoBuildRouteFromUrlRef.current = true;
    triggerRouteBuild({ recordHistory: false });
  }, [isOnline, triggerRouteBuild]);

  useRouteUrlSync({
    routeBuilt,
    from,
    to,
    startPoint,
    destinationPoint,
    mode: builtRouteParams?.mode ?? mode
  });

  const handleReset = useCallback(() => {
    dismissRouteStopsHint();
    setRouteBuilt(false);
    setBuiltRouteParams(null);
    setSelectedPlace(null);
    setHoveredPlaceId(null);
    setFrom('');
    setTo('');
    setStartPoint(null);
    setDestinationPoint(null);
    setMapPickMode(false);
    setMapPickTarget(null);
    setMobileExplicitMapPick(false);
    setHighlightedRouteDistanceKm(null);
    setIsElevationChartFocused(false);
    setRouteChartZoomTarget(null);
    setMobileSheetSnap('peek');
    setIsMobileSheetExpanded(true);
    setRouteInfo({
      status: 'idle',
      distance: '—',
      duration: '—',
      elevation: null,
      interestingPlaces: [],
      routePath: []
    });
  }, [dismissRouteStopsHint]);

  const elevationProfileRef = useRef(routeInfo.elevation?.profile);
  elevationProfileRef.current = routeInfo.elevation?.profile;
  const handleElevationChartFocusChange = useCallback((focused: boolean) => {
    setIsElevationChartFocused(focused);
    if (!focused) {
      setHighlightedRouteDistanceKm(null);
    }
  }, []);

  const handleElevationPointClick = useCallback((index: number) => {
    const distanceKm = elevationProfileRef.current?.[index]?.distanceKm;
    if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) {
      return;
    }

    setIsElevationChartFocused(true);
    setHighlightedRouteDistanceKm(distanceKm);
    setRouteChartZoomTarget({ distanceKm, key: Date.now() });
  }, []);

  const handleElevationPointHover = useCallback((index: number | null) => {
    setHighlightedRouteDistanceKm((previous) => {
      if (index === null) {
        return previous === null ? previous : null;
      }

      const distanceKm = elevationProfileRef.current?.[index]?.distanceKm;
      if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) {
        return previous === null ? previous : null;
      }

      return previous === distanceKm ? previous : distanceKm;
    });
  }, []);

  const handleSelectPlace = useCallback((placeId: string | null) => {
    if (placeId) {
      dismissRouteStopsHint();
    }

    setSelectedPlace(placeId);

    if (placeId) {
      setMobileSheetSnap('peek');
      setIsMobileSheetExpanded(false);
    }
  }, [dismissRouteStopsHint]);

  const handleRoutePointsClick = useCallback(() => {
    if (!mapInstance || routeInfo.routePath.length < 2) {
      return;
    }

    setSelectedPlace(null);
    fitMapToRoutePath(mapInstance, routeInfo.routePath);
  }, [mapInstance, routeInfo.routePath]);

  const handleCollapseMobileSheetToPeek = useCallback(() => {
    setMobileSheetSnap('peek');
    setIsMobileSheetExpanded(true);
  }, []);

  const handleMapUserMove = handleCollapseMobileSheetToPeek;

  const handleSearchHistorySelect = useCallback((entry: SearchHistoryEntry) => {
    setFrom(entry.from);
    setTo(entry.to);
    setMode(entry.mode);

    if (
      typeof entry.fromLat === 'number' &&
      typeof entry.fromLng === 'number' &&
      Number.isFinite(entry.fromLat) &&
      Number.isFinite(entry.fromLng)
    ) {
      setStartPoint({ lat: entry.fromLat, lng: entry.fromLng, address: entry.from });
    } else {
      setStartPoint(null);
    }

    if (
      typeof entry.toLat === 'number' &&
      typeof entry.toLng === 'number' &&
      Number.isFinite(entry.toLat) &&
      Number.isFinite(entry.toLng)
    ) {
      setDestinationPoint({ lat: entry.toLat, lng: entry.toLng, address: entry.to });
    } else {
      setDestinationPoint(null);
    }

    setMapPickMode(false);
    setMapPickTarget(null);
  }, []);

  const handleHoveredPlaceChange = useCallback((placeId: string | null) => {
    setHoveredPlaceId(placeId);
  }, []);

  const handleAddPlaceToRoute = useCallback((place: InterestingPlace) => {
    if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) {
      console.warn('Invalid place coordinates', place);
      return;
    }

    const baseRouteParams = builtRouteParams ?? {
      origin: from,
      destination: to,
      mode,
      intermediates: EMPTY_INTERMEDIATES,
      refreshPlaces: true
    };
    const alreadyAdded = baseRouteParams.intermediates.some((point) => point.id === place.id);
    if (alreadyAdded) {
      return;
    }

    if (baseRouteParams.intermediates.length >= MAX_ROUTE_STOPS) {
      console.warn('Maximum route stops reached');
      return;
    }

    const routePath = routeInfo.routePath;
    const routeOrderM =
      place.routeOrderM ??
      (routePath.length >= 2
        ? Math.round(getDistanceAlongPolylineMeters({ lat: place.lat, lng: place.lng }, routePath))
        : undefined);

    const nextIntermediates = sortRouteStopsByPath(
      [
        ...baseRouteParams.intermediates,
        {
          id: place.id,
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          routeOrderM
        }
      ],
      routePath
    );

    setBuiltRouteParams({
      ...baseRouteParams,
      origin: from,
      destination: to,
      mode,
      intermediates: normalizeRouteStops(nextIntermediates),
      refreshPlaces: false
    });
    setBuildNonce((previous) => previous + 1);
    setRouteBuilt(true);
    setRouteInfo((previous) => ({
      ...previous,
      status: 'loading',
      distance: '—',
      duration: '—',
      elevation: null,
      errorMessage: undefined
    }));
  }, [builtRouteParams, from, mode, routeInfo.routePath, to]);

  const handleRemovePlaceFromRoute = useCallback((placeId: string) => {
    if (!builtRouteParams) return;

    const nextIntermediates = builtRouteParams.intermediates.filter(
      (point) => point.id !== placeId
    );

    setBuiltRouteParams({
      ...builtRouteParams,
      intermediates: nextIntermediates,
      refreshPlaces: false
    });

    setBuildNonce((previous) => previous + 1);

    setRouteInfo((previous) => ({
      ...previous,
      status: 'loading',
      distance: '—',
      duration: '—',
      elevation: null,
      errorMessage: undefined
    }));
  }, [builtRouteParams]);

  const expandMobileSheetForPlanner = useCallback(() => {
    if (!isMobileViewport()) {
      return;
    }

    setMobileSheetSnap('penultimate');
    setIsMobileSheetExpanded(true);
  }, []);

  const finishMobileMapPick = useCallback(() => {
    setMobileExplicitMapPick(false);
    expandMobileSheetForPlanner();
  }, [expandMobileSheetForPlanner]);

  const handleMapPickSetStart = useCallback((point: RouteEndpointPoint) => {
    if (areRouteEndpointsEqual(point, destinationPoint)) {
      showDuplicateEndpointError();
      return;
    }

    setStartPoint(point);
    setFrom(point.address);
    blurRouteLocationInput('start');

    if (mobileExplicitMapPick) {
      setMapPickMode(false);
      setMapPickTarget(null);
      finishMobileMapPick();
      return;
    }

    if (!to.trim()) {
      setMapPickTarget('destination');
      setMapPickMode(true);
      return;
    }

    setMapPickMode(false);
    setMapPickTarget(null);
  }, [destinationPoint, finishMobileMapPick, mobileExplicitMapPick, showDuplicateEndpointError, to]);

  const handleMapPickSetDestination = useCallback((point: RouteEndpointPoint) => {
    if (areRouteEndpointsEqual(point, startPoint)) {
      showDuplicateEndpointError();
      return;
    }

    setDestinationPoint(point);
    setTo(point.address);
    blurRouteLocationInput('destination');
    setMapPickMode(false);
    setMapPickTarget(null);

    if (mobileExplicitMapPick) {
      finishMobileMapPick();
    }
  }, [finishMobileMapPick, mobileExplicitMapPick, showDuplicateEndpointError, startPoint]);

  const handleFromChange = useCallback((value: string) => {
    setFrom(value);
    if (!value.trim()) {
      setStartPoint(null);
    }
  }, []);

  const handleToChange = useCallback((value: string) => {
    setTo(value);
    if (!value.trim()) {
      setDestinationPoint(null);
    }
  }, []);

  const handleFromPlaceSelect = useCallback((place: PlaceAutocompleteSelection) => {
    if (areRouteEndpointsEqual(place, destinationPoint)) {
      showDuplicateEndpointError();
      return;
    }

    const address = place.address ?? place.name;
    setFrom(address);
    setStartPoint({
      lat: place.lat,
      lng: place.lng,
      address,
      source: isCurrentLocationPlace(place) ? 'current-location' : undefined
    });
    setMapPickMode(false);
    setMapPickTarget(null);
  }, [destinationPoint, showDuplicateEndpointError]);

  const handleToPlaceSelect = useCallback((place: PlaceAutocompleteSelection) => {
    if (areRouteEndpointsEqual(place, startPoint)) {
      showDuplicateEndpointError();
      return;
    }

    const address = place.address ?? place.name;
    setTo(address);
    setDestinationPoint({
      lat: place.lat,
      lng: place.lng,
      address,
      source: isCurrentLocationPlace(place) ? 'current-location' : undefined
    });
    setMapPickMode(false);
    setMapPickTarget(null);
  }, [showDuplicateEndpointError, startPoint]);

  const handleSwapLocations = useCallback(() => {
    setFrom(to);
    setTo(from);
    setStartPoint(destinationPoint);
    setDestinationPoint(startPoint);
  }, [destinationPoint, from, startPoint, to]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapInstance(map);
  }, []);

  const handleMapPickCancel = useCallback(() => {
    setMapPickMode(false);
    setMapPickTarget(null);
    setMobileExplicitMapPick(false);
  }, []);

  const handleMapPickFocusTarget = useCallback((target: Exclude<MapPickTarget, null>) => {
    setMapPickTarget(target);
    setMapPickMode(true);
  }, []);

  const handleMobileMapPickActivate = useCallback(() => {
    setMobileExplicitMapPick(true);
  }, []);

  const mapPickDirectFillTarget = useMemo((): MapPickTarget => {
    if (routeBuilt || !mapPickTarget) {
      return null;
    }

    const isDirectFillActive = isMobileViewport() ? mobileExplicitMapPick : mapPickMode;
    if (!isDirectFillActive) {
      return null;
    }

    if (mapPickTarget === 'start' && !from.trim()) {
      return 'start';
    }

    if (mapPickTarget === 'destination' && !to.trim()) {
      return 'destination';
    }

    return null;
  }, [from, mapPickMode, mapPickTarget, mobileExplicitMapPick, routeBuilt, to]);

  const routeIntermediates = builtRouteParams?.intermediates ?? EMPTY_INTERMEDIATES;
  const { customStopPlaces } = useCustomRouteStopDetails(
    routeIntermediates,
    routeInfo.interestingPlaces
  );
  const routePlacesForStops = useMemo(() => {
    const byId = new Map(routeInfo.interestingPlaces.map((place) => [place.id, place]));
    for (const place of customStopPlaces) {
      byId.set(place.id, place);
    }
    return [...byId.values()];
  }, [customStopPlaces, routeInfo.interestingPlaces]);

  return (
    <>
      <GreetingHintEffect
        routeBuilt={routeBuilt}
        mapReady={mapInstance !== null}
        onGreetingActiveChange={setGreetingHighlightActive}
        onMobileSheetSnapChange={setMobileSheetSnap}
        onMobileSheetExpandedChange={setIsMobileSheetExpanded}
      />
      <RouteStopsHintEffect
        routeBuilt={routeBuilt}
        routeStatus={routeInfo.status}
        interestingPlacesCount={routeInfo.interestingPlaces.length}
        onHintActiveChange={setRouteStopsHintActive}
      />
      <OfflineNetworkNotifier />
      <main className={`app-shell ${routeBuilt ? 'app-state-route' : 'app-state-empty'}`}>
      <section className="main-area">
        <Sidebar
          routeBuilt={routeBuilt}
          mode={mode}
          selectedPlace={selectedPlace}
          routeInfo={routeInfo}
          routeIntermediates={routeIntermediates}
          routePlacesForStops={routePlacesForStops}
          from={from}
          to={to}
          map={mapInstance}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          onFromPlaceSelect={handleFromPlaceSelect}
          onToPlaceSelect={handleToPlaceSelect}
          onSwapLocations={handleSwapLocations}
          onModeChange={setMode}
          onBuildRoute={handleBuildRoute}
          onReset={handleReset}
          onMapPickFocusTarget={handleMapPickFocusTarget}
          onMapPickCancel={handleMapPickCancel}
          onMobileMapPickActivate={handleMobileMapPickActivate}
          mapPickHighlightTarget={mapPickDirectFillTarget}
          onRemoveStop={handleRemovePlaceFromRoute}
          onStopHover={handleHoveredPlaceChange}
          onStopClick={handleSelectPlace}
          onRoutePointsClick={handleRoutePointsClick}
          hoveredStopId={hoveredPlaceId}
          onElevationPointHover={handleElevationPointHover}
          onElevationChartFocusChange={handleElevationChartFocusChange}
          onElevationPointClick={handleElevationPointClick}
          isOnline={isOnline}
          mobileSheetSnap={mobileSheetSnap}
          isMobileSheetExpanded={isMobileSheetExpanded}
          onMobileSheetExpandedChange={setIsMobileSheetExpanded}
          onMobileSheetSnapChange={setMobileSheetSnap}
          onSearchHistorySelect={handleSearchHistorySelect}
          fromSelected={startPoint !== null && Boolean(from.trim())}
          toSelected={destinationPoint !== null && Boolean(to.trim())}
          fromIsCurrentLocation={startPoint?.source === 'current-location'}
          toIsCurrentLocation={destinationPoint?.source === 'current-location'}
          hasDuplicateRouteEndpoints={hasDuplicateRouteEndpoints}
          greetingHighlightActive={greetingHighlightActive}
          onDismissGreeting={dismissGreeting}
          onLocateUser={handleLocateUser}
          isLocating={isLocating}
        />
        <MapPane
          routeBuilt={routeBuilt}
          routeStatus={routeInfo.status}
          buildNonce={buildNonce}
          mode={builtRouteParams?.mode ?? mode}
          origin={builtRouteParams?.origin ?? ''}
          destination={builtRouteParams?.destination ?? ''}
          intermediates={builtRouteParams?.intermediates ?? EMPTY_INTERMEDIATES}
          refreshPlaces={builtRouteParams?.refreshPlaces ?? true}
          routePlaces={routeInfo.interestingPlaces}
          customStopPlaces={customStopPlaces}
          selectedPlace={selectedPlace}
          hoveredPlaceId={hoveredPlaceId}
          onHoveredPlaceChange={handleHoveredPlaceChange}
          mapPickMode={mapPickMode}
          mapPickDirectFillTarget={mapPickDirectFillTarget}
          startPoint={startPoint}
          destinationPoint={destinationPoint}
          onRouteInfoChange={setRouteInfo}
          onMapPickSetStart={handleMapPickSetStart}
          onMapPickSetDestination={handleMapPickSetDestination}
          onMapPickCancel={handleMapPickCancel}
          onMapReady={handleMapReady}
          onSelectPlace={handleSelectPlace}
          onAddPlaceToRoute={handleAddPlaceToRoute}
          onRemovePlaceFromRoute={handleRemovePlaceFromRoute}
          highlightedRouteDistanceKm={highlightedRouteDistanceKm}
          elevationChartFocused={isElevationChartFocused}
          routeChartZoomTarget={routeChartZoomTarget}
          onMapUserMove={handleMapUserMove}
          onCollapseMobileSheet={handleCollapseMobileSheetToPeek}
          routeStopsHintActive={routeStopsHintActive}
          onLocateUser={handleLocateUser}
          isLocating={isLocating}
        />
      </section>
    </main>
    </>
  );
}

export default App;
