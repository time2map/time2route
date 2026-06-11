import { useEffect, useRef } from 'react';
import { useErrorToast } from '../context/ErrorToastContext';
import { wasGreetingCardDismissed } from '../utils/greetingCard';
import { isMobileViewport, type ExpandedSheetSnap } from '../utils/mobileRouteSheetSnap';

export const GREETING_HINT_TITLE = 'Build an interesting route';
export const GREETING_HINT_MESSAGE = 'in a couple of clicks';

type GreetingHintEffectProps = {
  routeBuilt: boolean;
  mapReady: boolean;
  onGreetingActiveChange: (active: boolean) => void;
  onMobileSheetSnapChange: (snap: ExpandedSheetSnap) => void;
  onMobileSheetExpandedChange: (expanded: boolean) => void;
};

export function GreetingHintEffect({
  routeBuilt,
  mapReady,
  onGreetingActiveChange,
  onMobileSheetSnapChange,
  onMobileSheetExpandedChange
}: Readonly<GreetingHintEffectProps>) {
  const { showErrorToast } = useErrorToast();
  const didShowRef = useRef(false);

  useEffect(() => {
    if (routeBuilt) {
      onGreetingActiveChange(false);
      return;
    }

    if (!mapReady) {
      return;
    }

    if (!isMobileViewport()) {
      return;
    }

    if (wasGreetingCardDismissed() || didShowRef.current) {
      return;
    }

    didShowRef.current = true;
    onMobileSheetSnapChange('middle');
    onMobileSheetExpandedChange(true);
    onGreetingActiveChange(true);

    showErrorToast({
      variant: 'success',
      title: GREETING_HINT_TITLE,
      message: GREETING_HINT_MESSAGE,
      autoHideMs: 12000
    });
  }, [
    mapReady,
    onGreetingActiveChange,
    onMobileSheetExpandedChange,
    onMobileSheetSnapChange,
    routeBuilt,
    showErrorToast
  ]);

  return null;
}
