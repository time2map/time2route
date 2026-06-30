import { useEffect } from 'react';
import { writeMapViewportToUrl } from '../../utils/mapUrlState';

export function useMapUrlSync(map: google.maps.Map | null) {
  useEffect(() => {
    if (!map) {
      return;
    }

    const listener = map.addListener('idle', () => {
      const center = map.getCenter();
      const zoom = map.getZoom();

      if (!center || zoom == null) {
        return;
      }

      writeMapViewportToUrl({
        lat: center.lat(),
        lng: center.lng(),
        zoom
      });
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map]);
}
