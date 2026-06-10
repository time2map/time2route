export function getRouteFitPadding(map: google.maps.Map): google.maps.Padding {
  const isMobile = globalThis.window.matchMedia('(max-width: 768px)').matches;

  if (!isMobile) {
    return {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40
    };
  }

  const mapRect = map.getDiv().getBoundingClientRect();
  const mapHeight = mapRect.height;
  const sheetElement = document.querySelector('.sidebar-mobile-sheet') as HTMLElement | null;
  const sheetRect = sheetElement?.getBoundingClientRect();
  const visibleSheetOverlap = sheetRect
    ? Math.max(0, mapRect.bottom - Math.max(mapRect.top, sheetRect.top))
    : 0;
  const bottomPadding = Math.min(Math.round(visibleSheetOverlap + 24), Math.round(mapHeight * 0.72));

  return {
    top: 72,
    right: 20,
    bottom: bottomPadding,
    left: 20
  };
}
