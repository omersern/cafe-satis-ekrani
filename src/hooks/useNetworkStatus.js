import { useEffect, useState } from 'react';
import { pingCloud } from '../lib/cloudClient';

/**
 * Cloud erişilebilirliğini mevcut WebSocket bağlantısından ölç.
 */
export default function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState({ isOnline: true, isSlow: false });

  useEffect(() => {
    let intervalId;
    let active = true;

    const checkConnection = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (active) setNetworkStatus({ isOnline: false, isSlow: false });
        return;
      }

      try {
        const result = await pingCloud();
        if (!active) return;
        setNetworkStatus({ isOnline: result.online, isSlow: result.latencyMs > 1500 });
      } catch {
        if (!active) return;
        setNetworkStatus({ isOnline: false, isSlow: false });
      }
    };

    const onOffline = () => {
      if (active) setNetworkStatus({ isOnline: false, isSlow: false });
    };
    const onOnline = () => {
      checkConnection();
    };

    checkConnection();
    intervalId = setInterval(checkConnection, 20000);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    return () => {
      active = false;
      clearInterval(intervalId);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return networkStatus;
}
