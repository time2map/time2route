import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof globalThis.window === 'undefined') {
      return false;
    }

    return globalThis.window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = globalThis.window.matchMedia(query);
    const sync = () => setMatches(media.matches);

    sync();
    media.addEventListener('change', sync);

    return () => {
      media.removeEventListener('change', sync);
    };
  }, [query]);

  return matches;
}
