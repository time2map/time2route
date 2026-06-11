import { escapePlaceHtml } from '../../utils/placeFormat';
import type { InterestingPlace } from '../../utils/types';

export function createPlaceNameLabel(
  place: InterestingPlace,
  index: number,
  markerColor: string,
  routeStop = false
): HTMLDivElement {
  const label = document.createElement('div');
  label.className = `place-name-label visible${routeStop ? ' place-name-label--route-stop' : ''}`;
  label.dataset.placeLabel = String(index);
  label.innerHTML = `
    <div class="pnl-inner">
      <span class="pnl-dot" style="background:${markerColor}"></span><span class="pnl-text">${escapePlaceHtml(place.name)}</span>
    </div>
  `;
  return label;
}
