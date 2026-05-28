import { LocationPinIcon } from './icons/LocationPinIcon';
import type { LocationSuggestion } from '../utils/locationSuggestions';

type LocationDropdownProps = {
  listboxId: string;
  inputId: string;
  visible: boolean;
  isLoading: boolean;
  suggestions: LocationSuggestion[];
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: (suggestion: LocationSuggestion) => void;
};

export function LocationDropdown({
  listboxId,
  inputId,
  visible,
  isLoading,
  suggestions,
  highlightedIndex,
  onHighlight,
  onSelect
}: Readonly<LocationDropdownProps>) {
  let body: React.ReactNode;

  if (isLoading) {
    body = <div className="location-dropdown-empty">Searching…</div>;
  } else if (suggestions.length > 0) {
    body = suggestions.map((suggestion, index) => (
      <button
        key={suggestion.id}
        type="button"
        role="option"
        aria-selected={index === highlightedIndex}
        className={`location-option${index === highlightedIndex ? ' highlighted' : ''}`}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => onHighlight(index)}
        onClick={() => {
          void onSelect(suggestion);
        }}>
        <span className="loc-icon">
          <LocationPinIcon />
        </span>
        <span className="loc-info">
          <span className="loc-name">{suggestion.name}</span>
          {suggestion.subtitle ? <span className="loc-sub">{suggestion.subtitle}</span> : null}
        </span>
        {suggestion.distance ? (
          <span className="loc-distance">{suggestion.distance}</span>
        ) : null}
      </button>
    ));
  } else {
    body = <div className="location-dropdown-empty">No places found</div>;
  }

  return (
    <div
      className={`location-dropdown${visible ? ' visible' : ''}`}
      id={listboxId}
      role="listbox"
      aria-labelledby={inputId}>
      {body}
    </div>
  );
}
