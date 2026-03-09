import { useState, useCallback, useEffect } from 'react';
import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  query, 
  where, 
  limit 
} from '@/lib/firebase';
import { SyncHistoryRecord } from '@/types/facility';
import { FACILITY_CONFIG } from '@/lib/facilityConfig';

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
  const effectiveFacilityId = facilityId || FACILITY_CONFIG.id;
  const [history, setHistory] = useState<SyncHistoryRecord[]>(() => loadLocalHistory());
  const [isLoading, setIsLoading] = useState(false);

  // Load history from Firebase - simpler query without compound index
  useEffect(() => {
    if (!userId) {
      // If no userId, still show local history
      const localHistory = loadLocalHistory();
      if (localHistory.length > 0) {
        setHistory(localHistory);
      }
      return;
    }
    
    if (!navigator.onLine) {
      const localHistory = loadLocalHistory();
      if (localHistory.length > 0) {
        setHistory(localHistory);
      }
      return;
    }

    const load = async () => {
      setIsLoading(true);
      try {
        const ref = collection(db, 'syncHistory');
        // Simple query without compound index requirement
        const q = query(
          ref, 
          where('userId', '==', userId),
          limit(100)
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
        
        // Sort client-side by startedAt descending
        records.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        const sortedRecords = records.slice(0, 50);
        
        setHistory(sortedRecords);
        saveLocalHistory(sortedRecords);
        console.log('Sync history loaded:', sortedRecords.length);
      } catch (error) {
        console.error('Error loading sync history:', error);
        // Fall back to local storage
        const localHistory = loadLocalHistory();
        if (localHistory.length > 0) {
          setHistory(localHistory);
        }
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
      facilityId: effectiveFacilityId,
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
        console.log('Sync record saved to Firebase:', record.id);
      } catch (error) {
        console.error('Error saving sync record:', error);
      }
    }
  }, [userId, effectiveFacilityId]);

  const refreshHistory = useCallback(async () => {
    if (!userId) return;
    
    if (!navigator.onLine) {
      const localHistory = loadLocalHistory();
      if (localHistory.length > 0) {
        setHistory(localHistory);
      }
      return;
    }

    setIsLoading(true);
    try {
      const ref = collection(db, 'syncHistory');
      // Simple query without compound index
      const q = query(
        ref, 
        where('userId', '==', userId),
        limit(100)
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
      
      // Sort client-side by startedAt descending
      records.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      const sortedRecords = records.slice(0, 50);
      
      setHistory(sortedRecords);
      saveLocalHistory(sortedRecords);
      console.log('Sync history refreshed:', sortedRecords.length);
    } catch (error) {
      console.error('Error refreshing sync history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const deleteRecord = useCallback(async (recordId: string) => {
    setHistory(prev => {
      const updated = prev.filter(r => r.id !== recordId);
      saveLocalHistory(updated);
      return updated;
    });

    if (navigator.onLine) {
      try {
        await deleteDoc(doc(db, 'syncHistory', recordId));
      } catch (error) {
        console.error('Error deleting sync record:', error);
      }
    }
  }, []);

  const clearAllHistory = useCallback(async () => {
    const currentHistory = [...history];
    setHistory([]);
    saveLocalHistory([]);

    if (navigator.onLine) {
      try {
        for (const record of currentHistory) {
          await deleteDoc(doc(db, 'syncHistory', record.id));
        }
      } catch (error) {
        console.error('Error clearing sync history:', error);
      }
    }
  }, [history]);

  return {
    history,
    isLoading,
    addSyncRecord,
    refreshHistory,
    deleteRecord,
    clearAllHistory,
  };
}