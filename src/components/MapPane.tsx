import { useCallback, useEffect, useRef, useState } from 'react';
import { buildAndDrawRoute, clearRouteFromMap, formatDistance, formatDuration } from '../utils/googleRouteLayer';
import { getRouteElevationStats } from '../utils/elevationUtils';
import { createPlacePinElement } from '../utils/placePinMarker';
import { filterPlacesNearRoute } from '../utils/placesAlongRoute';
import { searchPlacesAlongRoute } from '../api/secrchPlacesAlongRoute';
import type { ActivityMode, ElevationStats, InterestingPlace, RouteIntermediatePoint } from '../utils/types';
import { bindMapViewportBounds } from '../api/placeAutocomplete';
import { resolvePlaceCategory } from '../utils/poiTypes';

const modeLabel: Record<ActivityMode, string> = {
  walk: 'Walking',
  bike: 'Cycling'
};

type MapPaneProps = {
  routeBuilt: boolean;
  routeStatus: 'idle' | 'loading' | 'ready' | 'error';
  hideEndpointMarkers: boolean;
  buildNonce: number;
  mode: ActivityMode;
  origin: string;
  destination: string;
  intermediates: RouteIntermediatePoint[];
  refreshPlaces: boolean;
  routePlaces: InterestingPlace[];
  selectedPlace: string | null;
  mapPickMode: boolean;
  mapPickTarget: 'start' | 'destination' | null;
  startPoint: RouteEndpointPoint | null;
  destinationPoint: RouteEndpointPoint | null;
  onSelectPlace: (placeId: string) => void;
  onRouteInfoChange: (routeInfo: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    distance: string;
    duration: string;
    elevation: ElevationStats | null;
    interestingPlaces: InterestingPlace[];
    errorMessage?: string;
  }) => void;
  onMapPickSetStart: (point: RouteEndpointPoint) => void;
  onMapPickSetDestination: (point: RouteEndpointPoint) => void;
  onMapPickCancel: () => void;
  onMapReady?: (map: google.maps.Map) => void;
};

type RouteEndpointPoint = {
  lat: number;
  lng: number;
  address: string;
};

type MapPickState = {
  lat: number;
  lng: number;
  address: string;
};

const GOOGLE_SCRIPT_ID = 'google-maps-js';
const DEMO_MAP_ID = '4504f8b37365c3d0';

const defaultCenter: google.maps.LatLngLiteral = { lat: 52.3676, lng: 4.9041 };

function getGoogleMapsNamespace(): typeof google | null {
  const withGoogle = globalThis as typeof globalThis & { google?: typeof google };
  if (!withGoogle.google) return null;
  return withGoogle.google;
}

function loadGoogleMapsApi(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existingGoogle = getGoogleMapsNamespace();
    if (existingGoogle) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Maps script failed to load')), {
        once: true
      });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&language=en`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('Google Maps script failed to load')), { once: true });
    document.head.appendChild(script);
  });
}

type PlaceMarker = {
  id: string;
  place: InterestingPlace;
  marker: google.maps.marker.AdvancedMarkerElement;
  element: HTMLDivElement;
};

async function createPlaceMarkers(params: {
  map: google.maps.Map;
  selectedPlace: string | null;
  onSelectPlace: (placeId: string) => void;
  interestingPlaces: InterestingPlace[];
}): Promise<PlaceMarker[]> {
  const { map, selectedPlace, onSelectPlace, interestingPlaces } = params;
  const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;

  return interestingPlaces.map((place, index) => {
    const baseColor = resolvePlaceColor(place);
    const active = selectedPlace === place.id;
    const color = baseColor;

    const element = createPlaceMarkerElement({
      place,
      index,
      color,
      active
    });

    const marker = new AdvancedMarkerElement({
      map,
      position: { lat: place.lat, lng: place.lng },
      title: place.name,
      anchorLeft: '-50%',
      anchorTop: '-100%'
    });

    const handleClick = () => {
      onSelectPlace(place.id);
    };

    marker.append(element);

    // Для AdvancedMarkerElement надежнее использовать addListener('click'),
    // а не только addEventListener('gmp-click').
    marker.addListener('click', handleClick);

    // Дополнительно слушаем сам кастомный DOM-маркер.
    element.addEventListener('click', (event) => {
      event.stopPropagation();
      handleClick();
    });

    return { id: place.id, place, marker, element };
  });
}

function resolvePlaceColor(place: InterestingPlace): string {
  return resolvePlaceCategory(place).color;
}

function createEndpointMarkerElement(params: { variant: 'start' | 'destination'; address: string }): HTMLDivElement {
  const element = document.createElement('div');
  const title = params.variant === 'start' ? 'Start' : 'Destination';
  element.className = `route-endpoint-marker ${params.variant}`;
  element.innerHTML = `
    <div class="route-endpoint-popup">
      <div class="route-endpoint-title">${title}</div>
      <div class="route-endpoint-address">${params.address}</div>
    </div>
    <div class="route-endpoint-dot"></div>
  `;
  return element;
}

function createPlaceMarkerElement(params: {
  place: InterestingPlace;
  index: number;
  color: string;
  active: boolean;
}): HTMLDivElement {
  const element = document.createElement('div');
  const categoryMeta = resolvePlaceCategory(params.place);

  element.className = [
    'place-marker-wrapper',
    `place-marker-${categoryMeta.category}`,
    params.active ? 'is-active' : ''
  ]
    .filter(Boolean)
    .join(' ');

  element.dataset.place = String(params.index);
  element.dataset.placeCategory = categoryMeta.category;

  const pinElement = createPlacePinElement({
    index: params.index,
    title: params.place.name,
    color: params.color,
    active: params.active
  });

  element.appendChild(pinElement);

  if (params.active) {
    const popup = document.createElement('div');
    popup.className = 'place-marker-popup';

    const title = document.createElement('div');
    title.className = 'place-marker-popup-title';
    title.textContent = params.place.name;

    const category = document.createElement('div');
    category.className = 'place-marker-popup-category';
    category.textContent = categoryMeta.label;

    popup.appendChild(title);
    popup.appendChild(category);
    element.appendChild(popup);
  }

  return element;
}

function getRouteFitPadding(map: google.maps.Map): google.maps.Padding {
  const isMobile = globalThis.window.matchMedia('(max-width: 768px)').matches;

  if (!isMobile) {
    return {
      top: 40,
      right: 40,
      bottom: 40,
      left: 40
    };
  }

  const mapHeight = map.getDiv().getBoundingClientRect().height;
  const sheetElement = document.querySelector('.sidebar-mobile-sheet') as HTMLElement | null;
  const sheetHeight = sheetElement?.getBoundingClientRect().height ?? 0;
  const bottomPadding = Math.min(
    Math.round(sheetHeight + 24),
    Math.round(mapHeight * 0.72)
  );

  return {
    top: 72,
    right: 20,
    bottom: bottomPadding,
    left: 20
  };
}

export function MapPane({
  routeBuilt,
  routeStatus,
  hideEndpointMarkers,
  buildNonce,
  mode,
  origin,
  destination,
  intermediates,
  refreshPlaces,
  routePlaces,
  selectedPlace,
  mapPickMode,
  mapPickTarget,
  startPoint,
  destinationPoint,
  onSelectPlace,
  onRouteInfoChange,
  onMapPickSetStart,
  onMapPickSetDestination,
  onMapPickCancel,
  onMapReady
}: Readonly<MapPaneProps>) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const placeMarkersRef = useRef<PlaceMarker[]>([]);
  const pickMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const pickPinElRef = useRef<HTMLDivElement | null>(null);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const startMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const destinationMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const routePlacesRef = useRef<InterestingPlace[]>([]);
  const selectedPlaceRef = useRef<string | null>(null);
  const ignoreNextMapPickClickRef = useRef(false);
  const lastRoutePathRef = useRef<google.maps.LatLngLiteral[]>([]);
  const fitRouteFrameRef = useRef<number | null>(null);
  const [distanceLabel, setDistanceLabel] = useState('—');
  const [mapPick, setMapPick] = useState<MapPickState | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const configuredMapId = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined)?.trim();
  const mapId = configuredMapId || DEMO_MAP_ID;

  const clearPickMarker = useCallback(() => {
    if (pickMarkerRef.current) {
      pickMarkerRef.current.map = null;
      pickMarkerRef.current = null;
    }
    pickPinElRef.current = null;
    setMapPick(null);
  }, []);

  const fitRouteToVisibleArea = useCallback((routePath: google.maps.LatLngLiteral[]) => {
    const map = mapRef.current;
    if (!map || routePath.length < 2) return;

    if (fitRouteFrameRef.current) {
      cancelAnimationFrame(fitRouteFrameRef.current);
    }

    fitRouteFrameRef.current = requestAnimationFrame(() => {
      const bounds = new google.maps.LatLngBounds();
      routePath.forEach((point) => {
        bounds.extend(point);
      });
      map.fitBounds(bounds, getRouteFitPadding(map));
    });
  }, []);

  const handleLocateUser = useCallback(() => {
    const map = mapRef.current;
    if (!map || isLocatingUser) return;

    if (!('geolocation' in navigator)) {
      console.warn('Geolocation is not supported in this browser.');
      return;
    }

    setIsLocatingUser(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        map.panTo(location);
        map.setZoom(Math.max(map.getZoom() ?? 0, 16));
        if (userLocationMarkerRef.current) {
          userLocationMarkerRef.current.setPosition(location);
        } else {
          userLocationMarkerRef.current = new google.maps.Marker({
            map,
            position: location,
            title: 'My location'
          });
        }
        setIsLocatingUser(false);
      },
      (error) => {
        console.warn('Unable to access current location', error);
        setIsLocatingUser(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }, [isLocatingUser]);

  useEffect(() => {
    routePlacesRef.current = routePlaces;
  }, [routePlaces]);

  useEffect(() => {
    selectedPlaceRef.current = selectedPlace;
  }, [selectedPlace]);

  useEffect(() => {
    if (!apiKey || !mapContainerRef.current) return;

    let isMounted = true;

    void loadGoogleMapsApi(apiKey)
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;
        const mapsApi = getGoogleMapsNamespace()?.maps;
        if (!mapsApi) return;
        mapRef.current ??= new mapsApi.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: false,
          panControl: false,
          colorScheme: 'DARK',
          mapId
        });
        bindMapViewportBounds(mapRef.current);
        onMapReady?.(mapRef.current);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Map load failed';
        console.error(message);
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey, mapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setOptions({ clickableIcons: !mapPickMode });
  }, [mapPickMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!mapPickMode) {
      if (pickMarkerRef.current) {
        pickMarkerRef.current.map = null;
        pickMarkerRef.current = null;
      }
      pickPinElRef.current = null;
      return;
    }

    const container = mapContainerRef.current;
    if (container) {
      container.style.cursor = 'crosshair';
    }

    const listener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (ignoreNextMapPickClickRef.current) {
        ignoreNextMapPickClickRef.current = false;
        return;
      }

      const latLng = event.latLng;
      if (!latLng) return;

      const lat = latLng.lat();
      const lng = latLng.lng();

      if (pickMarkerRef.current) {
        pickMarkerRef.current.position = { lat, lng };
      } else {
        void (async () => {
          const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;

          const pinEl = document.createElement('div');
          pinEl.className = 'map-pick-pin';
          pinEl.innerHTML = `<div class="map-pick-pin-dot"></div><div class="map-pick-pin-pulse"></div>`;

          const marker = new AdvancedMarkerElement({
            map,
            position: { lat, lng }
          });
          marker.append(pinEl);
          pickMarkerRef.current = marker;
          pickPinElRef.current = pinEl;
        })();
      }

      const geocoder = new google.maps.Geocoder();
      void geocoder.geocode({ location: { lat, lng } }).then((response) => {
        const address = response.results[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        const point = { lat, lng, address };

        if (mapPickTarget === 'start') {
          onMapPickSetStart(point);
          clearPickMarker();
          return;
        }

        if (mapPickTarget === 'destination') {
          onMapPickSetDestination(point);
          clearPickMarker();
          return;
        }

        setMapPick(point);
      });
    });

    return () => {
      google.maps.event.removeListener(listener);
      if (container) {
        container.style.cursor = '';
      }
    };
  }, [clearPickMarker, mapPickMode, mapPickTarget, onMapPickSetDestination, onMapPickSetStart]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (hideEndpointMarkers) {
      if (startMarkerRef.current) {
        startMarkerRef.current.map = null;
        startMarkerRef.current = null;
      }

      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.map = null;
        destinationMarkerRef.current = null;
      }

      return;
    }

    let disposed = false;

    const syncEndpointMarkers = async () => {
      const { AdvancedMarkerElement } = (await google.maps.importLibrary('marker')) as google.maps.MarkerLibrary;
      if (disposed) return;

      const upsertMarker = (
        currentRef: { current: google.maps.marker.AdvancedMarkerElement | null },
        point: RouteEndpointPoint | null,
        variant: 'start' | 'destination'
      ) => {
        if (!point) {
          if (currentRef.current) {
            currentRef.current.map = null;
            currentRef.current = null;
          }
          return;
        }

        const markerElement = createEndpointMarkerElement({
          variant,
          address: point.address
        });

        if (currentRef.current) {
          currentRef.current.position = { lat: point.lat, lng: point.lng };
          currentRef.current.replaceChildren(markerElement);
          return;
        }

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: point.lat, lng: point.lng },
          anchorLeft: '-50%',
          anchorTop: '-100%'
        });
        marker.append(markerElement);
        currentRef.current = marker;
      };

      upsertMarker(startMarkerRef, startPoint, 'start');
      upsertMarker(destinationMarkerRef, destinationPoint, 'destination');
    };

    void syncEndpointMarkers();

    return () => {
      disposed = true;
    };
  }, [destinationPoint, hideEndpointMarkers, routeStatus, startPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const clearPlaceMarkers = () => {
      placeMarkersRef.current.forEach(({ marker }) => {
        marker.map = null;
      });
      placeMarkersRef.current = [];
    };

    if (!routeBuilt) {
      lastRoutePathRef.current = [];
      clearPlaceMarkers();
      clearRouteFromMap();
      return;
    }

    if (!origin.trim() || !destination.trim()) {
      clearPlaceMarkers();
      onRouteInfoChange({
        status: 'idle',
        distance: '—',
        duration: '—',
        elevation: null,
        interestingPlaces: []
      });
      return;
    }

    let disposed = false;

    void buildAndDrawRoute({
      map,
      origin,
      destination,
      activityMode: mode,
      intermediates,
      fitBounds: false
    })
      .then((result) => {
        if (disposed) return;
        const distance = formatDistance(result.distanceMeters);
        const duration = formatDuration(result.durationMillis);
        setDistanceLabel(distance);
        const routePath =
          result.path?.map((point) => ({
            lat: point.lat,
            lng: point.lng
          })) ?? [];

        lastRoutePathRef.current = routePath;
        fitRouteToVisibleArea(routePath);

        const applyRouteInfo = (elevation: ElevationStats | null) => {
          const encodedPolyline = result.encodedPolyline;

          const placesPromise =
            refreshPlaces && encodedPolyline && apiKey && routePath.length > 1
              ? searchPlacesAlongRoute({
                  encodedPolyline,
                  apiKey,
                  languageCode: 'en'
                })
                  .then((rawPlaces) =>
                    filterPlacesNearRoute({
                      places: rawPlaces,
                      routePath,
                      activityMode: mode
                    })
                  )
                  .catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : 'Places search failed';
                    console.error(message);
                    return [];
                  })
              : Promise.resolve(routePlacesRef.current);

          void placesPromise.then((interestingPlaces) => {
            if (disposed) return;

            clearPlaceMarkers();
            void createPlaceMarkers({
              map,
              selectedPlace: selectedPlaceRef.current,
              onSelectPlace,
              interestingPlaces
            }).then((createdMarkers) => {
              if (disposed) return;
              placeMarkersRef.current = createdMarkers;
            });

            onRouteInfoChange({
              status: 'ready',
              distance,
              duration,
              elevation,
              interestingPlaces
            });
          });
        };

        if (result.path && result.path.length > 1) {
          void getRouteElevationStats(result.path, {
            distanceMeters: result.distanceMeters,
            encodedPolyline: result.encodedPolyline
          })
            .then((stats) => {
              if (disposed) return;
              applyRouteInfo(stats);
            })
            .catch((error: unknown) => {
              const message = error instanceof Error ? error.message : 'Elevation build failed';
              console.error(message);
              applyRouteInfo(null);
            });
        } else {
          applyRouteInfo(null);
        }
      })
      .catch((error: unknown) => {
        if (disposed) return;
        const message = error instanceof Error ? error.message : 'Route build failed';
        console.error(message);
        clearPlaceMarkers();
        clearRouteFromMap();
        setDistanceLabel('—');
        onRouteInfoChange({
          status: 'error',
          distance: '—',
          duration: '—',
          elevation: null,
          interestingPlaces: refreshPlaces ? [] : routePlacesRef.current,
          errorMessage: message === 'Route not found' ? 'Route not found' : 'Unable to build route'
        });
      });

    return () => {
      disposed = true;
    };
  }, [
    apiKey,
    buildNonce,
    destination,
    intermediates,
    mode,
    onRouteInfoChange,
    onSelectPlace,
    origin,
    fitRouteToVisibleArea,
    refreshPlaces,
    routeBuilt
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    placeMarkersRef.current.forEach((placeMarker) => {
      const baseColor = resolvePlaceColor(placeMarker.place);
      const active = selectedPlace === placeMarker.id;
      const nextColor = baseColor;
      const index = Number(placeMarker.element.dataset.place ?? '0');

      const nextElement = createPlaceMarkerElement({
        place: placeMarker.place,
        index,
        color: nextColor,
        active
      });

      nextElement.addEventListener('click', (event) => {
        event.stopPropagation();
        onSelectPlace(placeMarker.id);
      });

      placeMarker.element = nextElement;
      placeMarker.marker.replaceChildren(nextElement);
    });

    if (!selectedPlace) return;

    const selectedMarker = placeMarkersRef.current.find(({ id }) => id === selectedPlace);
    if (!selectedMarker) return;

    const withPadding = map as google.maps.Map & {
      setOptions: (options: google.maps.MapOptions & { padding?: google.maps.Padding }) => void;
    };
    const fitPadding = getRouteFitPadding(map);
    withPadding.setOptions({
      padding: fitPadding
    });

    map.panTo({ lat: selectedMarker.place.lat, lng: selectedMarker.place.lng });

    const targetZoom = Math.max(map.getZoom() ?? 0, 16);
    map.setZoom(targetZoom);

    const isMobile = globalThis.window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const topPadding = fitPadding.top ?? 0;
      const bottomPadding = fitPadding.bottom ?? 0;
      const verticalShift = Math.round(Math.max(0, bottomPadding - topPadding) * 0.35);
      if (verticalShift > 0) {
        map.panBy(0, verticalShift);
      }
    }
  }, [selectedPlace, routeBuilt, onSelectPlace]);

  const handleSetStart = () => {
    if (mapPick) {
      ignoreNextMapPickClickRef.current = true;
      onMapPickSetStart(mapPick);
      clearPickMarker();
    }
  };

  const handleSetDestination = () => {
    if (mapPick) {
      ignoreNextMapPickClickRef.current = true;
      onMapPickSetDestination(mapPick);
      clearPickMarker();
    }
  };

  const handlePickCancel = () => {
    clearPickMarker();
    onMapPickCancel();
  };

  useEffect(() => {
    if (!pickPinElRef.current || !mapPick) return;
    const pinEl = pickPinElRef.current;

    const existing = pinEl.querySelector('.map-pick-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'map-pick-popup';
    popup.innerHTML = `
      <button type="button" class="map-pick-popup-close" data-action="close" aria-label="Close popup">×</button>
      <div class="map-pick-popup-address">${mapPick.address}</div>
      <div class="map-pick-popup-actions">
        <button type="button" class="map-pick-popup-btn start" data-action="start">Start</button>
        <button type="button" class="map-pick-popup-btn dest" data-action="dest">Destination</button>
      </div>
    `;
    popup.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
      if (!target) return;
      const action = target.dataset.action;
      if (action === 'start') handleSetStart();
      else if (action === 'dest') handleSetDestination();
      else if (action === 'close') handlePickCancel();
    });

    pinEl.style.overflow = 'visible';
    pinEl.appendChild(popup);
  }, [mapPick]);

  return (
    <div className={`map-pane${mapPickMode ? ' map-pick-mode' : ''}`}>
      <div
        ref={mapContainerRef}
        className="google-map-canvas"
      />

      <div className="map-float top-right">
        <button
          className="map-float-btn"
          type="button"
          onClick={handleLocateUser}
          disabled={isLocatingUser}
          aria-label="My location">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="3"
            />
            <circle
              cx="12"
              cy="12"
              r="8"
              fill="none"
            />
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2" />
          </svg>
        </button>
      </div>

      {routeBuilt && (
        <div className="map-badge">
          {modeLabel[mode]} route · {distanceLabel}
        </div>
      )}
    </div>
  );
}
