import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureUserLocationMarker } from '../../components/mapComponents/ensureUserLocationMarker';
import { useErrorToast } from '../../context/ErrorToastContext';
import { detectUserLocation, isApproximateUserLocation, type UserLocation } from '../../utils/detectUserLocation';
import { hasMapViewportInUrl } from '../../utils/mapUrlState';

type UseUserLocationParams = {
  mapRef: React.RefObject<google.maps.Map | null>;
  isReady?: boolean;
  autoLocateOnLoad?: boolean;
};

let hasAttemptedInitialLocate = false;

const BROWSER_ZOOM = 16;
const APPROXIMATE_ZOOM = 12;

const getGeolocationErrorMessage = (error: GeolocationPositionError) => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission denied.';
    case error.POSITION_UNAVAILABLE:
      return 'Current position is unavailable.';
    case error.TIMEOUT:
      return 'Location request timed out.';
    default:
      return 'Unknown geolocation error.';
  }
};

function locationErrorMessage(text: string) {
  return (
    <>
      <strong>Error:</strong> {text}
    </>
  );
}

function panMapToUserLocation(map: google.maps.Map, userLocation: UserLocation) {
  const zoom = isApproximateUserLocation(userLocation) ? APPROXIMATE_ZOOM : BROWSER_ZOOM;
  map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
  map.setZoom(Math.max(map.getZoom() ?? 0, zoom));
}

export function useUserLocation({
  mapRef,
  isReady = false,
  autoLocateOnLoad = false
}: UseUserLocationParams) {
  const { showErrorToast } = useErrorToast();
  const userLocationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const isLocatingRef = useRef(false);
  const [isLocating, setIsLocating] = useState(false);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const showUserOnMap = useCallback(
    async (map: google.maps.Map, userLocation: UserLocation) => {
      panMapToUserLocation(map, userLocation);
      await ensureUserLocationMarker(map, userLocation, userLocationMarkerRef);
    },
    []
  );

  const locateUser = useCallback(
    async (options?: { silent?: boolean; allowGeoapifyFallback?: boolean }) => {
      const map = mapRef.current;
      if (!map || isLocatingRef.current) {
        return false;
      }

      isLocatingRef.current = true;
      setIsLocating(true);
      setError(null);

      try {
        const userLocation = await detectUserLocation({
          allowGeoapifyFallback: options?.allowGeoapifyFallback ?? false
        });
        setLocation(userLocation);
        await showUserOnMap(map, userLocation);
        return true;
      } catch (locateError) {
        const message =
          locateError instanceof GeolocationPositionError
            ? getGeolocationErrorMessage(locateError)
            : locateError instanceof Error
              ? locateError.message
              : 'Unable to access current location.';

        const nextError =
          locateError instanceof Error ? locateError : new Error('Unable to access current location.');

        console.warn(message, locateError);
        setError(nextError);

        if (!options?.silent) {
          showErrorToast({
            variant: 'error',
            title: 'Unable to locate you',
            message: locationErrorMessage(message)
          });
        }

        return false;
      } finally {
        isLocatingRef.current = false;
        setIsLocating(false);
      }
    },
    [mapRef, showErrorToast, showUserOnMap]
  );

  const handleLocateUser = useCallback(() => {
    void locateUser({ silent: false, allowGeoapifyFallback: true });
  }, [locateUser]);

  useEffect(() => {
    if (!isReady || !location) {
      return;
    }

    const map = mapRef.current;
    if (!map) {
      return;
    }

    void ensureUserLocationMarker(map, location, userLocationMarkerRef);
  }, [isReady, location, mapRef]);

  useEffect(() => {
    if (!autoLocateOnLoad || !isReady || hasAttemptedInitialLocate) {
      return;
    }

    hasAttemptedInitialLocate = true;

    if (hasMapViewportInUrl()) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      void locateUser({ silent: true, allowGeoapifyFallback: false });
    });

    return () => {
      cancelled = true;
    };
  }, [autoLocateOnLoad, isReady, locateUser]);

  return {
    handleLocateUser,
    isLocating,
    location,
    error
  };
}
