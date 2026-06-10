import { useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Sheet, type SheetRef } from 'react-modal-sheet';
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

export const MOBILE_SHEET_SNAP_POINTS = [0, 0.22, 0.5, 0.9] as const;

export const MOBILE_SHEET_MAP_MOVE_SNAP_INDEX = 1;

function getSnapIndex(expanded: boolean, expandedSnap: ExpandedSheetSnap) {
  if (!expanded) {
    return 0;
  }

  switch (expandedSnap) {
    case 'peek':
    case 'markerSelected':
      return MOBILE_SHEET_MAP_MOVE_SNAP_INDEX;
    case 'middle':
      return 2;
    case 'penultimate':
      return 3;
    default:
      return 2;
  }
}

function snapIndexToExpandedSnap(snapIndex: number): ExpandedSheetSnap {
  if (snapIndex <= MOBILE_SHEET_MAP_MOVE_SNAP_INDEX) {
    return 'peek';
  }

  if (snapIndex === 2) {
    return 'intermediate';
  }

  return 'penultimate';
}

export function MobileRouteSheet({
  expanded,
  expandedSnap = 'intermediate',
  title,
  children,
  onExpandedChange,
  onSnapChange,
  onReset
}: Readonly<MobileRouteSheetProps>) {
  const sheetRef = useRef<SheetRef>(null);
  const targetSnap = getSnapIndex(expanded, expandedSnap);

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
