import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ActivityLog } from '@/types/facility';

const ACTIVITY_LOG_LOCAL_KEY = 'immunization_activity_logs';
const MAX_LOCAL_LOGS = 100;

interface UseActivityLogOptions {
  userId?: string;
  facilityId?: string;
}

interface PendingLog {
  log: Omit<ActivityLog, 'id'>;
  timestamp: number;
}

export function useActivityLog({ userId, facilityId }: UseActivityLogOptions = {}) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load logs from local storage and server
  const loadLogs = useCallback(async () => {
    if (!facilityId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Load from local storage first
    try {
      const localData = localStorage.getItem(ACTIVITY_LOG_LOCAL_KEY);
      if (localData) {
        const parsed = JSON.parse(localData) as ActivityLog[];
        setLogs(parsed.filter(l => l.facility_id === facilityId));
      }
    } catch (e) {
      console.error('Error loading activity logs from localStorage:', e);
    }

    // Sync pending logs
    await syncPendingLogs();

    // Fetch from server
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('facility_id', facilityId)
          .order('created_at', { ascending: false })
          .limit(MAX_LOCAL_LOGS);

        if (!error && data) {
          const serverLogs = data as ActivityLog[];
          setLogs(serverLogs);
          localStorage.setItem(ACTIVITY_LOG_LOCAL_KEY, JSON.stringify(serverLogs));
        }
      } catch (e) {
        console.error('Error fetching activity logs:', e);
      }
    }

    setIsLoading(false);
  }, [facilityId]);

  // Sync pending logs to server
  const syncPendingLogs = useCallback(async () => {
    if (!navigator.onLine) return;

    const pendingKey = `${ACTIVITY_LOG_LOCAL_KEY}_pending`;
    try {
      const pendingData = localStorage.getItem(pendingKey);
      if (!pendingData) return;

      const pending = JSON.parse(pendingData) as PendingLog[];
      if (pending.length === 0) return;

      const logsToSync = pending.map(p => p.log);
      
      const { error } = await supabase
        .from('activity_logs')
        .insert(logsToSync);

      if (!error) {
        localStorage.removeItem(pendingKey);
      }
    } catch (e) {
      console.error('Error syncing pending activity logs:', e);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Add a new activity log entry
  const logActivity = useCallback(async (
    action: ActivityLog['action'],
    entityType: ActivityLog['entity_type'],
    entityId?: string,
    description?: string,
    oldData?: Record<string, any>,
    newData?: Record<string, any>
  ): Promise<void> => {
    if (!userId || !facilityId) return;

    const now = new Date().toISOString();
    const newLog: Omit<ActivityLog, 'id'> = {
      facility_id: facilityId,
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      description,
      created_at: now,
    };

    // Add to local state
    const localLog: ActivityLog = {
      ...newLog,
      id: `log-${Date.now()}`,
    };

    setLogs(prev => [localLog, ...prev].slice(0, MAX_LOCAL_LOGS));

    // Try to save to server
    if (navigator.onLine) {
      try {
        const { error } = await supabase
          .from('activity_logs')
          .insert(newLog);

        if (error) {
          console.error('Error saving activity log:', error);
          addPendingLog(newLog);
        }
      } catch (e) {
        console.error('Error saving activity log:', e);
        addPendingLog(newLog);
      }
    } else {
      addPendingLog(newLog);
    }
  }, [userId, facilityId]);

  // Add to pending logs for later sync
  const addPendingLog = (log: Omit<ActivityLog, 'id'>) => {
    const pendingKey = `${ACTIVITY_LOG_LOCAL_KEY}_pending`;
    try {
      const existingData = localStorage.getItem(pendingKey);
      const existing = existingData ? JSON.parse(existingData) as PendingLog[] : [];
      existing.push({ log, timestamp: Date.now() });
      localStorage.setItem(pendingKey, JSON.stringify(existing));
    } catch (e) {
      console.error('Error adding pending log:', e);
    }
  };

  // Get logs for a specific entity
  const getEntityLogs = useCallback((entityType: ActivityLog['entity_type'], entityId: string) => {
    return logs.filter(log => log.entity_type === entityType && log.entity_id === entityId);
  }, [logs]);

  // Get deletion logs
  const getDeletionLogs = useCallback(() => {
    return logs.filter(log => 
      log.action === 'soft_delete' || log.action === 'permanent_delete'
    );
  }, [logs]);

  return {
    logs,
    isLoading,
    logActivity,
    getEntityLogs,
    getDeletionLogs,
    refreshLogs: loadLogs,
  };
}
