export type LocationSuggestion = {
  id: string;
  name: string;
  subtitle?: string;
  distance?: string;
};

export function filterLocationSuggestions(
  suggestions: LocationSuggestion[],
  query: string
): LocationSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return suggestions;
  return suggestions.filter((item) => {
    const haystack = [item.name, item.subtitle].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(normalized);
  });
}
