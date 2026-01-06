/**
 * Offline Status Hook
 * 
 * React hook for managing offline/online status and service worker state.
 */

import { useEffect, useState, useCallback } from "react";
import {
  isOffline as checkIsOffline,
  addOnlineListener,
  registerServiceWorker,
  updateServiceWorker,
  skipWaiting,
  isServiceWorkerSupported,
  type ServiceWorkerStatus,
} from "@/lib/serviceWorker";

export type UseOfflineStatusOptions = {
  enableServiceWorker?: boolean;
  onOfflineReady?: () => void;
  onUpdateAvailable?: () => void;
};

export type UseOfflineStatusReturn = {
  isOffline: boolean;
  isOnline: boolean;
  serviceWorkerStatus: ServiceWorkerStatus | null;
  serviceWorkerSupported: boolean;
  updateAvailable: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => Promise<void>;
  activateUpdate: () => void;
};

/**
 * Hook for managing offline status and service worker
 * 
 * @example
 * ```tsx
 * const { isOffline, offlineReady, updateAvailable } = useOfflineStatus({
 *   enableServiceWorker: true,
 *   onOfflineReady: () => console.log("App ready for offline use"),
 * });
 * 
 * if (isOffline) {
 *   return <OfflineBanner />;
 * }
 * ```
 */
export function useOfflineStatus(options: UseOfflineStatusOptions = {}): UseOfflineStatusReturn {
  const { enableServiceWorker = true, onOfflineReady, onUpdateAvailable } = options;

  // Initialize as false to match server-side rendering
  // We'll update it in useEffect to avoid hydration mismatches
  const [isOffline, setIsOffline] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<ServiceWorkerStatus | null>(null);
  const [serviceWorkerSupported, setServiceWorkerSupported] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    // Initial checks on mount
    setIsOffline(checkIsOffline());
    setServiceWorkerSupported(isServiceWorkerSupported());

    const cleanup = addOnlineListener((online) => {
      setIsOffline(!online);
    });

    return cleanup;
  }, []);

  // Register service worker
  useEffect(() => {
    if (!enableServiceWorker || !serviceWorkerSupported) {
      return;
    }

    const register = async () => {
      await registerServiceWorker({
        onStatusChange: (status) => {
          setServiceWorkerStatus(status);
        },
        onUpdateAvailable: () => {
          setUpdateAvailable(true);
          onUpdateAvailable?.();
        },
        onOfflineReady: () => {
          setOfflineReady(true);
          onOfflineReady?.();
        },
        onError: (error) => {
          console.error("[Offline] Service Worker error:", error);
        },
      });
    };

    void register();
  }, [enableServiceWorker, serviceWorkerSupported, onOfflineReady, onUpdateAvailable]);

  // Update service worker
  const handleUpdateServiceWorker = useCallback(async () => {
    await updateServiceWorker();
  }, []);

  // Activate update
  const activateUpdate = useCallback(() => {
    skipWaiting();
    setUpdateAvailable(false);
    
    // Reload page after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
    serviceWorkerStatus,
    serviceWorkerSupported,
    updateAvailable,
    offlineReady,
    updateServiceWorker: handleUpdateServiceWorker,
    activateUpdate,
  };
}
