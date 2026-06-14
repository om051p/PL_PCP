import { useState, useEffect } from 'react';

/**
 * React hook to monitor online/offline status and verify browser offline capability.
 * @returns {{isOnline: boolean, isOfflineCapable: boolean, syncPending: boolean}}
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [isOfflineCapable] = useState(() => 
    typeof window !== 'undefined' && !!window.indexedDB && !!window.localStorage
  );

  const [syncPending] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      // Future sync hook trigger could go here
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOfflineCapable,
    syncPending,
  };
}
