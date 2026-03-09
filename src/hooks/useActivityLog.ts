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
  orderBy, 
  limit 
} from '@/lib/firebase';
import { ActivityLog } from '@/types/facility';
import { FACILITY_CONFIG } from '@/lib/facilityConfig';

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
  // Always use the configured facility ID if not provided
  const effectiveFacilityId = facilityId || FACILITY_CONFIG.id;
  const [logs, setLogs] = useState<ActivityLog[]>(() => loadLocalLogs());
  const [isLoading, setIsLoading] = useState(false);

  // Load logs from Firebase - simpler query without compound index requirement
  useEffect(() => {
    if (!effectiveFacilityId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const ref = collection(db, 'activityLogs');
        // Use simpler query - filter by facility only, sort client-side
        const q = query(
          ref, 
          where('facilityId', '==', effectiveFacilityId),
          limit(200)
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
        
        // Sort client-side by createdAt descending
        records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const sortedRecords = records.slice(0, 100);
        
        setLogs(sortedRecords);
        saveLocalLogs(sortedRecords);
        console.log('Activity logs loaded:', sortedRecords.length);
      } catch (error) {
        console.error('Error loading activity logs:', error);
        // Fall back to local storage
        const localLogs = loadLocalLogs();
        if (localLogs.length > 0) {
          setLogs(localLogs);
        }
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [effectiveFacilityId]);

  const logActivity = useCallback(async (
    action: ActivityLog['action'],
    entityType: ActivityLog['entityType'],
    entityId?: string,
    entityName?: string,
    oldData?: Record<string, any>,
    newData?: Record<string, any>,
    description?: string
  ) => {
    if (!effectiveFacilityId || !userId) return;

    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      facilityId: effectiveFacilityId,
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
        console.log('Activity logged to Firebase:', newLog.id);
      } catch (error) {
        console.error('Error saving activity log:', error);
      }
    }
  }, [effectiveFacilityId, userId, userName]);

  const refreshLogs = useCallback(async () => {
    if (!effectiveFacilityId) return;

    setIsLoading(true);
    try {
      const ref = collection(db, 'activityLogs');
      // Use simpler query without compound index
      const q = query(
        ref, 
        where('facilityId', '==', effectiveFacilityId),
        limit(200)
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
      
      // Sort client-side by createdAt descending
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const sortedRecords = records.slice(0, 100);
      
      setLogs(sortedRecords);
      saveLocalLogs(sortedRecords);
      console.log('Activity logs refreshed:', sortedRecords.length);
    } catch (error) {
      console.error('Error refreshing activity logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveFacilityId]);

  return {
    logs,
    isLoading,
    logActivity,
    refreshLogs,
  };
}