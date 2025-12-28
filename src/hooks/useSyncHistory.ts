import { useState, useCallback, useEffect } from 'react';
import { SyncHistoryRecord } from '@/types/facility';
import { supabase } from '@/integrations/supabase/client';

const SYNC_HISTORY_LOCAL_KEY = 'immunization_sync_history';
const MAX_LOCAL_HISTORY = 50;

interface UseSyncHistoryOptions {
  userId?: string;
  facilityId?: string;
}

export function useSyncHistory({ userId, facilityId }: UseSyncHistoryOptions = {}) {
  const [history, setHistory] = useState<SyncHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from local storage and optionally sync with server
  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    
    // First load from local storage
    try {
      const localData = localStorage.getItem(SYNC_HISTORY_LOCAL_KEY);
      if (localData) {
        const parsed = JSON.parse(localData) as SyncHistoryRecord[];
        setHistory(parsed.slice(0, MAX_LOCAL_HISTORY));
      }
    } catch (e) {
      console.error('Error loading sync history from localStorage:', e);
    }

    // If we have a userId, try to fetch from server
    if (userId && navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('sync_history')
          .select('*')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(MAX_LOCAL_HISTORY);

        if (!error && data) {
          const serverHistory = data as SyncHistoryRecord[];
          setHistory(serverHistory);
          // Update local storage with server data
          localStorage.setItem(SYNC_HISTORY_LOCAL_KEY, JSON.stringify(serverHistory));
        }
      } catch (e) {
        console.error('Error fetching sync history from server:', e);
      }
    }

    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Add a new sync record
  const addSyncRecord = useCallback(async (
    status: 'success' | 'failed' | 'partial',
    syncedCount: number,
    failedCount: number,
    errorMessage?: string
  ): Promise<SyncHistoryRecord> => {
    const now = new Date().toISOString();
    const newRecord: SyncHistoryRecord = {
      id: `sync-${Date.now()}`,
      user_id: userId || 'unknown',
      facility_id: facilityId,
      status,
      synced_count: syncedCount,
      failed_count: failedCount,
      error_message: errorMessage,
      started_at: now,
      completed_at: now,
    };

    // Update local state
    setHistory(prev => {
      const updated = [newRecord, ...prev].slice(0, MAX_LOCAL_HISTORY);
      localStorage.setItem(SYNC_HISTORY_LOCAL_KEY, JSON.stringify(updated));
      return updated;
    });

    // Try to save to server
    if (userId && navigator.onLine) {
      try {
        const { error } = await supabase
          .from('sync_history')
          .insert({
            user_id: userId,
            facility_id: facilityId,
            status,
            synced_count: syncedCount,
            failed_count: failedCount,
            error_message: errorMessage,
            started_at: now,
            completed_at: now,
          });

        if (error) {
          console.error('Error saving sync history:', error);
        }
      } catch (e) {
        console.error('Error saving sync history:', e);
      }
    }

    return newRecord;
  }, [userId, facilityId]);

  // Get recent sync stats
  const getRecentStats = useCallback(() => {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(
      h => new Date(h.started_at) > last24Hours
    );

    return {
      totalSyncs: recentHistory.length,
      successfulSyncs: recentHistory.filter(h => h.status === 'success').length,
      failedSyncs: recentHistory.filter(h => h.status === 'failed').length,
      partialSyncs: recentHistory.filter(h => h.status === 'partial').length,
      totalSynced: recentHistory.reduce((sum, h) => sum + h.synced_count, 0),
      totalFailed: recentHistory.reduce((sum, h) => sum + h.failed_count, 0),
    };
  }, [history]);

  return {
    history,
    isLoading,
    addSyncRecord,
    getRecentStats,
    refreshHistory: loadHistory,
  };
}
