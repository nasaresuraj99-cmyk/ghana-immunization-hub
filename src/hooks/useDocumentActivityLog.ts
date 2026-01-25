import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { db, collection, doc, setDoc } from '@/lib/firebase';
import { FACILITY_CONFIG } from '@/lib/facilityConfig';

interface DocumentLogParams {
  userId: string;
  userName: string;
  documentType: 'certificate' | 'immunization_card' | 'report' | 'data_export';
  documentName: string;
  childId?: string;
  childRegNo?: string;
  childName?: string;
  reportType?: string;
  format?: 'pdf' | 'csv' | 'excel' | 'png' | 'json';
  periodLabel?: string;
}

/**
 * Hook for logging document generation activities for audit trail.
 * Logs to both Firebase (primary) and Supabase (backup) for reliability.
 */
export function useDocumentActivityLog() {
  const logDocumentGeneration = useCallback(async ({
    userId,
    userName,
    documentType,
    documentName,
    childId,
    childRegNo,
    childName,
    reportType,
    format = 'pdf',
    periodLabel,
  }: DocumentLogParams) => {
    if (!userId) {
      console.warn('Cannot log document activity: No user ID provided');
      return;
    }

    const facilityId = FACILITY_CONFIG.id;
    const logId = `doclog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // Build description
    let description = `Generated ${documentType.replace('_', ' ')}: ${documentName}`;
    if (childRegNo && childName) {
      description += ` for ${childName} (${childRegNo})`;
    }
    if (reportType) {
      description += ` - ${reportType}`;
    }
    if (periodLabel) {
      description += ` [${periodLabel}]`;
    }
    description += ` (${format.toUpperCase()})`;

    const logData = {
      id: logId,
      facilityId,
      userId,
      userName,
      action: 'generate_document' as const,
      entityType: documentType,
      entityId: childId || logId,
      entityName: documentName,
      description,
      newData: {
        documentType,
        documentName,
        format,
        childId,
        childRegNo,
        childName,
        reportType,
        periodLabel,
        generatedAt: timestamp,
        facilityName: FACILITY_CONFIG.name,
      },
      createdAt: timestamp,
    };

    // Log to Firebase (primary data store)
    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'activityLogs', logId), logData);
        console.log('Document activity logged to Firebase:', logId);
      } catch (error) {
        console.error('Error logging to Firebase:', error);
      }

      // Also log to Supabase for backup/redundancy
      try {
        await supabase.from('activity_logs').insert({
          id: logId,
          facility_id: facilityId,
          user_id: userId,
          action: 'generate_document',
          entity_type: documentType,
          entity_id: childId || logId,
          description,
          new_data: logData.newData,
          created_at: timestamp,
        });
        console.log('Document activity logged to Supabase:', logId);
      } catch (error) {
        console.error('Error logging to Supabase:', error);
      }
    } else {
      // Queue for later sync if offline
      const pendingLogs = JSON.parse(localStorage.getItem('pending_doc_logs') || '[]');
      pendingLogs.push(logData);
      localStorage.setItem('pending_doc_logs', JSON.stringify(pendingLogs.slice(-50)));
      console.log('Document activity queued for offline sync:', logId);
    }

    return logId;
  }, []);

  // Sync any pending offline logs when coming back online
  const syncPendingLogs = useCallback(async () => {
    if (!navigator.onLine) return;

    const pendingLogs = JSON.parse(localStorage.getItem('pending_doc_logs') || '[]');
    if (pendingLogs.length === 0) return;

    console.log(`Syncing ${pendingLogs.length} pending document logs...`);

    for (const logData of pendingLogs) {
      try {
        await setDoc(doc(db, 'activityLogs', logData.id), logData);
        await supabase.from('activity_logs').insert({
          id: logData.id,
          facility_id: logData.facilityId,
          user_id: logData.userId,
          action: logData.action,
          entity_type: logData.entityType,
          entity_id: logData.entityId,
          description: logData.description,
          new_data: logData.newData,
          created_at: logData.createdAt,
        });
      } catch (error) {
        console.error('Error syncing pending log:', error);
      }
    }

    localStorage.removeItem('pending_doc_logs');
    console.log('Pending document logs synced successfully');
  }, []);

  return {
    logDocumentGeneration,
    syncPendingLogs,
  };
}
