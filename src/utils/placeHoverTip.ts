import { escapePlaceHtml, formatDistanceFromRoute, formatPlaceTypeLabel } from './placeFormat';
import { resolvePlaceCategory } from './poiTypes';
import type { InterestingPlace } from './types';

function renderHoverTipRow(place: InterestingPlace): string {
  const categoryMeta = resolvePlaceCategory(place);
  const categoryLabel = formatPlaceTypeLabel(place.primaryType) || categoryMeta.label;
  const distanceLabel = formatDistanceFromRoute(place.distanceToRouteM);
  const segments: string[] = [];

  if (typeof place.rating === 'number') {
    segments.push(
      `<span class="ht-rating"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26 6.9.6-5.2 4.52 1.6 6.74L12 16.9l-6.2 3.22 1.6-6.74-5.2-4.52 6.9-.6L12 2z"/></svg>${place.rating.toFixed(1)}</span>`
    );
  }

  segments.push(`<span>${escapePlaceHtml(categoryLabel)}</span>`);

  if (distanceLabel) {
    segments.push(`<span>${escapePlaceHtml(distanceLabel)}</span>`);
  }

  return segments.join('<span>·</span>');
}

export function createPlaceHoverTip(place: InterestingPlace, markerColor: string): HTMLDivElement {
  const tip = document.createElement('div');
  tip.className = 'map-hover-tip';
  tip.innerHTML = `
    <div class="ht-name">
      <span class="ht-dot" style="background:${markerColor}"></span>
      <span>${escapePlaceHtml(place.name)}</span>
    </div>
    <div class="ht-row">${renderHoverTipRow(place)}</div>
    <div class="ht-arrow" aria-hidden="true"></div>
  `;
  return tip;
}
