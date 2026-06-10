import { useCallback, useState } from 'react';
import type { PlaceAutocompleteSelection } from '../api/placeAutocomplete';
import { useLocationInputWithDropdown } from '../hooks/useLocationInputWithDropdown';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { flyMapToPlace } from '../utils/flyMapToPlace';
import { LocationDropdown } from './LocationDropdown';

const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

type MapAreaSearchProps = {
  map: google.maps.Map | null;
  onMapPickCancel?: () => void;
  onCollapseMobileSheet?: () => void;
};

function MapSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function MapAreaSearch({
  map,
  onMapPickCancel,
  onCollapseMobileSheet
}: Readonly<MapAreaSearchProps>) {
  const isMobile = useMediaQuery(MOBILE_MEDIA_QUERY);
  const [query, setQuery] = useState('');

  const handlePlaceSelect = useCallback(
    (place: PlaceAutocompleteSelection) => {
      if (!map) return;
      flyMapToPlace(map, place);
      setQuery(place.address ?? place.name);
    },
    [map]
  );

  const {
    listboxId,
    inputRef,
    showDropdown,
    dropdownSuggestions,
    isLoading,
    highlightedIndex,
    selectSuggestion,
    highlightSuggestion,
    inputProps
  } = useLocationInputWithDropdown({
    inputId: 'map-area-search',
    value: query,
    map,
    onValueChange: setQuery,
    onPlaceSelect: handlePlaceSelect,
    onMapPickCancel
  });

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, [inputRef]);

  const handleFocus = useCallback(() => {
    if (isMobile) {
      onCollapseMobileSheet?.();
    }
    inputProps.onFocus();
  }, [inputProps.onFocus, isMobile, onCollapseMobileSheet]);

  if (!map) {
    return null;
  }

  return (
    <div className="map-area-search-float">
      <div className="map-area-search" data-location-field="map-area-search">
        <span className="map-area-search-icon" aria-hidden="true">
          <MapSearchIcon />
        </span>
        <input
          ref={inputRef}
          id="map-area-search"
          value={query}
          onChange={(event) => inputProps.onChange(event.target.value)}
          onFocus={handleFocus}
          onPointerDown={inputProps.onPointerDown}
          onBlur={inputProps.onBlur}
          onKeyDown={inputProps.onKeyDown}
          placeholder="Search area on map"
          role="combobox"
          aria-label="Search area on map"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listboxId : undefined}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {query.trim().length > 0 ? (
          <button
            type="button"
            className="map-area-search-clear"
            aria-label="Clear search"
            onClick={handleClear}>
            ×
          </button>
        ) : null}
        <LocationDropdown
          listboxId={listboxId}
          inputId="map-area-search"
          visible={showDropdown}
          isLoading={isLoading}
          suggestions={dropdownSuggestions}
          highlightedIndex={highlightedIndex}
          onHighlight={highlightSuggestion}
          onSelect={selectSuggestion}
        />
      </div>
    </div>
  );
}
