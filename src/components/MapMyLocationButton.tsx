type MapMyLocationButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

function MyLocationIcon() {
  return (
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
  );
}

export function MapMyLocationButton({ onClick, disabled = false }: Readonly<MapMyLocationButtonProps>) {
  return (
    <div className="map-float top-right">
      <button
        className="map-float-btn"
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label="My location">
        <MyLocationIcon />
      </button>
    </div>
  );
}
