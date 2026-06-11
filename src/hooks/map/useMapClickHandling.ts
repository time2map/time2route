import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveMapPickFromPlaceId } from '../../api/placeAutocomplete';
import { useMapPaneMarkers } from '../useMapPaneMarkers';
import { ensurePickMarker } from '../../components/mapComponents/ensurePickMarker';
import { getFocusedLocationInputId, isLocationSearchInputFocused } from '../../utils/mapPointerToLatLng';
import type { MapPickState, RouteEndpointPoint } from './mapPaneTypes';

type UseMapClickHandlingParams = {
  map: google.maps.Map | null;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  isReady: boolean;
  routeBuilt: boolean;
  mapPickMode: boolean;
  mapPickDirectFillTarget: 'start' | 'destination' | null;
  onMapPickSetStart: (point: RouteEndpointPoint) => void;
  onMapPickSetDestination: (point: RouteEndpointPoint) => void;
  onMapPickCancel: () => void;
  closePlacePopup: () => void;
};

const MAP_CLICK_SUPPRESS_MS = 450;

function shouldSkipMapBlur(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest('.place-marker-wrapper, .map-pick-popup, .map-float, [data-location-field], .location-dropdown')
  );
}

export function useMapClickHandling({
  map,
  mapContainerRef,
  isReady,
  routeBuilt,
  mapPickMode,
  mapPickDirectFillTarget,
  onMapPickSetStart,
  onMapPickSetDestination,
  onMapPickCancel,
  closePlacePopup
}: UseMapClickHandlingParams) {
  const { suppressDefaultPoiInfoWindow, isMapPoiClickEvent } = useMapPaneMarkers();
  const pickMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const pickPinElRef = useRef<HTMLDivElement | null>(null);
  const ignoreNextMapPickClickRef = useRef(false);
  const suppressMapPickUntilRef = useRef(0);
  const wasMapPickModeRef = useRef(false);
  const [mapPick, setMapPick] = useState<MapPickState | null>(null);

  const clearPickMarker = useCallback(() => {
    if (pickMarkerRef.current) {
      pickMarkerRef.current.map = null;
      pickMarkerRef.current = null;
    }
    pickPinElRef.current = null;
    setMapPick(null);
  }, []);

  const showPickPopup = useCallback(
    (point: MapPickState) => {
      if (!map) return;

      closePlacePopup();

      void ensurePickMarker(map, { lat: point.lat, lng: point.lng }, pickMarkerRef, pickPinElRef).then(() => {
        setMapPick(point);
      });
    },
    [closePlacePopup, map]
  );

  const processMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (isLocationSearchInputFocused() && !mapPickDirectFillTarget) {
        return;
      }

      const shouldSuppressMapPick =
        ignoreNextMapPickClickRef.current || Date.now() < suppressMapPickUntilRef.current;

      if (shouldSuppressMapPick) {
        ignoreNextMapPickClickRef.current = false;
        return;
      }

      suppressDefaultPoiInfoWindow(event);

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
        const address = response.results[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const name = address.split(',')[0]?.trim() || address;
        handleResolvedPick({ lat, lng, name, address });
      });
    },
    [
      clearPickMarker,
      closePlacePopup,
      isMapPoiClickEvent,
      mapPickDirectFillTarget,
      onMapPickSetDestination,
      onMapPickSetStart,
      routeBuilt,
      showPickPopup,
      suppressDefaultPoiInfoWindow
    ]
  );

  useEffect(() => {
    if (!map || !isReady) return;

    map.setOptions({ clickableIcons: true });

    const container = mapContainerRef.current;
    const allowMapPick = !routeBuilt || mapPickMode;
    if (allowMapPick && container) {
      container.style.cursor = 'crosshair';
    } else if (container) {
      container.style.cursor = '';
    }

    const listener = map.addListener('click', processMapClick);

    return () => {
      google.maps.event.removeListener(listener);
      if (container) {
        container.style.cursor = '';
      }
    };
  }, [isReady, map, mapContainerRef, mapPickMode, processMapClick, routeBuilt]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!map || !isReady || !container) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const focusedInputId = getFocusedLocationInputId();
      if (!focusedInputId) {
        return;
      }

      if (!(event.target instanceof Node) || !container.contains(event.target)) {
        return;
      }

      if (shouldSkipMapBlur(event.target)) {
        document.activeElement instanceof HTMLElement && document.activeElement.blur();
        return;
      }

      document.activeElement instanceof HTMLElement && document.activeElement.blur();

      if (focusedInputId !== 'map-area-search' && mapPickDirectFillTarget) {
        return;
      }

      suppressMapPickUntilRef.current = Date.now() + MAP_CLICK_SUPPRESS_MS;

      if (focusedInputId !== 'map-area-search') {
        onMapPickCancel();
      }
    };

    container.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isReady, map, mapContainerRef, mapPickDirectFillTarget, onMapPickCancel]);

  useEffect(() => {
    if (wasMapPickModeRef.current && !mapPickMode) {
      clearPickMarker();
    }
    wasMapPickModeRef.current = mapPickMode;
  }, [clearPickMarker, mapPickMode]);

  const ignoreNextClick = useCallback(() => {
    ignoreNextMapPickClickRef.current = true;
    suppressMapPickUntilRef.current = Date.now() + MAP_CLICK_SUPPRESS_MS;
  }, []);

  return {
    mapPick,
    clearPickMarker,
    pickMarkerRef,
    pickPinElRef,
    ignoreNextMapPickClickRef,
    ignoreNextClick,
    showPickPopup,
    onMapPickCancel
  };
}
