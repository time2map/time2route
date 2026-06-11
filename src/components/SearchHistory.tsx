import type { SearchHistoryEntry } from '../utils/searchHistory';
import { shortenLocationLabel } from '../utils/placeFormat';

type SearchHistoryProps = {
  entries: SearchHistoryEntry[];
  onSelect: (entry: SearchHistoryEntry) => void;
  onRemove: (id: string) => void;
  visible?: boolean;
};

function HistoryHeaderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true">
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M8 6h5a4 4 0 0 1 4 4v4" />
    </svg>
  );
}

export function SearchHistory({
  entries,
  onSelect,
  onRemove,
  visible = true
}: Readonly<SearchHistoryProps>) {
  if (entries.length === 0 || !visible) {
    return <div className="search-history" id="searchHistory" />;
  }

  return (
    <div className="search-history visible" id="searchHistory">
      <div className="search-history-header">
        <HistoryHeaderIcon />
        Recent searches
      </div>

      <div className="search-history-list">
        {entries.map((entry) => {
          const fullLabel = `${entry.from} → ${entry.to}`;
          const displayLabel = `${shortenLocationLabel(entry.from)} → ${shortenLocationLabel(entry.to)}`;

          return (
          <div
            key={entry.id}
            className="search-history-item"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(entry)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(entry);
              }
            }}>
            <span className="h-icon" aria-hidden="true">
              <RouteIcon />
            </span>
            <span className="h-name" title={fullLabel}>
              {displayLabel}
            </span>
            <button
              type="button"
              className="h-remove"
              aria-label={`Remove ${fullLabel}`}
              onClick={(event) => {
                event.stopPropagation();
                onRemove(entry.id);
              }}>
              ×
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
}
