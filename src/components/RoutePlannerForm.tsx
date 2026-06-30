import { useCallback, useEffect, useRef, useState } from 'react';
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
import { GreetingCard } from './GreetingCard';
import { MOBILE_SHEET_ANIMATION_MS } from './MobileRouteSheet';
import { usePlannerBuildButtonSnapHeight } from '../hooks/usePlannerBuildButtonSnapHeight';
import { LocationHint, resolveLocationHintState, resolveMobileLocationHintState } from './LocationHint';
import type { SearchHistoryEntry } from '../utils/searchHistory';
import { isMobileSheetFullyOpen, type ExpandedSheetSnap } from '../utils/mobileRouteSheetSnap';
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
  mapPickHighlightTarget?: 'start' | 'destination' | null;
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
  onMobileMapPickActivate?: () => void;
  fromSelected?: boolean;
  toSelected?: boolean;
  fromIsCurrentLocation?: boolean;
  toIsCurrentLocation?: boolean;
  hasDuplicateRouteEndpoints?: boolean;
  greetingHighlightActive?: boolean;
  onDismissGreeting?: () => void;
  onBuildButtonSnapHeightChange?: (heightPx: number) => void;
};

type ActiveDropdown = 'from' | 'to' | null;

const LOCATION_PLANNER_INTERACTIVE_SELECTOR = [
  '[data-location-field]',
  '.suggested-locations',
  '.location-chip',
  '.search-history',
  '.segmented-control',
  '.cta-btn'
].join(', ');

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
  mapPickHighlightTarget = null,
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
  onExpandMobileSheetForInput,
  onMobileMapPickActivate,
  fromSelected = false,
  toSelected = false,
  fromIsCurrentLocation = false,
  toIsCurrentLocation = false,
  hasDuplicateRouteEndpoints = false,
  greetingHighlightActive = false,
  onDismissGreeting,
  onBuildButtonSnapHeightChange
}: Readonly<RoutePlannerFormProps>) {
  const isMobile = variant === 'mobile';
  const fromInputId = isMobile ? 'fromInputMob' : 'fromInput';
  const toInputId = isMobile ? 'toInputMob' : 'toInput';
  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);
  const [suggestedLocationTarget, setSuggestedLocationTarget] = useState<'start' | 'destination'>('start');
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const locationPickerRef = useRef<HTMLDivElement>(null);
  const mobileFormRef = useRef<HTMLDivElement>(null);
  const buildRouteButtonRef = useRef<HTMLButtonElement>(null);
  const [isGreetingHighlight, setIsGreetingHighlight] = useState(false);
  const [focusedField, setFocusedField] = useState<'from' | 'to' | null>(null);
  const [pendingCurrentLocationTarget, setPendingCurrentLocationTarget] = useState<
    'start' | 'destination' | null
  >(null);
  const [isSheetExpanding, setIsSheetExpanding] = useState(false);
  const sheetExpandTimerRef = useRef<number | null>(null);
  const isMobileSheetOpen = isMobile && isMobileSheetFullyOpen(isMobileSheetExpanded, mobileSheetSnap);
  const mobileInputsLocked = isMobile && !isMobileSheetOpen;
  const mobilePlannerInteractive = !isMobile || (isMobileSheetOpen && !isSheetExpanding);

  usePlannerBuildButtonSnapHeight(
    isMobile && !routeBuilt,
    mobileFormRef,
    buildRouteButtonRef,
    onBuildButtonSnapHeightChange
  );

  const dismissGreetingIfActive = useCallback(() => {
    if (greetingHighlightActive) {
      onDismissGreeting?.();
    }
  }, [greetingHighlightActive, onDismissGreeting]);

  const handleSheetExpandForInput = useCallback(() => {
    dismissGreetingIfActive();

    if (!isMobile) {
      onExpandMobileSheetForInput?.();
      return;
    }

    if (sheetExpandTimerRef.current !== null) {
      globalThis.clearTimeout(sheetExpandTimerRef.current);
    }

    setIsSheetExpanding(true);
    onExpandMobileSheetForInput?.();

    sheetExpandTimerRef.current = globalThis.setTimeout(() => {
      setIsSheetExpanding(false);
      sheetExpandTimerRef.current = null;
    }, MOBILE_SHEET_ANIMATION_MS);
  }, [dismissGreetingIfActive, isMobile, onExpandMobileSheetForInput]);

  useEffect(() => {
    return () => {
      if (sheetExpandTimerRef.current !== null) {
        globalThis.clearTimeout(sheetExpandTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!mobileInputsLocked) {
      return;
    }

    fromInputRef.current?.blur();
    toInputRef.current?.blur();
    setFocusedField(null);
    setActiveDropdown(null);
  }, [mobileInputsLocked]);

  const releaseFocusedField = (field: 'from' | 'to', inputId: string) => {
    globalThis.setTimeout(() => {
      const activeElement = document.activeElement;
      if (activeElement?.closest(`[data-location-field="${inputId}"]`)) {
        return;
      }

      if (activeElement?.closest(LOCATION_PLANNER_INTERACTIVE_SELECTOR)) {
        return;
      }

      setFocusedField((current) => (current === field ? null : current));
    }, 0);
  };

  const isBuildRouteDisabled =
    !from.trim() || !to.trim() || !isOnline || hasDuplicateRouteEndpoints;
  const showSuggestedLocations = !from.trim() || !to.trim();
  const activeSuggestedTarget: 'start' | 'destination' =
    !from.trim() && to.trim() ? 'start' : suggestedLocationTarget;
  const suggestedActionsTarget: 'start' | 'destination' =
    focusedField === 'from' ? 'start' : focusedField === 'to' ? 'destination' : activeSuggestedTarget;
  const oppositeHasCurrentLocation =
    suggestedActionsTarget === 'start' ? toIsCurrentLocation : fromIsCurrentLocation;
  const isCurrentLocationSelectedForTarget =
    suggestedActionsTarget === 'start'
      ? fromIsCurrentLocation || pendingCurrentLocationTarget === 'start'
      : toIsCurrentLocation || pendingCurrentLocationTarget === 'destination';
  const showCurrentLocationChip =
    !isCurrentLocationSelectedForTarget && !oppositeHasCurrentLocation;

  useEffect(() => {
    if (fromIsCurrentLocation) {
      setPendingCurrentLocationTarget((current) => (current === 'start' ? null : current));
    }
  }, [fromIsCurrentLocation]);

  useEffect(() => {
    if (toIsCurrentLocation) {
      setPendingCurrentLocationTarget((current) => (current === 'destination' ? null : current));
    }
  }, [toIsCurrentLocation]);

  const { entries: searchHistoryEntries, removeEntry: removeSearchHistoryEntry } =
    useSearchHistory();

  const showSearchHistory = searchHistoryEntries.length > 0 && mobilePlannerInteractive;

  const blurFromInput = () => {
    fromInputRef.current?.blur();
    setFocusedField((current) => (current === 'from' ? null : current));
    setActiveDropdown((current) => (current === 'from' ? null : current));
  };

  const blurToInput = () => {
    toInputRef.current?.blur();
    setFocusedField((current) => (current === 'to' ? null : current));
    setActiveDropdown((current) => (current === 'to' ? null : current));
  };

  const handleFromPlaceSelect = (place: PlaceAutocompleteSelection) => {
    onFromPlaceSelect?.(place);
    blurFromInput();
  };

  const handleToPlaceSelect = (place: PlaceAutocompleteSelection) => {
    onToPlaceSelect?.(place);
    blurToInput();
  };

  const handleSearchHistoryEntrySelect = (entry: SearchHistoryEntry) => {
    onSearchHistorySelect?.(entry);
    fromInputRef.current?.blur();
    toInputRef.current?.blur();
    setFocusedField(null);
    setActiveDropdown(null);
  };

  const { fillCurrentLocation, selectOnMap } = useSuggestedLocationActions({
    map,
    isMobile,
    onFromPlaceSelect: handleFromPlaceSelect,
    onToPlaceSelect: handleToPlaceSelect,
    onMapPickFocusTarget,
    onMobileMapPickActivate,
    onCollapseMobileSheet
  });

  const handleCurrentLocationSelect = () => {
    if (oppositeHasCurrentLocation || isCurrentLocationSelectedForTarget) {
      return;
    }

    const target = suggestedActionsTarget;
    setPendingCurrentLocationTarget(target);
    void fillCurrentLocation(target).finally(() => {
      setPendingCurrentLocationTarget((current) => (current === target ? null : current));
    });
  };

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
    if (!(target instanceof Element) || target.closest(LOCATION_PLANNER_INTERACTIVE_SELECTOR)) {
      return;
    }

    clearLocationInputFocus();
  };

  const hideMobileLocationHints = isMobile && fromSelected && toSelected;
  const fromHintState =
    hideMobileLocationHints || isMobile
      ? resolveMobileLocationHintState(fromSelected)
      : resolveLocationHintState(focusedField === 'from', fromSelected);
  const toHintState =
    hideMobileLocationHints || isMobile
      ? resolveMobileLocationHintState(toSelected)
      : resolveLocationHintState(focusedField === 'to', toSelected);

  const fromField = (
    <div className="location-field">
      <LocationHint inputId={fromInputId} variant="start" state={fromHintState} />
      <LocationInputWithDropdown
      inputId={fromInputId}
      inputRef={fromInputRef}
      value={from}
      placeholder="Start point"
      map={map}
      suggestions={fromSuggestions}
      onPlaceSelect={handleFromPlaceSelect}
      pinIcon={<StartPinIcon />}
      wrapperClassName={`${isMobile ? 'sidebar-mobile-location-row' : 'location-pin-input start-loc'}${mapPickHighlightTarget === 'start' ? ' is-map-pick-target' : ''}`}
      isOpen={activeDropdown === 'from'}
      onOpenChange={(open) => setActiveDropdown(open ? 'from' : null)}
      onValueChange={onFromChange}
      onMapPickCancel={onMapPickCancel}
      placeResolved={fromSelected}
      inputDisabled={mobileInputsLocked}
      onInputActivate={handleSheetExpandForInput}
      onFocus={() => {
        dismissGreetingIfActive();
        setFocusedField('from');
        setSuggestedLocationTarget('start');
        onMapPickFocusTarget('start');
      }}
      onBlur={() => releaseFocusedField('from', fromInputId)}
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
    </div>
  );

  const toField = (
    <div className="location-field location-field--hint-below">
      <LocationInputWithDropdown
      inputId={toInputId}
      inputRef={toInputRef}
      value={to}
      placeholder="Destination"
      map={map}
      suggestions={toSuggestions}
      onPlaceSelect={handleToPlaceSelect}
      pinIcon={<EndPinIcon />}
      wrapperClassName={`${isMobile ? 'sidebar-mobile-location-row' : 'location-pin-input end-loc'}${mapPickHighlightTarget === 'destination' ? ' is-map-pick-target' : ''}`}
      isOpen={activeDropdown === 'to'}
      onOpenChange={(open) => setActiveDropdown(open ? 'to' : null)}
      onValueChange={onToChange}
      onMapPickCancel={onMapPickCancel}
      placeResolved={toSelected}
      inputDisabled={mobileInputsLocked}
      onInputActivate={handleSheetExpandForInput}
      onFocus={() => {
        dismissGreetingIfActive();
        setFocusedField('to');
        setSuggestedLocationTarget('destination');
        onMapPickFocusTarget('destination');
      }}
      onBlur={() => releaseFocusedField('to', toInputId)}
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
      <LocationHint inputId={toInputId} variant="destination" state={toHintState} />
    </div>
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
        <MobileLocationDragGroup
          className={greetingHighlightActive ? 'location-picker--greeting-active' : undefined}>
          {fromField}
          {toField}
        </MobileLocationDragGroup>
      ) : (
        <div
          className={`location-picker${isGreetingHighlight ? ' location-picker--greeting-active' : ''}`}
          ref={locationPickerRef}>
          {fromField}
          {toField}
          {!routeBuilt && (
            <GreetingCard
              anchorRef={locationPickerRef}
              onActiveChange={setIsGreetingHighlight}
            />
          )}
        </div>
      )}

      {showSuggestedLocations ? (
        <SuggestedLocations
          showCurrentLocation={showCurrentLocationChip}
          onCurrentLocation={handleCurrentLocationSelect}
          onSelectOnMap={() => {
            selectOnMap(suggestedActionsTarget);
            if (!isMobile) {
              const input =
                suggestedActionsTarget === 'start' ? fromInputRef.current : toInputRef.current;
              input?.focus({ preventScroll: true });
            }
          }}
        />
      ) : null}

      <SearchHistory
        entries={searchHistoryEntries}
        visible={showSearchHistory}
        onSelect={handleSearchHistoryEntrySelect}
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
        ref={buildRouteButtonRef}
        className="cta-btn"
        onClick={onBuildRoute}
        disabled={isBuildRouteDisabled}
        type="button">
        Build route
      </button>
      <p className="helper-text">Build routes and discover interesting places along the way.</p>
    </>
  );

  const content = routeBuilt ? routePointsView : plannerView;

  if (isMobile) {
    return (
      <div
        ref={mobileFormRef}
        className={`sidebar-mobile-form${isSheetExpanding ? ' is-sheet-expanding' : ''}`}
        onPointerDownCapture={handlePanelPointerDown}>
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
