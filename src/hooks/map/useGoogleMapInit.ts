import { useEffect, useRef, useState } from 'react';
import { bindMapViewportBounds } from '../../api/placeAutocomplete';
import { useMapPaneMarkers } from '../useMapPaneMarkers';
import { DEFAULT_MAP_CENTER } from './mapPaneConstants';
import { readMapViewportFromUrl } from '../../utils/mapUrlState';

type UseGoogleMapInitParams = {
  apiKey: string | undefined;
  mapId: string | undefined;
  onMapReady?: (map: google.maps.Map) => void;
};

export function useGoogleMapInit({ apiKey, mapId, onMapReady }: UseGoogleMapInitParams) {
  const { loadGoogleMapsApi, getGoogleMapsNamespace } = useMapPaneMarkers();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!apiKey || !mapContainerRef.current) return;

    let isMounted = true;

    void loadGoogleMapsApi(apiKey)
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;
        const mapsApi = getGoogleMapsNamespace()?.maps;
        if (!mapsApi) return;

        const urlViewport = readMapViewportFromUrl();

        mapRef.current ??= new mapsApi.Map(mapContainerRef.current, {
          center: urlViewport ?? DEFAULT_MAP_CENTER,
          zoom: urlViewport?.zoom ?? 13,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          panControl: false,
          colorScheme: 'DARK',
          mapId,
          clickableIcons: true
        });
        bindMapViewportBounds(mapRef.current);
        const instance = mapRef.current;
        setMap(instance);
        setIsReady(true);
        onMapReady?.(instance);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Map load failed';
        console.error(message);
      });

    return () => {
      isMounted = false;
      setIsReady(false);
      setMap(null);
      mapRef.current = null;
    };
  }, [apiKey, getGoogleMapsNamespace, loadGoogleMapsApi, mapId, onMapReady]);

  return { mapContainerRef, mapRef, map, isReady };
}
