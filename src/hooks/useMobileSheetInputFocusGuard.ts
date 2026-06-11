import { useEffect, useRef } from 'react';

function isMobileLocationInput(target: EventTarget | null): target is HTMLInputElement {
  return (
    target instanceof HTMLInputElement &&
    target.closest('.sidebar-mobile-sheet [data-location-field]') !== null
  );
}

function stabilizeMobileSheetInputScroll() {
  const sheetBody = document.querySelector('.sidebar-mobile-sheet-body');
  if (sheetBody instanceof HTMLElement) {
    sheetBody.scrollTop = 0;
  }

  globalThis.window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export function useMobileSheetInputFocusGuard(enabled: boolean) {
  const focusedInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const scheduleStabilize = () => {
      stabilizeMobileSheetInputScroll();
      globalThis.requestAnimationFrame(stabilizeMobileSheetInputScroll);
      globalThis.setTimeout(stabilizeMobileSheetInputScroll, 50);
      globalThis.setTimeout(stabilizeMobileSheetInputScroll, 300);
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isMobileLocationInput(event.target)) {
        return;
      }

      focusedInputRef.current = event.target;
      scheduleStabilize();
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (event.target === focusedInputRef.current) {
        focusedInputRef.current = null;
      }
    };

    const viewport = globalThis.window.visualViewport;
    const handleViewportChange = () => {
      if (focusedInputRef.current) {
        scheduleStabilize();
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    viewport?.addEventListener('resize', handleViewportChange);
    viewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      viewport?.removeEventListener('resize', handleViewportChange);
      viewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [enabled]);
}
