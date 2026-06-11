import { useEffect, useState } from 'react';
import {
  buildAndDrawRoute,
  clearRouteFromMap,
  formatDistance,
  formatDuration
} from '../../utils/googleRouteLayer';
import { getRouteElevationStats } from '../../utils/elevationUtils';
import { filterPlacesNearRoute, updateInterestingPlacesAlongRoute } from '../../utils/placesAlongRoute';
import { searchPlacesAlongRoute } from '../../api/secrchPlacesAlongRoute';
import { useErrorToast } from '../../context/ErrorToastContext';

const NO_PLACES_FOUND_MESSAGE = "Couldn't find a place. Try to choose another area.";
import type { ActivityMode, ElevationStats, InterestingPlace, RouteIntermediatePoint } from '../../utils/types';
import type { PlaceMapPopupAction } from '../../components/mapComponents/placeMapPopup';
import type { PlaceMarker, PlaceMarkerPopupContext } from '../useMapPaneMarkers';
import type { PlacePhotoState } from '../usePlacePhotoCache';

type RouteInfoChange = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  distance: string;
  duration: string;
  elevation: ElevationStats | null;
  interestingPlaces: InterestingPlace[];
  routePath: Array<{ lat: number; lng: number }>;
  errorMessage?: string;
};

type UseRouteBuilderParams = {
  map: google.maps.Map | null;
  apiKey: string | undefined;
  routeBuilt: boolean;
  buildNonce: number;
  mode: ActivityMode;
  origin: string;
  destination: string;
  intermediates: RouteIntermediatePoint[];
  refreshPlaces: boolean;
  onRouteInfoChange: (routeInfo: RouteInfoChange) => void;
  fitRoute: (routePath: google.maps.LatLngLiteral[]) => void;
  clearPlaceMarkers: () => void;
  clearCustomRouteStopMarkers: () => void;
  clearRouteProgressHighlight: () => void;
  createPlaceMarkers: (params: {
    map: google.maps.Map;
    popupContext: PlaceMarkerPopupContext;
    interestingPlaces: InterestingPlace[];
    hoveredPlaceId: string | null;
    onMarkerHover: (placeId: string | null) => void;
  }) => Promise<PlaceMarker[]>;
  placeMarkersRef: React.RefObject<PlaceMarker[]>;
  routePlacesRef: React.RefObject<InterestingPlace[]>;
  placePopupIdRef: React.RefObject<string | null>;
  selectedPlaceRef: React.RefObject<string | null>;
  hoveredPlaceIdRef: React.RefObject<string | null>;
  placePhotoCacheRef: React.RefObject<Record<string, PlacePhotoState>>;
  handlePlaceMarkerClickRef: React.RefObject<(placeId: string) => void>;
  handlePlaceMarkerHoverRef: React.RefObject<(placeId: string | null) => void>;
  handlePlacePopupActionRef: React.RefObject<(action: PlaceMapPopupAction, place: InterestingPlace) => void>;
  lastRoutePathRef: React.MutableRefObject<google.maps.LatLngLiteral[]>;
};

export function useRouteBuilder({
  map,
  apiKey,
  routeBuilt,
  buildNonce,
  mode,
  origin,
  destination,
  intermediates,
  refreshPlaces,
  onRouteInfoChange,
  fitRoute,
  clearPlaceMarkers,
  clearCustomRouteStopMarkers,
  clearRouteProgressHighlight,
  createPlaceMarkers,
  placeMarkersRef,
  routePlacesRef,
  placePopupIdRef,
  selectedPlaceRef,
  hoveredPlaceIdRef,
  placePhotoCacheRef,
  handlePlaceMarkerClickRef,
  handlePlaceMarkerHoverRef,
  handlePlacePopupActionRef,
  lastRoutePathRef
}: UseRouteBuilderParams) {
  const [distanceLabel, setDistanceLabel] = useState('—');
  const { showErrorToast } = useErrorToast();

  useEffect(() => {
    if (!map) return;

    if (!routeBuilt) {
      lastRoutePathRef.current = [];
      clearPlaceMarkers();
      clearCustomRouteStopMarkers();
      clearRouteProgressHighlight();
      clearRouteFromMap();
      return;
    }

    if (!origin.trim() || !destination.trim()) {
      clearPlaceMarkers();
      onRouteInfoChange({
        status: 'idle',
        distance: '—',
        duration: '—',
        elevation: null,
        interestingPlaces: [],
        routePath: []
      });
      return;
    }

    let disposed = false;

    void buildAndDrawRoute({
      map,
      origin,
      destination,
      activityMode: mode,
      intermediates,
      fitBounds: false
    })
      .then((result) => {
        if (disposed) return;
        const distance = formatDistance(result.distanceMeters);
        const duration = formatDuration(result.durationMillis);
        setDistanceLabel(distance);
        const routePath =
          result.path?.map((point) => ({
            lat: point.lat,
            lng: point.lng
          })) ?? [];

        lastRoutePathRef.current = routePath;
        fitRoute(routePath);

        const applyRouteInfo = (elevation: ElevationStats | null) => {
          const encodedPolyline = result.encodedPolyline;
          const placeSearchParams =
            refreshPlaces && encodedPolyline && apiKey && routePath.length > 1
              ? { encodedPolyline, apiKey }
              : null;

          const placesPromise = placeSearchParams
              ? searchPlacesAlongRoute({
                  ...placeSearchParams,
                  languageCode: 'en'
                })
                  .then((rawPlaces) =>
                    filterPlacesNearRoute({
                      places: rawPlaces,
                      routePath,
                      activityMode: mode
                    })
                  )
                  .catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : 'Places search failed';
                    console.error(message);
                    return [];
                  })
              : Promise.resolve(
                  updateInterestingPlacesAlongRoute(routePlacesRef.current, routePath)
                );

          void placesPromise.then((interestingPlaces) => {
            if (disposed) return;

            if (placeSearchParams && interestingPlaces.length === 0) {
              showErrorToast({
                variant: 'info',
                title: NO_PLACES_FOUND_MESSAGE,
                message: '',
                autoHideMs: 10000
              });
            }

            clearPlaceMarkers();
            void createPlaceMarkers({
              map,
              popupContext: {
                placePopupId: placePopupIdRef.current,
                selectedPlace: selectedPlaceRef.current,
                hoveredPlaceId: hoveredPlaceIdRef.current,
                routeStopIds: new Set(intermediates.map((stop) => stop.id)),
                placePhotos: placePhotoCacheRef.current,
                onPlaceMarkerClick: (placeId) => {
                  handlePlaceMarkerClickRef.current(placeId);
                },
                onPopupAction: (action, place) => {
                  handlePlacePopupActionRef.current(action, place);
                }
              },
              interestingPlaces,
              hoveredPlaceId: hoveredPlaceIdRef.current,
              onMarkerHover: (placeId) => {
                handlePlaceMarkerHoverRef.current(placeId);
              }
            }).then((createdMarkers) => {
              if (disposed) return;
              placeMarkersRef.current = createdMarkers;
            });

            onRouteInfoChange({
              status: 'ready',
              distance,
              duration,
              elevation,
              interestingPlaces,
              routePath
            });
          });
        };

        if (result.path && result.path.length > 1) {
          void getRouteElevationStats(result.path, {
            distanceMeters: result.distanceMeters,
            encodedPolyline: result.encodedPolyline
          })
            .then((stats) => {
              if (disposed) return;
              applyRouteInfo(stats);
            })
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Elevation build failed';
              console.error(message);
              applyRouteInfo(null);
            });
        } else {
          applyRouteInfo(null);
        }
      })
      .catch((error: unknown) => {
        if (disposed) return;
        const message = error instanceof Error ? error.message : 'Route build failed';
        console.error(message);
        clearPlaceMarkers();
        clearRouteProgressHighlight();
        clearRouteFromMap();
        setDistanceLabel('—');
        onRouteInfoChange({
          status: 'error',
          distance: '—',
          duration: '—',
          elevation: null,
          interestingPlaces: refreshPlaces ? [] : routePlacesRef.current,
          routePath: [],
          errorMessage: message === 'Route not found' ? 'Route not found' : 'Unable to build route'
        });
      });

    return () => {
      disposed = true;
    };
  }, [
    apiKey,
    buildNonce,
    clearCustomRouteStopMarkers,
    clearPlaceMarkers,
    clearRouteProgressHighlight,
    createPlaceMarkers,
    destination,
    fitRoute,
    handlePlaceMarkerClickRef,
    handlePlaceMarkerHoverRef,
    handlePlacePopupActionRef,
    intermediates,
    map,
    mode,
    onRouteInfoChange,
    origin,
    placeMarkersRef,
    placePhotoCacheRef,
    placePopupIdRef,
    hoveredPlaceIdRef,
    refreshPlaces,
    routeBuilt,
    routePlacesRef,
    selectedPlaceRef,
    lastRoutePathRef,
    showErrorToast
  ]);

  return { lastRoutePathRef, distanceLabel };
}
