import { useCallback } from 'react';

const MIN_ZOOM = 3;
const MAX_ZOOM = 21;

type MapNavigationControlsProps = {
  map: google.maps.Map | null;
};

export function MapNavigationControls({ map }: Readonly<MapNavigationControlsProps>) {
  const handleZoomIn = useCallback(() => {
    if (!map) return;
    const currentZoom = map.getZoom() ?? MIN_ZOOM;
    map.setZoom(Math.min(currentZoom + 1, MAX_ZOOM));
  }, [map]);

  const handleZoomOut = useCallback(() => {
    if (!map) return;
    const currentZoom = map.getZoom() ?? MIN_ZOOM;
    map.setZoom(Math.max(currentZoom - 1, MIN_ZOOM));
  }, [map]);

  if (!map) {
    return null;
  }

  return (
    <div className="map-float map-nav-controls">
      <button
        className="map-nav-controls-btn"
        type="button"
        onClick={handleZoomIn}
        aria-label="Zoom in">
        +
      </button>

      <div className="map-nav-controls-divider" aria-hidden="true" />

      <button
        className="map-nav-controls-btn"
        type="button"
        onClick={handleZoomOut}
        aria-label="Zoom out">
        −
      </button>
    </div>
  );
}
