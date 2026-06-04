import { escapePlaceHtml } from '../../utils/placeFormat';
import type { InterestingPlace } from '../../utils/types';

export function createPlaceNameLabel(place: InterestingPlace, index: number, markerColor: string): HTMLDivElement {
  const label = document.createElement('div');
  label.className = 'place-name-label visible';
  label.dataset.placeLabel = String(index);
  label.innerHTML = `
    <div class="pnl-inner">
      <span class="pnl-dot" style="background:${markerColor}"></span>${escapePlaceHtml(place.name)}
    </div>
  `;
  return label;
}
