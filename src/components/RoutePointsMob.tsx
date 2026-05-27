export function RoutePointsMob({ from, to }: Readonly<{ from: string; to: string }>) {
  return (
    <div className="route-points-mob">
      <div className="rp-row">
        <span className="rp-value start" id="routeFromMob">
          {from || 'Start point'}
        </span>
        <span className="rp-arrow">→</span>
        <span className="rp-value end" id="routeToMob">
          {to || 'Destination'}
        </span>
      </div>
      <div className="rp-roles">
        <span>Start</span>
        <span>→</span>
        <span>Destination</span>
      </div>
    </div>
  );
}
