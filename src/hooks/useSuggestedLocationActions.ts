import { useCallback } from 'react';
import type { PlaceAutocompleteSelection } from '../api/placeAutocomplete';
import { useErrorToast } from '../context/ErrorToastContext';
import { resolveCurrentLocationAddress } from '../utils/resolveCurrentLocation';

type LocationFieldTarget = 'start' | 'destination';

type UseSuggestedLocationActionsParams = {
  map?: google.maps.Map | null;
  isMobile?: boolean;
  onFromPlaceSelect?: (place: PlaceAutocompleteSelection) => void;
  onToPlaceSelect?: (place: PlaceAutocompleteSelection) => void;
  onMapPickFocusTarget: (target: LocationFieldTarget) => void;
  onCollapseMobileSheet?: () => void;
};

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Location permission denied.';
    case error.POSITION_UNAVAILABLE:
      return 'Current position is unavailable.';
    case error.TIMEOUT:
      return 'Location request timed out.';
    default:
      return 'Unknown geolocation error.';
  }
}

function applyPlaceToTarget(
  target: LocationFieldTarget,
  place: PlaceAutocompleteSelection,
  onFromPlaceSelect?: (place: PlaceAutocompleteSelection) => void,
  onToPlaceSelect?: (place: PlaceAutocompleteSelection) => void
) {
  if (target === 'start') {
    onFromPlaceSelect?.(place);
    return;
  }

  onToPlaceSelect?.(place);
}

export function useSuggestedLocationActions({
  map,
  isMobile = false,
  onFromPlaceSelect,
  onToPlaceSelect,
  onMapPickFocusTarget,
  onCollapseMobileSheet
}: UseSuggestedLocationActionsParams) {
  const { showErrorToast } = useErrorToast();

  const showLocationError = useCallback(
    (message: string) => {
      showErrorToast({
        variant: 'error',
        title: 'Unable to locate you',
        message
      });
    },
    [showErrorToast]
  );

  const fillCurrentLocation = useCallback(
    async (target: LocationFieldTarget) => {
      try {
        const location = await resolveCurrentLocationAddress();
        const place: PlaceAutocompleteSelection = {
          id: `current-location-${location.lat.toFixed(5)}-${location.lng.toFixed(5)}`,
          name: location.name,
          lat: location.lat,
          lng: location.lng,
          address: location.address
        };

        applyPlaceToTarget(target, place, onFromPlaceSelect, onToPlaceSelect);

        if (map) {
          map.panTo({ lat: location.lat, lng: location.lng });
          map.setZoom(Math.max(map.getZoom() ?? 0, 16));
        }
      } catch (error) {
        const message =
          error instanceof GeolocationPositionError
            ? getGeolocationErrorMessage(error)
            : error instanceof Error
              ? error.message
              : 'Unable to access current location.';

        showLocationError(message);
      }
    },
    [map, onFromPlaceSelect, onToPlaceSelect, showLocationError]
  );

  const selectOnMap = useCallback(
    (target: LocationFieldTarget) => {
      onMapPickFocusTarget(target);

      if (isMobile) {
        onCollapseMobileSheet?.();
      }
    },
    [isMobile, onCollapseMobileSheet, onMapPickFocusTarget]
  );

  return {
    fillCurrentLocation,
    selectOnMap
  };
}
