import type { ActivityMode } from './types';

const STORAGE_KEY = 'time2route:search-history';
const MAX_ENTRIES = 10;

export const SEARCH_HISTORY_UPDATED_EVENT = 'time2route:search-history-updated';

export type SearchHistoryEntry = {
  id: string;
  from: string;
  to: string;
  mode: ActivityMode;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
  searchedAt: number;
};

export type SearchHistoryInput = {
  from: string;
  to: string;
  mode: ActivityMode;
  fromLat?: number;
  fromLng?: number;
  toLat?: number;
  toLng?: number;
};

function normalizeLabel(value: string) {
  return value.trim().toLowerCase();
}

function createEntryId(from: string, to: string) {
  return `${normalizeLabel(from)}::${normalizeLabel(to)}`;
}

export function loadSearchHistory(): SearchHistoryEntry[] {
  if (typeof globalThis.localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SearchHistoryEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry) =>
        typeof entry?.from === 'string' &&
        typeof entry?.to === 'string' &&
        (entry.mode === 'walk' || entry.mode === 'bike')
    );
  } catch {
    return [];
  }
}

function persistSearchHistory(entries: SearchHistoryEntry[]) {
  if (typeof globalThis.localStorage === 'undefined') {
    return;
  }

  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  globalThis.window.dispatchEvent(new Event(SEARCH_HISTORY_UPDATED_EVENT));
}

export function addSearchHistoryEntry(input: SearchHistoryInput): SearchHistoryEntry[] {
  const from = input.from.trim();
  const to = input.to.trim();

  if (!from || !to) {
    return loadSearchHistory();
  }

  const id = createEntryId(from, to);
  const nextEntry: SearchHistoryEntry = {
    id,
    from,
    to,
    mode: input.mode,
    fromLat: input.fromLat,
    fromLng: input.fromLng,
    toLat: input.toLat,
    toLng: input.toLng,
    searchedAt: Date.now()
  };

  const withoutDuplicate = loadSearchHistory().filter((entry) => entry.id !== id);
  const next = [nextEntry, ...withoutDuplicate].slice(0, MAX_ENTRIES);

  persistSearchHistory(next);
  return next;
}

export function removeSearchHistoryEntry(id: string): SearchHistoryEntry[] {
  const next = loadSearchHistory().filter((entry) => entry.id !== id);
  persistSearchHistory(next);
  return next;
}
