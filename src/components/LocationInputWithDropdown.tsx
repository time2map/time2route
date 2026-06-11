import type { PlaceAutocompleteSelection } from '../api/placeAutocomplete';
import { useLocationInputWithDropdown } from '../hooks/useLocationInputWithDropdown';
import type { LocationSuggestion } from '../utils/locationSuggestions';
import { LocationDropdown } from './LocationDropdown';

export type LocationInputWithDropdownProps = {
  inputId: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
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
  onBlur?: () => void;
  onMapPickCancel?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeResolved?: boolean;
  inputDisabled?: boolean;
  onInputActivate?: () => void;
};

export function LocationInputWithDropdown({
  inputId,
  inputRef: externalInputRef,
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
  onBlur,
  onMapPickCancel,
  isOpen,
  onOpenChange,
  placeResolved,
  inputDisabled = false,
  onInputActivate
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
    onBlur,
    onMapPickCancel,
    isOpen,
    onOpenChange,
    placeResolved,
    inputDisabled
  });

  const handleWrapperPointerDownCapture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!inputDisabled) {
      return;
    }

    event.preventDefault();
    onInputActivate?.();
  };

  const setInputRef = (element: HTMLInputElement | null) => {
    inputRef.current = element;
    if (externalInputRef) {
      externalInputRef.current = element;
    }
  };

  return (
    <div
      className={`${wrapperClassName}${inputDisabled ? ' is-sheet-locked' : ''}`}
      data-location-field={inputId}
      onPointerDownCapture={handleWrapperPointerDownCapture}>
      <div className="pin-left">{pinIcon}</div>
      <input
        ref={setInputRef}
        id={inputId}
        value={value}
        readOnly={inputDisabled}
        tabIndex={inputDisabled ? -1 : undefined}
        aria-disabled={inputDisabled || undefined}
        onChange={(event) => inputProps.onChange(event.target.value)}
        onFocus={inputProps.onFocus}
        onPointerDown={inputProps.onPointerDown}
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
