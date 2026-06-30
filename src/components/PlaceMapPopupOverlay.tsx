import { useEffect, useRef } from 'react';
import {
  createPlaceMapPopup,
  type PlaceMapPopupAction
} from './mapComponents/placeMapPopup';
import type { InterestingPlace } from '../utils/types';

type PlaceMapPopupOverlayProps = {
  map: google.maps.Map | null;
  place: InterestingPlace;
  isAddedToRoute: boolean;
  photoUrl?: string;
  photoLoading?: boolean;
  onAction: (action: PlaceMapPopupAction, place: InterestingPlace) => void;
};

export function PlaceMapPopupOverlay({
  map,
  place,
  isAddedToRoute,
  photoUrl,
  photoLoading,
  onAction
}: Readonly<PlaceMapPopupOverlayProps>) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onActionRef = useRef(onAction);
  const placeRef = useRef(place);

  useEffect(() => {
    onActionRef.current = onAction;
    placeRef.current = place;
  }, [onAction, place]);

  useEffect(() => {
    if (!map) {
      return;
    }

    const listener = map.addListener('dragstart', () => {
      onActionRef.current('close', placeRef.current);
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const popup = createPlaceMapPopup({
      place,
      isAddedToRoute,
      photoUrl,
      photoLoading,
      variant: 'screen-centered',
      onAction
    });

    host.replaceChildren(popup);

    return () => {
      popup.remove();
    };
  }, [isAddedToRoute, onAction, photoLoading, photoUrl, place]);

  return (
    <div className="map-place-popup-overlay" role="presentation">
      <div className="map-place-popup-overlay__dialog" ref={hostRef} />
    </div>
  );
}
