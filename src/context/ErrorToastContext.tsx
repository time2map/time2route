import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';
import type { ReactNode } from 'react';
import {
  ErrorToast,
  type ErrorToastAction,
  type ErrorToastVariant
} from '../components/ErrorToast';

export type ShowErrorToastOptions = {
  variant?: ErrorToastVariant;
  title?: string;
  message: ReactNode;
  actions?: ErrorToastAction[];
  autoHideMs?: number;
  onClose?: () => void;
};

type ErrorToastContextValue = {
  showErrorToast: (options: ShowErrorToastOptions) => void;
  hideErrorToast: () => void;
};

const ErrorToastContext = createContext<ErrorToastContextValue | null>(null);

export function ErrorToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toast, setToast] = useState<ShowErrorToastOptions | null>(null);

  const showErrorToast = useCallback((options: ShowErrorToastOptions) => {
    setToast(options);
  }, []);

  const hideErrorToast = useCallback(() => {
    setToast((current) => {
      current?.onClose?.();
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({ showErrorToast, hideErrorToast }),
    [hideErrorToast, showErrorToast]
  );

  return (
    <ErrorToastContext.Provider value={value}>
      {children}
      <ErrorToast
        visible={toast != null}
        variant={toast?.variant ?? 'error'}
        title={toast?.title ?? 'Something went wrong'}
        message={toast?.message ?? ''}
        actions={toast?.actions}
        autoHideMs={toast?.autoHideMs ?? 8000}
        onClose={hideErrorToast}
      />
    </ErrorToastContext.Provider>
  );
}

export function useErrorToast() {
  const context = useContext(ErrorToastContext);

  if (!context) {
    throw new Error('useErrorToast must be used within ErrorToastProvider');
  }

  return context;
}
