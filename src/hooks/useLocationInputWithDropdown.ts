import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  resolvePlaceAutocompletePrediction,
  resolvePlaceById,
  type PlaceAutocompleteSelection
} from '../api/placeAutocomplete';
import {
  filterLocationSuggestions,
  type LocationSuggestion
} from '../utils/locationSuggestions';
import { usePlaceAutocompleteSuggestions } from './usePlaceAutocompleteSuggestions';

const MIN_QUERY_LENGTH = 1;

export type UseLocationInputWithDropdownParams = {
  inputId: string;
  value: string;
  map?: google.maps.Map | null;
  manualSuggestions?: LocationSuggestion[];
  onValueChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceAutocompleteSelection) => void;
  onSelectSuggestion?: (suggestion: LocationSuggestion) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onMapPickCancel?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeResolved?: boolean;
  inputDisabled?: boolean;
};

function formatSuggestionLabel(suggestion: LocationSuggestion): string {
  return suggestion.subtitle
    ? `${suggestion.name}, ${suggestion.subtitle}`
    : suggestion.name;
}

export function useLocationInputWithDropdown({
  inputId,
  value,
  map = null,
  manualSuggestions = [],
  onValueChange,
  onPlaceSelect,
  onSelectSuggestion,
  onFocus,
  onBlur,
  onMapPickCancel,
  isOpen: isOpenControlled,
  onOpenChange,
  placeResolved = false,
  inputDisabled = false
}: UseLocationInputWithDropdownParams) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpenUncontrolled, setIsOpenUncontrolled] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const useGoogleAutocomplete = Boolean(map && onPlaceSelect);
  const isOpen = isOpenControlled ?? isOpenUncontrolled;

  const {
    suggestions: googleSuggestions,
    isLoading,
    predictionsRef,
    resetSession
  } = usePlaceAutocompleteSuggestions({
    map: useGoogleAutocomplete ? map : null,
    query: value,
    isOpen,
    enabled: useGoogleAutocomplete && !placeResolved
  });

  const setIsOpen = useCallback(
    (open: boolean) => {
      onOpenChange?.(open);
      if (isOpenControlled === undefined) {
        setIsOpenUncontrolled(open);
      }
    },
    [isOpenControlled, onOpenChange]
  );

  const dropdownSuggestions = useGoogleAutocomplete
    ? googleSuggestions
    : filterLocationSuggestions(manualSuggestions, value);

  const showDropdown = isOpen && !placeResolved && value.trim().length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (!placeResolved) {
      return;
    }

    setIsOpen(false);
    setHighlightedId(null);
    resetSession();
  }, [placeResolved, resetSession, setIsOpen]);

  const highlightedIndex = useMemo(() => {
    if (dropdownSuggestions.length === 0) return -1;
    if (!highlightedId) return 0;
    const index = dropdownSuggestions.findIndex((suggestion) => suggestion.id === highlightedId);
    return index >= 0 ? index : 0;
  }, [dropdownSuggestions, highlightedId]);

  const finishSelection = useCallback(() => {
    setIsOpen(false);
    setHighlightedId(null);
    onMapPickCancel?.();
    inputRef.current?.blur();
  }, [onMapPickCancel, setIsOpen]);

  const applyPlaceSelection = useCallback(
    (place: PlaceAutocompleteSelection) => {
      onValueChange(place.address ?? place.name);
      onPlaceSelect?.(place);
      resetSession();
    },
    [onPlaceSelect, onValueChange, resetSession]
  );

  const selectSuggestion = useCallback(
    async (suggestion: LocationSuggestion) => {
      try {
        if (useGoogleAutocomplete) {
          const prediction = predictionsRef.current.get(suggestion.id);
          const place = prediction
            ? await resolvePlaceAutocompletePrediction(prediction)
            : await resolvePlaceById(suggestion.id);
          applyPlaceSelection(place);
          return;
        }

        onValueChange(formatSuggestionLabel(suggestion));
        onSelectSuggestion?.(suggestion);
      } catch (error: unknown) {
        console.error(error);
        onValueChange(formatSuggestionLabel(suggestion));
      } finally {
        finishSelection();
      }
    },
    [
      applyPlaceSelection,
      finishSelection,
      onSelectSuggestion,
      onValueChange,
      predictionsRef,
      useGoogleAutocomplete
    ]
  );

  const activateMapPickTarget = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  const handleInputFocus = useCallback(() => {
    if (inputDisabled) {
      return;
    }

    resetSession();
    activateMapPickTarget();
    if (!placeResolved && value.trim().length >= MIN_QUERY_LENGTH) {
      setIsOpen(true);
    }
  }, [activateMapPickTarget, inputDisabled, placeResolved, resetSession, setIsOpen, value]);

  const handleInputPointerDown = useCallback(() => {
    if (inputDisabled) {
      return;
    }

    activateMapPickTarget();
  }, [activateMapPickTarget, inputDisabled]);

  const handleInputChange = useCallback(
    (nextValue: string) => {
      onValueChange(nextValue);
      setHighlightedId(null);
      setIsOpen(!placeResolved && nextValue.trim().length >= MIN_QUERY_LENGTH);
    },
    [onValueChange, placeResolved, setIsOpen]
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown) {
        if (event.key === 'ArrowDown' && value.trim().length >= MIN_QUERY_LENGTH) {
          setIsOpen(true);
        }
        return;
      }

      if (event.key === 'ArrowDown' && dropdownSuggestions.length > 0) {
        event.preventDefault();
        const nextIndex =
          highlightedIndex < 0
            ? 0
            : (highlightedIndex + 1) % dropdownSuggestions.length;
        setHighlightedId(dropdownSuggestions[nextIndex].id);
        return;
      }

      if (event.key === 'ArrowUp' && dropdownSuggestions.length > 0) {
        event.preventDefault();
        const nextIndex =
          highlightedIndex <= 0
            ? dropdownSuggestions.length - 1
            : highlightedIndex - 1;
        setHighlightedId(dropdownSuggestions[nextIndex].id);
        return;
      }

      if (event.key === 'Enter' && highlightedIndex >= 0 && dropdownSuggestions[highlightedIndex]) {
        event.preventDefault();
        void selectSuggestion(dropdownSuggestions[highlightedIndex]);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        setHighlightedId(null);
      }
    },
    [
      dropdownSuggestions,
      highlightedIndex,
      selectSuggestion,
      setIsOpen,
      showDropdown,
      value
    ]
  );

  const handleInputBlur = useCallback(() => {
    onBlur?.();
    globalThis.setTimeout(() => {
      if (document.activeElement?.closest(`[data-location-field="${inputId}"]`)) {
        return;
      }
      setIsOpen(false);
      setHighlightedId(null);
    }, 120);
  }, [inputId, onBlur, setIsOpen]);

  const highlightSuggestion = useCallback(
    (index: number) => {
      const suggestion = dropdownSuggestions[index];
      setHighlightedId(suggestion?.id ?? null);
    },
    [dropdownSuggestions]
  );

  return {
    listboxId,
    inputRef,
    showDropdown,
    dropdownSuggestions,
    isLoading,
    highlightedIndex,
    selectSuggestion,
    highlightSuggestion,
    inputProps: {
      onFocus: handleInputFocus,
      onPointerDown: handleInputPointerDown,
      onChange: handleInputChange,
      onKeyDown: handleInputKeyDown,
      onBlur: handleInputBlur
    }
  };
}
