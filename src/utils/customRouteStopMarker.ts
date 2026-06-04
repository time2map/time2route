import { getPlacePhotoViewState, type PlacePhotoState } from '../hooks/usePlacePhotoCache';
import { createPlaceHoverTip } from './placeHoverTip';
import { createPlaceMapPopup, type PlaceMapPopupAction } from './placeMapPopup';
import { resolveRouteStopCategoryColor, resolveRouteStopCategoryVariant } from './routeStopIndicator';
import type { InterestingPlace, RouteIntermediatePoint } from './types';

export type CustomRouteStopPopupContext = {
  placePopupId: string | null;
  selectedPlace: string | null;
  hoveredPlaceId: string | null;
  placePhotos: Record<string, PlacePhotoState>;
  onPopupAction: (action: PlaceMapPopupAction, place: InterestingPlace) => void;
};

export function getCustomRouteStops(
  intermediates: RouteIntermediatePoint[],
  routePlaces: InterestingPlace[]
): RouteIntermediatePoint[] {
  const googlePlaceIds = new Set(routePlaces.map((place) => place.id));
  return intermediates.filter((stop) => !googlePlaceIds.has(stop.id));
}

export function routeStopToInterestingPlace(stop: RouteIntermediatePoint): InterestingPlace {
  return {
    id: stop.id,
    name: stop.name?.trim() || 'Stop',
    lat: stop.lat,
    lng: stop.lng,
    primaryType: 'point_of_interest'
  };
}

export function createCustomRouteStopMarkerElement(
  place: InterestingPlace,
  popupContext: CustomRouteStopPopupContext
): HTMLDivElement {
  const showMapPopup =
    popupContext.placePopupId === place.id || popupContext.selectedPlace === place.id;
  const isHovered =
    !showMapPopup &&
    popupContext.hoveredPlaceId === place.id &&
    popupContext.selectedPlace !== place.id;
  const photoState = getPlacePhotoViewState(popupContext.placePhotos, place.id);
  const categoryVariant = resolveRouteStopCategoryVariant(place);
  const categoryColor = resolveRouteStopCategoryColor(place);

  const element = document.createElement('div');
  element.className = [
    'custom-route-stop-marker',
    `custom-route-stop-marker--${categoryVariant}`,
    showMapPopup ? 'has-detail-popup' : '',
    isHovered ? 'is-hovered' : ''
  ]
    .filter(Boolean)
    .join(' ');

  element.dataset.placeId = place.id;

  element.appendChild(createPlaceHoverTip(place, categoryColor));

  const dot = document.createElement('div');
  dot.className = 'custom-route-stop-dot';
  dot.style.setProperty('--stop-category-color', categoryColor);
  dot.setAttribute('aria-hidden', 'true');

  const core = document.createElement('span');
  core.className = 'custom-route-stop-dot-core';
  core.setAttribute('aria-hidden', 'true');
  dot.appendChild(core);
  element.appendChild(dot);

  if (showMapPopup) {
    element.appendChild(
      createPlaceMapPopup({
        place,
        isAddedToRoute: true,
        photoUrl: photoState?.url,
        photoLoading: photoState?.loading,
        onAction: popupContext.onPopupAction
      })
    );
  }

  return element;
}

export function bindCustomRouteStopHoverHandlers(
  element: HTMLElement,
  placeId: string,
  popupContext: CustomRouteStopPopupContext,
  handlers: { onEnter: (placeId: string) => void; onLeave: () => void }
): void {
  const showMapPopup =
    popupContext.placePopupId === placeId || popupContext.selectedPlace === placeId;
  if (showMapPopup) {
    return;
  }

  const targets = [
    element,
    element.querySelector('.map-hover-tip'),
    element.querySelector('.custom-route-stop-dot'),
    element.querySelector('.custom-route-stop-dot-core')
  ].filter((node): node is HTMLElement => node instanceof HTMLElement);

  targets.forEach((target) => {
    target.addEventListener('mouseenter', () => handlers.onEnter(placeId));
    target.addEventListener('mouseleave', handlers.onLeave);
  });
}
