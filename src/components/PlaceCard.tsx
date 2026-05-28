import type { MouseEvent, ReactNode } from 'react';
import { resolvePlaceCategory } from '../utils/poiTypes';
import type { InterestingPlace } from '../utils/types';
import CulturePlaceIcon from './icons/CulturePlaceIcon';
import NaturePlaceIcon from './icons/NaturePlaceIcon';
import PoiPlaceIcon from './icons/PoiPlaceIcon';
import RouteIcon from './icons/RouteIcon';

export type PlacePhotoState = {
  status: 'loading' | 'loaded' | 'empty' | 'error';
  photoUrl?: string;
};

type PlaceCardCategory = 'nature' | 'culture' | 'poi';

type PlaceCardProps = {
  place: InterestingPlace;
  selected: boolean;
  isAddedToRoute?: boolean;
  routeStopIndex?: number;
  photoState?: PlacePhotoState;
  onSelect: (placeId: string) => void;
  onAddToRoute?: (placeId: string) => void;
  onRemoveFromRoute?: (placeId: string) => void;
  onOpenInGoogleMaps?: (placeId: string) => void;
};

function resolveCardCategory(place: InterestingPlace): PlaceCardCategory {
  const category = resolvePlaceCategory(place).category;

  if (category === 'point_of_interest') {
    return 'poi';
  }

  return category;
}

function formatPlaceType(primaryType?: string) {
  if (!primaryType) return 'Point of interest';

  return primaryType
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDistance(distanceToRouteM?: number) {
  if (typeof distanceToRouteM !== 'number') return null;

  if (distanceToRouteM < 30) return 'On route';
  if (distanceToRouteM < 1000) return `${Math.round(distanceToRouteM)} m from route`;

  return `${(distanceToRouteM / 1000).toFixed(1)} km from route`;
}

function stopAction(event: MouseEvent<HTMLButtonElement>) {
  event.stopPropagation();
}

function renderThumbContent(params: {
  category: PlaceCardCategory;
  isPhotoLoading: boolean;
  photoUrl?: string;
  placeName: string;
}): ReactNode {
  const { category, isPhotoLoading, photoUrl, placeName } = params;

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={placeName}
        className="place-card-v2__image"
        loading="lazy"
      />
    );
  }

  if (isPhotoLoading) {
    return <div className="place-card-v2__image-skeleton" />;
  }

  return <PlaceCategoryIcon category={category} />;
}

function PlaceCategoryIcon({ category }: Readonly<{ category: PlaceCardCategory }>) {
  if (category === 'nature') {
    return <NaturePlaceIcon />;
  }

  if (category === 'culture') {
    return <CulturePlaceIcon />;
  }

  return <PoiPlaceIcon />;
}

export function PlaceCard({
  place,
  selected,
  isAddedToRoute = false,
  routeStopIndex = 0,
  photoState,
  onSelect,
  onAddToRoute,
  onRemoveFromRoute,
  onOpenInGoogleMaps
}: Readonly<PlaceCardProps>) {
  const category = resolveCardCategory(place);
  const placeTypeLabel = formatPlaceType(place.primaryType);
  const distanceLabel = formatDistance(place.distanceToRouteM);
  const showOnRouteBadge = isAddedToRoute || distanceLabel === 'On route';
  const photoUrl = selected && photoState?.status === 'loaded'
    ? photoState.photoUrl
    : undefined;
  const isPhotoLoading = selected && photoState?.status === 'loading';

  const thumbContent = renderThumbContent({
    category,
    isPhotoLoading,
    photoUrl,
    placeName: place.name
  });

  return (
    <article
      className={[
        'place-card-v2',
        `place-card-v2--${category}`,
        selected ? 'is-selected' : ''
      ]
        .filter(Boolean)
        .join(' ')}>
      <button
        className="place-card-v2__select"
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(place.id)}>
        <div className="place-card-v2__thumb">
          {thumbContent}

          <div className="place-card-v2__thumb-overlay" />

          {place.rating ? (
            <div className="place-card-v2__rating">
              <span>★</span>
              {place.rating.toFixed(1)}
            </div>
          ) : null}
        </div>

        <div className="place-card-v2__body">
          <div className="place-card-v2__main">
            <div>
              <div className="place-card-v2__name">{place.name}</div>
              {showOnRouteBadge ? <span className="place-card-v2__on-route">ON ROUTE</span> : null}
              <div className="place-card-v2__category">{placeTypeLabel}</div>
            </div>
          </div>

          <div className="place-card-v2__meta">
            {distanceLabel && !showOnRouteBadge ? (
              <span className="place-card-v2__meta-item">
                <RouteIcon />
                {distanceLabel}
              </span>
            ) : null}

            {place.userRatingCount ? (
              <span className="place-card-v2__meta-item">
                {place.userRatingCount} reviews
              </span>
            ) : null}
          </div>
        </div>
      </button>

      {selected && (
        <div className="place-card-v2__actions">
          {isAddedToRoute && routeStopIndex > 0 ? (
            <span className="place-card-v2__stop-index">Stop {routeStopIndex}</span>
          ) : null}
          <button
            className="place-card-v2__action place-card-v2__action--ghost"
            type="button"
            onClick={(event) => {
              stopAction(event);
              onOpenInGoogleMaps?.(place.id);
            }}>
            Google Maps
          </button>

          <button
            className="place-card-v2__action place-card-v2__action--primary"
            type="button"
            onClick={(event) => {
              stopAction(event);
              if (isAddedToRoute) {
                onRemoveFromRoute?.(place.id);
                return;
              }
              onAddToRoute?.(place.id);
            }}>
            {isAddedToRoute ? 'Remove from route' : 'Add to route'}
          </button>
        </div>
      )}
    </article>
  );
}
