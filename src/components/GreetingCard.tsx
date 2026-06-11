import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { markGreetingCardDismissed, wasGreetingCardDismissed } from '../utils/greetingCard';

const HIDE_TRANSITION_MS = 350;
const GAP_PX = 16;

type GreetingCardProps = {
  anchorRef: RefObject<HTMLElement | null>;
  onActiveChange?: (active: boolean) => void;
};

type GreetingPosition = {
  top: number;
  left: number;
};

function getAnchorPosition(anchor: HTMLElement): GreetingPosition {
  const rect = anchor.getBoundingClientRect();

  return {
    top: rect.top + rect.height / 2,
    left: rect.right + GAP_PX
  };
}

export function GreetingCard({ anchorRef, onActiveChange }: GreetingCardProps) {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [position, setPosition] = useState<GreetingPosition | null>(null);

  useEffect(() => {
    if (!wasGreetingCardDismissed()) {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    onActiveChange?.(mounted && position !== null && !hidden);
  }, [hidden, mounted, onActiveChange, position]);

  useEffect(() => {
    return () => {
      onActiveChange?.(false);
    };
  }, [onActiveChange]);

  useLayoutEffect(() => {
    if (!mounted) {
      return;
    }

    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const updatePosition = () => {
      const nextAnchor = anchorRef.current;
      if (!nextAnchor) {
        return;
      }

      setPosition(getAnchorPosition(nextAnchor));
    };

    updatePosition();

    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(anchor);

    globalThis.window.addEventListener('resize', updatePosition);
    globalThis.window.addEventListener('scroll', updatePosition, true);

    return () => {
      resizeObserver.disconnect();
      globalThis.window.removeEventListener('resize', updatePosition);
      globalThis.window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, mounted]);

  const dismiss = useCallback(() => {
    if (hidden) {
      return;
    }

    markGreetingCardDismissed();
    setHidden(true);
    globalThis.window.setTimeout(() => {
      setMounted(false);
    }, HIDE_TRANSITION_MS);
  }, [hidden]);

  useEffect(() => {
    if (!mounted || hidden) {
      return;
    }

    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const handleInputInteract = (event: Event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && anchor.contains(target)) {
        dismiss();
      }
    };

    anchor.addEventListener('pointerdown', handleInputInteract);
    anchor.addEventListener('focusin', handleInputInteract);

    return () => {
      anchor.removeEventListener('pointerdown', handleInputInteract);
      anchor.removeEventListener('focusin', handleInputInteract);
    };
  }, [anchorRef, dismiss, hidden, mounted]);

  if (!mounted || !position) {
    return null;
  }

  return createPortal(
    <div
      className={`greeting-card${hidden ? ' hidden-card' : ''}`}
      id="greetingCard"
      style={{ top: position.top, left: position.left }}>
      <button
        className="greeting-close"
        id="greetingClose"
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}>
        ×
      </button>
      <div className="greeting-body">
        <div className="greeting-icon">
          <svg
            viewBox="0 0 32 32"
            fill="none">
            <circle
              cx="16"
              cy="16"
              r="14"
              stroke="var(--green)"
              stroke-width="1.8"></circle>
            <path
              d="M10 16l4 4 8-8"
              stroke="var(--green)"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"></path>
          </svg>
        </div>
        <div className="greeting-text">
          Build an interesting route
          <br />
          in a couple of clicks
        </div>
      </div>
    </div>,
    document.body
  );
}
