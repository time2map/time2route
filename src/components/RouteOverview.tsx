import { ElevationProfileChart } from './ElevationProfileChart';
import { RouteBadges } from './RouteBadges';
import { RouteSummary } from './RouteSummary';
import { RouteSummaryPlaceholder } from './RouteSummaryPlaceholder';
import { RouteSummarySkeleton } from './RouteSummarySkeleton';
import type { ActivityMode, ElevationStats, InterestingPlace } from '../utils/types';

type RouteOverviewProps = {
  variant: 'desktop' | 'mobile';
  from: string;
  to: string;
  mode: ActivityMode;
  modeLabel: string;
  bestForValue: string;
  placesLabel: string;
  elevationBadgeLabel: string;
  bestForLabel: string;
  showRouteSkeleton: boolean;
  showRouteError: boolean;
  errorMessage?: string;
  routeInfo: {
    distance: string;
    duration: string;
    elevation: ElevationStats | null;
    interestingPlaces: InterestingPlace[];
  };
  elevationPoints: Array<{
    distanceKm: number;
    elevationM: number;
    lat?: number;
    lng?: number;
  }>;
  elevationInsight: string;
  onElevationPointHover?: (index: number | null) => void;
  onElevationChartFocusChange?: (focused: boolean) => void;
  onElevationPointClick?: (index: number) => void;
  onReset?: () => void;
};

export function RouteOverview({
  variant,
  mode,
  modeLabel,
  bestForValue,
  placesLabel,
  elevationBadgeLabel,
  showRouteSkeleton,
  showRouteError,
  errorMessage,
  routeInfo,
  elevationPoints,
  elevationInsight,
  onElevationPointHover,
  onElevationChartFocusChange,
  onElevationPointClick,
  onReset
}: Readonly<RouteOverviewProps>) {
  if (showRouteSkeleton) {
    return <RouteSummarySkeleton />;
  }

  if (showRouteError) {
    return (
      <>
        <RouteSummaryPlaceholder message={errorMessage ?? 'Route not found'} />
        {variant === 'mobile' && onReset && <MobileResetButton onReset={onReset} />}
      </>
    );
  }

  return (
    <>
      {/* {variant === 'mobile' && <RoutePointsMob from={from} to={to} />} */}

      <RouteSummary
        routeInfo={routeInfo}
        modeLabel={modeLabel}
        compact={variant === 'mobile'}
      />

      <RouteBadges
        placesLabel={placesLabel}
        elevationBadgeLabel={elevationBadgeLabel}
      />

      <div className="overview-block">
        <ElevationProfileChart
          compact
          mode={mode}
          activityLabel={bestForValue}
          points={elevationPoints.length > 1 ? elevationPoints : undefined}
          chartHeight={160}
          onPointHover={onElevationPointHover}
          onChartFocusChange={variant === 'desktop' ? onElevationChartFocusChange : undefined}
          onPointClick={variant === 'desktop' ? onElevationPointClick : undefined}
        />
        <p className="elevation-insight">{elevationInsight}</p>
      </div>

      {/* { onReset && <MobileResetButton onReset={() => console.log('reset')} />} */}
    </>
  );
}

function MobileResetButton({ onReset }: Readonly<{ onReset: () => void }>) {
  return (
    <button
      className="cta-btn sidebar-mobile-reset-btn"
      onClick={onReset}
      type="button">
      Plan a new route
    </button>
  );
}
