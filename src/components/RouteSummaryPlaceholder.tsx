export function RouteSummaryPlaceholder({
  message,
  text = 'Try another start point or destination.'
}: Readonly<{
  message: string;
  text?: string;
}>) {
  return (
    <div className="route-summary-placeholder">
      <div className="route-summary-placeholder-title">{message}</div>
      <p className="route-summary-placeholder-text">{text}</p>
    </div>
  );
}
