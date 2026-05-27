import { useEffect, useRef, useState } from 'react';
import { getGooglePlacePhotoUrl } from '../api/googlePlacePhotos';
import type { InterestingPlace } from '../utils/types';
import type { PlacePhotoState } from '../components/PlaceCard';

export function usePlacePhotoCache(selectedPlace: string | null, places: InterestingPlace[]) {
  const [placePhotoCache, setPlacePhotoCache] = useState<Record<string, PlacePhotoState>>({});
  const placePhotoCacheRef = useRef<Record<string, PlacePhotoState>>({});

  useEffect(() => {
    placePhotoCacheRef.current = placePhotoCache;
  }, [placePhotoCache]);

  useEffect(() => {
    if (!selectedPlace) return;

    const activePlace = places.find((place) => place.id === selectedPlace);
    if (!activePlace) return;

    if (placePhotoCacheRef.current[activePlace.id]) return;

    const photoName = activePlace.photos?.[0]?.name;
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
        savePhotoState({ status: 'empty' });
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
          maxWidthPx: 360
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
  }, [selectedPlace, places]);

  return placePhotoCache;
}
