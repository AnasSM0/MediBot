/**
 * Offline Indicator Component
 * 
 * Displays offline status and service worker updates to users.
 */

"use client";

import { WifiOff, Wifi, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useState } from "react";

export type OfflineIndicatorProps = {
  className?: string;
  showOnlineStatus?: boolean;
};

/**
 * Offline Indicator Component
 * 
 * Shows:
 * - Offline status banner when no internet connection
 * - Update available notification
 * - Offline ready notification (first time)
 * 
 * @example
 * ```tsx
 * <OfflineIndicator />
 * ```
 */
export function OfflineIndicator({ className, showOnlineStatus = false }: OfflineIndicatorProps) {
  const {
    isOffline,
    isOnline,
    updateAvailable,
    offlineReady,
    activateUpdate,
  } = useOfflineStatus({
    enableServiceWorker: true,
  });

  const [showOfflineReady, setShowOfflineReady] = useState(true);
  const [showUpdateBanner, setShowUpdateBanner] = useState(true);

  // Don't show anything if online and no updates
  if (isOnline && !updateAvailable && (!offlineReady || !showOfflineReady) && !showOnlineStatus) {
    return null;
  }

  return (
    <div className={cn("fixed top-0 left-0 right-0 z-50", className)}>
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-yellow-600 text-white px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">You're offline</p>
                <p className="text-xs opacity-90">
                  Limited functionality available. Responses are generated locally.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Available Banner */}
      {updateAvailable && showUpdateBanner && (
        <div className="bg-blue-600 text-white px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">Update available</p>
                <p className="text-xs opacity-90">
                  A new version of MediBot is ready to install.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={activateUpdate}
                size="sm"
                variant="outline"
                className="bg-white text-blue-600 hover:bg-blue-50 border-white"
              >
                Update Now
              </Button>
              <button
                onClick={() => setShowUpdateBanner(false)}
                className="text-white hover:text-blue-100"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Ready Banner (first time only) */}
      {offlineReady && showOfflineReady && !isOffline && (
        <div className="bg-green-600 text-white px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Wifi className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold">Ready for offline use</p>
                <p className="text-xs opacity-90">
                  MediBot is now available offline with limited functionality.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowOfflineReady(false)}
              className="text-white hover:text-green-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Online Status (optional, for testing) */}
      {showOnlineStatus && isOnline && !updateAvailable && !offlineReady && (
        <div className="bg-green-600 text-white px-4 py-2 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <Wifi className="h-4 w-4" />
            <p className="text-xs font-medium">Online</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Offline Badge
 * 
 * Small badge for showing offline status in the UI
 */
export function OfflineBadge({ className }: { className?: string }) {
  const { isOffline } = useOfflineStatus();

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-400",
        className
      )}
    >
      <WifiOff className="h-3 w-3" />
      <span>Offline</span>
    </div>
  );
}
