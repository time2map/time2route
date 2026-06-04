import { formatPlaceTypeLabel } from '../utils/placeFormat';
import { resolvePlaceCategory } from '../utils/poiTypes';
import { resolveRouteStopIconClass } from '../utils/routeStopIndicator';
import { sortRouteStopsByPath } from '../utils/routeStopOrder';
import type { InterestingPlace, LatLng, RouteIntermediatePoint } from '../utils/types';
import { EndPinIcon } from './icons/EndPinIcon';
import { StartPinIcon } from './icons/StartPinIcon';

function RouteConn() {
  return (
    <div
      className="rp-conn"
      aria-hidden="true">
      <span className="rp-conn-dot" />
      <span className="rp-conn-dot" />
      <span className="rp-conn-dot" />
    </div>
  );
}

type RoutePointsProps = {
  from: string;
  to: string;
  stops: RouteIntermediatePoint[];
  routePlaces?: InterestingPlace[];
  alongRoutePlaceIds?: ReadonlySet<string>;
  routePath?: LatLng[];
  onRemoveStop?: (placeId: string) => void;
  onStopHover?: (placeId: string | null) => void;
  hoveredStopId?: string | null;
};

export function RoutePoints({
  from,
  to,
  stops,
  routePlaces = [],
  alongRoutePlaceIds = new Set<string>(),
  routePath,
  onRemoveStop,
  onStopHover,
  hoveredStopId = null
}: Readonly<RoutePointsProps>) {
  const placesById = new Map(routePlaces.map((place) => [place.id, place]));
  const sortedStops = sortRouteStopsByPath(stops, routePath);

  return (
    <div className="route-points">
      <div className="rp-line">
        <StartPinIcon />
        <div className="rp-content">
          <span className="rp-name">{from.trim() || 'Start point'}</span>
        </div>
      </div>

      <div className="rp-conn rp-conn-from">
        <RouteConn />
      </div>

      {sortedStops.length > 0 && (
        <div className="rp-stops">
          {sortedStops.map((stop) => {
            const place = placesById.get(stop.id);
            const categoryMeta = place ? resolvePlaceCategory(place) : null;
            const categoryLabel = place
              ? formatPlaceTypeLabel(place.primaryType) || categoryMeta?.label || 'Point of interest'
              : formatPlaceTypeLabel();
            const stopName = stop.name ?? place?.name ?? 'Unnamed stop';
            const iconClass = resolveRouteStopIconClass(stop.id, place, alongRoutePlaceIds);

            return (
              <div
                className={`rp-stop${hoveredStopId === stop.id ? ' is-hovered' : ''}`}
                key={stop.id}
                onMouseEnter={() => onStopHover?.(stop.id)}
                onMouseLeave={() => onStopHover?.(null)}>
                <div className="rp-stop-inner">
                  <span
                    className={`rp-stop-icon ${iconClass}`}
                    aria-hidden="true"
                  />
                  <span className="rp-stop-name">{stopName}</span>
                  <span className="rp-stop-category">{categoryLabel}</span>
                </div>
                {onRemoveStop && (
                  <button
                    type="button"
                    className="rp-stop-remove"
                    aria-label={`Remove ${stopName}`}
                    onClick={() => onRemoveStop(stop.id)}>
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sortedStops.length > 0 && (
        <div className="rp-conn rp-conn-to">
          <RouteConn />
        </div>
      )}

      <div className="rp-line">
        <div className="rp-dot rp-dot-end">
          <EndPinIcon />
        </div>
        <div className="rp-content">
          <span className="rp-name">{to.trim() || 'Destination'}</span>
        </div>
      </div>
    </div>
  );
}
