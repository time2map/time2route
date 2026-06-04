export function escapePlaceHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function formatPlaceTypeLabel(primaryType?: string): string {
  if (!primaryType) return 'Point of interest';
  return primaryType
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDistanceFromRoute(distanceToRouteM?: number): string | null {
  if (typeof distanceToRouteM !== 'number') return null;
  if (distanceToRouteM < 30) return 'On route';
  if (distanceToRouteM < 1000) return `${Math.round(distanceToRouteM)} m from route`;
  return `${(distanceToRouteM / 1000).toFixed(1)} km from route`;
}
