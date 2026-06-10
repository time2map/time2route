import { useState } from 'react';
import type { ActivityMode } from '../utils/types';
import type { PlaceAutocompleteSelection } from '../api/placeAutocomplete';
import type { LocationSuggestion } from '../utils/locationSuggestions';
import { EndPinIcon } from './icons/EndPinIcon';
import { StartPinIcon } from './icons/StartPinIcon';
import { ModeIcon } from './ModeIcon';
import { LocationInputWithDropdown } from './LocationInputWithDropdown';
import { RoutePoints } from './RoutePoints';
import type { InterestingPlace, LatLng, RouteIntermediatePoint } from '../utils/types';

type RoutePlannerFormProps = {
  variant: 'desktop' | 'mobile';
  from: string;
  to: string;
  mode: ActivityMode;
  map?: google.maps.Map | null;
  fromSuggestions?: LocationSuggestion[];
  toSuggestions?: LocationSuggestion[];
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onFromPlaceSelect?: (place: PlaceAutocompleteSelection) => void;
  onToPlaceSelect?: (place: PlaceAutocompleteSelection) => void;
  onModeChange: (value: ActivityMode) => void;
  onBuildRoute: () => void;
  onMapPickFocusTarget: (target: 'start' | 'destination') => void;
  onMapPickCancel: () => void;
  onSwapLocations: () => void;
  routeBuilt?: boolean;
  routeStops?: RouteIntermediatePoint[];
  routePlaces?: InterestingPlace[];
  alongRoutePlaceIds?: ReadonlySet<string>;
  routePath?: LatLng[];
  onRemoveStop?: (placeId: string) => void;
  onStopHover?: (placeId: string | null) => void;
  hoveredStopId?: string | null;
  onPlanNewRoute?: () => void;
  isOnline?: boolean;
};

type ActiveDropdown = 'from' | 'to' | null;

export function RoutePlannerForm({
  variant,
  from,
  to,
  mode,
  map = null,
  fromSuggestions = [],
  toSuggestions = [],
  onFromChange,
  onToChange,
  onFromPlaceSelect,
  onToPlaceSelect,
  onModeChange,
  onBuildRoute,
  onMapPickFocusTarget,
  onMapPickCancel,
  onSwapLocations,
  routeBuilt = false,
  routeStops = [],
  routePlaces = [],
  alongRoutePlaceIds,
  routePath,
  onRemoveStop,
  onStopHover,
  hoveredStopId = null,
  isOnline = true
}: Readonly<RoutePlannerFormProps>) {
  const isMobile = variant === 'mobile';
  const fromInputId = isMobile ? 'fromInputMob' : 'fromInput';
  const toInputId = isMobile ? 'toInputMob' : 'toInput';
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);

  const isBuildRouteDisabled = !from.trim() || !to.trim() || !isOnline;

  const fromField = (
    <LocationInputWithDropdown
      inputId={fromInputId}
      value={from}
      placeholder="Start point"
      map={map}
      suggestions={fromSuggestions}
      onPlaceSelect={onFromPlaceSelect}
      pinIcon={<StartPinIcon />}
      wrapperClassName={
        isMobile ? 'sidebar-mobile-location-row' : 'location-pin-input start-loc'
      }
      isOpen={activeDropdown === 'from'}
      onOpenChange={(open) => setActiveDropdown(open ? 'from' : null)}
      onValueChange={onFromChange}
      onMapPickCancel={onMapPickCancel}
      onFocus={() => {
        onMapPickFocusTarget('start');
      }}
      trailing={
        <>
          <button
            className="clear-btn"
            onClick={() => {
              onFromChange('');
              onMapPickFocusTarget('start');
            }}
            type="button"
            aria-label="Clear start point">
            ×
          </button>
          <button
            className="swap-btn"
            onClick={onSwapLocations}
            title="Swap A ↔ B"
            type="button"
            aria-label="Swap start and destination">
            ⇅
          </button>
        </>
      }
    />
  );

  const toField = (
    <LocationInputWithDropdown
      inputId={toInputId}
      value={to}
      placeholder="Destination"
      map={map}
      suggestions={toSuggestions}
      onPlaceSelect={onToPlaceSelect}
      pinIcon={<EndPinIcon />}
      wrapperClassName={
        isMobile ? 'sidebar-mobile-location-row' : 'location-pin-input end-loc'
      }
      isOpen={activeDropdown === 'to'}
      onOpenChange={(open) => setActiveDropdown(open ? 'to' : null)}
      onValueChange={onToChange}
      onMapPickCancel={onMapPickCancel}
      onFocus={() => {
        onMapPickFocusTarget('destination');
      }}
      trailing={
        <button
          className="clear-btn"
          onClick={() => {
            onToChange('');
            onMapPickFocusTarget('destination');
          }}
          type="button"
          aria-label="Clear destination">
          ×
        </button>
      }
    />
  );

  const routePointsView = (
    <>
      <RoutePoints
        from={from}
        to={to}
        stops={routeStops}
        routePlaces={routePlaces}
        alongRoutePlaceIds={alongRoutePlaceIds}
        routePath={routePath}
        onRemoveStop={onRemoveStop}
        onStopHover={onStopHover}
        hoveredStopId={hoveredStopId}
      />
    </>
  );

  const plannerView = (
    <>
      {isMobile ? (
        <div className="sidebar-mobile-location-group">
          {fromField}
          {toField}
        </div>
      ) : (
        <div className="location-picker">
          {fromField}
          {toField}
        </div>
      )}

      <div className="segmented-control">
        {(['walk', 'bike'] as const).map((item) => (
          <button
            key={item}
            className={mode === item ? 'active' : ''}
            onClick={() => onModeChange(item)}
            type="button">
            <ModeIcon mode={item} />
            {item}
          </button>
        ))}
      </div>

      <button
        className="cta-btn"
        onClick={onBuildRoute}
        disabled={isBuildRouteDisabled}
        type="button">
        Build shortest route
      </button>
      <p className="helper-text">Find the shortest way and discover what is along it.</p>
    </>
  );

  const content = routeBuilt ? routePointsView : plannerView;

  if (isMobile) {
    return <div className="sidebar-mobile-form">{content}</div>;
  }

  return (
    <div className="sidebar-section">
      {!routeBuilt && <div className="sidebar-title">Plan your route</div>}
      {content}
    </div>
  );
}
