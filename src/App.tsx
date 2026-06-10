import { useCallback, useMemo, useRef, useState } from 'react';
import type { PlaceAutocompleteSelection } from './api/placeAutocomplete';
import './AppLayout.css';
import './AppLayout.mobile.css';
import { MapPane } from './components/MapPane';
import { Sidebar } from './components/Sidebar';
import { OfflineNetworkNotifier } from './components/OfflineNetworkNotifier';
import { ErrorToastProvider } from './context/ErrorToastContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useCustomRouteStopDetails } from './hooks/useCustomRouteStopDetails';
import { getDistanceAlongPolylineMeters } from './utils/routePolyline';
import { sortRouteStopsByPath } from './utils/routeStopOrder';
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
};

type MapPickTarget = 'start' | 'destination' | null;

const MAX_ROUTE_STOPS = 10;
const EMPTY_INTERMEDIATES: RouteIntermediatePoint[] = [];

function normalizeRouteStops(stops: RouteIntermediatePoint[]) {
  return stops.slice(0, MAX_ROUTE_STOPS);
}


function App() {
  const isOnline = useOnlineStatus();
  const [routeBuilt, setRouteBuilt] = useState(false);
  const [mode, setMode] = useState<ActivityMode>('walk');
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
  const [from, setFrom] = useState('Amsterdam Centraal');
  const [to, setTo] = useState('Vondelpark, Amsterdam');
  const [startPoint, setStartPoint] = useState<RouteEndpointPoint | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<RouteEndpointPoint | null>(null);
  const [mapPickMode, setMapPickMode] = useState(false);
  const [mapPickTarget, setMapPickTarget] = useState<MapPickTarget>(null);
  const [endpointSelectionPending, setEndpointSelectionPending] = useState(true);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
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

  const handleBuildRoute = useCallback(() => {
    if (!isOnline) return;

    setBuiltRouteParams({
      origin: from,
      destination: to,
      mode,
      intermediates: [],
      refreshPlaces: true
    });
    setBuildNonce((previous) => previous + 1);
    setRouteBuilt(true);
    setEndpointSelectionPending(false);
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
  }, [from, isOnline, mode, to]);

  const handleReset = useCallback(() => {
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
    setEndpointSelectionPending(true);
    setHighlightedRouteDistanceKm(null);
    setIsElevationChartFocused(false);
    setRouteChartZoomTarget(null);
    setRouteInfo({
      status: 'idle',
      distance: '—',
      duration: '—',
      elevation: null,
      interestingPlaces: [],
      routePath: []
    });
  }, []);

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
    setSelectedPlace(placeId);
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

  const handleMapPickSetStart = useCallback((point: RouteEndpointPoint) => {
    setStartPoint(point);
    setFrom(point.address);
    setMapPickMode(false);
    setMapPickTarget(null);
    setEndpointSelectionPending(true);
  }, []);

  const handleMapPickSetDestination = useCallback((point: RouteEndpointPoint) => {
    setDestinationPoint(point);
    setTo(point.address);
    setMapPickMode(false);
    setMapPickTarget(null);
    setEndpointSelectionPending(true);
  }, []);

  const handleFromChange = useCallback((value: string) => {
    setFrom(value);
    setEndpointSelectionPending(true);
    if (!value.trim()) {
      setStartPoint(null);
    }
  }, []);

  const handleToChange = useCallback((value: string) => {
    setTo(value);
    setEndpointSelectionPending(true);
    if (!value.trim()) {
      setDestinationPoint(null);
    }
  }, []);

  const handleFromPlaceSelect = useCallback((place: PlaceAutocompleteSelection) => {
    const address = place.address ?? place.name;
    setFrom(address);
    setStartPoint({ lat: place.lat, lng: place.lng, address });
    setMapPickMode(false);
    setMapPickTarget(null);
    setEndpointSelectionPending(true);
  }, []);

  const handleToPlaceSelect = useCallback((place: PlaceAutocompleteSelection) => {
    const address = place.address ?? place.name;
    setTo(address);
    setDestinationPoint({ lat: place.lat, lng: place.lng, address });
    setMapPickMode(false);
    setMapPickTarget(null);
    setEndpointSelectionPending(true);
  }, []);

  const handleSwapLocations = useCallback(() => {
    setFrom(to);
    setTo(from);
    setStartPoint(destinationPoint);
    setDestinationPoint(startPoint);
    setEndpointSelectionPending(true);
  }, [destinationPoint, from, startPoint, to]);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  const handleMapPickCancel = useCallback(() => {
    setMapPickMode(false);
    setMapPickTarget(null);
  }, []);

  const handleMapPickFocusTarget = useCallback((target: Exclude<MapPickTarget, null>) => {
    setMapPickTarget(target);
    setMapPickMode(true);
  }, []);

  const mapPickDirectFillTarget = useMemo((): MapPickTarget => {
    if (routeBuilt) return null;
    if (mapPickTarget === 'start' && !from.trim()) return 'start';
    if (mapPickTarget === 'destination' && !to.trim()) return 'destination';
    return null;
  }, [from, mapPickTarget, routeBuilt, to]);

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
    <ErrorToastProvider>
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
          onRemoveStop={handleRemovePlaceFromRoute}
          onStopHover={handleHoveredPlaceChange}
          hoveredStopId={hoveredPlaceId}
          onElevationPointHover={handleElevationPointHover}
          onElevationChartFocusChange={handleElevationChartFocusChange}
          onElevationPointClick={handleElevationPointClick}
          isOnline={isOnline}
        />
        <MapPane
          routeBuilt={routeBuilt}
          routeStatus={routeInfo.status}
          hideEndpointMarkers={routeInfo.status === 'ready' && !endpointSelectionPending}
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
        />
      </section>
    </main>
    </ErrorToastProvider>
  );
}

export default App;
