import type { MouseEvent, ReactNode } from 'react';
import { resolvePlaceCategory } from '../utils/poiTypes';
import type { InterestingPlace } from '../utils/types';

export type PlacePhotoState = {
  status: 'loading' | 'loaded' | 'empty' | 'error';
  photoUrl?: string;
};

type PlaceCardCategory = 'nature' | 'culture' | 'poi';

type PlaceCardProps = {
  place: InterestingPlace;
  selected: boolean;
  photoState?: PlacePhotoState;
  onSelect: (placeId: string) => void;
  onAddToRoute?: (placeId: string) => void;
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

function RouteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true">
      <path d="M6 20L18 4" />
      <path d="M6 10l4-4" />
      <path d="M14 18l4-4" />
    </svg>
  );
}

function PlaceCategoryIcon({ category }: Readonly<{ category: PlaceCardCategory }>) {
  if (category === 'nature') {
    return (
      <svg
        className="place-card-v2__icon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true">
        <path d="M12 21c4-4.2 6-7.7 6-10.6A6 6 0 0 0 6 10.4C6 13.3 8 16.8 12 21z" />
        <path d="M12 15V8" />
        <path d="M9 11l3-3 3 3" />
      </svg>
    );
  }

  if (category === 'culture') {
    return (
      <svg
        className="place-card-v2__icon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true">
        <path d="M3 10h18" />
        <path d="M5 10l7-5 7 5" />
        <path d="M6 10v8" />
        <path d="M10 10v8" />
        <path d="M14 10v8" />
        <path d="M18 10v8" />
        <path d="M4 18h16" />
      </svg>
    );
  }

  return (
    <svg
      className="place-card-v2__icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true">
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
      <circle
        cx="12"
        cy="10"
        r="2.5"
      />
    </svg>
  );
}

export function PlaceCard({
  place,
  selected,
  photoState,
  onSelect,
  onAddToRoute,
  onOpenInGoogleMaps
}: Readonly<PlaceCardProps>) {
  const category = resolveCardCategory(place);
  const placeTypeLabel = formatPlaceType(place.primaryType);
  const distanceLabel = formatDistance(place.distanceToRouteM);
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
              <div className="place-card-v2__category">{placeTypeLabel}</div>
            </div>
          </div>

          <div className="place-card-v2__meta">
            {distanceLabel ? (
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
              onAddToRoute?.(place.id);
            }}>
            Add to route
          </button>
        </div>
      )}
    </article>
  );
}
