import type { ReactNode } from 'react';
import { DistanceIcon } from './icons/DistanceIcon';
import { ElevationIcon } from './icons/ElevationIcon';
import { TimeIcon } from './icons/TimeIcon';
import type { ElevationStats } from '../utils/types';

type RouteInfo = {
  distance: string;
  duration: string;
  elevation: ElevationStats | null;
};

type RouteSummaryProps = {
  routeInfo: RouteInfo;
  modeLabel: string;
  compact?: boolean;
};

function StatCard({
  label,
  value,
  sub,
  icon,
  full = false
}: Readonly<{
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: ReactNode;
  full?: boolean;
}>) {
  return (
    <div className={`stat-card${full ? ' full' : ''}`}>
      <div className="stat-label stat-label-with-icon">
        {icon}
        {label}
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function CompactStat({
  icon,
  value,
  sub
}: Readonly<{
  icon: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
}>) {
  return (
    <div className="route-summary-compact-stat">
      <span className="route-summary-compact-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="route-summary-compact-text">
        <span className="route-summary-compact-value">{value}</span>
        {sub ? <span className="route-summary-compact-sub">{sub}</span> : null}
      </span>
    </div>
  );
}

export function RouteSummary({ routeInfo, modeLabel, compact = false }: Readonly<RouteSummaryProps>) {
  const elevationValue = routeInfo.elevation ? `${routeInfo.elevation.totalAscentM} m` : '—';

  if (compact) {
    return (
      <div className="route-summary route-summary--compact" role="group" aria-label="Route summary">
        <CompactStat icon={<DistanceIcon />} value={routeInfo.distance} />
        <span className="route-summary-compact-divider" aria-hidden="true" />
        <CompactStat icon={<TimeIcon />} value={routeInfo.duration} sub={modeLabel} />
        <span className="route-summary-compact-divider" aria-hidden="true" />
        <CompactStat icon={<ElevationIcon />} value={elevationValue} sub="gain" />
      </div>
    );
  }

  return (
    <div className="route-summary">
      <StatCard
        full
        label="Distance"
        value={routeInfo.distance}
        icon={<DistanceIcon />}
      />

      <StatCard
        label="Est. time"
        value={routeInfo.duration}
        sub={modeLabel}
        icon={<TimeIcon />}
      />

      <StatCard
        label="Elevation"
        value={elevationValue}
        sub="gain"
        icon={<ElevationIcon />}
      />
    </div>
  );
}
