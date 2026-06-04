import { useCallback, useEffect } from 'react';
import { routeStopToInterestingPlace } from '../../components/mapComponents/customRouteStopMarker';
import { getCustomRouteStops } from '../../components/mapComponents/customRouteStopMarker';
import type { CustomRouteStopMarker } from '../useMapPaneMarkers';
import type { InterestingPlace, RouteIntermediatePoint } from '../../utils/types';

type UseCustomRouteStopMarkersParams = {
  map: google.maps.Map | null;
  isReady: boolean;
  routeBuilt: boolean;
  intermediates: RouteIntermediatePoint[];
  routePlaces: InterestingPlace[];
  customStopPlaces: InterestingPlace[];
  elevationChartFocused: boolean;
  customRouteStopMarkersRef: React.MutableRefObject<CustomRouteStopMarker[]>;
  clearCustomRouteStopMarkers: () => void;
  syncCustomRouteStopMarkerElements: () => void;
};

export function useCustomRouteStopMarkers({
  map,
  isReady,
  routeBuilt,
  intermediates,
  routePlaces,
  customStopPlaces,
  elevationChartFocused,
  customRouteStopMarkersRef,
  clearCustomRouteStopMarkers,
  syncCustomRouteStopMarkerElements
}: UseCustomRouteStopMarkersParams) {
  const getCustomStopPlace = useCallback(
    (stop: RouteIntermediatePoint) =>
      customStopPlaces.find((place) => place.id === stop.id) ?? routeStopToInterestingPlace(stop),
    [customStopPlaces]
  );

  useEffect(() => {
    if (!map || !isReady || !routeBuilt) {
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
      const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
      if (disposed) return;

      const stopIds = new Set(customStops.map((stop) => stop.id));
      customRouteStopMarkersRef.current = customRouteStopMarkersRef.current.filter(({ id, marker }) => {
        if (!stopIds.has(id)) {
          marker.map = null;
          return false;
        }
        return true;
      });

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
    customRouteStopMarkersRef,
    elevationChartFocused,
    getCustomStopPlace,
    intermediates,
    isReady,
    map,
    routeBuilt,
    routePlaces,
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
  }, [customRouteStopMarkersRef, customStopPlaces, getCustomStopPlace, intermediates, syncCustomRouteStopMarkerElements]);
}
