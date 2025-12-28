import { useState, useEffect } from "react";
import { WifiOff, Wifi, CloudOff, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  isSyncing?: boolean;
}

export function OfflineIndicator({ isSyncing = false }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Show "back online" message briefly
        setShowBanner(true);
        setTimeout(() => setShowBanner(false), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  if (!showBanner && isOnline) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 animate-fade-in",
        "rounded-lg shadow-lg px-4 py-3 flex items-center gap-3",
        isOnline 
          ? "bg-success/90 text-success-foreground" 
          : "bg-warning/90 text-warning-foreground"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-5 h-5" />
          <div className="flex-1">
            <p className="font-medium text-sm">Back Online</p>
            <p className="text-xs opacity-90">
              {isSyncing ? "Syncing your data..." : "Your data is synced"}
            </p>
          </div>
          {isSyncing && (
            <Cloud className="w-5 h-5 animate-pulse" />
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-5 h-5" />
          <div className="flex-1">
            <p className="font-medium text-sm">You're Offline</p>
            <p className="text-xs opacity-90">
              Don't worry - your changes are saved locally
            </p>
          </div>
          <CloudOff className="w-5 h-5" />
        </>
      )}
    </div>
  );
}
