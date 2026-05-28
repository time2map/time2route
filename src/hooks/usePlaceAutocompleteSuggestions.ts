import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPlaceAutocompleteSuggestions } from '../api/placeAutocomplete';
import type { LocationSuggestion } from '../utils/locationSuggestions';

const FETCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;

type SuggestionsFetchState = {
  query: string;
  suggestions: LocationSuggestion[];
  isLoading: boolean;
};

const emptyFetchState: SuggestionsFetchState = {
  query: '',
  suggestions: [],
  isLoading: false
};

async function createSessionToken(): Promise<google.maps.places.AutocompleteSessionToken> {
  const { AutocompleteSessionToken } = (await google.maps.importLibrary(
    'places'
  )) as {
    AutocompleteSessionToken: new () => google.maps.places.AutocompleteSessionToken;
  };
  return new AutocompleteSessionToken();
}

export function usePlaceAutocompleteSuggestions(params: {
  map: google.maps.Map | null;
  query: string;
  isOpen: boolean;
  enabled?: boolean;
}) {
  const { map, query, isOpen, enabled = true } = params;
  const [fetchState, setFetchState] = useState<SuggestionsFetchState>(emptyFetchState);
  const predictionsRef = useRef<Map<string, google.maps.places.PlacePrediction>>(new Map());
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestIdRef = useRef(0);

  const trimmedQuery = query.trim();
  const canSearch =
    enabled && Boolean(map) && isOpen && trimmedQuery.length >= MIN_QUERY_LENGTH;

  const suggestions =
    canSearch && fetchState.query === trimmedQuery ? fetchState.suggestions : [];
  const isLoading =
    canSearch && (fetchState.isLoading || fetchState.query !== trimmedQuery);

  const resetSession = useCallback(() => {
    void createSessionToken().then((token) => {
      sessionTokenRef.current = token;
    });
  }, []);

  useEffect(() => {
    if (!canSearch || !map) {
      predictionsRef.current = new Map();
      return;
    }

    if (!sessionTokenRef.current) {
      void createSessionToken().then((token) => {
        sessionTokenRef.current = token;
      });
    }

    const requestId = ++requestIdRef.current;
    const queryForRequest = trimmedQuery;

    const timer = globalThis.setTimeout(() => {
      const sessionToken = sessionTokenRef.current;
      if (!sessionToken) return;

      setFetchState({
        query: queryForRequest,
        suggestions: [],
        isLoading: true
      });

      void fetchPlaceAutocompleteSuggestions({ map, query: queryForRequest, sessionToken })
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          predictionsRef.current = result.predictionsById;
          setFetchState({
            query: queryForRequest,
            suggestions: result.suggestions,
            isLoading: false
          });
        })
        .catch((error: unknown) => {
          if (requestId !== requestIdRef.current) return;
          console.error(error);
          predictionsRef.current = new Map();
          setFetchState({
            query: queryForRequest,
            suggestions: [],
            isLoading: false
          });
        });
    }, FETCH_DEBOUNCE_MS);

    return () => {
      globalThis.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [canSearch, map, trimmedQuery]);

  return {
    suggestions,
    isLoading,
    predictionsRef,
    resetSession
  };
}
