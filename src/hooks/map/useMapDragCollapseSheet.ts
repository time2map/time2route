import { useEffect } from 'react';
import { isMobileViewport } from '../../utils/mobileRouteSheetSnap';

export function useMapDragCollapseSheet(
  map: google.maps.Map | null,
  onMapUserMove?: () => void
) {
  useEffect(() => {
    if (!map || !onMapUserMove) {
      return;
    }

    const listener = map.addListener('dragstart', () => {
      if (!isMobileViewport()) {
        return;
      }

      onMapUserMove();
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onMapUserMove]);
}
