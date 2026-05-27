import type { ActivityMode } from '../utils/types';
import { ElevationSmallIcon } from './icons/ElevationSmallIcon';
import { StarIcon } from './icons/StarIcon';
import { ModeIcon } from './ModeIcon';

type RouteBadgesProps = {
  placesLabel: string;
  elevationBadgeLabel: string;
  bestForLabel: string;
  mode: ActivityMode;
};

export function RouteBadges({
  placesLabel,
  elevationBadgeLabel,
  bestForLabel,
  mode
}: Readonly<RouteBadgesProps>) {
  return (
    <div className="badge-row">
      <span className="badge badge-blue">
        <StarIcon />
        {placesLabel}
      </span>

      <span className="badge badge-orange">
        <ElevationSmallIcon />
        {elevationBadgeLabel}
      </span>

      <span className="badge badge-green">
        <ModeIcon mode={mode} />
        {bestForLabel}
      </span>
    </div>
  );
}
