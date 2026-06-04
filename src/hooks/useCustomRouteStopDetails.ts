import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { enrichInterestingPlace } from '../api/placeDetails';
import { getCustomRouteStops, routeStopToInterestingPlace } from '../components/mapComponents/customRouteStopMarker';
import type { InterestingPlace, RouteIntermediatePoint } from '../utils/types';

function needsPlaceEnrichment(place: InterestingPlace): boolean {
  return typeof place.rating !== 'number' && (place.photos?.length ?? 0) === 0;
}

export function useCustomRouteStopDetails(intermediates: RouteIntermediatePoint[], routePlaces: InterestingPlace[]) {
  const [detailsById, setDetailsById] = useState<Record<string, InterestingPlace>>({});
  const loadedIdsRef = useRef<Set<string>>(new Set());
  const inflightIdsRef = useRef<Set<string>>(new Set());

  const customStops = useMemo(() => getCustomRouteStops(intermediates, routePlaces), [intermediates, routePlaces]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

    customStops.forEach((stop) => {
      const basePlace = routeStopToInterestingPlace(stop);
      if (!needsPlaceEnrichment(basePlace)) {
        loadedIdsRef.current.add(stop.id);
        setDetailsById((previous) => (previous[stop.id] ? previous : { ...previous, [stop.id]: basePlace }));
        return;
      }

      if (loadedIdsRef.current.has(stop.id) || inflightIdsRef.current.has(stop.id)) {
        return;
      }

      inflightIdsRef.current.add(stop.id);

      void enrichInterestingPlace(basePlace, apiKey)
        .then((enriched) => {
          loadedIdsRef.current.add(stop.id);
          setDetailsById((previous) => ({
            ...previous,
            [stop.id]: enriched
          }));
        })
        .finally(() => {
          inflightIdsRef.current.delete(stop.id);
        });
    });
  }, [customStops]);

  const getCustomStopPlace = useCallback(
    (stop: RouteIntermediatePoint): InterestingPlace => {
      return detailsById[stop.id] ?? routeStopToInterestingPlace(stop);
    },
    [detailsById]
  );

  const customStopPlaces = useMemo(
    () => customStops.map((stop) => getCustomStopPlace(stop)),
    [customStops, getCustomStopPlace]
  );

  return { customStops, customStopPlaces, getCustomStopPlace };
}
