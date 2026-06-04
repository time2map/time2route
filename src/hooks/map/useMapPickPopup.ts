import { useCallback, useEffect } from 'react';
import {
  getGoogleMapsUrlFromMapPick,
  mapPickPointToInterestingPlace,
  syncMapPickPopupOnPin
} from '../../components/mapComponents/mapPickPopup';
import type { MapPickState } from './mapPaneTypes';
import type { InterestingPlace, RouteIntermediatePoint } from '../../utils/types';

type UseMapPickPopupParams = {
  pickPinElRef: React.RefObject<HTMLDivElement | null>;
  mapPick: MapPickState | null;
  routeBuilt: boolean;
  intermediates: RouteIntermediatePoint[];
  ignoreNextClick: () => void;
  clearPickMarker: () => void;
  onMapPickCancel: () => void;
  onMapPickSetStart: (point: { lat: number; lng: number; address: string }) => void;
  onMapPickSetDestination: (point: { lat: number; lng: number; address: string }) => void;
  onAddPlaceToRoute: (place: InterestingPlace) => void;
};

export function useMapPickPopup({
  pickPinElRef,
  mapPick,
  routeBuilt,
  intermediates,
  ignoreNextClick,
  clearPickMarker,
  onMapPickCancel,
  onMapPickSetStart,
  onMapPickSetDestination,
  onAddPlaceToRoute
}: UseMapPickPopupParams) {
  const handlePickCancel = useCallback(() => {
    ignoreNextClick();
    clearPickMarker();
    onMapPickCancel();
  }, [clearPickMarker, ignoreNextClick, onMapPickCancel]);

  const handleSetStart = useCallback(() => {
    if (!mapPick) return;
    ignoreNextClick();
    onMapPickSetStart(mapPick);
    clearPickMarker();
  }, [clearPickMarker, ignoreNextClick, mapPick, onMapPickSetStart]);

  const handleSetDestination = useCallback(() => {
    if (!mapPick) return;
    ignoreNextClick();
    onMapPickSetDestination(mapPick);
    clearPickMarker();
  }, [clearPickMarker, ignoreNextClick, mapPick, onMapPickSetDestination]);

  const handlePickAddStop = useCallback(() => {
    if (!mapPick) return;
    ignoreNextClick();
    onAddPlaceToRoute(mapPickPointToInterestingPlace(mapPick));
    clearPickMarker();
  }, [clearPickMarker, ignoreNextClick, mapPick, onAddPlaceToRoute]);

  const handlePickOpenGmaps = useCallback(() => {
    if (!mapPick) return;
    ignoreNextClick();
    globalThis.open(getGoogleMapsUrlFromMapPick(mapPick), '_blank', 'noreferrer');
  }, [ignoreNextClick, mapPick]);

  const mapPickAddedToRoute = Boolean(
    mapPick?.placeId && intermediates.some((stop) => stop.id === mapPick.placeId)
  );

  useEffect(() => {
    if (!pickPinElRef.current) return;

    syncMapPickPopupOnPin({
      pinEl: pickPinElRef.current,
      pick: mapPick,
      routeBuilt,
      isAddedToRoute: mapPickAddedToRoute,
      onAction: (action) => {
        if (action === 'close') {
          handlePickCancel();
          return;
        }

        if (routeBuilt) {
          if (action === 'add-stop') handlePickAddStop();
          else if (action === 'open-gmaps') handlePickOpenGmaps();
          return;
        }

        if (action === 'start') handleSetStart();
        else if (action === 'dest') handleSetDestination();
      }
    });
  }, [
    handlePickAddStop,
    handlePickCancel,
    handlePickOpenGmaps,
    handleSetDestination,
    handleSetStart,
    mapPick,
    mapPickAddedToRoute,
    pickPinElRef,
    routeBuilt
  ]);
}
