import { useCallback } from 'react';
import { db, doc, setDoc } from '@/lib/firebase';
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
 * Logs to Firebase only for reliability and simplicity.
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

    // Log to Firebase only
    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'activityLogs', logId), logData);
        console.log('Document activity logged to Firebase:', logId);
      } catch (error) {
        console.error('Error logging to Firebase:', error);
        // Queue for later sync if Firebase fails
        queueOfflineLog(logData);
      }
    } else {
      // Queue for later sync if offline
      queueOfflineLog(logData);
      console.log('Document activity queued for offline sync:', logId);
    }

    return logId;
  }, []);

  // Helper to queue logs for offline sync
  const queueOfflineLog = (logData: any) => {
    const pendingLogs = JSON.parse(localStorage.getItem('pending_doc_logs') || '[]');
    pendingLogs.push(logData);
    localStorage.setItem('pending_doc_logs', JSON.stringify(pendingLogs.slice(-50)));
  };

  // Sync any pending offline logs when coming back online
  const syncPendingLogs = useCallback(async () => {
    if (!navigator.onLine) return;

    const pendingLogs = JSON.parse(localStorage.getItem('pending_doc_logs') || '[]');
    if (pendingLogs.length === 0) return;

    console.log(`Syncing ${pendingLogs.length} pending document logs...`);

    const successfulSyncs: string[] = [];

    for (const logData of pendingLogs) {
      try {
        await setDoc(doc(db, 'activityLogs', logData.id), logData);
        successfulSyncs.push(logData.id);
        console.log('Synced pending log:', logData.id);
      } catch (error) {
        console.error('Error syncing pending log:', error);
      }
    }

    // Remove successfully synced logs
    if (successfulSyncs.length > 0) {
      const remainingLogs = pendingLogs.filter(
        (log: any) => !successfulSyncs.includes(log.id)
      );
      if (remainingLogs.length === 0) {
        localStorage.removeItem('pending_doc_logs');
      } else {
        localStorage.setItem('pending_doc_logs', JSON.stringify(remainingLogs));
      }
      console.log(`Synced ${successfulSyncs.length} pending document logs`);
    }
  }, []);

  return {
    logDocumentGeneration,
    syncPendingLogs,
  };
}
