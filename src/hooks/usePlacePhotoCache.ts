import { useEffect, useRef, useState } from 'react';
import { getGooglePlacePhotoUrl } from '../api/googlePlacePhotos';
import type { InterestingPlace } from '../utils/types';

export type PlacePhotoState =
  | { status: 'loading' }
  | { status: 'loaded'; photoUrl: string }
  | { status: 'empty' }
  | { status: 'error' };

export function getPlacePhotoViewState(
  cache: Record<string, PlacePhotoState>,
  placeId: string
): { url?: string; loading?: boolean } {
  const state = cache[placeId];
  if (!state) {
    return {};
  }
  if (state.status === 'loading') {
    return { loading: true };
  }
  if (state.status === 'loaded') {
    return { url: state.photoUrl, loading: false };
  }
  return { loading: false };
}

type UsePlacePhotoCacheOptions = {
  maxWidthPx?: number;
};

export function usePlacePhotoCache(
  activePlaceId: string | null,
  places: InterestingPlace[],
  options?: UsePlacePhotoCacheOptions
) {
  const maxWidthPx = options?.maxWidthPx ?? 520;
  const [placePhotoCache, setPlacePhotoCache] = useState<Record<string, PlacePhotoState>>({});
  const placePhotoCacheRef = useRef<Record<string, PlacePhotoState>>({});

  useEffect(() => {
    placePhotoCacheRef.current = placePhotoCache;
  }, [placePhotoCache]);

  useEffect(() => {
    if (!activePlaceId) return;

    const activePlace = places.find((place) => place.id === activePlaceId);
    if (!activePlace) return;

    const photoName = activePlace.photos?.[0]?.name;
    const cached = placePhotoCacheRef.current[activePlace.id];
    if (cached?.status === 'loading' || cached?.status === 'loaded') {
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    let cancelled = false;

    const savePhotoState = (nextState: PlacePhotoState) => {
      setPlacePhotoCache((prev) => {
        const next = {
          ...prev,
          [activePlace.id]: nextState
        };

        placePhotoCacheRef.current = next;
        return next;
      });
    };

    void (async () => {
      await Promise.resolve();

      if (cancelled) return;

      if (!photoName) {
        if (cached?.status !== 'empty' && cached?.status !== 'error') {
          savePhotoState({ status: 'empty' });
        }
        return;
      }

      if (!apiKey) {
        savePhotoState({ status: 'error' });
        return;
      }

      savePhotoState({ status: 'loading' });

      try {
        const photoUrl = await getGooglePlacePhotoUrl({
          photoName,
          apiKey,
          maxWidthPx
        });

        if (cancelled) return;

        savePhotoState(photoUrl ? { status: 'loaded', photoUrl } : { status: 'empty' });
      } catch {
        if (cancelled) return;

        savePhotoState({ status: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activePlaceId, maxWidthPx, places]);

  return placePhotoCache;
}
