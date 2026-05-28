import { ElevationProfileChart } from './ElevationProfileChart';
import { RouteBadges } from './RouteBadges';
import { RoutePointsMob } from './RoutePointsMob';
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
  }>;
  elevationInsight: string;
  onReset?: () => void;
};

export function RouteOverview({
  variant,
  from,
  to,
  mode,
  modeLabel,
  bestForValue,
  placesLabel,
  elevationBadgeLabel,
  bestForLabel,
  showRouteSkeleton,
  showRouteError,
  errorMessage,
  routeInfo,
  elevationPoints,
  elevationInsight,
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
      {variant === 'mobile' && <RoutePointsMob from={from} to={to} />}

      <RouteSummary routeInfo={routeInfo} modeLabel={modeLabel} />

      <RouteBadges
        mode={mode}
        placesLabel={placesLabel}
        elevationBadgeLabel={elevationBadgeLabel}
        bestForLabel={bestForLabel}
      />

      <div className="overview-block">
        <ElevationProfileChart
          compact
          activityLabel={bestForValue}
          points={elevationPoints.length > 1 ? elevationPoints : undefined}
          chartHeight={160}
        />
        <p className="elevation-insight">{elevationInsight}</p>
      </div>

      {variant === 'mobile' && onReset && <MobileResetButton onReset={onReset} />}
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
