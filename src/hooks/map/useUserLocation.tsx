import { useCallback, useEffect, useRef, useState } from 'react';
import { useErrorToast } from '../../context/ErrorToastContext';
import { getCurrentPosition } from '../../utils/resolveCurrentLocation';

type UseUserLocationParams = {
  mapRef: React.RefObject<google.maps.Map | null>;
  isReady?: boolean;
  autoLocateOnLoad?: boolean;
};

let hasAttemptedInitialLocate = false;

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

function showUserOnMap(
  map: google.maps.Map,
  location: google.maps.LatLngLiteral,
  markerRef: React.MutableRefObject<google.maps.Marker | null>
) {
  map.panTo(location);
  map.setZoom(Math.max(map.getZoom() ?? 0, 16));

  if (markerRef.current) {
    markerRef.current.setPosition(location);
    return;
  }

  markerRef.current = new google.maps.Marker({
    map,
    position: location,
    title: 'My location'
  });
}

export function useUserLocation({
  mapRef,
  isReady = false,
  autoLocateOnLoad = false
}: UseUserLocationParams) {
  const { showErrorToast } = useErrorToast();
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const locateUser = useCallback(
    async (options?: { silent?: boolean }) => {
      const map = mapRef.current;
      if (!map || isLocating) {
        return false;
      }

      setIsLocating(true);

      try {
        const position = await getCurrentPosition();
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        showUserOnMap(map, location, userLocationMarkerRef);
        return true;
      } catch (error) {
        const message =
          error instanceof GeolocationPositionError
            ? getGeolocationErrorMessage(error)
            : error instanceof Error
              ? error.message
              : 'Unable to access current location.';

        console.warn(message, error);

        if (!options?.silent) {
          showErrorToast({
            variant: 'error',
            title: 'Unable to locate you',
            message: locationErrorMessage(message)
          });
        }

        return false;
      } finally {
        setIsLocating(false);
      }
    },
    [isLocating, mapRef, showErrorToast]
  );

  const handleLocateUser = useCallback(() => {
    void locateUser({ silent: false });
  }, [locateUser]);

  useEffect(() => {
    if (!autoLocateOnLoad || !isReady || hasAttemptedInitialLocate) {
      return;
    }

    hasAttemptedInitialLocate = true;
    void locateUser({ silent: true });
  }, [autoLocateOnLoad, isReady, locateUser]);

  return { handleLocateUser, isLocating };
}
