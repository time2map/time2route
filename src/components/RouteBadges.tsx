
import { ElevationSmallIcon } from './icons/ElevationSmallIcon';
import { StarIcon } from './icons/StarIcon';

type RouteBadgesProps = {
  placesLabel: string;
  elevationBadgeLabel: string;
};

export function RouteBadges({
  placesLabel,
  elevationBadgeLabel
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
    </div>
  );
}
