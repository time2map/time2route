import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import {
  getProportionalIntermediateHeight,
  getSheetSnapPoints,
  getUniqueSnapPoints,
  resolveExpandedSnapHeight,
  SNAP_TOLERANCE_PX,
  type ExpandedSheetSnap
} from '../utils/mobileRouteSheetSnap';

type MobileRouteSheetProps = {
  expanded: boolean;
  expandedSnap?: ExpandedSheetSnap;
  routeBuilt: boolean;
  title: string;
  planner: ReactNode;
  overview: ReactNode;
  onExpandedChange: (expanded: boolean) => void;
};

const SHEET_CHROME_BUFFER_PX = 10;

function getViewportHeight() {
  return globalThis.window.visualViewport?.height ?? globalThis.window.innerHeight;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function measureIntermediateHeight(
  body: HTMLElement | null,
  handleEl: HTMLElement | null,
  headerEl: HTMLElement | null,
  routeBuilt: boolean
) {
  const viewportHeight = getViewportHeight();
  const proportional = getProportionalIntermediateHeight(routeBuilt, viewportHeight);

  if (!body) {
    return proportional;
  }

  const form = body.querySelector('.sidebar-mobile-form');
  const contentHeight = form
    ? Math.ceil(form.scrollHeight)
    : Math.ceil(body.scrollHeight);

  if (contentHeight <= 0) {
    return proportional;
  }

  const handleHeight = handleEl?.offsetHeight ?? 0;
  const headerHeight = headerEl?.offsetHeight ?? 0;
  const bodyStyles = getComputedStyle(body);
  const bodyPadding =
    parseFloat(bodyStyles.paddingTop) + parseFloat(bodyStyles.paddingBottom);

  const measured =
    handleHeight + headerHeight + bodyPadding + contentHeight + SHEET_CHROME_BUFFER_PX;

  const min = routeBuilt ? 108 : 128;
  const max = Math.max(min, viewportHeight - 16);

  return clamp(measured, min, max);
}

function getNearestSnapPoint(
  height: number,
  snapPoints: ReturnType<typeof getSheetSnapPoints>
) {
  const points = [snapPoints.min, snapPoints.middle, snapPoints.intermediate, snapPoints.max];

  return points.reduce((nearest, point) => (
    Math.abs(point - height) < Math.abs(nearest - height)
      ? point
      : nearest
  ), points[0]);
}

function isSheetFullyExpanded(height: number, routeBuilt: boolean) {
  const { max } = getSheetSnapPoints(routeBuilt);
  return Math.abs(height - max) <= SNAP_TOLERANCE_PX;
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
    const intermediate = getProportionalIntermediateHeight(routeBuilt);
    const snapPoints = getSheetSnapPoints(routeBuilt, intermediate);
    if (!expanded) return snapPoints.min;
    return resolveExpandedSnapHeight(snapPoints, expandedSnap);
  })();

  const [sheetHeight, setSheetHeight] = useState(initialHeight);
  const [dragging, setDragging] = useState(false);
  const [bodyAtScrollTop, setBodyAtScrollTop] = useState(true);
  const [intermediateHeightPx, setIntermediateHeightPx] = useState(() =>
    globalThis.window === undefined
      ? getProportionalIntermediateHeight(routeBuilt)
      : measureIntermediateHeight(null, null, null, routeBuilt)
  );

  const sheetHeightRef = useRef(sheetHeight);
  const bodyRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const intermediateHeightRef = useRef(intermediateHeightPx);
  intermediateHeightRef.current = intermediateHeightPx;

  const getSnapPoints = useCallback(
    () => getSheetSnapPoints(routeBuilt, intermediateHeightRef.current),
    [routeBuilt, intermediateHeightPx]
  );
  const pointerCaptureRef = useRef<{ element: HTMLElement; pointerId: number } | null>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const didDragRef = useRef(false);
  const skipNextExpandedSyncRef = useRef(false);
  const sheetDragActiveRef = useRef(false);
  const pendingBodyDragRef = useRef(false);
  const BODY_DRAG_ACTIVATION_PX = 6;

  const applySheetHeight = useCallback((height: number) => {
    sheetHeightRef.current = height;
    setSheetHeight(height);
  }, []);

  const snapToHeight = useCallback((height: number, notifyParent = true) => {
    const snapPoints = getSnapPoints();
    const nextHeight = clamp(height, snapPoints.min, snapPoints.max);

    applySheetHeight(nextHeight);

    if (notifyParent) {
      skipNextExpandedSyncRef.current = true;
      onExpandedChange(nextHeight > snapPoints.min + 8);
    }
  }, [applySheetHeight, getSnapPoints, onExpandedChange]);

  const updateIntermediateHeight = useCallback(() => {
    const next = measureIntermediateHeight(
      bodyRef.current,
      handleRef.current,
      headerRef.current,
      routeBuilt
    );

    if (Math.abs(next - intermediateHeightRef.current) < 2) {
      return;
    }

    intermediateHeightRef.current = next;
    setIntermediateHeightPx(next);
  }, [routeBuilt]);

  useEffect(() => {
    const syncHeightWithViewport = () => {
      updateIntermediateHeight();
      const snapPoints = getSheetSnapPoints(routeBuilt, intermediateHeightRef.current);
      const currentHeight = sheetHeightRef.current;
      applySheetHeight(clamp(currentHeight, snapPoints.min, snapPoints.max));
    };

    window.addEventListener('resize', syncHeightWithViewport);
    window.visualViewport?.addEventListener('resize', syncHeightWithViewport);

    return () => {
      window.removeEventListener('resize', syncHeightWithViewport);
      window.visualViewport?.removeEventListener('resize', syncHeightWithViewport);
    };
  }, [applySheetHeight, routeBuilt, updateIntermediateHeight]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    updateIntermediateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateIntermediateHeight();
    });

    resizeObserver.observe(body);

    return () => {
      resizeObserver.disconnect();
    };
  }, [routeBuilt, planner, overview, updateIntermediateHeight]);

  useEffect(() => {
    if (skipNextExpandedSyncRef.current) {
      skipNextExpandedSyncRef.current = false;
      return;
    }

    const snapPoints = getSnapPoints();
    const nextHeight = !expanded
      ? snapPoints.min
      : resolveExpandedSnapHeight(snapPoints, expandedSnap);

    const frameId = requestAnimationFrame(() => {
      applySheetHeight(nextHeight);
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [applySheetHeight, expanded, expandedSnap, getSnapPoints]);

  useEffect(() => {
    if (!expanded || expandedSnap !== 'intermediate') return;

    const snapPoints = getSnapPoints();
    const currentHeight = sheetHeightRef.current;

    if (Math.abs(currentHeight - snapPoints.intermediate) <= SNAP_TOLERANCE_PX) {
      applySheetHeight(snapPoints.intermediate);
    }
  }, [applySheetHeight, expanded, expandedSnap, getSnapPoints, intermediateHeightPx]);

  const fullyExpanded = isSheetFullyExpanded(sheetHeight, routeBuilt);

  useEffect(() => {
    if (fullyExpanded) return;
    const body = bodyRef.current;
    if (body) {
      body.scrollTop = 0;
    }
    setBodyAtScrollTop(true);
  }, [fullyExpanded, sheetHeight]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const syncScrollTop = () => {
      setBodyAtScrollTop(body.scrollTop <= 0);
    };

    syncScrollTop();
    body.addEventListener('scroll', syncScrollTop, { passive: true });

    return () => {
      body.removeEventListener('scroll', syncScrollTop);
    };
  }, [fullyExpanded, routeBuilt]);

  const isBodyScrolledToTop = useCallback(() => {
    const body = bodyRef.current;
    return !body || body.scrollTop <= 0;
  }, []);

  const isSheetDragTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    if (target.closest('.sidebar-mobile-sheet-handle, .sidebar-mobile-sheet-close')) {
      return false;
    }
    return !target.closest('button, a, input, textarea, select, [role="button"]');
  }, []);

  const releasePointerCapture = useCallback(() => {
    const capture = pointerCaptureRef.current;
    if (!capture) return;

    try {
      capture.element.releasePointerCapture(capture.pointerId);
    } catch {
      // already released
    }

    pointerCaptureRef.current = null;
  }, []);

  const startSheetInteraction = useCallback((
    clientY: number,
    options: { immediate?: boolean; captureTarget?: HTMLElement; pointerId?: number }
  ) => {
    const { immediate = false, captureTarget, pointerId } = options;

    if (captureTarget !== undefined && pointerId !== undefined) {
      captureTarget.setPointerCapture(pointerId);
      pointerCaptureRef.current = { element: captureTarget, pointerId };
    }

    startYRef.current = clientY;
    startHeightRef.current = sheetHeightRef.current;
    didDragRef.current = false;
    sheetDragActiveRef.current = immediate;
    pendingBodyDragRef.current = !immediate;

    if (immediate) {
      setDragging(true);
    }

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const body = bodyRef.current;
      const verticalDelta = moveEvent.clientY - startYRef.current;

      if (pendingBodyDragRef.current && !sheetDragActiveRef.current) {
        const atMaxHeight = isSheetFullyExpanded(sheetHeightRef.current, routeBuilt);

        if (atMaxHeight && body && body.scrollTop > 0) {
          pendingBodyDragRef.current = false;
          return;
        }

        if (!atMaxHeight) {
          if (Math.abs(verticalDelta) > BODY_DRAG_ACTIVATION_PX) {
            sheetDragActiveRef.current = true;
            pendingBodyDragRef.current = false;
            setDragging(true);
          } else {
            return;
          }
        } else if (verticalDelta > BODY_DRAG_ACTIVATION_PX) {
          sheetDragActiveRef.current = true;
          pendingBodyDragRef.current = false;
          setDragging(true);
        } else if (verticalDelta < -BODY_DRAG_ACTIVATION_PX) {
          pendingBodyDragRef.current = false;
          return;
        } else {
          return;
        }
      }

      if (!sheetDragActiveRef.current) return;

      moveEvent.preventDefault();

      const snapPoints = getSnapPoints();
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

    const finishInteraction = () => {
      globalThis.window.removeEventListener('pointermove', handlePointerMove);
      globalThis.window.removeEventListener('pointercancel', finishInteraction);
      releasePointerCapture();

      const wasSheetDrag = sheetDragActiveRef.current;
      pendingBodyDragRef.current = false;
      sheetDragActiveRef.current = false;
      setDragging(false);

      if (!wasSheetDrag) return;

      const snapPoints = getSnapPoints();
      const nearestHeight = getNearestSnapPoint(sheetHeightRef.current, snapPoints);

      requestAnimationFrame(() => {
        snapToHeight(nearestHeight);
      });
    };

    globalThis.window.addEventListener('pointermove', handlePointerMove, { passive: false });
    globalThis.window.addEventListener('pointerup', finishInteraction, { once: true });
    globalThis.window.addEventListener('pointercancel', finishInteraction, { once: true });
  }, [applySheetHeight, getSnapPoints, releasePointerCapture, snapToHeight]);

  const handleHandlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();
    startSheetInteraction(event.clientY, {
      immediate: true,
      captureTarget: event.currentTarget,
      pointerId: event.pointerId
    });
  }, [startSheetInteraction]);

  const handleContentPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const atMaxHeight = isSheetFullyExpanded(sheetHeightRef.current, routeBuilt);
    if (atMaxHeight && !isBodyScrolledToTop()) return;
    if (!isSheetDragTarget(event.target)) return;

    const shouldReserveGesture = !atMaxHeight || isBodyScrolledToTop();
    if (shouldReserveGesture) {
      event.preventDefault();
    }

    startSheetInteraction(event.clientY, {
      immediate: false,
      captureTarget: event.currentTarget,
      pointerId: event.pointerId
    });
  }, [isBodyScrolledToTop, isSheetDragTarget, routeBuilt, startSheetInteraction]);

  const handleHandleClick = useCallback(() => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    const snapPoints = getSnapPoints();
    const currentHeight = sheetHeightRef.current;
    const sequence = getUniqueSnapPoints(snapPoints);
    const currentIndex = sequence.findIndex((point) => Math.abs(point - currentHeight) <= SNAP_TOLERANCE_PX);
    const nextHeight = currentIndex === -1
      ? getNearestSnapPoint(currentHeight, snapPoints)
      : sequence[(currentIndex + 1) % sequence.length];

    snapToHeight(nextHeight);
  }, [getSnapPoints, snapToHeight]);

  const handleClose = useCallback(() => {
    snapToHeight(getSnapPoints().min);
  }, [getSnapPoints, snapToHeight]);

  const sheetStyle = {
    '--sheet-height': `${sheetHeight}px`
  } as CSSProperties & Record<'--sheet-height', string>;

  return (
    <div
      className={[
        'sidebar-mobile-sheet',
        dragging ? 'dragging' : '',
        fullyExpanded ? 'fully-expanded' : '',
        sheetHeight > getSnapPoints().min + 8 ? 'expanded' : ''
      ].filter(Boolean).join(' ')}
      style={sheetStyle}>
      <button
        ref={handleRef}
        className="sidebar-mobile-sheet-handle"
        type="button"
        onPointerDown={handleHandlePointerDown}
        onClick={handleHandleClick}
        aria-label="Drag route sheet">
        <span className="sidebar-mobile-sheet-handle-bar" />
      </button>

      <div
        ref={headerRef}
        className="sidebar-mobile-sheet-header"
        onPointerDown={handleContentPointerDown}>
        <span className="sidebar-mobile-sheet-title">{title}</span>
        <button
          className="sidebar-mobile-sheet-close"
          type="button"
          onClick={handleClose}
          aria-label="Collapse route sheet">
          ×
        </button>
      </div>

      <div
        ref={bodyRef}
        className={[
          'sidebar-mobile-sheet-body',
          fullyExpanded && bodyAtScrollTop ? 'at-scroll-top' : ''
        ].filter(Boolean).join(' ')}
        onPointerDown={handleContentPointerDown}>
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
