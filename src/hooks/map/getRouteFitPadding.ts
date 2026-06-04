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

  const mapHeight = map.getDiv().getBoundingClientRect().height;
  const sheetElement = document.querySelector('.sidebar-mobile-sheet') as HTMLElement | null;
  const sheetHeight = sheetElement?.getBoundingClientRect().height ?? 0;
  const bottomPadding = Math.min(Math.round(sheetHeight + 24), Math.round(mapHeight * 0.72));

  return {
    top: 72,
    right: 20,
    bottom: bottomPadding,
    left: 20
  };
}
