import type { LocationSuggestion } from '../utils/locationSuggestions';

export type PlaceAutocompleteSelection = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
};

type PlacesAutocompleteLibrary = {
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      sessionToken: google.maps.places.AutocompleteSessionToken;
      includedRegionCodes?: string[];
      locationBias?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
    }) => Promise<{ suggestions: google.maps.places.AutocompleteSuggestion[] }>;
  };
  AutocompleteSessionToken: new () => google.maps.places.AutocompleteSessionToken;
};

type MapViewportBoundsBinding = {
  getViewportBounds: () => google.maps.LatLngBounds | undefined;
  destroy: () => void;
};

const mapViewportBoundsBindings = new WeakMap<google.maps.Map, MapViewportBoundsBinding>();

let placesLibraryPromise: Promise<PlacesAutocompleteLibrary> | null = null;

function getPlacesLibrary(): Promise<PlacesAutocompleteLibrary> {
  placesLibraryPromise ??= google.maps.importLibrary('places') as Promise<PlacesAutocompleteLibrary>;
  return placesLibraryPromise;
}

const mapViewportBoundsRefcount = new WeakMap<google.maps.Map, number>();

function syncViewportBounds(map: google.maps.Map, viewportBounds: { current: google.maps.LatLngBounds | undefined }) {
  viewportBounds.current = map.getBounds() ?? undefined;
}

export function getMapViewportBounds(map: google.maps.Map): google.maps.LatLngBounds | undefined {
  return map.getBounds() ?? mapViewportBoundsBindings.get(map)?.getViewportBounds();
}

export function bindMapViewportBounds(map: google.maps.Map): () => void {
  const refcount = mapViewportBoundsRefcount.get(map) ?? 0;
  if (refcount > 0) {
    mapViewportBoundsRefcount.set(map, refcount + 1);
    return () => {
      const next = (mapViewportBoundsRefcount.get(map) ?? 1) - 1;
      if (next > 0) {
        mapViewportBoundsRefcount.set(map, next);
        return;
      }
      mapViewportBoundsRefcount.delete(map);
      mapViewportBoundsBindings.get(map)?.destroy();
    };
  }

  const viewportBounds = { current: map.getBounds() ?? undefined };

  syncViewportBounds(map, viewportBounds);

  const idleListener = map.addListener('idle', () => {
    syncViewportBounds(map, viewportBounds);
  });

  const binding: MapViewportBoundsBinding = {
    getViewportBounds: () => viewportBounds.current,
    destroy: () => {
      google.maps.event.removeListener(idleListener);
      mapViewportBoundsBindings.delete(map);
    }
  };

  mapViewportBoundsBindings.set(map, binding);
  mapViewportBoundsRefcount.set(map, 1);

  return () => {
    mapViewportBoundsRefcount.delete(map);
    binding.destroy();
  };
}

export type PlaceAutocompleteFetchResult = {
  suggestions: LocationSuggestion[];
  predictionsById: Map<string, google.maps.places.PlacePrediction>;
};

export async function fetchPlaceAutocompleteSuggestions(params: {
  map: google.maps.Map;
  query: string;
  sessionToken: google.maps.places.AutocompleteSessionToken;
}): Promise<PlaceAutocompleteFetchResult> {
  const trimmed = params.query.trim();
  if (!trimmed) {
    return { suggestions: [], predictionsById: new Map() };
  }

  const { AutocompleteSuggestion } = await getPlacesLibrary();
  const viewportBounds = getMapViewportBounds(params.map);

  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: trimmed,
    sessionToken: params.sessionToken,
    ...(viewportBounds ? { locationBias: viewportBounds } : {})
  });

  const predictionsById = new Map<string, google.maps.places.PlacePrediction>();
  const items: LocationSuggestion[] = [];

  suggestions.forEach((suggestion, index) => {
    const placePrediction = suggestion.placePrediction;
    if (!placePrediction) return;

    const id = placePrediction.placeId ?? `prediction-${index}`;
    predictionsById.set(id, placePrediction);
    items.push(predictionToLocationSuggestion(placePrediction, id));
  });

  return { suggestions: items, predictionsById };
}

export async function resolvePlaceAutocompletePrediction(
  placePrediction: google.maps.places.PlacePrediction
): Promise<PlaceAutocompleteSelection> {
  return resolvePlaceDetails(placePrediction.toPlace(), placePrediction.placeId);
}

export async function resolvePlaceById(placeId: string): Promise<PlaceAutocompleteSelection> {
  const { Place } = (await getPlacesLibrary()) as PlacesAutocompleteLibrary & {
    Place: new (options: { id: string }) => google.maps.places.Place;
  };

  return resolvePlaceDetails(new Place({ id: placeId }), placeId);
}

async function resolvePlaceDetails(
  place: google.maps.places.Place,
  fallbackId: string
): Promise<PlaceAutocompleteSelection> {
  await place.fetchFields({
    fields: ['id', 'displayName', 'formattedAddress', 'location']
  });

  const location = place.location;
  if (!location) {
    throw new Error('Selected place has no location');
  }

  return {
    id: place.id ?? fallbackId,
    name: getPlaceDisplayName(place),
    address: place.formattedAddress ?? undefined,
    lat: location.lat(),
    lng: location.lng()
  };
}

function predictionToLocationSuggestion(
  placePrediction: google.maps.places.PlacePrediction,
  id: string
): LocationSuggestion {
  const structured = (
    placePrediction as google.maps.places.PlacePrediction & {
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      text?: { text?: string };
    }
  ).structuredFormat;
  const text = (placePrediction as { text?: { text?: string } }).text;
  const mainText = structured?.mainText?.text ?? text?.text ?? '';
  const secondaryText = structured?.secondaryText?.text;

  return {
    id,
    name: mainText,
    subtitle: secondaryText
  };
}

function getPlaceDisplayName(place: google.maps.places.Place): string {
  const displayName = place.displayName;
  if (typeof displayName === 'string') {
    return displayName;
  }
  if (displayName && typeof displayName === 'object' && 'text' in displayName) {
    return String((displayName as { text?: string }).text ?? '');
  }
  return '';
}
