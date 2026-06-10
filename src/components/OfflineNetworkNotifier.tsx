import { useEffect } from 'react';
import { useErrorToast } from '../context/ErrorToastContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineNetworkNotifier() {
  const isOnline = useOnlineStatus();
  const { showErrorToast, hideErrorToast } = useErrorToast();

  useEffect(() => {
    if (!isOnline) {
      showErrorToast({
        variant: 'warning',
        message: 'No internet connection. Map and routing are unavailable.',
        autoHideMs: 0
      });
      return;
    }

    hideErrorToast();
  }, [hideErrorToast, isOnline, showErrorToast]);

  return null;
}
