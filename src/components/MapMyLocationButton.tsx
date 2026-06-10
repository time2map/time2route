import { LocationIcon } from './icons/LocationIcon';

type MapMyLocationButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

export function MapMyLocationButton({ onClick, disabled = false }: Readonly<MapMyLocationButtonProps>) {
  return (
    <div className="map-float top-right">
      <button
        className="map-float-btn"
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label="My location">
        <LocationIcon />
      </button>
    </div>
  );
}
