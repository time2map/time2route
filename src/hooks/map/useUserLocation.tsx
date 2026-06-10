import { useCallback, useRef, useState } from 'react';
import { useErrorToast } from '../../context/ErrorToastContext';

type UseUserLocationParams = {
  mapRef: React.RefObject<google.maps.Map | null>;
};

const locate = (options: PositionOptions) =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });

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

export function useUserLocation({ mapRef }: UseUserLocationParams) {
  const { showErrorToast } = useErrorToast();
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleLocateUser = useCallback(async () => {
    const map = mapRef.current;
    if (!map || isLocating) return;

    if (!('geolocation' in navigator)) {
      showErrorToast({
        variant: 'error',
        title: 'Unable to locate you',
        message: locationErrorMessage('Geolocation is not supported in this browser.')
      });
      return;
    }

    setIsLocating(true);

    try {
      let position: GeolocationPosition;

      try {
        position = await locate({
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 5 * 60 * 1000
        });
      } catch (firstError) {
        console.warn('Default geolocation failed, retrying with high accuracy', firstError);

        position = await locate({
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        });
      }

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      map.panTo(location);
      map.setZoom(Math.max(map.getZoom() ?? 0, 16));

      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setPosition(location);
      } else {
        userLocationMarkerRef.current = new google.maps.Marker({
          map,
          position: location,
          title: 'My location'
        });
      }
    } catch (error) {
      const message =
        error instanceof GeolocationPositionError
          ? getGeolocationErrorMessage(error)
          : 'Unable to access current location.';

      console.warn(message, error);
      showErrorToast({
        variant: 'error',
        title: 'Unable to locate you',
        message: locationErrorMessage(message)
      });
    } finally {
      setIsLocating(false);
    }
  }, [isLocating, mapRef, showErrorToast]);

  return { handleLocateUser, isLocating };
}
