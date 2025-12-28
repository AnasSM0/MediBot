/**
 * Service Worker Registration Utility
 * 
 * Handles registration, updates, and lifecycle of the service worker.
 */

export type ServiceWorkerStatus = 'installing' | 'installed' | 'activating' | 'activated' | 'redundant' | 'error' | 'unsupported';

export type ServiceWorkerCallbacks = {
  onStatusChange?: (status: ServiceWorkerStatus) => void;
  onUpdateAvailable?: () => void;
  onOfflineReady?: () => void;
  onError?: (error: Error) => void;
};

/**
 * Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(callbacks?: ServiceWorkerCallbacks): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn('Service Workers are not supported in this browser');
    callbacks?.onStatusChange?.('unsupported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Service Worker registered:', registration);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      console.log('[SW] Update found, installing new version');
      callbacks?.onStatusChange?.('installing');

      newWorker.addEventListener('statechange', () => {
        console.log('[SW] State changed:', newWorker.state);
        callbacks?.onStatusChange?.(newWorker.state as ServiceWorkerStatus);

        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New service worker available
            console.log('[SW] New version available');
            callbacks?.onUpdateAvailable?.();
          } else {
            // First install
            console.log('[SW] Content cached for offline use');
            callbacks?.onOfflineReady?.();
          }
        }

        if (newWorker.state === 'activated') {
          console.log('[SW] Service Worker activated');
        }
      });
    });

    // Check for updates periodically (every hour)
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    callbacks?.onError?.(error as Error);
    callbacks?.onStatusChange?.('error');
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[SW] Service Worker unregistered:', success);
      return success;
    }
    return false;
  } catch (error) {
    console.error('[SW] Unregistration failed:', error);
    return false;
  }
}

/**
 * Update the service worker
 */
export async function updateServiceWorker(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.update();
      console.log('[SW] Update check triggered');
    }
  } catch (error) {
    console.error('[SW] Update failed:', error);
  }
}

/**
 * Skip waiting and activate new service worker immediately
 */
export function skipWaiting(): void {
  if (!isServiceWorkerSupported()) {
    return;
  }

  navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
}

/**
 * Clear all caches
 */
export async function clearCaches(): Promise<void> {
  if (!isServiceWorkerSupported()) {
    return;
  }

  try {
    navigator.serviceWorker.controller?.postMessage({ type: 'CLEAR_CACHE' });
    
    // Also clear caches directly
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    
    console.log('[SW] All caches cleared');
  } catch (error) {
    console.error('[SW] Failed to clear caches:', error);
  }
}

/**
 * Check if the app is currently offline
 */
export function isOffline(): boolean {
  return typeof window !== 'undefined' && !navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function addOnlineListener(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Get service worker registration
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration || null;
  } catch (error) {
    console.error('[SW] Failed to get registration:', error);
    return null;
  }
}

/**
 * Check if service worker is active
 */
export async function isServiceWorkerActive(): Promise<boolean> {
  const registration = await getServiceWorkerRegistration();
  return registration?.active !== null && registration?.active !== undefined;
}
