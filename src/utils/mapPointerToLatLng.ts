const LOCATION_INPUT_IDS = new Set([
  'map-area-search',
  'fromInput',
  'toInput',
  'fromInputMob',
  'toInputMob'
]);

export function getFocusedLocationInputId(): string | null {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLInputElement && LOCATION_INPUT_IDS.has(activeElement.id)) {
    return activeElement.id;
  }

  return null;
}

export function isLocationSearchInputFocused(): boolean {
  return getFocusedLocationInputId() !== null;
}
