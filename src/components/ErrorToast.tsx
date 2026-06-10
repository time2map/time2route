import { useEffect, useId } from 'react';
import type { ReactNode } from 'react';

export type ErrorToastVariant = 'error' | 'warning' | 'success' | 'info';

export type ErrorToastAction = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
};

export type ErrorToastProps = {
  visible: boolean;
  variant?: ErrorToastVariant;
  title?: string;
  message: ReactNode;
  actions?: ErrorToastAction[];
  autoHideMs?: number;
  onClose: () => void;
};

const ICON_BY_VARIANT: Record<ErrorToastVariant, string> = {
  error: '!',
  warning: '!',
  success: '✓',
  info: 'i'
};

export function ErrorToast({
  visible,
  variant = 'error',
  title = 'Something went wrong',
  message,
  actions = [],
  autoHideMs,
  onClose
}: Readonly<ErrorToastProps>) {
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    if (!visible || autoHideMs == null || autoHideMs <= 0) return;

    const timerId = globalThis.window.setTimeout(onClose, autoHideMs);

    return () => {
      globalThis.window.clearTimeout(timerId);
    };
  }, [autoHideMs, onClose, visible]);

  return (
    <div
      className={`error-toast${visible ? ' visible' : ''}`}
      role="alert"
      aria-live="assertive"
      aria-labelledby={titleId}
      aria-describedby={messageId}>
      <div className={`error-toast-icon ${variant}`} aria-hidden="true">
        {ICON_BY_VARIANT[variant]}
      </div>

      <div className="error-toast-body">
        <div className="error-toast-title" id={titleId}>
          {title}
        </div>
        <div className="error-toast-message" id={messageId}>
          {message}
        </div>
      </div>

      {actions.length > 0 ? (
        <div className="error-toast-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`error-toast-btn ${action.variant ?? 'primary'}`}
              onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="error-toast-close"
        onClick={onClose}
        aria-label="Close">
        ✕
      </button>
    </div>
  );
}
