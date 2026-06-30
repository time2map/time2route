import { escapePlaceHtml, formatDistanceFromRoute, formatPlaceTypeLabel } from '../../utils/placeFormat';
import { resolvePlaceCategory } from '../../utils/poiTypes';
import type { InterestingPlace } from '../../utils/types';

export type PlaceMapPopupAction = 'close' | 'add-stop' | 'open-gmaps';

type PlaceMapPopupParams = {
  place: InterestingPlace;
  isAddedToRoute: boolean;
  photoUrl?: string;
  photoLoading?: boolean;
  variant?: 'marker' | 'screen-centered';
  onAction: (action: PlaceMapPopupAction, place: InterestingPlace) => void;
};

function getCategoryThumbMarkup(category: string): string {
  if (category === 'nature') {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3c3 4 7 8 7 12a7 7 0 1 1-14 0c0-4 4-8 7-12Z" stroke="currentColor" stroke-width="1.8"/></svg>`;
  }
  if (category === 'culture') {
    return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 10h18"/><path d="M5 10l7-5 7 5"/><path d="M6 10v8"/><path d="M10 10v8"/><path d="M14 10v8"/><path d="M18 10v8"/><path d="M4 18h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}

function renderThumbContent(params: {
  category: string;
  photoUrl?: string;
  photoLoading?: boolean;
  placeName: string;
}): string {
  if (params.photoUrl) {
    return `<img src="${escapePlaceHtml(params.photoUrl)}" alt="${escapePlaceHtml(params.placeName)}" class="popup-thumb-image" loading="lazy" data-photo-trigger="true" />`;
  }
  if (params.photoLoading) {
    return '<div class="popup-thumb-skeleton" aria-hidden="true"></div>';
  }
  return getCategoryThumbMarkup(params.category);
}

function renderRatingMarkup(rating?: number): string {
  if (typeof rating !== 'number') return '';
  return `<span class="popup-rating"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26 6.9.6-5.2 4.52 1.6 6.74L12 16.9l-6.2 3.22 1.6-6.74-5.2-4.52 6.9-.6L12 2z"/></svg>${rating.toFixed(1)}</span>`;
}

function renderDistanceMarkup(distanceLabel: string | null): string {
  if (!distanceLabel) return '';
  return `<div class="popup-distance"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 20 18 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 10l4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 18l4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>${escapePlaceHtml(distanceLabel)}</div>`;
}

export function createPlaceMapPopup(params: PlaceMapPopupParams): HTMLDivElement {
  const { place, isAddedToRoute, photoUrl, photoLoading, variant = 'marker', onAction } = params;
  const isScreenCentered = variant === 'screen-centered';
  const categoryMeta = resolvePlaceCategory(place);
  const distanceLabel = isAddedToRoute ? 'On route' : formatDistanceFromRoute(place.distanceToRouteM);
  const addStopClass = isAddedToRoute ? 'popup-addstop added' : 'popup-addstop';
  const addStopLabel = isAddedToRoute ? 'Remove' : 'Add a stop';
  const thumbClassName = photoUrl ? 'popup-thumb popup-thumb--expandable' : 'popup-thumb';

  const popup = document.createElement('div');
  popup.className = `map-popup visible${isScreenCentered ? ' map-popup--screen-centered' : ''}`;
  popup.innerHTML = `
    <button type="button" class="popup-close" data-action="close" aria-label="Close">×</button>
    <div class="${thumbClassName}">${renderThumbContent({
      category: categoryMeta.category,
      photoUrl,
      photoLoading,
      placeName: place.name
    })}</div>
    <div class="popup-body">
      <div class="popup-header">
        <span class="popup-name">${escapePlaceHtml(place.name)}</span>
        ${renderRatingMarkup(place.rating)}
      </div>
      <div class="popup-category">${escapePlaceHtml(formatPlaceTypeLabel(place.primaryType) || categoryMeta.label)}</div>
      ${renderDistanceMarkup(distanceLabel)}
      <div class="popup-actions">
        <button type="button" class="${addStopClass}" data-action="add-stop">${addStopLabel}</button>
        <button type="button" class="popup-gmaps" data-action="open-gmaps">Google Maps</button>
      </div>
    </div>
    ${isScreenCentered ? '' : '<div class="popup-arrow" aria-hidden="true"></div>'}
  `;

  popup.addEventListener('click', (event) => {
    event.stopPropagation();
    const target = event.target as HTMLElement;

    const actionTarget = target.closest('[data-action]') as HTMLElement | null;
    if (actionTarget) {
      const action = actionTarget.dataset.action as PlaceMapPopupAction | undefined;
      if (action) {
        onAction(action, place);
      }
      return;
    }

    if (!photoUrl) return;

    const photoTrigger = target.closest('[data-photo-trigger], .popup-thumb--expandable');
    if (!photoTrigger) return;

    popup.classList.toggle('map-popup--photo-expanded');
    popup.setAttribute('aria-expanded', String(popup.classList.contains('map-popup--photo-expanded')));
  });

  return popup;
}
