import type { PlaceAutocompleteSelection } from '../api/placeAutocomplete';
import { useLocationInputWithDropdown } from '../hooks/useLocationInputWithDropdown';
import type { LocationSuggestion } from '../utils/locationSuggestions';
import { LocationDropdown } from './LocationDropdown';

export type LocationInputWithDropdownProps = {
  inputId: string;
  value: string;
  placeholder: string;
  map?: google.maps.Map | null;
  suggestions?: LocationSuggestion[];
  pinIcon: React.ReactNode;
  wrapperClassName: string;
  trailing?: React.ReactNode;
  onValueChange: (value: string) => void;
  onPlaceSelect?: (place: PlaceAutocompleteSelection) => void;
  onSelectSuggestion?: (suggestion: LocationSuggestion) => void;
  onFocus?: () => void;
  onMapPickCancel?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function LocationInputWithDropdown({
  inputId,
  value,
  placeholder,
  map = null,
  suggestions = [],
  pinIcon,
  wrapperClassName,
  trailing,
  onValueChange,
  onPlaceSelect,
  onSelectSuggestion,
  onFocus,
  onMapPickCancel,
  isOpen,
  onOpenChange
}: Readonly<LocationInputWithDropdownProps>) {
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
    inputId,
    value,
    map,
    manualSuggestions: suggestions,
    onValueChange,
    onPlaceSelect,
    onSelectSuggestion,
    onFocus,
    onMapPickCancel,
    isOpen,
    onOpenChange
  });

  return (
    <div className={wrapperClassName} data-location-field={inputId}>
      {pinIcon}
      <input
        ref={inputRef}
        id={inputId}
        value={value}
        onChange={(event) => inputProps.onChange(event.target.value)}
        onFocus={inputProps.onFocus}
        onBlur={inputProps.onBlur}
        onKeyDown={inputProps.onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listboxId : undefined}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {trailing}
      <LocationDropdown
        listboxId={listboxId}
        inputId={inputId}
        visible={showDropdown}
        isLoading={isLoading}
        suggestions={dropdownSuggestions}
        highlightedIndex={highlightedIndex}
        onHighlight={highlightSuggestion}
        onSelect={selectSuggestion}
      />
    </div>
  );
}
