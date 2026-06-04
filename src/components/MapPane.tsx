import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildAndDrawRoute,
  clearRouteFromMap,
  formatDistance,
  formatDuration,
  getRouteStrokeColor
} from '../utils/googleRouteLayer';
import {
  getRouteSegmentAroundDistanceMeters,
  slicePolylineAtDistanceMeters
} from '../utils/routePolyline';
import { getRouteElevationStats } from '../utils/elevationUtils';
import { createPlacePinElement } from '../utils/placePinMarker';
import { filterPlacesNearRoute } from '../utils/placesAlongRoute';
import { searchPlacesAlongRoute } from '../api/secrchPlacesAlongRoute';
import type { ActivityMode, ElevationStats, InterestingPlace, RouteIntermediatePoint } from '../utils/types';
import { bindMapViewportBounds, resolveMapPickFromPlaceId, type MapPickPoint } from '../api/placeAutocomplete';
import { getGoogleMapsPlaceUrl } from '../utils/googleMapsPlaceUrl';
import { createPlaceHoverTip } from '../utils/placeHoverTip';
import { createPlaceNameLabel } from '../utils/placeNameLabel';
import { createPlaceMapPopup, type PlaceMapPopupAction } from '../utils/placeMapPopup';
import {
  focusMapOnPlaceMarker,
  restoreMapViewportPadding
} from '../utils/focusMapOnPlaceMarker';
import { routeStopToInterestingPlace } from '../utils/customRouteStopMarker';
import {
  getPlacePhotoViewState,
  usePlacePhotoCache,
  type PlacePhotoState
} from '../hooks/usePlacePhotoCache';
import {
  getGoogleMapsUrlFromMapPick,
  mapPickPointToInterestingPlace,
  syncMapPickPopupOnPin
} from '../utils/mapPickPopup';
import { resolvePlaceCategory } from '../utils/poiTypes';
import {
  bindCustomRouteStopHoverHandlers,
  createCustomRouteStopMarkerElement,
  getCustomRouteStops
} from '../utils/customRouteStopMarker';
import { MapAreaSearch } from './MapAreaSearch';

const modeLabel: Record<ActivityMode, string> = {
  walk: 'Walking',
  bike: 'Cycling'
};

const PLACE_MARKER_Z_BASE = 100;
const PLACE_MARKER_Z_HOVER = 200;
const PLACE_MARKER_Z_DETAIL = 300;
const CUSTOM_ROUTE_STOP_Z_INDEX = 110;
const CUSTOM_ROUTE_STOP_Z_HOVER = 205;

function isSelectedPlaceMarker(placeId: string, selectedPlace: string | null) {
  return selectedPlace === placeId;
}

function isDetailPlaceMarker(
  placeId: string,
  placePopupId: string | null,
  selectedPlace: string | null
) {
  return placePopupId === placeId || selectedPlace === placeId;
}

function resolvePlaceMarkerZIndex(
  placeId: string,
  placePopupId: string | null,
  selectedPlace: string | null,
  hoveredPlaceId: string | null
) {
  if (isDetailPlaceMarker(placeId, placePopupId, selectedPlace)) {
    return PLACE_MARKER_Z_DETAIL;
  }
  if (hoveredPlaceId === placeId && !isSelectedPlaceMarker(placeId, selectedPlace)) {
    return PLACE_MARKER_Z_HOVER;
  }
  return PLACE_MARKER_Z_BASE;
}

function updatePlaceMarkersZIndex(
  markers: PlaceMarker[],
  placePopupId: string | null,
  selectedPlace: string | null,
  hoveredPlaceId: string | null
) {
  markers.forEach(({ id, marker }) => {
    marker.zIndex = resolvePlaceMarkerZIndex(id, placePopupId, selectedPlace, hoveredPlaceId);
  });
}

function shouldShowMarkerHover(
  placeId: string,
  hoveredPlaceId: string | null,
  selectedPlace: string | null,
  hasDetailPopup: boolean
): boolean {
  return (
    hoveredPlaceId === placeId &&
    !isSelectedPlaceMarker(placeId, selectedPlace) &&
    !hasDetailPopup
  );
}

function syncMarkerHoverVisual(
  markers: PlaceMarker[],
  hoveredPlaceId: string | null,
  selectedPlace: string | null
) {
  markers.forEach(({ id, element }) => {
    const hasDetailPopup = element.classList.contains('has-detail-popup');
    element.classList.toggle(
      'is-hovered',
      shouldShowMarkerHover(id, hoveredPlaceId, selectedPlace, hasDetailPopup)
    );
  });
}

type MapPaneProps = {
  routeBuilt: boolean;
  routeStatus: 'idle' | 'loading' | 'ready' | 'error';
  hideEndpointMarkers: boolean;
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
  /** When set, map click fills this empty focused field directly instead of opening the pick popup. */
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
  /** Distance along the built route to highlight (km), e.g. from elevation chart hover. */
  highlightedRouteDistanceKm: number | null;
  /** Cursor is over the elevation chart — hide POI/endpoint markers and show route progress. */
  elevationChartFocused: boolean;
  /** Zoom map to a segment around this distance when user clicks the elevation chart. */
  routeChartZoomTarget: { distanceKm: number; key: number } | null;
};

type RouteEndpointPoint = {
  lat: number;
  lng: number;
  address: string;
};

type MapPickState = MapPickPoint;

const GOOGLE_SCRIPT_ID = 'google-maps-js';
const DEMO_MAP_ID = '4504f8b37365c3d0';

const defaultCenter: google.maps.LatLngLiteral = { lat: 52.3676, lng: 4.9041 };

function getGoogleMapsNamespace(): typeof google | null {
  const withGoogle = globalThis as typeof globalThis & { google?: typeof google };
  if (!withGoogle.google) return null;
  return withGoogle.google;
}

type MapPoiClickEvent = google.maps.MapMouseEvent & {
  placeId?: string;
  stop?: () => void;
};

function isMapPoiClickEvent(event: google.maps.MapMouseEvent): event is MapPoiClickEvent & {
  placeId: string;
  stop: () => void;
} {
  const placeId = (event as MapPoiClickEvent).placeId;
  return typeof placeId === 'string' && placeId.length > 0;
}

/** Suppress Google's built-in POI card; must run synchronously in the click handler. */
function suppressDefaultPoiInfoWindow(event: google.maps.MapMouseEvent): void {
  const stop = (event as MapPoiClickEvent).stop;
  if (typeof stop === 'function') {
    stop.call(event);
  }
}

function loadGoogleMapsApi(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingGoogle = getGoogleMapsNamespace();
    if (existingGoogle) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Maps script failed to load')), {
        once: true
      });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=en`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Google Maps script failed to load')), { once: true });
    document.head.appendChild(script);
  });
}

type PlaceMarker = {
  id: string;
  place: InterestingPlace;
  marker: google.maps.marker.AdvancedMarkerElement;
  element: HTMLDivElement;
};

type CustomRouteStopMarker = {
  id: string;
  place: InterestingPlace;
  marker: google.maps.marker.AdvancedMarkerElement;
  element: HTMLDivElement;
};

function resolveCustomRouteStopZIndex(
  placeId: string,
  placePopupId: string | null,
  selectedPlace: string | null,
  hoveredPlaceId: string | null
) {
  if (placePopupId === placeId || selectedPlace === placeId) {
    return PLACE_MARKER_Z_DETAIL;
  }
  if (hoveredPlaceId === placeId && selectedPlace !== placeId) {
    return CUSTOM_ROUTE_STOP_Z_HOVER;
  }
  return CUSTOM_ROUTE_STOP_Z_INDEX;
}

function mountCustomRouteStopMarker(
  entry: CustomRouteStopMarker,
  popupContext: PlaceMarkerPopupContext,
  handlers: {
    onMarkerClick: (placeId: string) => void;
    onMarkerHover: (placeId: string | null) => void;
  }
) {
  const markerElement = createCustomRouteStopMarkerElement(entry.place, popupContext);

  markerElement.addEventListener('click', (event) => {
    event.stopPropagation();
    handlers.onMarkerClick(entry.id);
  });

  bindCustomRouteStopHoverHandlers(markerElement, entry.id, popupContext, {
    onEnter: handlers.onMarkerHover,
    onLeave: () => handlers.onMarkerHover(null)
  });

  entry.element = markerElement;
  entry.marker.replaceChildren(markerElement);
  entry.marker.zIndex = resolveCustomRouteStopZIndex(
    entry.id,
    popupContext.placePopupId,
    popupContext.selectedPlace,
    popupContext.hoveredPlaceId
  );
}

type PlaceMarkerPopupContext = {
  placePopupId: string | null;
  selectedPlace: string | null;
  hoveredPlaceId: string | null;
  routeStopIds: Set<string>;
  placePhotos: Record<string, PlacePhotoState>;
  onPlaceMarkerClick: (placeId: string) => void;
  onPopupAction: (action: PlaceMapPopupAction, place: InterestingPlace) => void;
};

function mountPlaceMarkerElement(
  placeMarker: PlaceMarker,
  popupContext: PlaceMarkerPopupContext,
  markerColor: string,
  handlers: {
    onMarkerClick: (placeId: string) => void;
    onMarkerHover: (placeId: string | null) => void;
  },
  hoveredPlaceId: string | null
) {
  const active = popupContext.selectedPlace === placeMarker.id;
  const index = Number(placeMarker.element.dataset.place ?? '0');

  const nextElement = createPlaceMarkerElement({
    place: placeMarker.place,
    index,
    color: markerColor,
    active,
    popupContext
  });

  nextElement.addEventListener('click', (event) => {
    event.stopPropagation();
    handlers.onMarkerClick(placeMarker.id);
  });

  nextElement.addEventListener('mouseenter', () => {
    if (isSelectedPlaceMarker(placeMarker.id, popupContext.selectedPlace)) {
      return;
    }
    handlers.onMarkerHover(placeMarker.id);
  });

  nextElement.addEventListener('mouseleave', () => {
    handlers.onMarkerHover(null);
  });

  placeMarker.element = nextElement;
  placeMarker.marker.replaceChildren(nextElement);
  placeMarker.marker.zIndex = resolvePlaceMarkerZIndex(
    placeMarker.id,
    popupContext.placePopupId,
    popupContext.selectedPlace,
    hoveredPlaceId
  );
  syncMarkerHoverVisual([placeMarker], hoveredPlaceId, popupContext.selectedPlace);
}

async function createPlaceMarkers(params: {
  map: google.maps.Map;
  popupContext: PlaceMarkerPopupContext;
  interestingPlaces: InterestingPlace[];
  hoveredPlaceId: string | null;
  onMarkerHover: (placeId: string | null) => void;
}): Promise<PlaceMarker[]> {
  const { map, popupContext, interestingPlaces, hoveredPlaceId, onMarkerHover } = params;
  const { selectedPlace, onPlaceMarkerClick, placePopupId } = popupContext;
  const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;

  return interestingPlaces.map((place, index) => {
    const baseColor = resolvePlaceColor(place);
    const active = selectedPlace === place.id;
    const color = baseColor;

    const element = createPlaceMarkerElement({
      place,
      index,
      color,
      active,
      popupContext
    });

    const marker = new AdvancedMarkerElement({
      map,
      position: { lat: place.lat, lng: place.lng },
      title: place.name,
      anchorLeft: '-50%',
      anchorTop: '-100%'
    });

    const handleClick = () => {
      onPlaceMarkerClick(place.id);
    };

    marker.append(element);

    // Для AdvancedMarkerElement надежнее использовать addListener('click'),
    // а не только addEventListener('gmp-click').
    marker.addListener('click', handleClick);

    // Дополнительно слушаем сам кастомный DOM-маркер.
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      handleClick();
    });

    element.addEventListener('mouseenter', () => {
      if (isSelectedPlaceMarker(place.id, selectedPlace)) {
        return;
      }
      onMarkerHover(place.id);
    });

    element.addEventListener('mouseleave', () => {
      onMarkerHover(null);
    });

    marker.zIndex = resolvePlaceMarkerZIndex(place.id, placePopupId, selectedPlace, hoveredPlaceId);

    return { id: place.id, place, marker, element };
  });
}

function resolvePlaceColor(place: InterestingPlace): string {
  return resolvePlaceCategory(place).color;
}

async function ensurePickMarker(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  pickMarkerRef: { current: google.maps.marker.AdvancedMarkerElement | null },
  pickPinElRef: { current: HTMLDivElement | null }
): Promise<void> {
  if (pickMarkerRef.current) {
    pickMarkerRef.current.position = position;
    return;
  }

  const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
  const pinEl = document.createElement('div');
  pinEl.className = 'map-pick-pin';
  pinEl.innerHTML = `<div class="map-pick-pin-dot"></div><div class="map-pick-pin-pulse"></div>`;

  const marker = new AdvancedMarkerElement({
    map,
    position
  });
  marker.append(pinEl);
  pickMarkerRef.current = marker;
  pickPinElRef.current = pinEl;
}

function createEndpointMarkerElement(params: { variant: 'start' | 'destination'; address: string }): HTMLDivElement {
  const element = document.createElement('div');
  const title = params.variant === 'start' ? 'Start' : 'Destination';
  element.className = `route-endpoint-marker ${params.variant}`;
  element.innerHTML = `
    <div class="route-endpoint-popup">
      <div class="route-endpoint-title">${title}</div>
      <div class="route-endpoint-address">${params.address}</div>
    </div>
    <div class="route-endpoint-dot"></div>
  `;
  return element;
}

function createPlaceMarkerElement(params: {
  place: InterestingPlace;
  index: number;
  color: string;
  active: boolean;
  popupContext: PlaceMarkerPopupContext;
}): HTMLDivElement {
  const { place, popupContext } = params;
  const categoryMeta = resolvePlaceCategory(place);
  const showMapPopup =
    popupContext.placePopupId === place.id || popupContext.selectedPlace === place.id;
  const photoState = getPlacePhotoViewState(popupContext.placePhotos, place.id);
  const isHovered = shouldShowMarkerHover(
    place.id,
    popupContext.hoveredPlaceId,
    popupContext.selectedPlace,
    showMapPopup
  );

  const element = document.createElement('div');
  element.className = [
    'place-marker-wrapper',
    `place-marker-${categoryMeta.category}`,
    params.active ? 'is-active' : '',
    isHovered ? 'is-hovered' : ''
  ]
    .filter(Boolean)
    .join(' ');

  element.dataset.place = String(params.index);
  element.dataset.placeId = place.id;
  element.dataset.placeCategory = categoryMeta.category;

  const pinElement = createPlacePinElement({
    index: params.index,
    title: place.name,
    color: params.color,
    active: params.active
  });

  const popupParams = {
    place,
    isAddedToRoute: popupContext.routeStopIds.has(place.id),
    photoUrl: photoState?.url,
    photoLoading: photoState?.loading,
    onAction: popupContext.onPopupAction
  };

  element.appendChild(createPlaceNameLabel(place, params.index, params.color));
  element.appendChild(createPlaceHoverTip(place, params.color));
  element.appendChild(pinElement);

  if (showMapPopup) {
    element.classList.add('has-detail-popup');
    element.appendChild(createPlaceMapPopup(popupParams));
  }

  return element;
}

function getRouteFitPadding(map: google.maps.Map): google.maps.Padding {
  const isMobile = globalThis.window.matchMedia('(max-width: 768px)').matches;

  if (!isMobile) {
    return {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40
    };
  }

  const mapHeight = map.getDiv().getBoundingClientRect().height;
  const sheetElement = document.querySelector('.sidebar-mobile-sheet') as HTMLElement | null;
  const sheetHeight = sheetElement?.getBoundingClientRect().height ?? 0;
  const bottomPadding = Math.min(
    Math.round(sheetHeight + 24),
    Math.round(mapHeight * 0.72)
  );

  return {
    top: 72,
    right: 20,
    bottom: bottomPadding,
    left: 20
  };
}

export function MapPane({
  routeBuilt,
  routeStatus,
  hideEndpointMarkers,
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
  routeChartZoomTarget
}: Readonly<MapPaneProps>) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const routeTraveledPolylineRef = useRef<google.maps.Polyline | null>(null);
  const routeRemainingPolylineRef = useRef<google.maps.Polyline | null>(null);
  const placeMarkersRef = useRef<PlaceMarker[]>([]);
  const customRouteStopMarkersRef = useRef<CustomRouteStopMarker[]>([]);
  const pickMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const pickPinElRef = useRef<HTMLDivElement | null>(null);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const startMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const destinationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const routePlacesRef = useRef<InterestingPlace[]>([]);
  const selectedPlaceRef = useRef<string | null>(null);
  const placePopupIdRef = useRef<string | null>(null);
  const hoveredPlaceIdRef = useRef<string | null>(null);
  const placePhotoCacheRef = useRef<Record<string, PlacePhotoState>>({});
  const handlePlaceMarkerClickRef = useRef<(placeId: string) => void>(() => {});
  const handlePlaceMarkerHoverRef = useRef<(placeId: string | null) => void>(() => {});
  const handlePlacePopupActionRef = useRef<
    (action: PlaceMapPopupAction, place: InterestingPlace) => void
  >(() => {});
  const ignoreNextMapPickClickRef = useRef(false);
  const lastRoutePathRef = useRef<google.maps.LatLngLiteral[]>([]);
  const fitRouteFrameRef = useRef<number | null>(null);
  const [distanceLabel, setDistanceLabel] = useState('—');
  const [mapPick, setMapPick] = useState<MapPickState | null>(null);
  const [placePopupId, setPlacePopupId] = useState<string | null>(null);
  const getCustomStopPlace = useCallback(
    (stop: RouteIntermediatePoint) =>
      customStopPlaces.find((place) => place.id === stop.id) ??
      routeStopToInterestingPlace(stop),
    [customStopPlaces]
  );
  const popupPlaces = useMemo(
    () => [...routePlaces, ...customStopPlaces],
    [routePlaces, customStopPlaces]
  );
  const placePhotoCache = usePlacePhotoCache(placePopupId, popupPlaces, { maxWidthPx: 520 });
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const configuredMapId = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined)?.trim();
  const mapId = configuredMapId || DEMO_MAP_ID;

  const clearPickMarker = useCallback(() => {
    if (pickMarkerRef.current) {
      pickMarkerRef.current.map = null;
      pickMarkerRef.current = null;
    }
    pickPinElRef.current = null;
    setMapPick(null);
  }, []);

  const clearCustomRouteStopMarkers = useCallback(() => {
    customRouteStopMarkersRef.current.forEach(({ marker }) => {
      marker.map = null;
    });
    customRouteStopMarkersRef.current = [];
  }, []);

  const clearRouteProgressHighlight = useCallback(() => {
    if (routeTraveledPolylineRef.current) {
      routeTraveledPolylineRef.current.setMap(null);
      routeTraveledPolylineRef.current = null;
    }
    if (routeRemainingPolylineRef.current) {
      routeRemainingPolylineRef.current.setMap(null);
      routeRemainingPolylineRef.current = null;
    }
  }, []);

  const closePlacePopup = useCallback(() => {
    placePopupIdRef.current = null;
    selectedPlaceRef.current = null;
    setPlacePopupId(null);
    onSelectPlace(null);
  }, [onSelectPlace]);

  const showPickPopup = useCallback(
    (point: MapPickState) => {
      const map = mapRef.current;
      if (!map) return;

      closePlacePopup();

      void ensurePickMarker(
        map,
        { lat: point.lat, lng: point.lng },
        pickMarkerRef,
        pickPinElRef
      ).then(() => {
        setMapPick(point);
      });
    },
    [closePlacePopup]
  );

  const focusMapOnPlaceId = useCallback((placeId: string) => {
    const map = mapRef.current;
    if (!map) return;

    const markerPlace = placeMarkersRef.current.find(({ id }) => id === placeId)?.place;
    const customPlace = customRouteStopMarkersRef.current.find(({ id }) => id === placeId)?.place;
    const listPlace = routePlacesRef.current.find((place) => place.id === placeId);
    const place = markerPlace ?? customPlace ?? listPlace;
    if (!place) return;

    focusMapOnPlaceMarker(
      map,
      { lat: place.lat, lng: place.lng },
      { basePadding: getRouteFitPadding(map) }
    );
  }, []);

  const handlePlaceMarkerClick = useCallback(
    (placeId: string) => {
      clearPickMarker();
      setPlacePopupId(placeId);
      onSelectPlace(placeId);
    },
    [clearPickMarker, onSelectPlace]
  );

  const applyHoveredPlace = useCallback(
    (placeId: string | null) => {
      const selectedId = selectedPlaceRef.current;
      const nextHoveredId =
        placeId && isSelectedPlaceMarker(placeId, selectedId) ? null : placeId;

      const changed = hoveredPlaceIdRef.current !== nextHoveredId;
      hoveredPlaceIdRef.current = nextHoveredId;
      if (changed) {
        onHoveredPlaceChange?.(nextHoveredId);
      }
      updatePlaceMarkersZIndex(
        placeMarkersRef.current,
        placePopupIdRef.current,
        selectedId,
        nextHoveredId
      );
      syncMarkerHoverVisual(placeMarkersRef.current, nextHoveredId, selectedId);
    },
    [onHoveredPlaceChange]
  );

  const handlePlaceMarkerHover = useCallback(
    (placeId: string | null) => {
      applyHoveredPlace(placeId);
    },
    [applyHoveredPlace]
  );

  const handlePlacePopupAction = useCallback(
    (action: PlaceMapPopupAction, place: InterestingPlace) => {
      if (action === 'close') {
        closePlacePopup();
        return;
      }

      if (action === 'add-stop') {
        const isAdded = intermediates.some((stop) => stop.id === place.id);
        if (isAdded) {
          onRemovePlaceFromRoute(place.id);
        } else {
          onAddPlaceToRoute(place);
        }
        return;
      }

      if (action === 'open-gmaps') {
        globalThis.open(getGoogleMapsPlaceUrl(place), '_blank', 'noreferrer');
      }
    },
    [closePlacePopup, intermediates, onAddPlaceToRoute, onRemovePlaceFromRoute]
  );

  const syncPlaceMarkerElements = useCallback(() => {
    const popupContext: PlaceMarkerPopupContext = {
      placePopupId,
      selectedPlace,
      hoveredPlaceId: hoveredPlaceIdRef.current,
      routeStopIds: new Set(intermediates.map((stop) => stop.id)),
      placePhotos: placePhotoCache,
      onPlaceMarkerClick: handlePlaceMarkerClick,
      onPopupAction: handlePlacePopupAction
    };

    placeMarkersRef.current.forEach((placeMarker) => {
      mountPlaceMarkerElement(
        placeMarker,
        popupContext,
        resolvePlaceColor(placeMarker.place),
        {
          onMarkerClick: handlePlaceMarkerClick,
          onMarkerHover: handlePlaceMarkerHover
        },
        hoveredPlaceIdRef.current
      );
    });
  }, [
    handlePlaceMarkerClick,
    handlePlaceMarkerHover,
    handlePlacePopupAction,
    intermediates,
    placePopupId,
    placePhotoCache,
    selectedPlace
  ]);

  const syncCustomRouteStopMarkerElements = useCallback(() => {
    const popupContext: PlaceMarkerPopupContext = {
      placePopupId,
      selectedPlace,
      hoveredPlaceId: hoveredPlaceIdRef.current,
      routeStopIds: new Set(intermediates.map((stop) => stop.id)),
      placePhotos: placePhotoCache,
      onPlaceMarkerClick: handlePlaceMarkerClick,
      onPopupAction: handlePlacePopupAction
    };

    customRouteStopMarkersRef.current.forEach((entry) => {
      mountCustomRouteStopMarker(entry, popupContext, {
        onMarkerClick: handlePlaceMarkerClick,
        onMarkerHover: handlePlaceMarkerHover
      });
    });
  }, [
    handlePlaceMarkerClick,
    handlePlaceMarkerHover,
    handlePlacePopupAction,
    intermediates,
    placePopupId,
    placePhotoCache,
    selectedPlace
  ]);

  const fitRouteToVisibleArea = useCallback((routePath: google.maps.LatLngLiteral[]) => {
    const map = mapRef.current;
    if (!map || routePath.length < 2) return;

    if (fitRouteFrameRef.current) {
      cancelAnimationFrame(fitRouteFrameRef.current);
    }

    fitRouteFrameRef.current = requestAnimationFrame(() => {
      const bounds = new google.maps.LatLngBounds();
      routePath.forEach((point) => {
        bounds.extend(point);
      });
      map.fitBounds(bounds, getRouteFitPadding(map));
    });
  }, []);

  const zoomMapToRouteDistance = useCallback((distanceKm: number) => {
    const map = mapRef.current;
    const routePath = lastRoutePathRef.current;
    if (!map || routePath.length < 2) return;

    const centerMeters = distanceKm * 1000;
    const segment = getRouteSegmentAroundDistanceMeters(routePath, centerMeters, 550);
    const bounds = new google.maps.LatLngBounds();

    segment.forEach((point) => {
      bounds.extend(point);
    });

    if (fitRouteFrameRef.current) {
      cancelAnimationFrame(fitRouteFrameRef.current);
    }

    fitRouteFrameRef.current = requestAnimationFrame(() => {
      map.fitBounds(bounds, getRouteFitPadding(map));

      const maxZoom = 16;
      const listener = map.addListener('idle', () => {
        listener.remove();
        const zoom = map.getZoom();
        if (zoom != null && zoom > maxZoom) {
          map.setZoom(maxZoom);
        }
      });
    });
  }, []);

  const handleLocateUser = useCallback(() => {
    const map = mapRef.current;
    if (!map || isLocatingUser) return;

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not supported in this browser.');
      return;
    }

    setIsLocatingUser(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        map.panTo(location);
        map.setZoom(Math.max(map.getZoom() ?? 0, 16));
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setPosition(location);
        } else {
          userLocationMarkerRef.current = new google.maps.Marker({
            map,
            position: location,
            title: 'My location'
          });
        }
        setIsLocatingUser(false);
      },
      (error) => {
        console.warn('Unable to access current location', error);
        setIsLocatingUser(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, [isLocatingUser]);

  useEffect(() => {
    routePlacesRef.current = routePlaces;
  }, [routePlaces]);

  useEffect(() => {
    syncPlaceMarkerElements();
  }, [syncPlaceMarkerElements]);

  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
    setPlacePopupId(selectedPlace);

    if (hoveredPlaceIdRef.current && isSelectedPlaceMarker(hoveredPlaceIdRef.current, selectedPlace)) {
      hoveredPlaceIdRef.current = null;
      onHoveredPlaceChange?.(null);
    }

    updatePlaceMarkersZIndex(
      placeMarkersRef.current,
      placePopupIdRef.current,
      selectedPlace,
      hoveredPlaceIdRef.current
    );
    syncMarkerHoverVisual(placeMarkersRef.current, hoveredPlaceIdRef.current, selectedPlace);
    syncCustomRouteStopMarkerElements();
  }, [onHoveredPlaceChange, selectedPlace, syncCustomRouteStopMarkerElements]);

  useEffect(() => {
    const selectedId = selectedPlaceRef.current;
    const nextHoveredId =
      hoveredPlaceId && isSelectedPlaceMarker(hoveredPlaceId, selectedId) ? null : hoveredPlaceId;

    if (hoveredPlaceIdRef.current !== nextHoveredId) {
      hoveredPlaceIdRef.current = nextHoveredId;
      updatePlaceMarkersZIndex(
        placeMarkersRef.current,
        placePopupIdRef.current,
        selectedId,
        nextHoveredId
      );
    }

    syncMarkerHoverVisual(placeMarkersRef.current, nextHoveredId, selectedId);
    syncCustomRouteStopMarkerElements();
  }, [hoveredPlaceId, syncCustomRouteStopMarkerElements]);

  useEffect(() => {
    placePopupIdRef.current = placePopupId;
    updatePlaceMarkersZIndex(
      placeMarkersRef.current,
      placePopupId,
      selectedPlaceRef.current,
      hoveredPlaceIdRef.current
    );
    syncCustomRouteStopMarkerElements();
  }, [placePopupId, syncCustomRouteStopMarkerElements]);

  useEffect(() => {
    syncCustomRouteStopMarkerElements();
  }, [placePhotoCache, syncCustomRouteStopMarkerElements]);

  useEffect(() => {
    placePhotoCacheRef.current = placePhotoCache;
  }, [placePhotoCache]);

  useEffect(() => {
    handlePlaceMarkerClickRef.current = handlePlaceMarkerClick;
  }, [handlePlaceMarkerClick]);

  useEffect(() => {
    handlePlaceMarkerHoverRef.current = handlePlaceMarkerHover;
  }, [handlePlaceMarkerHover]);

  useEffect(() => {
    handlePlacePopupActionRef.current = handlePlacePopupAction;
  }, [handlePlacePopupAction]);

  useEffect(() => {
    if (!apiKey || !mapContainerRef.current) return;

    let isMounted = true;

    void loadGoogleMapsApi(apiKey)
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;
        const mapsApi = getGoogleMapsNamespace()?.maps;
        if (!mapsApi) return;
        mapRef.current ??= new mapsApi.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          panControl: false,
          colorScheme: 'DARK',
          mapId,
          clickableIcons: true
        });
        bindMapViewportBounds(mapRef.current);
        const map = mapRef.current;
        setMapInstance(map);
        setIsMapReady(true);
        onMapReady?.(map);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Map load failed';
        console.error(message);
      });

    return () => {
      isMounted = false;
      setIsMapReady(false);
      setMapInstance(null);
    };
  }, [apiKey, mapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    map.setOptions({ clickableIcons: true });

    const container = mapContainerRef.current;
    const allowMapPick = !routeBuilt || mapPickMode;
    if (allowMapPick && container) {
      container.style.cursor = 'crosshair';
    } else if (container) {
      container.style.cursor = '';
    }

    const applyPickToEmptyFocusedField = (point: MapPickState): boolean => {
      if (routeBuilt || !mapPickDirectFillTarget) {
        return false;
      }

      const endpoint = { lat: point.lat, lng: point.lng, address: point.address };

      if (mapPickDirectFillTarget === 'start') {
        onMapPickSetStart(endpoint);
        clearPickMarker();
        return true;
      }

      if (mapPickDirectFillTarget === 'destination') {
        onMapPickSetDestination(endpoint);
        clearPickMarker();
        return true;
      }

      return false;
    };

    const handleResolvedPick = (point: MapPickState) => {
      if (!applyPickToEmptyFocusedField(point)) {
        showPickPopup(point);
      }
    };

    const listener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (ignoreNextMapPickClickRef.current) {
        ignoreNextMapPickClickRef.current = false;
        return;
      }

      // Block Google's default POI card; keep POI clickable (clickableIcons: true).
      suppressDefaultPoiInfoWindow(event);

      if (isMapPoiClickEvent(event)) {
        const placeId = event.placeId;
        closePlacePopup();
        void resolveMapPickFromPlaceId(placeId)
          .then(handleResolvedPick)
          .catch((error: unknown) => {
            console.error(error);
          });
        return;
      }

      if (routeBuilt) {
        closePlacePopup();
        clearPickMarker();
        return;
      }

      const latLng = event.latLng;
      if (!latLng) return;

      closePlacePopup();

      const lat = latLng.lat();
      const lng = latLng.lng();
      const pointCoords = { lat, lng };

      const geocoder = new google.maps.Geocoder();
      void geocoder.geocode({ location: pointCoords }).then((response) => {
        const address =
          response.results[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const name = address.split(',')[0]?.trim() || address;
        handleResolvedPick({ lat, lng, name, address });
      });
    });

    return () => {
      google.maps.event.removeListener(listener);
      if (container) {
        container.style.cursor = '';
      }
    };
  }, [
    clearPickMarker,
    closePlacePopup,
    isMapReady,
    mapPickMode,
    mapPickDirectFillTarget,
    onMapPickSetDestination,
    onMapPickSetStart,
    routeBuilt,
    showPickPopup
  ]);

  const wasMapPickModeRef = useRef(false);
  useEffect(() => {
    if (wasMapPickModeRef.current && !mapPickMode) {
      clearPickMarker();
    }
    wasMapPickModeRef.current = mapPickMode;
  }, [clearPickMarker, mapPickMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (hideEndpointMarkers || elevationChartFocused) {
      if (startMarkerRef.current) {
        startMarkerRef.current.map = null;
        startMarkerRef.current = null;
      }

      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.map = null;
        destinationMarkerRef.current = null;
      }

      return;
    }

    let disposed = false;

    const syncEndpointMarkers = async () => {
      const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
      if (disposed) return;

      const upsertMarker = (
        currentRef: { current: google.maps.marker.AdvancedMarkerElement | null },
        point: RouteEndpointPoint | null,
        variant: 'start' | 'destination'
      ) => {
        if (!point) {
          if (currentRef.current) {
            currentRef.current.map = null;
            currentRef.current = null;
          }
          return;
        }

        const markerElement = createEndpointMarkerElement({
          variant,
          address: point.address
        });

        if (currentRef.current) {
          currentRef.current.position = { lat: point.lat, lng: point.lng };
          currentRef.current.replaceChildren(markerElement);
          return;
        }

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: point.lat, lng: point.lng },
          anchorLeft: '-50%',
          anchorTop: '-100%'
        });
        marker.append(markerElement);
        currentRef.current = marker;
      };

      upsertMarker(startMarkerRef, startPoint, 'start');
      upsertMarker(destinationMarkerRef, destinationPoint, 'destination');
    };

    void syncEndpointMarkers();

    return () => {
      disposed = true;
    };
  }, [destinationPoint, elevationChartFocused, hideEndpointMarkers, routeStatus, startPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clearPlaceMarkers = () => {
      placeMarkersRef.current.forEach(({ marker }) => {
        marker.map = null;
      });
      placeMarkersRef.current = [];
    };

    if (!routeBuilt) {
      lastRoutePathRef.current = [];
      clearPlaceMarkers();
      clearCustomRouteStopMarkers();
      clearRouteProgressHighlight();
      clearRouteFromMap();
      return;
    }

    if (!origin.trim() || !destination.trim()) {
      clearPlaceMarkers();
      onRouteInfoChange({
        status: 'idle',
        distance: '—',
        duration: '—',
        elevation: null,
        interestingPlaces: [],
        routePath: []
      });
      return;
    }

    let disposed = false;

    void buildAndDrawRoute({
      map,
      origin,
      destination,
      activityMode: mode,
      intermediates,
      fitBounds: false
    })
      .then((result) => {
        if (disposed) return;
        const distance = formatDistance(result.distanceMeters);
        const duration = formatDuration(result.durationMillis);
        setDistanceLabel(distance);
        const routePath =
          result.path?.map((point) => ({
            lat: point.lat,
            lng: point.lng
          })) ?? [];

        lastRoutePathRef.current = routePath;
        fitRouteToVisibleArea(routePath);

        const applyRouteInfo = (elevation: ElevationStats | null) => {
          const encodedPolyline = result.encodedPolyline;

          const placesPromise =
            refreshPlaces && encodedPolyline && apiKey && routePath.length > 1
              ? searchPlacesAlongRoute({
                  encodedPolyline,
                  apiKey,
                  languageCode: 'en'
                })
                  .then((rawPlaces) =>
                    filterPlacesNearRoute({
                      places: rawPlaces,
                      routePath,
                      activityMode: mode
                    })
                  )
                  .catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : 'Places search failed';
                    console.error(message);
                    return [];
                  })
              : Promise.resolve(routePlacesRef.current);

          void placesPromise.then((interestingPlaces) => {
            if (disposed) return;

            clearPlaceMarkers();
            void createPlaceMarkers({
              map,
              popupContext: {
                placePopupId: placePopupIdRef.current,
                selectedPlace: selectedPlaceRef.current,
                hoveredPlaceId: hoveredPlaceIdRef.current,
                routeStopIds: new Set(intermediates.map((stop) => stop.id)),
                placePhotos: placePhotoCacheRef.current,
                onPlaceMarkerClick: (placeId) => {
                  handlePlaceMarkerClickRef.current(placeId);
                },
                onPopupAction: (action, place) => {
                  handlePlacePopupActionRef.current(action, place);
                }
              },
              interestingPlaces,
              hoveredPlaceId: hoveredPlaceIdRef.current,
              onMarkerHover: (placeId) => {
                handlePlaceMarkerHoverRef.current(placeId);
              }
            }).then((createdMarkers) => {
              if (disposed) return;
              placeMarkersRef.current = createdMarkers;
            });

            onRouteInfoChange({
              status: 'ready',
              distance,
              duration,
              elevation,
              interestingPlaces,
              routePath
            });
          });
        };

        if (result.path && result.path.length > 1) {
          void getRouteElevationStats(result.path, {
            distanceMeters: result.distanceMeters,
            encodedPolyline: result.encodedPolyline
          })
            .then((stats) => {
              if (disposed) return;
              applyRouteInfo(stats);
            })
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Elevation build failed';
              console.error(message);
              applyRouteInfo(null);
            });
        } else {
          applyRouteInfo(null);
        }
      })
      .catch((error: unknown) => {
        if (disposed) return;
        const message = error instanceof Error ? error.message : 'Route build failed';
        console.error(message);
        clearPlaceMarkers();
        clearRouteProgressHighlight();
        clearRouteFromMap();
        setDistanceLabel('—');
        onRouteInfoChange({
          status: 'error',
          distance: '—',
          duration: '—',
          elevation: null,
          interestingPlaces: refreshPlaces ? [] : routePlacesRef.current,
          routePath: [],
          errorMessage: message === 'Route not found' ? 'Route not found' : 'Unable to build route'
        });
      });

    return () => {
      disposed = true;
    };
  }, [
    apiKey,
    buildNonce,
    clearRouteProgressHighlight,
    destination,
    intermediates,
    mode,
    onRouteInfoChange,
    origin,
    fitRouteToVisibleArea,
    refreshPlaces,
    routeBuilt
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    clearRouteProgressHighlight();

    const routePath = lastRoutePathRef.current;
    if (
      !elevationChartFocused ||
      highlightedRouteDistanceKm == null ||
      !Number.isFinite(highlightedRouteDistanceKm) ||
      routePath.length < 2
    ) {
      return;
    }

    const { traveled, remaining } = slicePolylineAtDistanceMeters(
      routePath,
      highlightedRouteDistanceKm * 1000
    );
    const routeColor = getRouteStrokeColor(mode);

    if (traveled.length >= 2) {
      routeTraveledPolylineRef.current = new google.maps.Polyline({
        map,
        path: traveled,
        strokeColor: '#fcfdff',
        strokeOpacity: 1,
        strokeWeight: 8,
        zIndex: 10
      });
    }

    if (remaining.length >= 2) {
      routeRemainingPolylineRef.current = new google.maps.Polyline({
        map,
        path: remaining,
        strokeColor: routeColor,
        strokeOpacity: 0.28,
        strokeWeight: 6,
        zIndex: 4
      });
    }
  }, [
    clearRouteProgressHighlight,
    elevationChartFocused,
    highlightedRouteDistanceKm,
    isMapReady,
    mode
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const showMarkers = !elevationChartFocused;

    placeMarkersRef.current.forEach(({ marker }) => {
      marker.map = showMarkers ? map : null;
    });

    customRouteStopMarkersRef.current.forEach(({ marker }) => {
      marker.map = showMarkers ? map : null;
    });

    if (pickMarkerRef.current) {
      pickMarkerRef.current.map = showMarkers && mapPick ? map : null;
    }
  }, [elevationChartFocused, isMapReady, mapPick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady || !routeBuilt) {
      clearCustomRouteStopMarkers();
      return;
    }

    const customStops = getCustomRouteStops(intermediates, routePlaces);
    if (customStops.length === 0) {
      clearCustomRouteStopMarkers();
      return;
    }

    if (elevationChartFocused) {
      customRouteStopMarkersRef.current.forEach(({ marker }) => {
        marker.map = null;
      });
      return;
    }

    let disposed = false;

    const syncCustomRouteStopMarkers = async () => {
      const { AdvancedMarkerElement } = (await google.maps.importLibrary(
        'marker'
      )) as google.maps.MarkerLibrary;
      if (disposed) return;

      const stopIds = new Set(customStops.map((stop) => stop.id));
      customRouteStopMarkersRef.current = customRouteStopMarkersRef.current.filter(
        ({ id, marker }) => {
          if (!stopIds.has(id)) {
            marker.map = null;
            return false;
          }
          return true;
        }
      );

      for (const stop of customStops) {
        const place = getCustomStopPlace(stop);
        const existing = customRouteStopMarkersRef.current.find((entry) => entry.id === stop.id);

        if (existing) {
          existing.place = place;
          existing.marker.position = { lat: stop.lat, lng: stop.lng };
          continue;
        }

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: stop.lat, lng: stop.lng },
          anchorLeft: '-50%',
          anchorTop: '-100%'
        });
        const placeholder = document.createElement('div');
        marker.append(placeholder);
        customRouteStopMarkersRef.current.push({
          id: stop.id,
          place,
          marker,
          element: placeholder
        });
      }

      syncCustomRouteStopMarkerElements();
    };

    void syncCustomRouteStopMarkers();

    return () => {
      disposed = true;
    };
  }, [
    clearCustomRouteStopMarkers,
    elevationChartFocused,
    intermediates,
    isMapReady,
    routeBuilt,
    routePlaces,
    hoveredPlaceId,
    getCustomStopPlace,
    syncCustomRouteStopMarkerElements
  ]);

  useEffect(() => {
    customRouteStopMarkersRef.current.forEach((entry) => {
      const stop = intermediates.find((item) => item.id === entry.id);
      if (!stop) return;
      entry.place = getCustomStopPlace(stop);
    });

    if (customRouteStopMarkersRef.current.length > 0) {
      syncCustomRouteStopMarkerElements();
    }
  }, [customStopPlaces, getCustomStopPlace, intermediates, syncCustomRouteStopMarkerElements]);

  useEffect(
    () => () => {
      clearRouteProgressHighlight();
    },
    [clearRouteProgressHighlight]
  );

  useEffect(() => {
    if (!routeChartZoomTarget) return;
    zoomMapToRouteDistance(routeChartZoomTarget.distanceKm);
  }, [routeChartZoomTarget, zoomMapToRouteDistance]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routeBuilt) return;

    if (!selectedPlace) {
      restoreMapViewportPadding(map, getRouteFitPadding(map));
      return;
    }

    focusMapOnPlaceId(selectedPlace);
  }, [focusMapOnPlaceId, routeBuilt, selectedPlace]);

  const handleSetStart = () => {
    if (mapPick) {
      ignoreNextMapPickClickRef.current = true;
      onMapPickSetStart(mapPick);
      clearPickMarker();
    }
  };

  const handleSetDestination = () => {
    if (mapPick) {
      ignoreNextMapPickClickRef.current = true;
      onMapPickSetDestination(mapPick);
      clearPickMarker();
    }
  };

  const handlePickCancel = () => {
    ignoreNextMapPickClickRef.current = true;
    clearPickMarker();
    onMapPickCancel();
  };

  const handlePickAddStop = useCallback(() => {
    if (!mapPick) return;

    ignoreNextMapPickClickRef.current = true;
    onAddPlaceToRoute(mapPickPointToInterestingPlace(mapPick));
    clearPickMarker();
  }, [clearPickMarker, mapPick, onAddPlaceToRoute]);

  const handlePickOpenGmaps = useCallback(() => {
    if (!mapPick) return;

    ignoreNextMapPickClickRef.current = true;
    globalThis.open(getGoogleMapsUrlFromMapPick(mapPick), '_blank', 'noreferrer');
  }, [mapPick]);

  const mapPickAddedToRoute = Boolean(
    mapPick?.placeId && intermediates.some((stop) => stop.id === mapPick.placeId)
  );

  useEffect(() => {
    if (!pickPinElRef.current) return;

    syncMapPickPopupOnPin({
      pinEl: pickPinElRef.current,
      pick: mapPick,
      routeBuilt,
      isAddedToRoute: mapPickAddedToRoute,
      onAction: (action) => {
        if (action === 'close') {
          handlePickCancel();
          return;
        }

        if (routeBuilt) {
          if (action === 'add-stop') handlePickAddStop();
          else if (action === 'open-gmaps') handlePickOpenGmaps();
          return;
        }

        if (action === 'start') handleSetStart();
        else if (action === 'dest') handleSetDestination();
      }
    });
  }, [mapPick, mapPickAddedToRoute, routeBuilt, handlePickAddStop, handlePickOpenGmaps]);

  return (
    <div className={`map-pane${!routeBuilt || mapPickMode ? ' map-pick-mode' : ''}`}>
      <div
        ref={mapContainerRef}
        className="google-map-canvas"
      />

      <div className="map-top-left-stack">
        {mapInstance ? (
          <MapAreaSearch map={mapInstance} onMapPickCancel={onMapPickCancel} />
        ) : null}
        {routeBuilt && (
          <div className="map-badge">
            {modeLabel[mode]} route · {distanceLabel}
          </div>
        )}
      </div>

      <div className="map-float top-right">
        <button
          className="map-float-btn"
          type="button"
          onClick={handleLocateUser}
          disabled={isLocatingUser}
          aria-label="My location">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="3"
            />
            <circle
              cx="12"
              cy="12"
              r="8"
              fill="none"
            />
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
          </svg>
        </button>
      </div>

    </div>
  );
}
