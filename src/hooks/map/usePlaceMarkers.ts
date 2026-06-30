import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useMapPaneMarkers,
  type CustomRouteStopMarker,
  type PlaceMarker,
  type PlaceMarkerPopupContext
} from '../useMapPaneMarkers';
import { usePlacePhotoCache, type PlacePhotoState, getPlacePhotoViewState } from '../usePlacePhotoCache';
import type { InterestingPlace, RouteIntermediatePoint } from '../../utils/types';
import { isMobileViewport } from '../../utils/mobileRouteSheetSnap';
import { usePlacePopupSync } from './usePlacePopupSync';

type UsePlaceMarkersParams = {
  map: google.maps.Map | null;
  routeBuilt: boolean;
  routePlaces: InterestingPlace[];
  customStopPlaces: InterestingPlace[];
  intermediates: RouteIntermediatePoint[];
  selectedPlace: string | null;
  hoveredPlaceId: string | null;
  onSelectPlace: (placeId: string | null) => void;
  onHoveredPlaceChange?: (placeId: string | null) => void;
  onAddPlaceToRoute: (place: InterestingPlace) => void;
  onRemovePlaceFromRoute: (placeId: string) => void;
  clearPickMarker: () => void;
  routeStopsHintActive?: boolean;
};

export function usePlaceMarkers(params: UsePlaceMarkersParams) {
  const {
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
    clearPickMarker,
    routeStopsHintActive = false
  } = params;

  const { mountPlaceMarkerElement, mountCustomRouteStopMarker, createPlaceMarkers, resolvePlaceColor } =
    useMapPaneMarkers();

  const placeMarkersRef = useRef<PlaceMarker[]>([]);
  const customRouteStopMarkersRef = useRef<CustomRouteStopMarker[]>([]);
  const routePlacesRef = useRef<InterestingPlace[]>([]);
  const placePhotoCacheRef = useRef<Record<string, PlacePhotoState>>({});

  const popupPlaces = useMemo(
    () => [...routePlaces, ...customStopPlaces],
    [customStopPlaces, routePlaces]
  );

  const popup = usePlacePopupSync({
    map,
    routeBuilt,
    selectedPlace,
    hoveredPlaceId,
    onSelectPlace,
    onHoveredPlaceChange,
    intermediates,
    onAddPlaceToRoute,
    onRemovePlaceFromRoute,
    placeMarkersRef,
    customRouteStopMarkersRef,
    routePlacesRef,
    clearPickMarker
  });

  const placePhotoCache = usePlacePhotoCache(popup.placePopupId, popupPlaces, { maxWidthPx: 520 });
  const centerPopupOnScreen = isMobileViewport();
  const activePopupPlace = useMemo(
    () =>
      popup.placePopupId
        ? popupPlaces.find((place) => place.id === popup.placePopupId) ?? null
        : null,
    [popup.placePopupId, popupPlaces]
  );
  const activePopupPhoto = activePopupPlace
    ? getPlacePhotoViewState(placePhotoCache, activePopupPlace.id)
    : undefined;

  const syncPlaceMarkerElements = useCallback(() => {
    const popupContext: PlaceMarkerPopupContext = {
      placePopupId: popup.placePopupId,
      selectedPlace,
      hoveredPlaceId,
      routeStopIds: new Set(intermediates.map((stop) => stop.id)),
      routeStopsHintActive,
      centerPopupOnScreen,
      placePhotos: placePhotoCache,
      onPlaceMarkerClick: popup.handlePlaceMarkerClick,
      onPopupAction: popup.handlePlacePopupAction
    };

    placeMarkersRef.current.forEach((placeMarker) => {
      mountPlaceMarkerElement(
        placeMarker,
        popupContext,
        resolvePlaceColor(placeMarker.place),
        {
          onMarkerClick: popup.handlePlaceMarkerClick,
          onMarkerHover: popup.handlePlaceMarkerHover
        },
        hoveredPlaceId
      );
    });
  }, [
    intermediates,
    mountPlaceMarkerElement,
    placePhotoCache,
    popup.handlePlaceMarkerClick,
    popup.handlePlaceMarkerHover,
    popup.handlePlacePopupAction,
    popup.placePopupId,
    resolvePlaceColor,
    routeStopsHintActive,
    selectedPlace,
    centerPopupOnScreen,
    hoveredPlaceId
  ]);

  const syncCustomRouteStopMarkerElements = useCallback(() => {
    const popupContext: PlaceMarkerPopupContext = {
      placePopupId: popup.placePopupId,
      selectedPlace,
      hoveredPlaceId,
      routeStopIds: new Set(intermediates.map((stop) => stop.id)),
      routeStopsHintActive,
      centerPopupOnScreen,
      placePhotos: placePhotoCache,
      onPlaceMarkerClick: popup.handlePlaceMarkerClick,
      onPopupAction: popup.handlePlacePopupAction
    };

    customRouteStopMarkersRef.current.forEach((entry) => {
      mountCustomRouteStopMarker(entry, popupContext, {
        onMarkerClick: popup.handlePlaceMarkerClick,
        onMarkerHover: popup.handlePlaceMarkerHover
      });
    });
  }, [
    intermediates,
    mountCustomRouteStopMarker,
    placePhotoCache,
    popup.handlePlaceMarkerClick,
    popup.handlePlaceMarkerHover,
    popup.handlePlacePopupAction,
    popup.placePopupId,
    routeStopsHintActive,
    selectedPlace,
    centerPopupOnScreen,
    hoveredPlaceId
  ]);

  const clearPlaceMarkers = useCallback(() => {
    placeMarkersRef.current.forEach(({ marker }) => {
      marker.map = null;
    });
    placeMarkersRef.current = [];
  }, []);

  const clearCustomRouteStopMarkers = useCallback(() => {
    customRouteStopMarkersRef.current.forEach(({ marker }) => {
      marker.map = null;
    });
    customRouteStopMarkersRef.current = [];
  }, []);

  useEffect(() => {
    routePlacesRef.current = routePlaces;
  }, [routePlaces]);

  useEffect(() => {
    syncPlaceMarkerElements();
  }, [syncPlaceMarkerElements]);

  useEffect(() => {
    syncCustomRouteStopMarkerElements();
  }, [placePhotoCache, popup.placePopupId, selectedPlace, syncCustomRouteStopMarkerElements]);

  useEffect(() => {
    syncPlaceMarkerElements();
    syncCustomRouteStopMarkerElements();
  }, [
    popup.placePopupId,
    routeStopsHintActive,
    selectedPlace,
    hoveredPlaceId,
    syncCustomRouteStopMarkerElements,
    syncPlaceMarkerElements
  ]);

  useEffect(() => {
    placePhotoCacheRef.current = placePhotoCache;
  }, [placePhotoCache]);

  const handlePlaceMarkerClickRef = useRef(popup.handlePlaceMarkerClick);
  const handlePlaceMarkerHoverRef = useRef(popup.handlePlaceMarkerHover);
  const handlePlacePopupActionRef = useRef(popup.handlePlacePopupAction);

  useEffect(() => {
    handlePlaceMarkerClickRef.current = popup.handlePlaceMarkerClick;
    handlePlaceMarkerHoverRef.current = popup.handlePlaceMarkerHover;
    handlePlacePopupActionRef.current = popup.handlePlacePopupAction;
  }, [popup.handlePlaceMarkerClick, popup.handlePlaceMarkerHover, popup.handlePlacePopupAction]);

  return {
    placeMarkersRef,
    customRouteStopMarkersRef,
    routePlacesRef,
    placePhotoCacheRef,
    placePopupIdRef: popup.placePopupIdRef,
    selectedPlaceRef: popup.selectedPlaceRef,
    hoveredPlaceIdRef: popup.hoveredPlaceIdRef,
    clearPlaceMarkers,
    clearCustomRouteStopMarkers,
    syncPlaceMarkerElements,
    syncCustomRouteStopMarkerElements,
    createPlaceMarkers,
    handlePlaceMarkerClickRef,
    handlePlaceMarkerHoverRef,
    handlePlacePopupActionRef,
    placePopupId: popup.placePopupId,
    closePlacePopup: popup.closePlacePopup,
    handlePlaceMarkerClick: popup.handlePlaceMarkerClick,
    handlePlaceMarkerHover: popup.handlePlaceMarkerHover,
    handlePlacePopupAction: popup.handlePlacePopupAction,
    centerPopupOnScreen,
    activePopupPlace,
    activePopupPhotoUrl: activePopupPhoto?.url,
    activePopupPhotoLoading: activePopupPhoto?.loading,
    isActivePopupAddedToRoute: activePopupPlace
      ? intermediates.some((stop) => stop.id === activePopupPlace.id)
      : false
  };
}
