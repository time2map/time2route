import { useEffect, type RefObject } from 'react';

const SHEET_BODY_PADDING_PX = 12;

export function usePlannerBuildButtonSnapHeight(
  enabled: boolean,
  containerRef: RefObject<HTMLElement | null>,
  buildButtonRef: RefObject<HTMLElement | null>,
  onHeightChange?: (heightPx: number) => void
) {
  useEffect(() => {
    if (!enabled || !onHeightChange) {
      return;
    }

    const measure = () => {
      const container = containerRef.current;
      const button = buildButtonRef.current;
      if (!container || !button) {
        return;
      }

      const sheet = container.closest('.sidebar-mobile-sheet');
      const header = sheet?.querySelector('.sidebar-mobile-sheet-header');
      const headerHeight = header?.getBoundingClientRect().height ?? 0;
      const containerTop = container.getBoundingClientRect().top;
      const buttonBottom = button.getBoundingClientRect().bottom;
      const safeBottom =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--safe-b')
        ) || 0;

      onHeightChange(
        Math.ceil(headerHeight + (buttonBottom - containerTop) + SHEET_BODY_PADDING_PX + safeBottom)
      );
    };

    const observer = new ResizeObserver(measure);
    const container = containerRef.current;
    const button = buildButtonRef.current;

    if (container) {
      observer.observe(container);
    }

    if (button) {
      observer.observe(button);
    }

    const sheet = container?.closest('.sidebar-mobile-sheet');
    const header = sheet?.querySelector('.sidebar-mobile-sheet-header');
    if (header) {
      observer.observe(header);
    }

    measure();

    const viewport = globalThis.window.visualViewport;
    viewport?.addEventListener('resize', measure);
    globalThis.window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      viewport?.removeEventListener('resize', measure);
      globalThis.window.removeEventListener('resize', measure);
    };
  }, [buildButtonRef, containerRef, enabled, onHeightChange]);
}
