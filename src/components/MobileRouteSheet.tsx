import { useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Sheet, type SheetRef } from 'react-modal-sheet';
import { useMobileSheetInputFocusGuard } from '../hooks/useMobileSheetInputFocusGuard';
import type { ExpandedSheetSnap } from '../utils/mobileRouteSheetSnap';

type MobileRouteSheetProps = {
  expanded: boolean;
  expandedSnap?: ExpandedSheetSnap;
  title: string;
  children: ReactNode;
  onExpandedChange: (expanded: boolean) => void;
  onSnapChange?: (snap: ExpandedSheetSnap) => void;
  onReset?: () => void;
};

export const MOBILE_SHEET_SNAP_POINTS = [0, 0.22,0.5, 1] as const;

export const MOBILE_SHEET_ANIMATION_MS = 350;

export const MOBILE_SHEET_MAP_MOVE_SNAP_INDEX = 1;

export const MOBILE_SHEET_MIDDLE_SNAP_INDEX = 2;

const MOBILE_SHEET_FULL_SNAP_INDEX = MOBILE_SHEET_SNAP_POINTS.length - 1;

function getSnapIndex(expanded: boolean, expandedSnap: ExpandedSheetSnap) {
  if (!expanded) {
    return 0;
  }

  if (expandedSnap === 'penultimate') {
    return MOBILE_SHEET_FULL_SNAP_INDEX;
  }

  if (expandedSnap === 'middle' || expandedSnap === 'intermediate') {
    return MOBILE_SHEET_MIDDLE_SNAP_INDEX;
  }

  return MOBILE_SHEET_MAP_MOVE_SNAP_INDEX;
}

function snapIndexToExpandedSnap(snapIndex: number): ExpandedSheetSnap {
  if (snapIndex >= MOBILE_SHEET_FULL_SNAP_INDEX) {
    return 'penultimate';
  }

  if (snapIndex >= MOBILE_SHEET_MIDDLE_SNAP_INDEX) {
    return 'middle';
  }

  return 'peek';
}

export function MobileRouteSheet({
  expanded,
  expandedSnap = 'peek',
  title,
  children,
  onExpandedChange,
  onSnapChange,
  onReset
}: Readonly<MobileRouteSheetProps>) {
  const sheetRef = useRef<SheetRef>(null);
  const targetSnap = getSnapIndex(expanded, expandedSnap);

  useMobileSheetInputFocusGuard(true);

  useEffect(() => {
    sheetRef.current?.snapTo(targetSnap);
  }, [targetSnap]);

  const handleClose = useCallback(() => {
    sheetRef.current?.snapTo(0);
    onExpandedChange(false);
    onSnapChange?.('peek');
  }, [onExpandedChange, onSnapChange]);

  const handleResetClick = useCallback(() => {
    onReset?.();
  }, [onReset]);

  const handleSnap = useCallback(
    (snapIndex: number) => {
      onExpandedChange(snapIndex > 0);
      onSnapChange?.(snapIndexToExpandedSnap(snapIndex));
    },
    [onExpandedChange, onSnapChange]
  );

  return (
    <Sheet
      ref={sheetRef}
      isOpen
      disableDismiss
      disableScrollLocking
      snapPoints={[...MOBILE_SHEET_SNAP_POINTS]}
      initialSnap={targetSnap}
      onSnap={handleSnap}
      onClose={handleClose}
      tweenConfig={{ ease: 'easeOut', duration: 0.32 }}>
      <Sheet.Container unstyled className="sidebar-mobile-sheet">
        <Sheet.Header unstyled className="sidebar-mobile-sheet-header">
          <div className="sidebar-mobile-sheet-handle" aria-hidden="true">
            <Sheet.DragIndicator unstyled className="sidebar-mobile-sheet-handle-bar" />
          </div>

          <div className="sidebar-mobile-sheet-header-row">
            <span className="sidebar-mobile-sheet-title">{title}</span>
            <button
              className="sidebar-mobile-sheet-close"
              type="button"
              onClick={handleResetClick}
              aria-label="Reset route">
              ×
            </button>
          </div>
        </Sheet.Header>

        <Sheet.Content
          unstyled
          className="sidebar-mobile-sheet-content"
          scrollClassName="sidebar-mobile-sheet-body">
          {children}
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
}
