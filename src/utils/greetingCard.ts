const STORAGE_KEY = 'time2route:greeting-dismissed';

export function wasGreetingCardDismissed(): boolean {
  if (typeof globalThis.localStorage === 'undefined') {
    return false;
  }

  try {
    return globalThis.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markGreetingCardDismissed(): void {
  if (typeof globalThis.localStorage === 'undefined') {
    return;
  }

  try {
    globalThis.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Ignore quota / privacy mode errors.
  }
}
