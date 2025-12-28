import { Cloud, CloudOff, CheckCircle, XCircle, RefreshCw, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SyncProgress } from "@/hooks/useSyncStatus";
import { toast } from "sonner";

interface SyncProgressBarProps {
  syncProgress: SyncProgress & {
    isOnline: boolean;
    statusMessage: string;
    triggerManualSync: () => boolean;
  };
  conflictCount?: number;
  onOpenConflicts?: () => void;
}

export function SyncProgressBar({ syncProgress, conflictCount = 0, onOpenConflicts }: SyncProgressBarProps) {
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
    if (isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (syncStatus === 'error') return <XCircle className="w-4 h-4" />;
    if (pendingCount === 0) return <CheckCircle className="w-4 h-4" />;
    return <Cloud className="w-4 h-4" />;
  };

  const getStatusColor = () => {
    if (!isOnline) return "text-muted-foreground bg-muted";
    if (syncStatus === 'error') return "text-destructive bg-destructive/10";
    if (isSyncing) return "text-info bg-info/10";
    if (pendingCount === 0) return "text-success bg-success/10";
    return "text-warning bg-warning/10";
  };

  const progressPercent = isSyncing && pendingCount > 0 
    ? Math.round((syncedCount / (syncedCount + pendingCount)) * 100)
    : 0;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status Badge */}
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
        getStatusColor()
      )}>
        {getStatusIcon()}
        <span className="hidden sm:inline">{statusMessage}</span>
        <span className="sm:hidden">
          {isOnline ? (isSyncing ? "Syncing..." : "Online") : "Offline"}
        </span>
      </div>

      {/* Sync Progress */}
      {isSyncing && pendingCount > 0 && (
        <div className="flex items-center gap-2 min-w-[140px]">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground">
            {progressPercent}%
          </span>
        </div>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && !isSyncing && (
        <span className="text-xs text-muted-foreground hidden md:inline">
          Last sync: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}

      {/* Pending Count */}
      {pendingCount > 0 && !isSyncing && (
        <Badge variant="secondary" className="text-xs gap-1">
          <Cloud className="w-3 h-3" />
          {pendingCount} pending
        </Badge>
      )}

      {/* Conflict Warning */}
      {conflictCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenConflicts}
          className="h-8 px-3 text-xs gap-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:text-amber-400"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{conflictCount} conflict{conflictCount > 1 ? 's' : ''}</span>
        </Button>
      )}

      {/* Manual Sync Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleManualSync}
        disabled={isSyncing || !isOnline}
        className="h-8 px-3 text-xs gap-1.5 bg-muted/50 hover:bg-muted"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin")} />
        <span className="hidden sm:inline">Sync</span>
      </Button>
    </div>
  );
}
