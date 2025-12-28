import { useState, useCallback, useEffect, useMemo } from 'react';

export interface SyncProgress {
  pendingCount: number;
  syncedCount: number;
  failedCount: number;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error' | 'offline';
}

const SYNC_STATUS_KEY = 'immunization_sync_status';

const loadSyncStatus = (): Partial<SyncProgress> => {
  try {
    const stored = localStorage.getItem(SYNC_STATUS_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        ...data,
        lastSyncTime: data.lastSyncTime ? new Date(data.lastSyncTime) : null,
      };
    }
  } catch (e) {
    console.error('Error loading sync status:', e);
  }
  return {};
};

const saveSyncStatus = (status: Partial<SyncProgress>) => {
  try {
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
      ...status,
      lastSyncTime: status.lastSyncTime?.toISOString() || null,
    }));
  } catch (e) {
    console.error('Error saving sync status:', e);
  }
};

export function useSyncStatus() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [progress, setProgress] = useState<SyncProgress>(() => ({
    pendingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    lastSyncTime: null,
    isSyncing: false,
    syncStatus: navigator.onLine ? 'idle' : 'offline',
    ...loadSyncStatus(),
  }));

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setProgress(prev => ({
        ...prev,
        syncStatus: prev.pendingCount > 0 ? 'syncing' : 'idle',
      }));
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setProgress(prev => ({ ...prev, syncStatus: 'offline' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const startSync = useCallback((pendingCount: number) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        pendingCount,
        isSyncing: true,
        syncStatus: 'syncing' as const,
        failedCount: 0,
      };
      return newProgress;
    });
  }, []);

  const updateProgress = useCallback((synced: number, failed: number) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        syncedCount: synced,
        failedCount: failed,
        pendingCount: Math.max(0, prev.pendingCount - synced - failed),
      };
      return newProgress;
    });
  }, []);

  const completeSync = useCallback((success: boolean) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        isSyncing: false,
        syncStatus: (success ? 'success' : 'error') as 'success' | 'error',
        lastSyncTime: new Date(),
        pendingCount: success ? 0 : prev.pendingCount,
      };
      saveSyncStatus(newProgress);
      return newProgress;
    });
    
    // Reset status after a delay
    setTimeout(() => {
      setProgress(prev => ({
        ...prev,
        syncStatus: navigator.onLine ? 'idle' : 'offline',
        syncedCount: 0,
        failedCount: 0,
      }));
    }, 3000);
  }, []);

  const setPendingCount = useCallback((count: number) => {
    setProgress(prev => ({
      ...prev,
      pendingCount: count,
    }));
  }, []);

  const [manualSyncTrigger, setManualSyncTrigger] = useState(0);

  const triggerManualSync = useCallback(() => {
    if (!navigator.onLine) {
      return false;
    }
    setManualSyncTrigger(prev => prev + 1);
    return true;
  }, []);

  const statusMessage = useMemo(() => {
    switch (progress.syncStatus) {
      case 'syncing':
        return `Syncing ${progress.pendingCount} item${progress.pendingCount !== 1 ? 's' : ''}...`;
      case 'success':
        return `Synced ${progress.syncedCount} item${progress.syncedCount !== 1 ? 's' : ''} successfully`;
      case 'error':
        return `Failed to sync ${progress.failedCount} item${progress.failedCount !== 1 ? 's' : ''}`;
      case 'offline':
        return `Offline - ${progress.pendingCount} pending change${progress.pendingCount !== 1 ? 's' : ''}`;
      default:
        return progress.lastSyncTime 
          ? `Last synced: ${formatRelativeTime(progress.lastSyncTime)}`
          : 'Ready to sync';
    }
  }, [progress]);

  return {
    ...progress,
    isOnline,
    statusMessage,
    startSync,
    updateProgress,
    completeSync,
    setPendingCount,
    triggerManualSync,
    manualSyncTrigger,
  };
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}
