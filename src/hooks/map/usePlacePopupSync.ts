import { useCallback, useEffect, useRef, useState } from 'react';
import { getGoogleMapsPlaceUrl } from '../../utils/googleMapsPlaceUrl';
import {
  focusMapOnPlaceMarker,
  getPlaceMarkerFocusPadding,
  restoreMapViewportPadding
} from '../../utils/focusMapOnPlaceMarker';
import { getRouteFitPadding } from './getRouteFitPadding';
import { isMobileViewport } from '../../utils/mobileRouteSheetSnap';
import type { PlaceMapPopupAction } from '../../components/mapComponents/placeMapPopup';
import {
  useMapPaneMarkers,
  type CustomRouteStopMarker,
  type PlaceMarker
} from '../useMapPaneMarkers';
import type { InterestingPlace, RouteIntermediatePoint } from '../../utils/types';

type UsePlacePopupSyncParams = {
  map: google.maps.Map | null;
  routeBuilt: boolean;
  selectedPlace: string | null;
  hoveredPlaceId: string | null;
  onSelectPlace: (placeId: string | null) => void;
  onHoveredPlaceChange?: (placeId: string | null) => void;
  intermediates: RouteIntermediatePoint[];
  onAddPlaceToRoute: (place: InterestingPlace) => void;
  onRemovePlaceFromRoute: (placeId: string) => void;
  placeMarkersRef: React.RefObject<PlaceMarker[]>;
  customRouteStopMarkersRef: React.RefObject<CustomRouteStopMarker[]>;
  routePlacesRef: React.RefObject<InterestingPlace[]>;
  clearPickMarker: () => void;
};

export function usePlacePopupSync({
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
}: UsePlacePopupSyncParams) {
  const {
    isSelectedPlaceMarker,
    updatePlaceMarkersZIndex,
    syncMarkerHoverVisual
  } = useMapPaneMarkers();

  const [placePopupId, setPlacePopupId] = useState<string | null>(null);
  const selectedPlaceRef = useRef<string | null>(null);
  const placePopupIdRef = useRef<string | null>(null);
  const hoveredPlaceIdRef = useRef<string | null>(null);

  const closePlacePopup = useCallback(() => {
    placePopupIdRef.current = null;
    selectedPlaceRef.current = null;
    setPlacePopupId(null);
    onSelectPlace(null);
  }, [onSelectPlace]);

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
      const nextHoveredId = placeId && isSelectedPlaceMarker(placeId, selectedId) ? null : placeId;

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
    [onHoveredPlaceChange, placeMarkersRef, isSelectedPlaceMarker, syncMarkerHoverVisual, updatePlaceMarkersZIndex]
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
          closePlacePopup();
        }
        return;
      }

      if (action === 'open-gmaps') {
        globalThis.open(getGoogleMapsPlaceUrl(place), '_blank', 'noreferrer');
      }
    },
    [closePlacePopup, intermediates, onAddPlaceToRoute, onRemovePlaceFromRoute]
  );

  const focusMapOnPlaceId = useCallback(
    (placeId: string) => {
      if (!map) return;

      const markerPlace = placeMarkersRef.current.find(({ id }) => id === placeId)?.place;
      const customPlace = customRouteStopMarkersRef.current.find(({ id }) => id === placeId)?.place;
      const listPlace = routePlacesRef.current.find((place) => place.id === placeId);
      const place = markerPlace ?? customPlace ?? listPlace;
      if (!place) return;

      const basePadding = isMobileViewport()
        ? getPlaceMarkerFocusPadding(map, true)
        : getRouteFitPadding(map);

      focusMapOnPlaceMarker(map, { lat: place.lat, lng: place.lng }, { basePadding });
    },
    [customRouteStopMarkersRef, map, placeMarkersRef, routePlacesRef]
  );

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
  }, [
    onHoveredPlaceChange,
    selectedPlace,
    isSelectedPlaceMarker,
    placeMarkersRef,
    syncMarkerHoverVisual,
    updatePlaceMarkersZIndex
  ]);

  useEffect(() => {
    const selectedId = selectedPlaceRef.current;
    const nextHoveredId =
      hoveredPlaceId && isSelectedPlaceMarker(hoveredPlaceId, selectedId) ? null : hoveredPlaceId;

    if (hoveredPlaceIdRef.current !== nextHoveredId) {
      hoveredPlaceIdRef.current = nextHoveredId;
      updatePlaceMarkersZIndex(placeMarkersRef.current, placePopupIdRef.current, selectedId, nextHoveredId);
    }

    syncMarkerHoverVisual(placeMarkersRef.current, nextHoveredId, selectedId);
  }, [
    hoveredPlaceId,
    isSelectedPlaceMarker,
    placeMarkersRef,
    syncMarkerHoverVisual,
    updatePlaceMarkersZIndex
  ]);

  useEffect(() => {
    placePopupIdRef.current = placePopupId;
    updatePlaceMarkersZIndex(
      placeMarkersRef.current,
      placePopupId,
      selectedPlaceRef.current,
      hoveredPlaceIdRef.current
    );
  }, [placePopupId, placeMarkersRef, updatePlaceMarkersZIndex]);

  useEffect(() => {
    if (!map || !routeBuilt) return;

    if (!selectedPlace) {
      restoreMapViewportPadding(map, getRouteFitPadding(map));
      return;
    }

    const frameId = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        focusMapOnPlaceId(selectedPlace);
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [focusMapOnPlaceId, map, routeBuilt, selectedPlace]);

  return {
    placePopupId,
    placePopupIdRef,
    selectedPlaceRef,
    hoveredPlaceIdRef,
    closePlacePopup,
    handlePlaceMarkerClick,
    handlePlaceMarkerHover,
    handlePlacePopupAction
  };
}
