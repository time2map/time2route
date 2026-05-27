import type { ReactNode } from 'react';
import { DifficultyIcon } from './icons/DifficultyIcon';
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

export function RouteSummary({ routeInfo, modeLabel }: Readonly<RouteSummaryProps>) {
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
        value={routeInfo.elevation ? `${routeInfo.elevation.totalAscentM} m` : '—'}
        sub="gain"
        icon={<ElevationIcon />}
      />

      <StatCard
        label="Difficulty"
        value={routeInfo.elevation ? routeInfo.elevation.difficulty : '—'}
        icon={<DifficultyIcon />}
      />
    </div>
  );
}
