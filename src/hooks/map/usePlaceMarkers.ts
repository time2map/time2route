import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useMapPaneMarkers,
  type CustomRouteStopMarker,
  type PlaceMarker,
  type PlaceMarkerPopupContext
} from '../useMapPaneMarkers';
import { usePlacePhotoCache, type PlacePhotoState } from '../usePlacePhotoCache';
import type { InterestingPlace, RouteIntermediatePoint } from '../../utils/types';
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
    clearPickMarker
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

  const syncPlaceMarkerElements = useCallback(() => {
    const popupContext: PlaceMarkerPopupContext = {
      placePopupId: popup.placePopupId,
      selectedPlace,
      hoveredPlaceId: popup.hoveredPlaceIdRef.current,
      routeStopIds: new Set(intermediates.map((stop) => stop.id)),
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
        popup.hoveredPlaceIdRef.current
      );
    });
  }, [
    intermediates,
    mountPlaceMarkerElement,
    placePhotoCache,
    popup,
    resolvePlaceColor,
    selectedPlace
  ]);

  const syncCustomRouteStopMarkerElements = useCallback(() => {
    const popupContext: PlaceMarkerPopupContext = {
      placePopupId: popup.placePopupId,
      selectedPlace,
      hoveredPlaceId: popup.hoveredPlaceIdRef.current,
      routeStopIds: new Set(intermediates.map((stop) => stop.id)),
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
    popup,
    selectedPlace
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
    popup.placePopupIdRef.current = popup.placePopupId;
    syncPlaceMarkerElements();
    syncCustomRouteStopMarkerElements();
  }, [
    popup.placePopupId,
    selectedPlace,
    hoveredPlaceId,
    syncCustomRouteStopMarkerElements,
    syncPlaceMarkerElements
  ]);

  useEffect(() => {
    placePhotoCacheRef.current = placePhotoCache;
  }, [placePhotoCache]);

  const handlePlaceMarkerClickRef = useRef(popup.handlePlaceMarkerClick);
  handlePlaceMarkerClickRef.current = popup.handlePlaceMarkerClick;
  const handlePlaceMarkerHoverRef = useRef(popup.handlePlaceMarkerHover);
  handlePlaceMarkerHoverRef.current = popup.handlePlaceMarkerHover;
  const handlePlacePopupActionRef = useRef(popup.handlePlacePopupAction);
  handlePlacePopupActionRef.current = popup.handlePlacePopupAction;

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
    handlePlacePopupAction: popup.handlePlacePopupAction
  };
}
