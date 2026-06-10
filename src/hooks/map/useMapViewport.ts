import { useCallback, useRef } from 'react';
import { getRouteSegmentAroundDistanceMeters } from '../../utils/routePolyline';
import { fitMapToRoutePath } from './fitMapToRoutePath';
import { getRouteFitPadding } from './getRouteFitPadding';

type UseMapViewportParams = {
  map: google.maps.Map | null;
  lastRoutePathRef: React.RefObject<google.maps.LatLngLiteral[]>;
};

export function useMapViewport({ map, lastRoutePathRef }: UseMapViewportParams) {
  const fitRouteFrameRef = useRef<number | null>(null);

  const fitRoute = useCallback(
    (routePath: google.maps.LatLngLiteral[]) => {
      if (!map || routePath.length < 2) return;

      if (fitRouteFrameRef.current) {
        cancelAnimationFrame(fitRouteFrameRef.current);
      }

      fitRouteFrameRef.current = requestAnimationFrame(() => {
        fitMapToRoutePath(map, routePath);
      });
    },
    [map]
  );

  const zoomToDistance = useCallback(
    (distanceKm: number) => {
      const routePath = lastRoutePathRef.current;
      if (!map || !routePath || routePath.length < 2) return;

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
    },
    [lastRoutePathRef, map]
  );

  return { fitRoute, zoomToDistance };
}
