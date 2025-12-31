import { useState, useEffect } from "react";
import { WifiOff, Wifi, CloudUpload, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface OfflineSyncIndicatorProps {
  pendingCount?: number;
  isSyncing?: boolean;
  lastSyncTime?: Date | null;
}

export function OfflineSyncIndicator({ 
  pendingCount = 0, 
  isSyncing = false,
  lastSyncTime 
}: OfflineSyncIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline || pendingCount > 0) {
        setShowBanner(true);
        // Keep banner visible while syncing, then hide after 5s
        if (!isSyncing) {
          setTimeout(() => setShowBanner(false), 5000);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Show banner initially if offline or has pending items
    if (!navigator.onLine || pendingCount > 0) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline, pendingCount, isSyncing]);

  // Hide banner when sync completes
  useEffect(() => {
    if (isOnline && !isSyncing && pendingCount === 0 && showBanner) {
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, isSyncing, pendingCount, showBanner]);

  // Compact indicator for header (always visible when offline or pending)
  const showCompactIndicator = !isOnline || pendingCount > 0;

  return (
    <>
      {/* Compact indicator in header area */}
      {showCompactIndicator && (
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          !isOnline 
            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            : pendingCount > 0 
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
              : ""
        )}>
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline</span>
              {pendingCount > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {pendingCount}
                </Badge>
              )}
            </>
          ) : pendingCount > 0 ? (
            <>
              {isSyncing ? (
                <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{isSyncing ? "Syncing" : "Pending"}</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {pendingCount}
              </Badge>
            </>
          ) : null}
        </div>
      )}

      {/* Full banner notification */}
      {showBanner && (
        <div
          className={cn(
            "fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40",
            "rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4",
            !isOnline 
              ? "bg-amber-500 text-white" 
              : isSyncing 
                ? "bg-blue-500 text-white"
                : pendingCount > 0 
                  ? "bg-orange-500 text-white"
                  : "bg-green-500 text-white"
          )}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">You're Offline</p>
                <p className="text-xs opacity-90">
                  {pendingCount > 0 
                    ? `${pendingCount} record${pendingCount > 1 ? 's' : ''} will sync when online`
                    : "Changes are saved locally"
                  }
                </p>
              </div>
            </>
          ) : isSyncing ? (
            <>
              <CloudUpload className="w-5 h-5 flex-shrink-0 animate-bounce" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Syncing Data...</p>
                <p className="text-xs opacity-90">
                  {pendingCount > 0 ? `${pendingCount} record${pendingCount > 1 ? 's' : ''} remaining` : "Almost done"}
                </p>
              </div>
            </>
          ) : pendingCount > 0 ? (
            <>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Pending Upload</p>
                <p className="text-xs opacity-90">
                  {pendingCount} record{pendingCount > 1 ? 's' : ''} waiting to sync
                </p>
              </div>
            </>
          ) : (
            <>
              <Check className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Back Online</p>
                <p className="text-xs opacity-90">All data synced successfully</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
