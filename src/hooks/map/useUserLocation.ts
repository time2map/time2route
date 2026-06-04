import { useCallback, useRef, useState } from 'react';

type UseUserLocationParams = {
  map: google.maps.Map | null;
};

export function useUserLocation({ map }: UseUserLocationParams) {
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleLocateUser = useCallback(() => {
    if (!map || isLocating) return;

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not supported in this browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
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
        setIsLocating(false);
      },
      (error) => {
        console.warn('Unable to access current location', error);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, [isLocating, map]);

  return { handleLocateUser, isLocating };
}
