import { animate } from 'motion/react';
import { useCallback, useRef, type ReactNode } from 'react';
import { Sheet } from 'react-modal-sheet';

type DragState = {
  pointerId: number;
  startClientY: number;
  startSheetY: number;
  active: boolean;
};

function findNearestSnapIndex(
  snapPoints: Array<{ snapIndex: number; snapValueY: number }>,
  currentY: number
) {
  return snapPoints.reduce((nearest, point) =>
    Math.abs(point.snapValueY - currentY) < Math.abs(nearest.snapValueY - currentY)
      ? point
      : nearest
  ).snapIndex;
}

export function MobileLocationDragGroup({ children }: Readonly<{ children: ReactNode }>) {
  const sheet = Sheet.useContext();
  const dragStateRef = useRef<DragState | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const finishDrag = useCallback(async () => {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;

    if (!dragState?.active) {
      return;
    }

    const nearestSnapIndex = findNearestSnapIndex(sheet.snapPoints, sheet.y.get());
    await sheet.snapTo(nearestSnapIndex);
  }, [sheet]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startClientY: event.clientY,
      startSheetY: sheet.y.get(),
      active: false
    };

    groupRef.current?.setPointerCapture(event.pointerId);
  }, [sheet]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - dragState.startClientY;

    if (!dragState.active) {
      if (Math.abs(deltaY) <= 8) {
        return;
      }

      dragState.active = true;

      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && groupRef.current?.contains(activeElement)) {
        activeElement.blur();
      }
    }

    event.preventDefault();
    sheet.y.set(Math.max(0, dragState.startSheetY + deltaY));
  }, [sheet]);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      if (groupRef.current?.hasPointerCapture(event.pointerId)) {
        groupRef.current.releasePointerCapture(event.pointerId);
      }

      void finishDrag();
    },
    [finishDrag]
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      if (groupRef.current?.hasPointerCapture(event.pointerId)) {
        groupRef.current.releasePointerCapture(event.pointerId);
      }

      if (dragState.active) {
        void animate(sheet.y, dragState.startSheetY, { ease: 'easeOut', duration: 0.2 });
      }

      dragStateRef.current = null;
    },
    [sheet.y]
  );

  return (
    <div
      ref={groupRef}
      className="sidebar-mobile-location-group sheet-location-drag-group"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}>
      {children}
    </div>
  );
}
