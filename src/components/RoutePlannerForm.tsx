import type { ActivityMode } from '../utils/types';
import { EndPinIcon } from './icons/EndPinIcon';
import { MapPickIcon } from './icons/MapPickIcon';
import { StartPinIcon } from './icons/StartPinIcon';
import { ModeIcon } from './ModeIcon';

type RoutePlannerFormProps = {
  variant: 'desktop' | 'mobile';
  from: string;
  to: string;
  mode: ActivityMode;
  mapPickMode: boolean;
  mapPickTarget: 'start' | 'destination' | null;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onModeChange: (value: ActivityMode) => void;
  onBuildRoute: () => void;
  onMapPickToggle: () => void;
  onMapPickFocusTarget: (target: 'start' | 'destination') => void;
  onSwapLocations: () => void;
};

export function RoutePlannerForm({
  variant,
  from,
  to,
  mode,
  mapPickMode,
  mapPickTarget,
  onFromChange,
  onToChange,
  onModeChange,
  onBuildRoute,
  onMapPickToggle,
  onMapPickFocusTarget,
  onSwapLocations
}: Readonly<RoutePlannerFormProps>) {
  const isMobile = variant === 'mobile';
  const fromInputId = isMobile ? 'fromInputMob' : 'fromInput';
  const toInputId = isMobile ? 'toInputMob' : 'toInput';
  let mapPickLabel = 'Set a point on the map';
  if (mapPickMode) {
    mapPickLabel = 'Picking from map…';
    if (mapPickTarget === 'start') {
      mapPickLabel = 'Pick start point on map…';
    } else if (mapPickTarget === 'destination') {
      mapPickLabel = 'Pick destination on map…';
    }
  }
  const isBuildRouteDisabled = !from.trim() || !to.trim();

  const content = (
    <>
      {isMobile ? (
        <div className="sidebar-mobile-location-group">
          <div className="sidebar-mobile-location-row">
            <StartPinIcon />
            <input
              id={fromInputId}
              value={from}
              onChange={(event) => onFromChange(event.target.value)}
              onFocus={() => {
                if (!from.trim()) {
                  onMapPickFocusTarget('start');
                }
              }}
              placeholder="Start point"
            />
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
          </div>

          <div className="sidebar-mobile-location-row">
            <EndPinIcon />
            <input
              id={toInputId}
              value={to}
              onChange={(event) => onToChange(event.target.value)}
              onFocus={() => {
                if (!to.trim()) {
                  onMapPickFocusTarget('destination');
                }
              }}
              placeholder="Destination"
            />
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
          </div>
        </div>
      ) : (
        <div className="location-picker">
          <div className="location-pin-input start-loc">
            <StartPinIcon />
            <input
              id={fromInputId}
              value={from}
              onChange={(event) => onFromChange(event.target.value)}
              onFocus={() => {
                if (!from.trim()) {
                  onMapPickFocusTarget('start');
                }
              }}
              placeholder="Start point"
            />
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
              type="button">
              ⇅
            </button>
          </div>
          <div className="location-pin-input end-loc">
            <EndPinIcon />
            <input
              id={toInputId}
              value={to}
              onChange={(event) => onToChange(event.target.value)}
              onFocus={() => {
                if (!to.trim()) {
                  onMapPickFocusTarget('destination');
                }
              }}
              placeholder="Destination"
            />
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
          </div>
        </div>
      )}

      <button
        className={`map-pick-hint${mapPickMode ? ' active' : ''}`}
        onClick={onMapPickToggle}
        type="button">
        <MapPickIcon />
        <span>{mapPickLabel}</span>
      </button>

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

  if (isMobile) {
    return <div className="sidebar-mobile-form">{content}</div>;
  }

  return (
    <div className="sidebar-section">
      <div className="sidebar-title">Plan your route</div>
      {content}
    </div>
  );
}
