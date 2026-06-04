import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';

type MobileRouteSheetProps = {
  expanded: boolean;
  expandedSnap?: 'middle' | 'intermediate';
  routeBuilt: boolean;
  title: string;
  planner: ReactNode;
  overview: ReactNode;
  onExpandedChange: (expanded: boolean) => void;
};

const TOP_GAP_PX = 16;
const INTERMEDIATE_HEIGHT_PX = 396;

function getViewportHeight() {
  return globalThis.window.visualViewport?.height ?? globalThis.window.innerHeight;
}

function getSheetSnapPoints(routeBuilt: boolean) {
  const viewportHeight = getViewportHeight();

  const min = routeBuilt ? 108 : 128;
  const max = Math.max(min, viewportHeight - TOP_GAP_PX);
  const middle = Math.min(Math.max(min + 220, viewportHeight * 0.55), max);
  const intermediate = clamp(INTERMEDIATE_HEIGHT_PX, min, max);

  return {
    min,
    middle,
    intermediate,
    max
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getNearestSnapPoint(
  height: number,
  snapPoints: { min: number; middle: number; intermediate: number; max: number }
) {
  const points = [snapPoints.min, snapPoints.middle, snapPoints.intermediate, snapPoints.max];

  return points.reduce((nearest, point) => (
    Math.abs(point - height) < Math.abs(nearest - height)
      ? point
      : nearest
  ), points[0]);
}

function getUniqueSnapPoints(snapPoints: {
  min: number;
  middle: number;
  intermediate: number;
  max: number;
}) {
  return Array.from(new Set([
    snapPoints.min,
    snapPoints.middle,
    snapPoints.intermediate,
    snapPoints.max
  ])).sort((a, b) => a - b);
}

export function MobileRouteSheet({
  expanded,
  expandedSnap = 'intermediate',
  routeBuilt,
  title,
  planner,
  overview,
  onExpandedChange
}: Readonly<MobileRouteSheetProps>) {
  const initialHeight = (() => {
    if (globalThis.window === undefined) {
      return 128;
    }
    const snapPoints = getSheetSnapPoints(routeBuilt);
    if (!expanded) return snapPoints.min;
    return expandedSnap === 'middle' ? snapPoints.middle : snapPoints.intermediate;
  })();

  const [sheetHeight, setSheetHeight] = useState(initialHeight);
  const [dragging, setDragging] = useState(false);

  const sheetHeightRef = useRef(sheetHeight);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const didDragRef = useRef(false);
  const skipNextExpandedSyncRef = useRef(false);

  const applySheetHeight = useCallback((height: number) => {
    sheetHeightRef.current = height;
    setSheetHeight(height);
  }, []);

  const snapToHeight = useCallback((height: number, notifyParent = true) => {
    const snapPoints = getSheetSnapPoints(routeBuilt);
    const nextHeight = clamp(height, snapPoints.min, snapPoints.max);

    applySheetHeight(nextHeight);

    if (notifyParent) {
      skipNextExpandedSyncRef.current = true;
      onExpandedChange(nextHeight > snapPoints.min + 8);
    }
  }, [applySheetHeight, onExpandedChange, routeBuilt]);

  useEffect(() => {
    const syncHeightWithViewport = () => {
      const snapPoints = getSheetSnapPoints(routeBuilt);
      const currentHeight = sheetHeightRef.current;
      applySheetHeight(clamp(currentHeight, snapPoints.min, snapPoints.max));
    };

    window.addEventListener('resize', syncHeightWithViewport);
    window.visualViewport?.addEventListener('resize', syncHeightWithViewport);

    return () => {
      window.removeEventListener('resize', syncHeightWithViewport);
      window.visualViewport?.removeEventListener('resize', syncHeightWithViewport);
    };
  }, [applySheetHeight, routeBuilt]);

  useEffect(() => {
    if (skipNextExpandedSyncRef.current) {
      skipNextExpandedSyncRef.current = false;
      return;
    }

    const snapPoints = getSheetSnapPoints(routeBuilt);
    const nextHeight = !expanded
      ? snapPoints.min
      : expandedSnap === 'middle'
        ? snapPoints.middle
        : snapPoints.intermediate;

    const frameId = requestAnimationFrame(() => {
      applySheetHeight(nextHeight);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [applySheetHeight, expanded, expandedSnap, routeBuilt]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();
    startYRef.current = event.clientY;
    startHeightRef.current = sheetHeightRef.current;
    didDragRef.current = false;
    setDragging(true);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      moveEvent.preventDefault();

      const snapPoints = getSheetSnapPoints(routeBuilt);
      const deltaY = startYRef.current - moveEvent.clientY;
      const nextHeight = clamp(
        startHeightRef.current + deltaY,
        snapPoints.min,
        snapPoints.max
      );

      if (Math.abs(deltaY) > 4) {
        didDragRef.current = true;
      }

      applySheetHeight(nextHeight);
    };

    const handlePointerUp = () => {
      globalThis.window.removeEventListener('pointermove', handlePointerMove);

      const snapPoints = getSheetSnapPoints(routeBuilt);
      const nearestHeight = getNearestSnapPoint(sheetHeightRef.current, snapPoints);

      setDragging(false);
      requestAnimationFrame(() => {
        snapToHeight(nearestHeight);
      });
    };

    globalThis.window.addEventListener('pointermove', handlePointerMove, { passive: false });
    globalThis.window.addEventListener('pointerup', handlePointerUp, { once: true });
  }, [applySheetHeight, routeBuilt, snapToHeight]);

  const handleHandleClick = useCallback(() => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    const snapPoints = getSheetSnapPoints(routeBuilt);
    const currentHeight = sheetHeightRef.current;
    const sequence = getUniqueSnapPoints(snapPoints);
    const currentIndex = sequence.findIndex((point) => Math.abs(point - currentHeight) <= 12);
    const nextHeight = currentIndex === -1
      ? getNearestSnapPoint(currentHeight, snapPoints)
      : sequence[(currentIndex + 1) % sequence.length];

    snapToHeight(nextHeight);
  }, [routeBuilt, snapToHeight]);

  const handleClose = useCallback(() => {
    const snapPoints = getSheetSnapPoints(routeBuilt);
    snapToHeight(snapPoints.min);
  }, [routeBuilt, snapToHeight]);

  const sheetStyle = {
    '--sheet-height': `${sheetHeight}px`
  } as CSSProperties & Record<'--sheet-height', string>;

  return (
    <div
      className={[
        'sidebar-mobile-sheet',
        dragging ? 'dragging' : '',
        sheetHeight > getSheetSnapPoints(routeBuilt).min + 8 ? 'expanded' : ''
      ].filter(Boolean).join(' ')}
      style={sheetStyle}>
      <button
        className="sidebar-mobile-sheet-handle"
        type="button"
        onPointerDown={handlePointerDown}
        onClick={handleHandleClick}
        aria-label="Drag route sheet">
        <span className="sidebar-mobile-sheet-handle-bar" />
      </button>

      <div className="sidebar-mobile-sheet-header">
        <span className="sidebar-mobile-sheet-title">{title}</span>
        <button
          className="sidebar-mobile-sheet-close"
          type="button"
          onClick={handleClose}
          aria-label="Collapse route sheet">
          ×
        </button>
      </div>

      <div className="sidebar-mobile-sheet-body">
        {routeBuilt ? (
          <>
            {planner}
            <div className="sidebar-mobile-route">{overview}</div>
          </>
        ) : (
          planner
        )}
      </div>
    </div>
  );
}
