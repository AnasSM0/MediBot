/**
 * Offline Fallback Page
 * 
 * Displayed when the user is offline and tries to navigate to an uncached page.
 */

"use client";

import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OfflinePage() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const handleGoHome = () => {
    router.push("/");
  };

  const handleGoToChat = () => {
    router.push("/chat");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-[#1E1E1E]/90 p-8">
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20">
            <WifiOff className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
          </div>

          {/* Title */}
          <h1 className="mb-2 text-2xl font-bold text-foreground">You're Offline</h1>

          {/* Description */}
          <p className="mb-6 text-sm text-muted-foreground">
            It looks like you've lost your internet connection. Some features may not be available
            until you're back online.
          </p>

          {/* What's Available */}
          <div className="mb-6 rounded-lg bg-[#222222]/50 p-4 text-left">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              What's available offline:
            </h2>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Basic chat functionality with limited responses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>General health information and first aid tips</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <span>Emergency guidance and when to seek help</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">✗</span>
                <span>Personalized medical advice and diagnosis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">✗</span>
                <span>Image analysis and prescription reading</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-500">✗</span>
                <span>Chat history synchronization</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleRefresh}
              className="w-full"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking Connection...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button onClick={handleGoHome} variant="outline" className="flex-1">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
              <Button onClick={handleGoToChat} variant="outline" className="flex-1">
                Go to Chat
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <p className="mt-6 text-xs text-muted-foreground">
            For urgent medical concerns, please contact emergency services or visit your nearest
            healthcare facility.
          </p>
        </div>
      </Card>
    </div>
  );
}
