import { useCallback, useState } from 'react';
import type { PlaceAutocompleteSelection } from './api/placeAutocomplete';
import './AppLayout.css';
import './AppLayout.mobile.css';
import { MapPane } from './components/MapPane';
import { Sidebar } from './components/Sidebar';
import type { ActivityMode, ElevationStats, InterestingPlace, RouteIntermediatePoint } from './utils/types';

type RouteInfo = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  distance: string;
  duration: string;
  elevation: ElevationStats | null;
  interestingPlaces: InterestingPlace[];
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

function sortStopsByRouteOrder(stops: RouteIntermediatePoint[]) {
  const allHaveOrder = stops.every((stop) => typeof stop.routeOrderM === 'number');
  if (!allHaveOrder) {
    return stops;
  }

  return [...stops].sort((a, b) => (a.routeOrderM ?? 0) - (b.routeOrderM ?? 0));
}

function App() {
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
  const [activeTab, setActiveTab] = useState<'overview' | 'places'>('overview');
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
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
    interestingPlaces: []
  });

  const handleBuildRoute = useCallback(() => {
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
    setActiveTab('overview');
    setRouteInfo({
      status: 'loading',
      distance: '—',
      duration: '—',
      elevation: null,
      interestingPlaces: []
    });
  }, [from, to, mode]);

  const handleReset = useCallback(() => {
    setRouteBuilt(false);
    setBuiltRouteParams(null);
    setSelectedPlace(null);
    setActiveTab('overview');
    setFrom('');
    setTo('');
    setStartPoint(null);
    setDestinationPoint(null);
    setMapPickMode(false);
    setMapPickTarget(null);
    setEndpointSelectionPending(true);
    setRouteInfo({
      status: 'idle',
      distance: '—',
      duration: '—',
      elevation: null,
      interestingPlaces: []
    });
  }, []);

  const handleSelectPlace = useCallback((placeId: string) => {
    setSelectedPlace(placeId);
    setActiveTab('places');
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

    const nextIntermediates = sortStopsByRouteOrder([
      ...baseRouteParams.intermediates,
      {
        id: place.id,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        routeOrderM: place.routeOrderM
      }
    ]);

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
  }, [builtRouteParams, from, mode, to]);

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

  const handleMapPickToggle = useCallback(() => {
    setMapPickMode((prev) => {
      const next = !prev;
      if (!next) {
        setMapPickTarget(null);
      }
      return next;
    });
  }, []);

  const handleMapPickFocusTarget = useCallback((target: Exclude<MapPickTarget, null>) => {
    setMapPickTarget(target);
    setMapPickMode(true);
  }, []);

  return (
    <main className={`app-shell ${routeBuilt ? 'app-state-route' : 'app-state-empty'}`}>
      <section className="main-area">
        <Sidebar
          routeBuilt={routeBuilt}
          mode={mode}
          activeTab={activeTab}
          selectedPlace={selectedPlace}
          routeInfo={routeInfo}
          routeIntermediates={builtRouteParams?.intermediates ?? EMPTY_INTERMEDIATES}
          from={from}
          to={to}
          mapPickMode={mapPickMode}
          mapPickTarget={mapPickTarget}
          map={mapInstance}
          onFromChange={handleFromChange}
          onToChange={handleToChange}
          onFromPlaceSelect={handleFromPlaceSelect}
          onToPlaceSelect={handleToPlaceSelect}
          onSwapLocations={handleSwapLocations}
          onModeChange={setMode}
          onBuildRoute={handleBuildRoute}
          onTabChange={setActiveTab}
          onSelectPlace={handleSelectPlace}
          onAddPlaceToRoute={handleAddPlaceToRoute}
          onRemovePlaceFromRoute={handleRemovePlaceFromRoute}
          onReset={handleReset}
          onMapPickToggle={handleMapPickToggle}
          onMapPickFocusTarget={handleMapPickFocusTarget}
          onMapPickCancel={handleMapPickCancel}
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
          selectedPlace={selectedPlace}
          mapPickMode={mapPickMode}
          mapPickTarget={mapPickTarget}
          startPoint={startPoint}
          destinationPoint={destinationPoint}
          onSelectPlace={handleSelectPlace}
          onRouteInfoChange={setRouteInfo}
          onMapPickSetStart={handleMapPickSetStart}
          onMapPickSetDestination={handleMapPickSetDestination}
          onMapPickCancel={handleMapPickCancel}
          onMapReady={handleMapReady}
        />
      </section>
    </main>
  );
}

export default App;
