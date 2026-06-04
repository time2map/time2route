import { useMemo } from 'react';
import { createPlacePinElement } from '../components/mapComponents/placePinMarker';
import { createPlaceHoverTip } from '../components/mapComponents/placeHoverTip';
import { createPlaceNameLabel } from '../components/mapComponents/placeNameLabel';
import { createPlaceMapPopup, type PlaceMapPopupAction } from '../components/mapComponents/placeMapPopup';
import { resolvePlaceCategory } from '../utils/poiTypes';
import {
  bindCustomRouteStopHoverHandlers,
  createCustomRouteStopMarkerElement
} from '../components/mapComponents/customRouteStopMarker';
import { getPlacePhotoViewState, type PlacePhotoState } from './usePlacePhotoCache';
import type { InterestingPlace } from '../utils/types';

const PLACE_MARKER_Z_BASE = 100;
const PLACE_MARKER_Z_HOVER = 200;
const PLACE_MARKER_Z_DETAIL = 300;
const CUSTOM_ROUTE_STOP_Z_INDEX = 110;
const CUSTOM_ROUTE_STOP_Z_HOVER = 205;

export const GOOGLE_MAPS_SCRIPT_ID = 'google-maps-js';

export type PlaceMarker = {
  id: string;
  place: InterestingPlace;
  marker: google.maps.marker.AdvancedMarkerElement;
  element: HTMLDivElement;
};

export type CustomRouteStopMarker = {
  id: string;
  place: InterestingPlace;
  marker: google.maps.marker.AdvancedMarkerElement;
  element: HTMLDivElement;
};

export type PlaceMarkerPopupContext = {
  placePopupId: string | null;
  selectedPlace: string | null;
  hoveredPlaceId: string | null;
  routeStopIds: Set<string>;
  placePhotos: Record<string, PlacePhotoState>;
  onPlaceMarkerClick: (placeId: string) => void;
  onPopupAction: (action: PlaceMapPopupAction, place: InterestingPlace) => void;
};

function isSelectedPlaceMarker(placeId: string, selectedPlace: string | null) {
  return selectedPlace === placeId;
}

function isDetailPlaceMarker(placeId: string, placePopupId: string | null, selectedPlace: string | null) {
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
  return hoveredPlaceId === placeId && !isSelectedPlaceMarker(placeId, selectedPlace) && !hasDetailPopup;
}

function syncMarkerHoverVisual(markers: PlaceMarker[], hoveredPlaceId: string | null, selectedPlace: string | null) {
  markers.forEach(({ id, element }) => {
    const hasDetailPopup = element.classList.contains('has-detail-popup');
    element.classList.toggle('is-hovered', shouldShowMarkerHover(id, hoveredPlaceId, selectedPlace, hasDetailPopup));
  });
}

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

    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Maps script failed to load')), {
        once: true
      });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=en`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Google Maps script failed to load')), { once: true });
    document.head.appendChild(script);
  });
}

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

function createPlaceMarkerElement(params: {
  place: InterestingPlace;
  index: number;
  color: string;
  active: boolean;
  popupContext: PlaceMarkerPopupContext;
}): HTMLDivElement {
  const { place, popupContext } = params;
  const categoryMeta = resolvePlaceCategory(place);
  const showMapPopup = popupContext.placePopupId === place.id || popupContext.selectedPlace === place.id;
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

function resolvePlaceColor(place: InterestingPlace): string {
  return resolvePlaceCategory(place).color;
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
    const color = resolvePlaceColor(place);
    const active = selectedPlace === place.id;

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
    marker.addListener('click', handleClick);

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

export function useMapPaneMarkers() {
  return useMemo(
    () => ({
      loadGoogleMapsApi,
      getGoogleMapsNamespace,
      suppressDefaultPoiInfoWindow,
      isMapPoiClickEvent,
      isSelectedPlaceMarker,
      updatePlaceMarkersZIndex,
      syncMarkerHoverVisual,
      mountCustomRouteStopMarker,
      mountPlaceMarkerElement,
      createPlaceMarkers,
      resolvePlaceColor
    }),
    []
  );
}
