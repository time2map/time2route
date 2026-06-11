type SuggestedLocationsProps = {
  onCurrentLocation: () => void;
  onSelectOnMap: () => void;
  showCurrentLocation?: boolean;
};

function CurrentLocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8 15.3L12 22l8-4.7A10 10 0 0 0 12 2z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  );
}

export function SuggestedLocations({
  onCurrentLocation,
  onSelectOnMap,
  showCurrentLocation = true
}: Readonly<SuggestedLocationsProps>) {
  return (
    <div className="suggested-locations">
      {showCurrentLocation ? (
        <button type="button" className="location-chip" onClick={onCurrentLocation}>
          <CurrentLocationIcon />
          Current location
        </button>
      ) : null}

      <button
        type="button"
        className="location-chip"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onSelectOnMap}>
        <PinIcon />
        Select on the map
      </button>
    </div>
  );
}
