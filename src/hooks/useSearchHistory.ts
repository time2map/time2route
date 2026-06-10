import { useCallback, useEffect, useState } from 'react';
import {
  addSearchHistoryEntry,
  loadSearchHistory,
  removeSearchHistoryEntry,
  SEARCH_HISTORY_UPDATED_EVENT,
  type SearchHistoryEntry,
  type SearchHistoryInput
} from '../utils/searchHistory';

export function useSearchHistory() {
  const [entries, setEntries] = useState<SearchHistoryEntry[]>(() => loadSearchHistory());

  useEffect(() => {
    const syncFromStorage = () => {
      setEntries(loadSearchHistory());
    };

    globalThis.window.addEventListener(SEARCH_HISTORY_UPDATED_EVENT, syncFromStorage);
    globalThis.window.addEventListener('storage', syncFromStorage);
    return () => {
      globalThis.window.removeEventListener(SEARCH_HISTORY_UPDATED_EVENT, syncFromStorage);
      globalThis.window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const addEntry = useCallback((input: SearchHistoryInput) => {
    const next = addSearchHistoryEntry(input);
    setEntries(next);
    return next;
  }, []);

  const removeEntry = useCallback((id: string) => {
    const next = removeSearchHistoryEntry(id);
    setEntries(next);
    return next;
  }, []);

  const refresh = useCallback(() => {
    setEntries(loadSearchHistory());
  }, []);

  return {
    entries,
    addEntry,
    removeEntry,
    refresh
  };
}
