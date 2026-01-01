import { useMemo } from "react";
import { 
  CloudUpload, 
  Wifi, 
  WifiOff, 
  Check, 
  AlertCircle, 
  RefreshCw,
  Database,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { SyncProgress } from "@/hooks/useSyncStatus";

interface SyncStatusWidgetProps {
  syncProgress: SyncProgress & {
    isOnline: boolean;
    statusMessage: string;
    triggerManualSync: () => boolean;
  };
}

export function SyncStatusWidget({ syncProgress }: SyncStatusWidgetProps) {
  const {
    pendingCount,
    syncedCount,
    failedCount,
    lastSyncTime,
    isSyncing,
    syncStatus,
    isOnline,
    statusMessage,
    triggerManualSync,
  } = syncProgress;

  const progressPercentage = useMemo(() => {
    const total = pendingCount + syncedCount + failedCount;
    if (total === 0) return 100;
    return Math.round(((syncedCount + failedCount) / total) * 100);
  }, [pendingCount, syncedCount, failedCount]);

  const handleManualSync = () => {
    const triggered = triggerManualSync();
    if (!triggered) {
      // User is offline
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return "text-amber-500";
    switch (syncStatus) {
      case 'syncing': return "text-blue-500";
      case 'success': return "text-green-500";
      case 'error': return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-5 h-5" />;
    switch (syncStatus) {
      case 'syncing': return <CloudUpload className="w-5 h-5 animate-pulse" />;
      case 'success': return <Check className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      default: return <Wifi className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm">Sync Status</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleManualSync}
          disabled={!isOnline || isSyncing}
          className="h-8"
        >
          <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
        </Button>
      </div>

      {/* Connection Status */}
      <div className={cn("flex items-center gap-2 mb-3", getStatusColor())}>
        {getStatusIcon()}
        <span className="text-sm font-medium">
          {!isOnline ? "Offline Mode" : syncStatus === 'syncing' ? "Syncing..." : "Online"}
        </span>
      </div>

      {/* Sync Progress Bar */}
      {isSyncing && (
        <div className="mb-3">
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {syncedCount} of {pendingCount + syncedCount + failedCount} synced
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-card rounded-lg p-2 text-center">
          <div className={cn(
            "text-lg font-bold",
            pendingCount > 0 ? "text-amber-500" : "text-muted-foreground"
          )}>
            {pendingCount}
          </div>
          <div className="text-xs text-muted-foreground">Pending</div>
        </div>
        <div className="bg-card rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-500">{syncedCount}</div>
          <div className="text-xs text-muted-foreground">Synced</div>
        </div>
        <div className="bg-card rounded-lg p-2 text-center">
          <div className={cn(
            "text-lg font-bold",
            failedCount > 0 ? "text-red-500" : "text-muted-foreground"
          )}>
            {failedCount}
          </div>
          <div className="text-xs text-muted-foreground">Failed</div>
        </div>
      </div>

      {/* Status Message */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>{statusMessage}</span>
      </div>

      {/* Offline Queue Info */}
      {!isOnline && pendingCount > 0 && (
        <div className="mt-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {pendingCount} record{pendingCount !== 1 ? 's' : ''} queued for upload. 
            Will sync automatically when online.
          </p>
        </div>
      )}
    </div>
  );
}
