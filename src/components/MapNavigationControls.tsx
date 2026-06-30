import { useCallback, type SyntheticEvent } from 'react';

const MIN_ZOOM = 3;
const MAX_ZOOM = 21;

const stopMapGesturePropagation = (event: SyntheticEvent) => {
  event.stopPropagation();
};

const stopMapDoubleTapGesture = (event: SyntheticEvent) => {
  event.stopPropagation();
  event.preventDefault();
};

const mapGestureBlockProps = {
  onDoubleClick: stopMapDoubleTapGesture,
  onDoubleClickCapture: stopMapDoubleTapGesture,
  onTouchStartCapture: stopMapGesturePropagation,
  onTouchEndCapture: stopMapGesturePropagation,
  onPointerDownCapture: stopMapGesturePropagation
} as const;

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
    <div className="map-float map-nav-controls" {...mapGestureBlockProps}>
      <button
        className="map-nav-controls-btn"
        type="button"
        onClick={handleZoomIn}
        aria-label="Zoom in"
        {...mapGestureBlockProps}>
        +
      </button>

      <div className="map-nav-controls-divider" aria-hidden="true" />

      <button
        className="map-nav-controls-btn"
        type="button"
        onClick={handleZoomOut}
        aria-label="Zoom out"
        {...mapGestureBlockProps}>
        −
      </button>
    </div>
  );
}
