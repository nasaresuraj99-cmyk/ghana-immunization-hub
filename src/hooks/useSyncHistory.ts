import { useState, useCallback, useEffect } from 'react';
import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from '@/lib/firebase';
import { SyncHistoryRecord } from '@/types/facility';

const SYNC_HISTORY_LOCAL_KEY = 'sync_history';

const loadLocalHistory = (): SyncHistoryRecord[] => {
  try {
    const stored = localStorage.getItem(SYNC_HISTORY_LOCAL_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalHistory = (history: SyncHistoryRecord[]) => {
  try {
    localStorage.setItem(SYNC_HISTORY_LOCAL_KEY, JSON.stringify(history.slice(0, 50)));
  } catch {}
};

export function useSyncHistory(userId?: string, facilityId?: string) {
  const [history, setHistory] = useState<SyncHistoryRecord[]>(() => loadLocalHistory());
  const [isLoading, setIsLoading] = useState(false);

  // Load history from Firebase
  useEffect(() => {
    if (!userId || !navigator.onLine) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const ref = collection(db, 'syncHistory');
        const q = query(
          ref, 
          where('userId', '==', userId),
          orderBy('startedAt', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        const records: SyncHistoryRecord[] = [];
        
        snap.forEach(d => {
          const data = d.data();
          records.push({
            id: d.id,
            userId: data.userId,
            facilityId: data.facilityId,
            status: data.status,
            syncedCount: data.syncedCount || 0,
            failedCount: data.failedCount || 0,
            errorMessage: data.errorMessage,
            startedAt: data.startedAt,
            completedAt: data.completedAt,
          });
        });
        
        setHistory(records);
        saveLocalHistory(records);
      } catch (error) {
        console.error('Error loading sync history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [userId]);

  const addSyncRecord = useCallback(async (
    status: SyncHistoryRecord['status'],
    syncedCount: number,
    failedCount: number,
    errorMessage?: string
  ) => {
    if (!userId) return;

    const now = new Date().toISOString();
    const record: SyncHistoryRecord = {
      id: `sync-${Date.now()}`,
      userId,
      facilityId,
      status,
      syncedCount,
      failedCount,
      errorMessage,
      startedAt: now,
      completedAt: now,
    };

    // Update local state
    setHistory(prev => {
      const updated = [record, ...prev].slice(0, 50);
      saveLocalHistory(updated);
      return updated;
    });

    // Sync to Firebase
    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'syncHistory', record.id), record);
      } catch (error) {
        console.error('Error saving sync record:', error);
      }
    }
  }, [userId, facilityId]);

  const refreshHistory = useCallback(async () => {
    if (!userId || !navigator.onLine) return;

    setIsLoading(true);
    try {
      const ref = collection(db, 'syncHistory');
      const q = query(
        ref, 
        where('userId', '==', userId),
        orderBy('startedAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const records: SyncHistoryRecord[] = [];
      
      snap.forEach(d => {
        const data = d.data();
        records.push({
          id: d.id,
          userId: data.userId,
          facilityId: data.facilityId,
          status: data.status,
          syncedCount: data.syncedCount || 0,
          failedCount: data.failedCount || 0,
          errorMessage: data.errorMessage,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
        });
      });
      
      setHistory(records);
      saveLocalHistory(records);
    } catch (error) {
      console.error('Error refreshing sync history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  return {
    history,
    isLoading,
    addSyncRecord,
    refreshHistory,
  };
}