import { useEffect, useRef } from 'react';
import { createEndpointMarkerElement } from '../../components/mapComponents/createEndpointMarkerElement';
import type { RouteEndpointPoint } from './mapPaneTypes';

type UseEndpointMarkersParams = {
  map: google.maps.Map | null;
  elevationChartFocused: boolean;
  routeStatus: string;
  startPoint: RouteEndpointPoint | null;
  destinationPoint: RouteEndpointPoint | null;
};

export function useEndpointMarkers({
  map,
  elevationChartFocused,
  routeStatus,
  startPoint,
  destinationPoint
}: UseEndpointMarkersParams) {
  const startMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const destinationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (!map) return;

    if (elevationChartFocused) {
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
  }, [destinationPoint, elevationChartFocused, map, routeStatus, startPoint]);
}
