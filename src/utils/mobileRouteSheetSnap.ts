const TOP_GAP_PX = 16;

/** Sheet height when a map marker / place is selected on mobile. */
export const MARKER_SELECTED_SHEET_HEIGHT_PX = 188;

export type SheetSnapPoints = {
  min: number;
  middle: number;
  intermediate: number;
  max: number;
};

function getViewportHeight() {
  return globalThis.window.visualViewport?.height ?? globalThis.window.innerHeight;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getProportionalIntermediateHeight(
  routeBuilt: boolean,
  viewportHeight = getViewportHeight()
) {
  const min = routeBuilt ? 108 : 128;
  const max = Math.max(min, viewportHeight - TOP_GAP_PX);
  const ratio = routeBuilt ? 0.4 : 0.36;

  return clamp(Math.round(viewportHeight * ratio), min, max);
}

export function getSheetSnapPoints(
  routeBuilt: boolean,
  intermediateHeightPx?: number
): SheetSnapPoints {
  const viewportHeight = getViewportHeight();

  const min = routeBuilt ? 108 : 128;
  const max = Math.max(min, viewportHeight - TOP_GAP_PX);
  const middle = Math.min(Math.max(min + 220, viewportHeight * 0.55), max);
  const intermediate = clamp(
    intermediateHeightPx ?? getProportionalIntermediateHeight(routeBuilt, viewportHeight),
    min,
    max
  );

  return {
    min,
    middle,
    intermediate,
    max
  };
}

export function getUniqueSnapPoints(snapPoints: SheetSnapPoints) {
  return Array.from(new Set([
    snapPoints.min,
    snapPoints.middle,
    snapPoints.intermediate,
    snapPoints.max
  ])).sort((a, b) => a - b);
}

/** Snap one step below fully expanded (second-largest unique height). */
export function getPenultimateSnapPoint(snapPoints: SheetSnapPoints) {
  const unique = getUniqueSnapPoints(snapPoints);

  if (unique.length < 2) {
    return unique[0] ?? snapPoints.min;
  }

  return unique[unique.length - 2];
}

export function getPenultimateSheetHeightPx(
  routeBuilt: boolean,
  intermediateHeightPx?: number
) {
  return getPenultimateSnapPoint(getSheetSnapPoints(routeBuilt, intermediateHeightPx));
}

export function getMarkerSelectedSheetHeightPx(
  routeBuilt: boolean,
  intermediateHeightPx?: number
) {
  const snapPoints = getSheetSnapPoints(routeBuilt, intermediateHeightPx);
  return clamp(MARKER_SELECTED_SHEET_HEIGHT_PX, snapPoints.min, snapPoints.max);
}

export function isMobileViewport() {
  return globalThis.window.matchMedia('(max-width: 768px)').matches;
}

export type ExpandedSheetSnap = 'intermediate' | 'middle' | 'penultimate' | 'markerSelected';

export function resolveExpandedSnapHeight(
  snapPoints: SheetSnapPoints,
  expandedSnap: ExpandedSheetSnap
) {
  switch (expandedSnap) {
    case 'markerSelected':
      return clamp(MARKER_SELECTED_SHEET_HEIGHT_PX, snapPoints.min, snapPoints.max);
    case 'penultimate':
      return getPenultimateSnapPoint(snapPoints);
    case 'middle':
      return snapPoints.middle;
    default:
      return snapPoints.intermediate;
  }
}

export const SNAP_TOLERANCE_PX = 12;
