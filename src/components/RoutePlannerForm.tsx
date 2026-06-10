import { useRef, useState } from 'react';
import type { ActivityMode } from '../utils/types';
import type { PlaceAutocompleteSelection } from '../api/placeAutocomplete';
import type { LocationSuggestion } from '../utils/locationSuggestions';
import { EndPinIcon } from './icons/EndPinIcon';
import { StartPinIcon } from './icons/StartPinIcon';
import { ModeIcon } from './ModeIcon';
import { useSuggestedLocationActions } from '../hooks/useSuggestedLocationActions';
import { LocationInputWithDropdown } from './LocationInputWithDropdown';
import { MobileLocationDragGroup } from './MobileLocationDragGroup';
import { RoutePoints } from './RoutePoints';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { SearchHistory } from './SearchHistory';
import { SuggestedLocations } from './SuggestedLocations';
import type { SearchHistoryEntry } from '../utils/searchHistory';
import type { ExpandedSheetSnap } from '../utils/mobileRouteSheetSnap';
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
  mapPickTarget?: 'start' | 'destination' | null;
  onSwapLocations: () => void;
  routeBuilt?: boolean;
  routeStops?: RouteIntermediatePoint[];
  routePlaces?: InterestingPlace[];
  alongRoutePlaceIds?: ReadonlySet<string>;
  routePath?: LatLng[];
  onRemoveStop?: (placeId: string) => void;
  onStopHover?: (placeId: string | null) => void;
  onStopClick?: (placeId: string) => void;
  onRoutePointsClick?: () => void;
  hoveredStopId?: string | null;
  selectedStopId?: string | null;
  onPlanNewRoute?: () => void;
  isOnline?: boolean;
  onCollapseMobileSheet?: () => void;
  onSearchHistorySelect?: (entry: SearchHistoryEntry) => void;
  mobileSheetSnap?: ExpandedSheetSnap;
  isMobileSheetExpanded?: boolean;
  onExpandMobileSheetForInput?: () => void;
};

type ActiveDropdown = 'from' | 'to' | null;

function isMobileSheetFullyOpen(
  expanded: boolean,
  snap: ExpandedSheetSnap | undefined
): boolean {
  return expanded && snap === 'penultimate';
}

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
  mapPickTarget = null,
  onSwapLocations,
  routeBuilt = false,
  routeStops = [],
  routePlaces = [],
  alongRoutePlaceIds,
  routePath,
  onRemoveStop,
  onStopHover,
  onStopClick,
  onRoutePointsClick,
  hoveredStopId = null,
  selectedStopId = null,
  isOnline = true,
  onCollapseMobileSheet,
  onSearchHistorySelect,
  mobileSheetSnap,
  isMobileSheetExpanded = true,
  onExpandMobileSheetForInput
}: Readonly<RoutePlannerFormProps>) {
  const isMobile = variant === 'mobile';
  const fromInputId = isMobile ? 'fromInputMob' : 'fromInput';
  const toInputId = isMobile ? 'toInputMob' : 'toInput';
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [suggestedLocationTarget, setSuggestedLocationTarget] = useState<'start' | 'destination'>('start');
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  const isBuildRouteDisabled = !from.trim() || !to.trim() || !isOnline;
  const showSuggestedLocations = !from.trim() || !to.trim();
  const activeSuggestedTarget: 'start' | 'destination' =
    !from.trim() && to.trim() ? 'start' : from.trim() && !to.trim() ? 'destination' : suggestedLocationTarget;

  const { entries: searchHistoryEntries, removeEntry: removeSearchHistoryEntry } =
    useSearchHistory();

  const showSearchHistory =
    searchHistoryEntries.length > 0 &&
    (!isMobile || isMobileSheetFullyOpen(isMobileSheetExpanded, mobileSheetSnap));

  const { fillCurrentLocation, selectOnMap } = useSuggestedLocationActions({
    map,
    isMobile,
    onFromPlaceSelect,
    onToPlaceSelect,
    onMapPickFocusTarget,
    onCollapseMobileSheet
  });

  const clearLocationInputFocus = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && activeElement.closest('[data-location-field]')) {
      activeElement.blur();
    }

    fromInputRef.current?.blur();
    toInputRef.current?.blur();
    setActiveDropdown(null);
    onMapPickCancel();
  };

  const handlePanelPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('[data-location-field]')) {
      return;
    }

    clearLocationInputFocus();
  };

  const fromField = (
    <LocationInputWithDropdown
      inputId={fromInputId}
      inputRef={fromInputRef}
      value={from}
      placeholder="Start point"
      map={map}
      suggestions={fromSuggestions}
      onPlaceSelect={onFromPlaceSelect}
      pinIcon={<StartPinIcon />}
      wrapperClassName={`${isMobile ? 'sidebar-mobile-location-row' : 'location-pin-input start-loc'}${mapPickTarget === 'start' ? ' is-map-pick-target' : ''}`}
      isOpen={activeDropdown === 'from'}
      onOpenChange={(open) => setActiveDropdown(open ? 'from' : null)}
      onValueChange={onFromChange}
      onMapPickCancel={onMapPickCancel}
      onFocus={() => {
        if (isMobile) {
          onExpandMobileSheetForInput?.();
        }
        setSuggestedLocationTarget('start');
        onMapPickFocusTarget('start');
      }}
      trailing={
        <>
          <button
            className="clear-btn"
            onClick={() => {
              setSuggestedLocationTarget('start');
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
      inputRef={toInputRef}
      value={to}
      placeholder="Destination"
      map={map}
      suggestions={toSuggestions}
      onPlaceSelect={onToPlaceSelect}
      pinIcon={<EndPinIcon />}
      wrapperClassName={`${isMobile ? 'sidebar-mobile-location-row' : 'location-pin-input end-loc'}${mapPickTarget === 'destination' ? ' is-map-pick-target' : ''}`}
      isOpen={activeDropdown === 'to'}
      onOpenChange={(open) => setActiveDropdown(open ? 'to' : null)}
      onValueChange={onToChange}
      onMapPickCancel={onMapPickCancel}
      onFocus={() => {
        if (isMobile) {
          onExpandMobileSheetForInput?.();
        }
        setSuggestedLocationTarget('destination');
        onMapPickFocusTarget('destination');
      }}
      trailing={
        <button
          className="clear-btn"
          onClick={() => {
            setSuggestedLocationTarget('destination');
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
        onStopClick={onStopClick}
        onRoutePointsClick={onRoutePointsClick}
        hoveredStopId={hoveredStopId}
        selectedStopId={selectedStopId}
      />
    </>
  );

  const plannerView = (
    <>
      {isMobile ? (
        <MobileLocationDragGroup>
          {fromField}
          {toField}
        </MobileLocationDragGroup>
      ) : (
        <div className="location-picker">
          {fromField}
          {toField}
        </div>
      )}

      {showSuggestedLocations ? (
        <SuggestedLocations
          onCurrentLocation={() => {
            void fillCurrentLocation(activeSuggestedTarget);
          }}
          onSelectOnMap={() => {
            selectOnMap(activeSuggestedTarget);
            if (!isMobile) {
              const input =
                activeSuggestedTarget === 'start' ? fromInputRef.current : toInputRef.current;
              input?.focus({ preventScroll: true });
            }
          }}
        />
      ) : null}

      <SearchHistory
        entries={searchHistoryEntries}
        visible={showSearchHistory}
        onSelect={(entry) => onSearchHistorySelect?.(entry)}
        onRemove={removeSearchHistoryEntry}
      />

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
    return (
      <div className="sidebar-mobile-form" onPointerDownCapture={handlePanelPointerDown}>
        {content}
      </div>
    );
  }

  return (
    <div className="sidebar-section" onPointerDownCapture={handlePanelPointerDown}>
      {!routeBuilt && <div className="sidebar-title">Plan your route</div>}
      {content}
    </div>
  );
}
