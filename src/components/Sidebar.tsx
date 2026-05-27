import logo from '../assets/time2route-logo.svg';
import { useEffect, useRef, useState } from 'react';
import { getGooglePlacePhotoUrl } from '../api/googlePlacePhotos';
import { ElevationProfileChart } from './ElevationProfileChart';
import { getElevationInsight } from '../utils/elevationUtils';
import type { ActivityMode, ElevationStats, InterestingPlace } from '../utils/types';
import { PlaceCard, type PlacePhotoState } from './PlaceCard';
import BikeIcon from './icons/BikeIcon';
import WalkIcon from './icons/WalkIcon';

type SidebarTab = 'overview' | 'places';

type SidebarProps = {
  routeBuilt: boolean;
  mode: ActivityMode;
  activeTab: SidebarTab;
  selectedPlace: string | null;
  routeInfo: {
    status: 'idle' | 'loading' | 'ready' | 'error';
    distance: string;
    duration: string;
    elevation: ElevationStats | null;
    interestingPlaces: InterestingPlace[];
    errorMessage?: string;
  };
  from: string;
  to: string;
  mapPickMode: boolean;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onModeChange: (value: ActivityMode) => void;
  onBuildRoute: () => void;
  onTabChange: (tab: SidebarTab) => void;
  onSelectPlace: (placeId: string) => void;
  onAddPlaceToRoute: (place: InterestingPlace) => void;
  onReset: () => void;
  onMapPickToggle: () => void;
};

function getGoogleMapsPlaceUrl(place: InterestingPlace): string {
  const searchParams = new URLSearchParams({
    api: '1',
    query: `${place.lat},${place.lng}`,
    query_place_id: place.id
  });

  return `https://www.google.com/maps/search/?${searchParams.toString()}`;
}

function ModeIcon({ mode }: Readonly<{ mode: ActivityMode }>) {
  if (mode === 'walk') {
    return <WalkIcon />;
  }
  return <BikeIcon />;
}

function RouteSummarySkeleton() {
  return (
    <div
      className="route-summary"
      aria-hidden="true">
      <div className="stat-card route-summary-skeleton-card full">
        <div className="skeleton-label-row">
          <span className="skeleton-icon" />
          <span className="skeleton-line skeleton-label" />
        </div>
        <span className="skeleton-line skeleton-value" />
      </div>
      <div className="stat-card route-summary-skeleton-card">
        <div className="skeleton-label-row">
          <span className="skeleton-icon" />
          <span className="skeleton-line skeleton-label" />
        </div>
        <span className="skeleton-line skeleton-value" />
        <span className="skeleton-line skeleton-sub" />
      </div>
      <div className="stat-card route-summary-skeleton-card">
        <div className="skeleton-label-row">
          <span className="skeleton-icon" />
          <span className="skeleton-line skeleton-label" />
        </div>
        <span className="skeleton-line skeleton-value" />
        <span className="skeleton-line skeleton-sub" />
      </div>
      <div className="stat-card route-summary-skeleton-card">
        <div className="skeleton-label-row">
          <span className="skeleton-icon" />
          <span className="skeleton-line skeleton-label" />
        </div>
        <span className="skeleton-line skeleton-value" />
      </div>
    </div>
  );
}

function RouteSummaryPlaceholder({
  message,
  text = 'Try another start point or destination.'
}: Readonly<{
  message: string;
  text?: string;
}>) {
  return (
    <div className="route-summary-placeholder">
      <div className="route-summary-placeholder-title">{message}</div>
      <p className="route-summary-placeholder-text">
        {text}
      </p>
    </div>
  );
}

export function Sidebar({
  routeBuilt,
  mode,
  activeTab,
  selectedPlace,
  routeInfo,
  from,
  to,
  mapPickMode,
  onFromChange,
  onToChange,
  onModeChange,
  onBuildRoute,
  onTabChange,
  onSelectPlace,
  onAddPlaceToRoute,
  onMapPickToggle
}: Readonly<SidebarProps>) {
  const [placePhotoCache, setPlacePhotoCache] = useState<Record<string, PlacePhotoState>>({});
  const placePhotoCacheRef = useRef<Record<string, PlacePhotoState>>({});

  let modeLabel = 'cycling';
  let bestForValue = 'Cycling';
  if (mode === 'walk') {
    modeLabel = 'walking';
    bestForValue = 'Walking';
  }

  const placesCount = routeInfo.interestingPlaces.length;
  const placesLabel = `${placesCount} interesting place${placesCount === 1 ? '' : 's'}`;
  const sortedInterestingPlaces = [...routeInfo.interestingPlaces].sort(
    (firstPlace, secondPlace) =>
      (secondPlace.rating ?? Number.NEGATIVE_INFINITY) - (firstPlace.rating ?? Number.NEGATIVE_INFINITY)
  );
  const elevationBadgeLabel = routeInfo.elevation
    ? `${routeInfo.elevation.difficulty} elevation`
    : 'Elevation data unavailable';
  const bestForLabel = `Best for: ${bestForValue}`;
  const showRouteSkeleton =
    routeBuilt && Boolean(from.trim()) && Boolean(to.trim()) && routeInfo.status === 'loading';
  const showRouteError = routeInfo.status === 'error';
  const showPlacesPlaceholder =
    showRouteError || (routeInfo.status === 'ready' && sortedInterestingPlaces.length === 0);
  const placesPlaceholderMessage = showRouteError
    ? (routeInfo.errorMessage ?? 'Route not found')
    : 'No places found';
  const placesPlaceholderText = showRouteError
    ? 'Try another start point or destination.'
    : 'Try another route to discover places along the way.';
  const elevationPoints =
    routeInfo.elevation?.profile.map((point) => ({
      distanceKm: point.distanceKm,
      elevationM: point.elevationM
    })) ?? [];
  const elevationInsight = routeInfo.elevation
    ? getElevationInsight(routeInfo.elevation)
    : 'Elevation data will be available after route build.';
  const swapLocations = () => {
    const nextFrom = to;
    const nextTo = from;
    onFromChange(nextFrom);
    onToChange(nextTo);
  };

  const openPlaceInGoogleMaps = (placeId: string) => {
    const place = routeInfo.interestingPlaces.find((item) => item.id === placeId);
    if (!place) return;

    window.open(getGoogleMapsPlaceUrl(place), '_blank', 'noreferrer');
  };

  const addPlaceToRoute = (placeId: string) => {
    const place = routeInfo.interestingPlaces.find((item) => item.id === placeId);
    if (!place) return;

    onAddPlaceToRoute(place);
  };

  useEffect(() => {
    placePhotoCacheRef.current = placePhotoCache;
  }, [placePhotoCache]);

  useEffect(() => {
    if (!selectedPlace) return;

    const activePlace = routeInfo.interestingPlaces.find((place) => place.id === selectedPlace);

    if (!activePlace) return;

    if (placePhotoCacheRef.current[activePlace.id]) return;

    const photoName = activePlace.photos?.[0]?.name;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    let cancelled = false;

    const savePhotoState = (nextState: PlacePhotoState) => {
      setPlacePhotoCache((prev) => {
        const next = {
          ...prev,
          [activePlace.id]: nextState
        };
        placePhotoCacheRef.current = next;
        return next;
      });
    };

    void (async () => {
      await Promise.resolve();

      if (cancelled) return;

      if (!photoName) {
        savePhotoState({ status: 'empty' });
        return;
      }

      if (!apiKey) {
        savePhotoState({ status: 'error' });
        return;
      }

      savePhotoState({ status: 'loading' });

      try {
        const photoUrl = await getGooglePlacePhotoUrl({
          photoName,
          apiKey,
          maxWidthPx: 360
        });

        if (cancelled) return;

        savePhotoState(photoUrl ? { status: 'loaded', photoUrl } : { status: 'empty' });
      } catch {
        if (cancelled) return;

        savePhotoState({ status: 'error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedPlace, routeInfo.interestingPlaces]);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img
          src={logo}
          alt="Time2Route logo"
          className="sidebar-logo-icon"
        />
        <span className="sidebar-brand">Time2Route</span>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-title">Plan your route</div>
        <div className="location-picker">
          <div className="location-pin-input start-loc">
            <div className="pin-left">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--green)"
                strokeWidth="2.5"
                strokeLinecap="round">
                <circle
                  cx="12"
                  cy="12"
                  r="3"
                  fill="var(--green)"></circle>
                <path d="M12 6v-4m0 16v4m10-10h-4M6 12H2"></path>
              </svg>
            </div>
            <input
              id="fromInput"
              value={from}
              onChange={(event) => onFromChange(event.target.value)}
              placeholder="Start point"
            />
            <button
              className="clear-btn"
              onClick={() => onFromChange('')}
              type="button"
              aria-label="Clear start point">
              ×
            </button>
            <button
              className="swap-btn"
              onClick={swapLocations}
              title="Swap A ↔ B"
              type="button">
              ⇅
            </button>
          </div>
          <div className="location-pin-input end-loc">
            <div className="pin-left">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round">
                <path
                  d="M12 2a10 10 0 0 0-8 15.3L12 22l8-4.7A10 10 0 0 0 12 2z"
                  fill="var(--accent)"></path>
                <circle
                  cx="12"
                  cy="11"
                  r="2.5"
                  fill="#fff"
                  stroke="none"></circle>
              </svg>
            </div>
            <input
              id="toInput"
              value={to}
              onChange={(event) => onToChange(event.target.value)}
              placeholder="Destination"
            />
            <button
              className="clear-btn"
              onClick={() => onToChange('')}
              type="button"
              aria-label="Clear destination">
              ×
            </button>
          </div>
          <button
            className={`map-pick-hint${mapPickMode ? ' active' : ''}`}
            onClick={onMapPickToggle}
            type="button">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
              <path d="M12.58 12.58l5.3 5.3"></path>
            </svg>
            <span>{mapPickMode ? 'Picking from map…' : 'Set a point on the map'}</span>
          </button>
        </div>
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
          type="button">
          Build shortest route
        </button>
        <p className="helper-text">Find the shortest way and discover what is along it.</p>
      </div>

      {routeBuilt && (
        <div className="sidebar-section state-route">
          <div className="route-header">
            <span className="sidebar-title">Shortest route</span>
          </div>

          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => onTabChange('overview')}
              type="button">
              Overview
            </button>
            <button
              className={`sidebar-tab ${activeTab === 'places' ? 'active' : ''}`}
              onClick={() => onTabChange('places')}
              type="button">
              Places
            </button>
          </div>

          <div className="sidebar-scroll">
            {activeTab === 'overview' ? (
              <div className="sidebar-tab-content active">
                {showRouteSkeleton ? (
                  <RouteSummarySkeleton />
                ) : showRouteError ? (
                  <RouteSummaryPlaceholder message={routeInfo.errorMessage ?? 'Route not found'} />
                ) : (
                  <div className="route-summary">
                    <div className="stat-card full">
                      <div className="stat-label stat-label-with-icon">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round">
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                          />
                          <path d="M2 12h20" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
                        </svg>
                        Distance
                      </div>
                      <div className="stat-value">{routeInfo.distance}</div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-label stat-label-with-icon">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round">
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                          />
                          <path d="M12 6v6l4 2" />
                        </svg>
                        Est. time
                      </div>
                      <div className="stat-value">{routeInfo.duration}</div>
                      <div className="stat-sub">{modeLabel}</div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-label stat-label-with-icon">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round">
                          <path d="M2 13.3C4 10 6 7.3 8 7.3C10 7.3 12 10 14 13.3" />
                          <path d="M2 9.3C4 6 6 3.3 8 3.3C10 3.3 12 6 14 9.3" />
                        </svg>
                        Elevation
                      </div>
                      <div className="stat-value">
                        {routeInfo.elevation ? `${routeInfo.elevation.totalAscentM} m` : '—'}
                      </div>
                      <div className="stat-sub">gain</div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-label stat-label-with-icon">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round">
                          <path d="M6 20L18 4" />
                          <path d="M6 10l4-4" />
                          <path d="M14 18l4-4" />
                        </svg>
                        Difficulty
                      </div>
                      <div className="stat-value">{routeInfo.elevation ? routeInfo.elevation.difficulty : '—'}</div>
                    </div>
                  </div>
                )}
                {!showRouteError && (
                  <>
                    <div className="badge-row">
                      <span className="badge badge-blue">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {placesLabel}
                      </span>
                      <span className="badge badge-orange">
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round">
                          <path d="M2 13.3C4 10 6 7.3 8 7.3C10 7.3 12 10 14 13.3" />
                          <path d="M2 9.3C4 6 6 3.3 8 3.3C10 3.3 12 6 14 9.3" />
                        </svg>
                        {elevationBadgeLabel}
                      </span>
                      <span className="badge badge-green">
                        <ModeIcon mode={mode} />
                        {bestForLabel}
                      </span>
                    </div>

                    <div className="overview-block">
                      <ElevationProfileChart
                        compact
                        activityLabel={bestForValue}
                        points={elevationPoints.length > 1 ? elevationPoints : undefined}
                        chartHeight={160}
                      />
                      <p className="elevation-insight">{elevationInsight}</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="sidebar-tab-content active">
                {showPlacesPlaceholder ? (
                  <RouteSummaryPlaceholder
                    message="Interesting places along the route"
                    text={`${placesPlaceholderMessage}. ${placesPlaceholderText}`}
                  />
                ) : (
                  <>
                    <h3 className="places-title">Interesting places along the route</h3>
                    <div className="place-list place-list-single">
                      {sortedInterestingPlaces.map((place) => {
                        const isSelected = selectedPlace === place.id;
                        const photoState = placePhotoCache[place.id];

                        return (
                          <PlaceCard
                            key={place.id}
                            place={place}
                            selected={isSelected}
                            photoState={photoState}
                            onSelect={onSelectPlace}
                            onAddToRoute={addPlaceToRoute}
                            onOpenInGoogleMaps={openPlaceInGoogleMaps}
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
