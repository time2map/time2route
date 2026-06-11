export type LocationHintState = 'hidden' | 'prompt' | 'success';

type LocationHintProps = {
  inputId: string;
  variant: 'start' | 'destination';
  state: LocationHintState;
};

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function LocationHint({ inputId, variant, state }: LocationHintProps) {
  if (state === 'hidden') {
    return null;
  }

  const isSuccess = state === 'success';
  const hintId = variant === 'start' ? 'fromHint' : 'toHint';
  const label = isSuccess
    ? variant === 'start'
      ? 'Start point selected'
      : 'Destination selected'
    : 'Start typing or click on the map to set a location';

  return (
    <div
      className={`location-hint${isSuccess ? ' success' : ''}`}
      id={hintId}
      aria-live="polite"
      data-hint-for={inputId}>
      {isSuccess ? <CheckIcon /> : <GlobeIcon />}
      <span>{label}</span>
    </div>
  );
}

export function resolveLocationHintState(
  focused: boolean,
  selected: boolean
): LocationHintState {
  if (selected) {
    return 'success';
  }

  if (focused) {
    return 'prompt';
  }

  return 'hidden';
}
