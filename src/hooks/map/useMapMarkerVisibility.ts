import { useEffect } from 'react';
import type { CustomRouteStopMarker, PlaceMarker } from '../useMapPaneMarkers';
import type { MapPickState } from './mapPaneTypes';

type UseMapMarkerVisibilityParams = {
  map: google.maps.Map | null;
  isReady: boolean;
  elevationChartFocused: boolean;
  mapPick: MapPickState | null;
  placeMarkersRef: React.RefObject<PlaceMarker[]>;
  customRouteStopMarkersRef: React.RefObject<CustomRouteStopMarker[]>;
  pickMarkerRef: React.RefObject<google.maps.marker.AdvancedMarkerElement | null>;
};

export function useMapMarkerVisibility({
  map,
  isReady,
  elevationChartFocused,
  mapPick,
  placeMarkersRef,
  customRouteStopMarkersRef,
  pickMarkerRef
}: UseMapMarkerVisibilityParams) {
  useEffect(() => {
    if (!map || !isReady) return;

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
  }, [customRouteStopMarkersRef, elevationChartFocused, isReady, map, mapPick, pickMarkerRef, placeMarkersRef]);
}
