import type { MapPickPoint } from '../../api/placeAutocomplete';
import { escapePlaceHtml } from '../../utils/placeFormat';
import type { InterestingPlace } from '../../utils/types';

export type MapPickPopupPlanAction = 'close' | 'start' | 'dest';
export type MapPickPopupRouteAction = 'close' | 'add-stop' | 'open-gmaps';
export type MapPickPopupAction = MapPickPopupPlanAction | MapPickPopupRouteAction;

type SyncMapPickPopupParams = {
  pinEl: HTMLDivElement;
  pick: MapPickPoint | null;
  routeBuilt: boolean;
  isAddedToRoute?: boolean;
  onAction: (action: MapPickPopupAction) => void;
  onSuppressMapClick?: () => void;
};

function shouldShowPickAddress(pick: MapPickPoint): boolean {
  const address = pick.address.trim();
  const name = pick.name.trim();
  return address.length > 0 && address.toLowerCase() !== name.toLowerCase();
}

function renderPickActionsMarkup(routeBuilt: boolean, isAddedToRoute: boolean): string {
  if (routeBuilt) {
    const addStopClass = isAddedToRoute ? 'popup-addstop added' : 'popup-addstop';
    const addStopLabel = isAddedToRoute ? 'Added' : 'Add a stop';
    return `
      <div class="map-pick-popup-actions map-pick-popup-actions--route">
        <button type="button" class="${addStopClass}" data-action="add-stop">${addStopLabel}</button>
        <button type="button" class="popup-gmaps" data-action="open-gmaps">Open in Google Maps</button>
      </div>
    `;
  }

  return `
    <div class="map-pick-popup-actions">
      <button type="button" class="map-pick-popup-btn start" data-action="start">Start</button>
      <button type="button" class="map-pick-popup-btn dest" data-action="dest">Destination</button>
    </div>
  `;
}

const CAPTURE_EVENT_OPTIONS: AddEventListenerOptions = { capture: true };

function createMapPickPopup(params: {
  pick: MapPickPoint;
  routeBuilt: boolean;
  isAddedToRoute: boolean;
  onAction: (action: MapPickPopupAction) => void;
  onSuppressMapClick?: () => void;
}): HTMLDivElement {
  const { pick, routeBuilt, isAddedToRoute, onAction, onSuppressMapClick } = params;
  const addressMarkup = shouldShowPickAddress(pick)
    ? `<div class="map-pick-popup-address">${escapePlaceHtml(pick.address)}</div>`
    : '';

  const popup = document.createElement('div');
  popup.className = routeBuilt ? 'map-pick-popup map-pick-popup--route' : 'map-pick-popup';
  popup.innerHTML = `
    <button type="button" class="map-pick-popup-close" data-action="close" aria-label="Close popup">×</button>
    <div class="map-pick-popup-title">${escapePlaceHtml(pick.name)}</div>
    ${addressMarkup}
    ${renderPickActionsMarkup(routeBuilt, isAddedToRoute)}
  `;

  const stopMapClickThrough = (event: Event) => {
    event.stopPropagation();
    onSuppressMapClick?.();
  };

  popup.addEventListener('click', (event) => {
    event.stopPropagation();
    onSuppressMapClick?.();

    const target = (event.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    if (!target) return;

    const action = target.dataset.action as MapPickPopupAction | undefined;
    if (!action) return;

    if (
      action === 'close' ||
      action === 'start' ||
      action === 'dest' ||
      action === 'add-stop' ||
      action === 'open-gmaps'
    ) {
      onAction(action);
    }
  });

  for (const eventName of ['touchstart', 'touchend', 'pointerdown', 'mousedown'] as const) {
    popup.addEventListener(eventName, stopMapClickThrough, CAPTURE_EVENT_OPTIONS);
  }

  return popup;
}

export function mapPickPointToInterestingPlace(pick: MapPickPoint): InterestingPlace {
  const placeId = pick.placeId ?? `map-pick-${pick.lat.toFixed(5)}-${pick.lng.toFixed(5)}`;

  return {
    id: placeId,
    name: pick.name,
    lat: pick.lat,
    lng: pick.lng
  };
}

export function getGoogleMapsUrlFromMapPick(pick: MapPickPoint): string {
  const searchParams = new URLSearchParams({
    api: '1',
    query: `${pick.lat},${pick.lng}`
  });

  if (pick.placeId) {
    searchParams.set('query_place_id', pick.placeId);
  }

  return `https://www.google.com/maps/search/?${searchParams.toString()}`;
}

export function syncMapPickPopupOnPin({
  pinEl,
  pick,
  routeBuilt,
  isAddedToRoute = false,
  onAction,
  onSuppressMapClick
}: SyncMapPickPopupParams): void {
  const existing = pinEl.querySelector('.map-pick-popup');
  if (existing) {
    existing.remove();
  }

  if (!pick) {
    return;
  }

  pinEl.style.overflow = 'visible';
  pinEl.appendChild(
    createMapPickPopup({
      pick,
      routeBuilt,
      isAddedToRoute,
      onAction,
      onSuppressMapClick
    })
  );
}
