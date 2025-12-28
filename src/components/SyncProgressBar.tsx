import { Cloud, CloudOff, CheckCircle, XCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SyncProgress } from "@/hooks/useSyncStatus";
import { toast } from "sonner";

interface SyncProgressBarProps {
  syncProgress: SyncProgress & {
    isOnline: boolean;
    statusMessage: string;
    triggerManualSync: () => boolean;
  };
}

export function SyncProgressBar({ syncProgress }: SyncProgressBarProps) {
  const { 
    isOnline, 
    syncStatus, 
    statusMessage, 
    pendingCount, 
    syncedCount, 
    isSyncing,
    lastSyncTime,
    triggerManualSync,
  } = syncProgress;

  const handleManualSync = () => {
    if (!isOnline) {
      toast.error("Cannot sync while offline", {
        description: "Please connect to the internet to sync your data.",
      });
      return;
    }
    
    if (isSyncing) {
      toast.info("Sync already in progress");
      return;
    }

    const triggered = triggerManualSync();
    if (triggered) {
      toast.info("Manual sync started", {
        description: "Your data is being synchronized...",
      });
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    
    switch (syncStatus) {
      case 'syncing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      case 'offline':
        return <CloudOff className="w-4 h-4" />;
      default:
        return <Cloud className="w-4 h-4" />;
    }
  };

  const getStatusColor = () => {
    if (!isOnline || syncStatus === 'offline') return 'text-warning';
    
    switch (syncStatus) {
      case 'syncing':
        return 'text-primary';
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const progressValue = isSyncing && pendingCount > 0
    ? Math.round((syncedCount / (pendingCount + syncedCount)) * 100)
    : 100;

  return (
    <div className="flex items-center gap-3">
      {/* Online/Offline indicator */}
      <div className="flex items-center gap-1.5">
        {isOnline ? (
          <Wifi className="w-4 h-4 text-success" />
        ) : (
          <WifiOff className="w-4 h-4 text-warning" />
        )}
        <span className={cn(
          "text-xs font-medium hidden sm:inline",
          isOnline ? "text-success" : "text-warning"
        )}>
          {isOnline ? "Online" : "Offline"}
        </span>
      </div>

      <div className="h-4 w-px bg-border" />

      {/* Sync status */}
      <div className={cn("flex items-center gap-2", getStatusColor())}>
        {getStatusIcon()}
        <span className="text-xs">{statusMessage}</span>
      </div>

      {/* Progress bar for active sync */}
      {isSyncing && pendingCount > 0 && (
        <div className="w-20 hidden sm:block">
          <Progress value={progressValue} className="h-1.5" />
        </div>
      )}

      {/* Pending badge */}
      {pendingCount > 0 && !isSyncing && (
        <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">
          {pendingCount} pending
        </span>
      )}

      {/* Manual Sync Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualSync}
        disabled={isSyncing || !isOnline}
        className="h-7 px-2 text-xs gap-1.5"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
        <span className="hidden sm:inline">Sync</span>
      </Button>
    </div>
  );
}
