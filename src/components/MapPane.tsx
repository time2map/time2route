import { useEffect, useRef } from 'react';
import type { ActivityMode, ElevationStats, InterestingPlace, RouteIntermediatePoint } from '../utils/types';
import { MapAreaSearch } from './MapAreaSearch';
import { MapMyLocationButton } from './MapMyLocationButton';
import { useGoogleMapInit } from '../hooks/map/useGoogleMapInit';
import { useMapClickHandling } from '../hooks/map/useMapClickHandling';
import { useRouteBuilder } from '../hooks/map/useRouteBuilder';
import { useRouteProgressHighlight } from '../hooks/map/useRouteProgressHighlight';
import { usePlaceMarkers } from '../hooks/map/usePlaceMarkers';
import { useCustomRouteStopMarkers } from '../hooks/map/useCustomRouteStopMarkers';
import { useEndpointMarkers } from '../hooks/map/useEndpointMarkers';
import { useMapViewport } from '../hooks/map/useMapViewport';
import { useMapPickPopup } from '../hooks/map/useMapPickPopup';
import { useUserLocation } from '../hooks/map/useUserLocation';
import { useMapDragCollapseSheet } from '../hooks/map/useMapDragCollapseSheet';
import { useMapMarkerVisibility } from '../hooks/map/useMapMarkerVisibility';
import { resolveGoogleMapId } from '../hooks/map/mapPaneConstants';
import type { RouteEndpointPoint } from '../hooks/map/mapPaneTypes';

const modeLabel: Record<ActivityMode, string> = {
  walk: 'Walking',
  bike: 'Cycling'
};

export type MapPaneProps = {
  routeBuilt: boolean;
  routeStatus: 'idle' | 'loading' | 'ready' | 'error';
  buildNonce: number;
  mode: ActivityMode;
  origin: string;
  destination: string;
  intermediates: RouteIntermediatePoint[];
  refreshPlaces: boolean;
  routePlaces: InterestingPlace[];
  customStopPlaces: InterestingPlace[];
  selectedPlace: string | null;
  hoveredPlaceId: string | null;
  onHoveredPlaceChange?: (placeId: string | null) => void;
  mapPickMode: boolean;
  mapPickDirectFillTarget: 'start' | 'destination' | null;
  startPoint: RouteEndpointPoint | null;
  destinationPoint: RouteEndpointPoint | null;
  onRouteInfoChange: (routeInfo: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    distance: string;
    duration: string;
    elevation: ElevationStats | null;
    interestingPlaces: InterestingPlace[];
    routePath: Array<{ lat: number; lng: number }>;
    errorMessage?: string;
  }) => void;
  onMapPickSetStart: (point: RouteEndpointPoint) => void;
  onMapPickSetDestination: (point: RouteEndpointPoint) => void;
  onMapPickCancel: () => void;
  onMapReady?: (map: google.maps.Map) => void;
  onSelectPlace: (placeId: string | null) => void;
  onAddPlaceToRoute: (place: InterestingPlace) => void;
  onRemovePlaceFromRoute: (placeId: string) => void;
  highlightedRouteDistanceKm: number | null;
  elevationChartFocused: boolean;
  routeChartZoomTarget: { distanceKm: number; key: number } | null;
  onMapUserMove?: () => void;
  onCollapseMobileSheet?: () => void;
  routeStopsHintActive?: boolean;
};

export function MapPane(props: Readonly<MapPaneProps>) {
  const {
    routeBuilt,
    routeStatus,
    buildNonce,
    mode,
    origin,
    destination,
    intermediates,
    refreshPlaces,
    routePlaces,
    customStopPlaces,
    selectedPlace,
    hoveredPlaceId,
    onHoveredPlaceChange,
    mapPickMode,
    mapPickDirectFillTarget,
    startPoint,
    destinationPoint,
    onRouteInfoChange,
    onMapPickSetStart,
    onMapPickSetDestination,
    onMapPickCancel,
    onMapReady,
    onSelectPlace,
    onAddPlaceToRoute,
    onRemovePlaceFromRoute,
    highlightedRouteDistanceKm,
    elevationChartFocused,
    routeChartZoomTarget,
    onMapUserMove,
    onCollapseMobileSheet,
    routeStopsHintActive = false
  } = props;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const mapId = resolveGoogleMapId(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined);

  const lastRoutePathRef = useRef<google.maps.LatLngLiteral[]>([]);
  const closePlacePopupRef = useRef<() => void>(() => {});

  const { mapContainerRef, mapRef, map, isReady } = useGoogleMapInit({ apiKey, mapId, onMapReady });

  useMapDragCollapseSheet(map, onMapUserMove);

  const click = useMapClickHandling({
    map,
    mapContainerRef,
    isReady,
    routeBuilt,
    mapPickMode,
    mapPickDirectFillTarget,
    onMapPickSetStart,
    onMapPickSetDestination,
    onMapPickCancel,
    closePlacePopup: () => closePlacePopupRef.current()
  });

  const places = usePlaceMarkers({
    map,
    routeBuilt,
    routePlaces,
    customStopPlaces,
    intermediates,
    selectedPlace,
    hoveredPlaceId,
    onSelectPlace,
    onHoveredPlaceChange,
    onAddPlaceToRoute,
    onRemovePlaceFromRoute,
    clearPickMarker: click.clearPickMarker,
    routeStopsHintActive
  });

  useEffect(() => {
    closePlacePopupRef.current = places.closePlacePopup;
  }, [places.closePlacePopup]);

  const { fitRoute, zoomToDistance } = useMapViewport({ map, lastRoutePathRef });

  const { clearRouteProgressHighlight } = useRouteProgressHighlight({
    map,
    isReady,
    mode,
    elevationChartFocused,
    highlightedRouteDistanceKm,
    lastRoutePathRef
  });

  const { distanceLabel } = useRouteBuilder({
    map,
    apiKey,
    routeBuilt,
    buildNonce,
    mode,
    origin,
    destination,
    intermediates,
    refreshPlaces,
    onRouteInfoChange,
    fitRoute,
    clearPlaceMarkers: places.clearPlaceMarkers,
    clearCustomRouteStopMarkers: places.clearCustomRouteStopMarkers,
    clearRouteProgressHighlight,
    createPlaceMarkers: places.createPlaceMarkers,
    placeMarkersRef: places.placeMarkersRef,
    routePlacesRef: places.routePlacesRef,
    placePopupIdRef: places.placePopupIdRef,
    selectedPlaceRef: places.selectedPlaceRef,
    hoveredPlaceIdRef: places.hoveredPlaceIdRef,
    placePhotoCacheRef: places.placePhotoCacheRef,
    handlePlaceMarkerClickRef: places.handlePlaceMarkerClickRef,
    handlePlaceMarkerHoverRef: places.handlePlaceMarkerHoverRef,
    handlePlacePopupActionRef: places.handlePlacePopupActionRef,
    lastRoutePathRef
  });

  useCustomRouteStopMarkers({
    map,
    isReady,
    routeBuilt,
    intermediates,
    routePlaces,
    customStopPlaces,
    elevationChartFocused,
    customRouteStopMarkersRef: places.customRouteStopMarkersRef,
    clearCustomRouteStopMarkers: places.clearCustomRouteStopMarkers,
    syncCustomRouteStopMarkerElements: places.syncCustomRouteStopMarkerElements
  });

  useEndpointMarkers({
    map,
    elevationChartFocused,
    routeStatus,
    startPoint,
    destinationPoint
  });

  useMapPickPopup({
    pickPinElRef: click.pickPinElRef,
    mapPick: click.mapPick,
    routeBuilt,
    intermediates,
    ignoreNextClick: click.ignoreNextClick,
    clearPickMarker: click.clearPickMarker,
    onMapPickCancel,
    onMapPickSetStart,
    onMapPickSetDestination,
    onAddPlaceToRoute
  });

  const { handleLocateUser, isLocating } = useUserLocation({
    mapRef,
    isReady,
    autoLocateOnLoad: true
  });

  useMapMarkerVisibility({
    map,
    isReady,
    elevationChartFocused,
    mapPick: click.mapPick,
    placeMarkersRef: places.placeMarkersRef,
    customRouteStopMarkersRef: places.customRouteStopMarkersRef,
    pickMarkerRef: click.pickMarkerRef
  });

  useEffect(() => {
    if (!routeChartZoomTarget) return;
    zoomToDistance(routeChartZoomTarget.distanceKm);
  }, [routeChartZoomTarget, zoomToDistance]);

  return (
    <div className={`map-pane${!routeBuilt || mapPickMode ? ' map-pick-mode' : ''}`}>
      <div
        ref={mapContainerRef}
        className="google-map-canvas"
      />

      <div className="map-top-left-stack">
        {map ? (
          <MapAreaSearch
            map={map}
            onMapPickCancel={onMapPickCancel}
            onCollapseMobileSheet={onCollapseMobileSheet}
          />
        ) : null}
        {routeBuilt && (
          <div className="map-badge">
            {modeLabel[mode]} route · {distanceLabel}
          </div>
        )}
      </div>

      <MapMyLocationButton
        onClick={handleLocateUser}
        disabled={isLocating}
      />
    </div>
  );
}
