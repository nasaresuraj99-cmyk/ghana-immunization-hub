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
import { ActivityLog } from '@/types/facility';

const ACTIVITY_LOG_LOCAL_KEY = 'activity_logs';

const loadLocalLogs = (): ActivityLog[] => {
  try {
    const stored = localStorage.getItem(ACTIVITY_LOG_LOCAL_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalLogs = (logs: ActivityLog[]) => {
  try {
    localStorage.setItem(ACTIVITY_LOG_LOCAL_KEY, JSON.stringify(logs.slice(-100)));
  } catch {}
};

export function useActivityLog(facilityId?: string, userId?: string, userName?: string) {
  const [logs, setLogs] = useState<ActivityLog[]>(() => loadLocalLogs());
  const [isLoading, setIsLoading] = useState(false);

  // Load logs from Firebase
  useEffect(() => {
    if (!facilityId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const ref = collection(db, 'activityLogs');
        const q = query(
          ref, 
          where('facilityId', '==', facilityId),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const snap = await getDocs(q);
        const records: ActivityLog[] = [];
        
        snap.forEach(d => {
          const data = d.data();
          records.push({
            id: d.id,
            facilityId: data.facilityId,
            userId: data.userId,
            userName: data.userName,
            action: data.action,
            entityType: data.entityType,
            entityId: data.entityId,
            entityName: data.entityName,
            oldData: data.oldData,
            newData: data.newData,
            description: data.description,
            createdAt: data.createdAt,
          });
        });
        
        setLogs(records);
        saveLocalLogs(records);
      } catch (error) {
        console.error('Error loading activity logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [facilityId]);

  const logActivity = useCallback(async (
    action: ActivityLog['action'],
    entityType: ActivityLog['entityType'],
    entityId?: string,
    entityName?: string,
    oldData?: Record<string, any>,
    newData?: Record<string, any>,
    description?: string
  ) => {
    if (!facilityId || !userId) return;

    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      facilityId,
      userId,
      userName: userName || 'Unknown',
      action,
      entityType,
      entityId,
      entityName,
      oldData,
      newData,
      description,
      createdAt: new Date().toISOString(),
    };

    // Update local state
    setLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 100);
      saveLocalLogs(updated);
      return updated;
    });

    // Sync to Firebase
    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'activityLogs', newLog.id), newLog);
      } catch (error) {
        console.error('Error saving activity log:', error);
      }
    }
  }, [facilityId, userId, userName]);

  const refreshLogs = useCallback(async () => {
    if (!facilityId) return;

    setIsLoading(true);
    try {
      const ref = collection(db, 'activityLogs');
      const q = query(
        ref, 
        where('facilityId', '==', facilityId),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      const records: ActivityLog[] = [];
      
      snap.forEach(d => {
        const data = d.data();
        records.push({
          id: d.id,
          facilityId: data.facilityId,
          userId: data.userId,
          userName: data.userName,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          entityName: data.entityName,
          oldData: data.oldData,
          newData: data.newData,
          description: data.description,
          createdAt: data.createdAt,
        });
      });
      
      setLogs(records);
      saveLocalLogs(records);
    } catch (error) {
      console.error('Error refreshing activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [facilityId]);

  return {
    logs,
    isLoading,
    logActivity,
    refreshLogs,
  };
}