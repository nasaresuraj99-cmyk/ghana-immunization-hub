import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Child, VaccineRecord, DashboardStats } from "@/types/child";
import { ConflictRecord, ConflictResolution } from "@/types/conflict";
import { ActivityLog } from "@/types/facility";
import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  query,
  where,
  getDoc,
  updateDoc
} from "@/lib/firebase";
import { useSyncStatus, SyncProgress } from "./useSyncStatus";
import { useConflictDetection } from "./useConflictDetection";

// Ghana EPI Schedule - Complete Immunization List
const getVaccineSchedule = (dateOfBirth: string): VaccineRecord[] => {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  
  const weeksPerMonth = 4.33;
  
  const vaccines = [
    { name: "BCG at Birth", weeksAfterBirth: 0 },
    { name: "OPV0 at Birth", weeksAfterBirth: 0 },
    { name: "Hepatitis B at Birth", weeksAfterBirth: 0 },
    { name: "OPV1 at 6 weeks", weeksAfterBirth: 6 },
    { name: "Penta1 at 6 weeks", weeksAfterBirth: 6 },
    { name: "PCV1 at 6 weeks", weeksAfterBirth: 6 },
    { name: "Rotavirus1 at 6 weeks", weeksAfterBirth: 6 },
    { name: "OPV2 at 10 weeks", weeksAfterBirth: 10 },
    { name: "Penta2 at 10 weeks", weeksAfterBirth: 10 },
    { name: "PCV2 at 10 weeks", weeksAfterBirth: 10 },
    { name: "Rotavirus2 at 10 weeks", weeksAfterBirth: 10 },
    { name: "OPV3 at 14 weeks", weeksAfterBirth: 14 },
    { name: "Penta3 at 14 weeks", weeksAfterBirth: 14 },
    { name: "PCV3 at 14 weeks", weeksAfterBirth: 14 },
    { name: "Rotavirus3 at 14 weeks", weeksAfterBirth: 14 },
    { name: "IPV1 at 14 weeks", weeksAfterBirth: 14 },
    { name: "Malaria1 at 6 months", weeksAfterBirth: Math.round(6 * weeksPerMonth) },
    { name: "Vitamin A at 6 months", weeksAfterBirth: Math.round(6 * weeksPerMonth) },
    { name: "Malaria2 at 7 months", weeksAfterBirth: Math.round(7 * weeksPerMonth) },
    { name: "IPV2 at 7 months", weeksAfterBirth: Math.round(7 * weeksPerMonth) },
    { name: "Malaria3 at 9 months", weeksAfterBirth: Math.round(9 * weeksPerMonth) },
    { name: "Measles Rubella1 at 9 months", weeksAfterBirth: Math.round(9 * weeksPerMonth) },
    { name: "Vitamin A at 12 months", weeksAfterBirth: Math.round(12 * weeksPerMonth) },
    { name: "Malaria4 at 18 months", weeksAfterBirth: Math.round(18 * weeksPerMonth) },
    { name: "Measles Rubella2 at 18 months", weeksAfterBirth: Math.round(18 * weeksPerMonth) },
    { name: "Men A at 18 months", weeksAfterBirth: Math.round(18 * weeksPerMonth) },
    { name: "LLIN at 18 months", weeksAfterBirth: Math.round(18 * weeksPerMonth) },
    { name: "Vitamin A at 18 months", weeksAfterBirth: Math.round(18 * weeksPerMonth) },
    { name: "Vitamin A at 24 months", weeksAfterBirth: Math.round(24 * weeksPerMonth) },
    { name: "Vitamin A at 30 months", weeksAfterBirth: Math.round(30 * weeksPerMonth) },
    { name: "Vitamin A at 36 months", weeksAfterBirth: Math.round(36 * weeksPerMonth) },
    { name: "Vitamin A at 42 months", weeksAfterBirth: Math.round(42 * weeksPerMonth) },
    { name: "Vitamin A at 48 months", weeksAfterBirth: Math.round(48 * weeksPerMonth) },
    { name: "Vitamin A at 54 months", weeksAfterBirth: Math.round(54 * weeksPerMonth) },
    { name: "Vitamin A at 60 months", weeksAfterBirth: Math.round(60 * weeksPerMonth) },
  ];

  return vaccines.map(vaccine => {
    const dueDate = new Date(dob);
    dueDate.setDate(dueDate.getDate() + vaccine.weeksAfterBirth * 7);
    
    let status: VaccineRecord['status'] = 'pending';
    if (dueDate < today) {
      status = 'overdue';
    }

    return {
      name: vaccine.name,
      dueDate: dueDate.toISOString().split('T')[0],
      status,
    };
  });
};

const LOCAL_STORAGE_KEY = 'immunization_children_data';
const PENDING_SYNC_KEY = 'immunization_pending_sync';
const FIREBASE_SYNCED_KEY = 'immunization_firebase_synced';

interface PendingSync {
  action: 'add' | 'update' | 'delete' | 'soft_delete' | 'restore';
  childId: string;
  data?: Child;
  timestamp: number;
}

interface UseChildrenOptions {
  userId?: string;
  facilityId?: string;
  includeArchived?: boolean;
}

const loadFromLocalStorage = (): Child[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading from localStorage:', e);
  }
  return [];
};

const saveToLocalStorage = (children: Child[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(children));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
};

const loadPendingSyncs = (): PendingSync[] => {
  try {
    const stored = localStorage.getItem(PENDING_SYNC_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading pending syncs:', e);
  }
  return [];
};

const savePendingSyncs = (syncs: PendingSync[]) => {
  try {
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(syncs));
  } catch (e) {
    console.error('Error saving pending syncs:', e);
  }
};

// Activity log helper - filters out undefined values for Firebase compatibility
const logActivity = async (
  facilityId: string,
  userId: string,
  userName: string,
  action: ActivityLog['action'],
  entityType: ActivityLog['entityType'],
  entityId: string,
  entityName: string,
  oldData?: Record<string, any>,
  newData?: Record<string, any>
) => {
  if (!facilityId) return;
  
  try {
    const logRef = doc(collection(db, 'activityLogs'));
    const log: ActivityLog = {
      id: logRef.id,
      facilityId,
      userId,
      userName,
      action,
      entityType,
      entityId,
      entityName,
      createdAt: new Date().toISOString(),
    };
    
    // Only add oldData and newData if they are defined (Firebase doesn't accept undefined)
    if (oldData !== undefined) {
      log.oldData = oldData;
    }
    if (newData !== undefined) {
      log.newData = newData;
    }
    
    await setDoc(logRef, log);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

export function useChildren(options: UseChildrenOptions = {}) {
  const { userId, facilityId, includeArchived = false } = options;
  
  const [children, setChildren] = useState<Child[]>([]);
  const [archivedChildren, setArchivedChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasSyncedRef = useRef(false);
  const currentUserIdRef = useRef(userId);
  const currentFacilityIdRef = useRef(facilityId);
  
  const syncStatus = useSyncStatus();
  const { isOnline, startSync, updateProgress, completeSync, setPendingCount, isSyncing, manualSyncTrigger } = syncStatus;
  
  const conflictDetection = useConflictDetection();
  const { detectConflict, addConflict, resolveConflict, getConflictDiffs, conflicts, isConflictModalOpen, setIsConflictModalOpen } = conflictDetection;

  // Update pending count when it changes
  useEffect(() => {
    const pendingSyncs = loadPendingSyncs();
    setPendingCount(pendingSyncs.length);
  }, [setPendingCount]);

  // Sync pending changes when online with progress tracking
  const syncPendingChanges = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    const pendingSyncs = loadPendingSyncs();
    if (pendingSyncs.length === 0) return;

    startSync(pendingSyncs.length);
    let syncedCount = 0;
    let failedCount = 0;
    const successfulSyncs: number[] = [];

    for (let i = 0; i < pendingSyncs.length; i++) {
      const sync = pendingSyncs[i];
      try {
        const childRef = doc(db, 'children', sync.childId);
        
        if (sync.action === 'delete') {
          await deleteDoc(childRef);
        } else if (sync.data) {
          await setDoc(childRef, sync.data);
        }
        
        successfulSyncs.push(i);
        syncedCount++;
        updateProgress(syncedCount, failedCount);
      } catch (error) {
        console.error('Error syncing:', error);
        failedCount++;
        updateProgress(syncedCount, failedCount);
      }
    }

    const remainingSyncs = pendingSyncs.filter((_, index) => !successfulSyncs.includes(index));
    savePendingSyncs(remainingSyncs);
    setPendingCount(remainingSyncs.length);
    completeSync(failedCount === 0);
  }, [isSyncing, startSync, updateProgress, completeSync, setPendingCount]);

  // Update refs when they change
  useEffect(() => {
    if (userId && userId !== currentUserIdRef.current) {
      currentUserIdRef.current = userId;
      hasSyncedRef.current = false;
    }
    if (facilityId && facilityId !== currentFacilityIdRef.current) {
      currentFacilityIdRef.current = facilityId;
      hasSyncedRef.current = false;
    }
  }, [userId, facilityId]);

  // Initial fetch from Firebase - filter by facilityId
  useEffect(() => {
    if (hasSyncedRef.current || !userId) return;
    
    const fetchFromFirebase = async () => {
      setIsLoading(true);
      
      // If offline, just use local data filtered by facilityId
      if (!navigator.onLine) {
        const localData = loadFromLocalStorage();
        const filtered = localData.filter(c => {
          const matchesFacility = facilityId ? c.facilityId === facilityId : c.userId === userId;
          return matchesFacility && !c.isDeleted;
        });
        const archived = localData.filter(c => {
          const matchesFacility = facilityId ? c.facilityId === facilityId : c.userId === userId;
          return matchesFacility && c.isDeleted;
        });
        setChildren(filtered);
        setArchivedChildren(archived);
        setIsLoading(false);
        return;
      }
      
      try {
        hasSyncedRef.current = true;
        const childrenRef = collection(db, 'children');
        
        // Query by facilityId if available, otherwise by userId
        let childQuery;
        if (facilityId) {
          childQuery = query(childrenRef, where('facilityId', '==', facilityId));
        } else {
          childQuery = query(childrenRef, where('userId', '==', userId));
        }
        
        const snapshot = await getDocs(childQuery);
        
        const firebaseChildren: Child[] = [];
        const firebaseArchived: Child[] = [];
        
        snapshot.forEach((docSnap) => {
          const child = docSnap.data() as Child;
          if (child.isDeleted) {
            firebaseArchived.push(child);
          } else {
            firebaseChildren.push(child);
          }
        });
        
        // Firebase is the source of truth - merge local pending changes
        const localChildren = loadFromLocalStorage();
        const localFiltered = localChildren.filter(c => {
          const matchesFacility = facilityId ? c.facilityId === facilityId : c.userId === userId;
          return matchesFacility;
        });
        
        const merged = mergeChildren(localFiltered.filter(c => !c.isDeleted), firebaseChildren);
        const mergedArchived = mergeChildren(localFiltered.filter(c => c.isDeleted), firebaseArchived);
        
        setChildren(merged);
        setArchivedChildren(mergedArchived);
        saveToLocalStorage([...merged, ...mergedArchived]);
        
        // Mark as synced
        localStorage.setItem(FIREBASE_SYNCED_KEY, 'true');
        
        // Sync any pending changes
        await syncPendingChanges();
      } catch (error) {
        console.error('Firebase fetch error:', error);
        // If Firebase fails, continue with local data
        const localData = loadFromLocalStorage();
        const filtered = localData.filter(c => {
          const matchesFacility = facilityId ? c.facilityId === facilityId : c.userId === userId;
          return matchesFacility && !c.isDeleted;
        });
        const archived = localData.filter(c => {
          const matchesFacility = facilityId ? c.facilityId === facilityId : c.userId === userId;
          return matchesFacility && c.isDeleted;
        });
        setChildren(filtered);
        setArchivedChildren(archived);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFromFirebase();
  }, [userId, facilityId, syncPendingChanges]);

  // Sync when coming back online or when manual sync is triggered
  useEffect(() => {
    if (isOnline && !isLoading) {
      syncPendingChanges();
    }
  }, [isOnline, isLoading, syncPendingChanges, manualSyncTrigger]);

  const mergeChildren = (local: Child[], firebase: Child[]): Child[] => {
    const merged = new Map<string, Child>();
    
    // First add all Firebase children (source of truth)
    firebase.forEach(child => {
      merged.set(child.id, child);
    });
    
    // Then check local children - detect conflicts or add if not in Firebase
    local.forEach(child => {
      const existing = merged.get(child.id);
      if (!existing) {
        merged.set(child.id, child);
      } else if (detectConflict(child, existing)) {
        // Conflict detected - add to conflict list
        addConflict(child, existing);
        // Keep remote version for now until resolved
        merged.set(child.id, existing);
      } else if (new Date(child.registeredAt) > new Date(existing.registeredAt)) {
        merged.set(child.id, child);
      }
    });
    
    return Array.from(merged.values());
  };

  // Save to localStorage whenever children change
  useEffect(() => {
    if (!isLoading) {
      saveToLocalStorage([...children, ...archivedChildren]);
    }
  }, [children, archivedChildren, isLoading]);

  const addPendingSync = useCallback((sync: PendingSync) => {
    const pending = loadPendingSyncs();
    const filtered = pending.filter(p => p.childId !== sync.childId);
    filtered.push(sync);
    savePendingSyncs(filtered);
  }, []);

// Helper function to remove undefined values from objects for Firebase compatibility
  const sanitizeForFirebase = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeForFirebase(item));
    }
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          sanitized[key] = sanitizeForFirebase(value);
        }
      }
      return sanitized;
    }
    return obj;
  };

  const syncToFirebase = useCallback(async (childId: string, data: Child | null, action: PendingSync['action']) => {
    // Sanitize data to remove undefined values
    const sanitizedData = data ? sanitizeForFirebase(data) : null;
    
    // Always add to pending first for reliability
    if (sanitizedData) {
      addPendingSync({ action, childId, data: sanitizedData, timestamp: Date.now() });
    } else {
      addPendingSync({ action, childId, timestamp: Date.now() });
    }

    // If online, try to sync immediately
    if (navigator.onLine) {
      try {
        const childRef = doc(db, 'children', childId);
        if (action === 'delete') {
          await deleteDoc(childRef);
        } else if (sanitizedData) {
          await setDoc(childRef, sanitizedData);
        }
        
        // Remove from pending on success
        const pending = loadPendingSyncs();
        const filtered = pending.filter(p => p.childId !== childId || p.timestamp < Date.now() - 1000);
        savePendingSyncs(filtered);
      } catch (error) {
        console.error('Firebase sync error:', error);
        // Pending sync already added above
      }
    }
  }, [addPendingSync]);

  // Must be declared after syncToFirebase
  const handleConflictResolution = useCallback((conflictId: string, resolution: ConflictResolution, resolvedChild: Child) => {
    // Update local state with resolved child
    setChildren(prev => prev.map(c => c.id === resolvedChild.id ? resolvedChild : c));
    
    // Sync to Firebase
    syncToFirebase(resolvedChild.id, resolvedChild, 'update');
    
    // Mark conflict as resolved
    resolveConflict(conflictId);
  }, [resolveConflict, syncToFirebase]);

  const addChild = useCallback((childData: Omit<Child, 'id' | 'userId' | 'registeredAt' | 'vaccines'>, userName?: string) => {
    if (!currentUserIdRef.current) {
      throw new Error('User must be logged in to add children');
    }
    
    const newChild: Child = {
      ...childData,
      id: `child-${Date.now()}`,
      userId: currentUserIdRef.current,
      facilityId: currentFacilityIdRef.current,
      createdByUserId: currentUserIdRef.current,
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vaccines: getVaccineSchedule(childData.dateOfBirth),
      isDeleted: false,
    };
    
    setChildren(prev => [...prev, newChild]);
    syncToFirebase(newChild.id, newChild, 'add');
    
    // Log activity
    if (currentFacilityIdRef.current) {
      logActivity(
        currentFacilityIdRef.current,
        currentUserIdRef.current,
        userName || 'Unknown',
        'create',
        'child',
        newChild.id,
        newChild.name
      );
    }

    return newChild;
  }, [syncToFirebase]);

  const updateChild = useCallback((childId: string, childData: Partial<Child>, userName?: string) => {
    setChildren(prev => {
      const oldChild = prev.find(c => c.id === childId);
      const updated = prev.map(child => 
        child.id === childId 
          ? { ...child, ...childData, updatedAt: new Date().toISOString() }
          : child
      );
      
      const updatedChild = updated.find(c => c.id === childId);
      if (updatedChild) {
        syncToFirebase(childId, updatedChild, 'update');
        
        // Log activity
        if (currentFacilityIdRef.current && currentUserIdRef.current) {
          logActivity(
            currentFacilityIdRef.current,
            currentUserIdRef.current,
            userName || 'Unknown',
            'update',
            'child',
            childId,
            updatedChild.name,
            oldChild,
            childData
          );
        }
      }
      
      return updated;
    });
  }, [syncToFirebase]);

  // Soft delete - marks child as deleted but keeps in database
  const softDeleteChild = useCallback((childId: string, userId: string, userName?: string) => {
    setChildren(prev => {
      const childToDelete = prev.find(c => c.id === childId);
      if (!childToDelete) return prev;
      
      const deletedChild: Child = {
        ...childToDelete,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedByUserId: userId,
        updatedAt: new Date().toISOString(),
      };
      
      // Remove from active list and add to archived
      setArchivedChildren(archived => [...archived, deletedChild]);
      syncToFirebase(childId, deletedChild, 'soft_delete');
      
      // Log activity
      if (currentFacilityIdRef.current) {
        logActivity(
          currentFacilityIdRef.current,
          userId,
          userName || 'Unknown',
          'soft_delete',
          'child',
          childId,
          childToDelete.name
        );
      }
      
      return prev.filter(c => c.id !== childId);
    });
  }, [syncToFirebase]);

  // Restore a soft-deleted child
  const restoreChild = useCallback((childId: string, userId: string, userName?: string) => {
    setArchivedChildren(prev => {
      const childToRestore = prev.find(c => c.id === childId);
      if (!childToRestore) return prev;
      
      const restoredChild: Child = {
        ...childToRestore,
        isDeleted: false,
        deletedAt: undefined,
        deletedByUserId: undefined,
        updatedAt: new Date().toISOString(),
      };
      
      // Add back to active list
      setChildren(active => [...active, restoredChild]);
      syncToFirebase(childId, restoredChild, 'restore');
      
      // Log activity
      if (currentFacilityIdRef.current) {
        logActivity(
          currentFacilityIdRef.current,
          userId,
          userName || 'Unknown',
          'restore',
          'child',
          childId,
          childToRestore.name
        );
      }
      
      return prev.filter(c => c.id !== childId);
    });
  }, [syncToFirebase]);

  // Permanent delete - removes from database completely
  const permanentDeleteChild = useCallback((childId: string, userId: string, userName?: string) => {
    const childToDelete = archivedChildren.find(c => c.id === childId);
    
    setArchivedChildren(prev => prev.filter(c => c.id !== childId));
    syncToFirebase(childId, null, 'delete');
    
    // Log activity
    if (currentFacilityIdRef.current && childToDelete) {
      logActivity(
        currentFacilityIdRef.current,
        userId,
        userName || 'Unknown',
        'permanent_delete',
        'child',
        childId,
        childToDelete.name
      );
    }
  }, [archivedChildren, syncToFirebase]);

  // Legacy delete function - now uses soft delete
  const deleteChild = useCallback((childId: string) => {
    if (currentUserIdRef.current) {
      softDeleteChild(childId, currentUserIdRef.current);
    }
  }, [softDeleteChild]);

  const updateVaccine = useCallback((childId: string, vaccineName: string, givenDate: string, batchNumber?: string, userName?: string) => {
    setChildren(prev => {
      const updated = prev.map(child => {
        if (child.id !== childId) return child;
        
        return {
          ...child,
          updatedAt: new Date().toISOString(),
          vaccines: child.vaccines.map(vaccine => 
            vaccine.name === vaccineName
              ? { 
                  ...vaccine, 
                  status: 'completed' as const, 
                  givenDate,
                  batchNumber: batchNumber || undefined,
                  administeredBy: userName || 'Current User',
                  administeredByUserId: currentUserIdRef.current,
                }
              : vaccine
          ),
        };
      });

      const updatedChild = updated.find(c => c.id === childId);
      if (updatedChild) {
        syncToFirebase(childId, updatedChild, 'update');
        
        // Log activity
        if (currentFacilityIdRef.current && currentUserIdRef.current) {
          logActivity(
            currentFacilityIdRef.current,
            currentUserIdRef.current,
            userName || 'Unknown',
            'update',
            'vaccine',
            childId,
            `${vaccineName} for ${updatedChild.name}`
          );
        }
      }

      return updated;
    });
  }, [syncToFirebase]);

  const stats = useMemo((): DashboardStats => {
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    let vaccinatedToday = 0;
    let dueSoon = 0;
    let defaulters = 0;
    let fullyImmunized = 0;

    children.forEach(child => {
      const hasOverdue = child.vaccines.some(v => v.status === 'overdue');
      const allCompleted = child.vaccines.every(v => v.status === 'completed');
      
      if (hasOverdue) defaulters++;
      if (allCompleted) fullyImmunized++;

      child.vaccines.forEach(vaccine => {
        if (vaccine.givenDate === today.toISOString().split('T')[0]) {
          vaccinatedToday++;
        }
        
        if (vaccine.status === 'pending') {
          const dueDate = new Date(vaccine.dueDate);
          if (dueDate >= today && dueDate <= sevenDaysFromNow) {
            dueSoon++;
          }
        }
      });
    });

    const totalVaccines = children.reduce((sum, child) => sum + child.vaccines.length, 0);
    const completedVaccines = children.reduce((sum, child) => 
      sum + child.vaccines.filter(v => v.status === 'completed').length, 0
    );

    return {
      totalChildren: children.length,
      vaccinatedToday,
      dueSoon,
      defaulters,
      coverageRate: totalVaccines > 0 ? Math.round((completedVaccines / totalVaccines) * 100) : 0,
      fullyImmunized,
      dropoutRate: children.length > 0 ? Math.round((defaulters / children.length) * 100) : 0,
      archivedChildren: archivedChildren.length,
    };
  }, [children, archivedChildren]);

  const importChildren = useCallback((importedChildren: Child[]) => {
    // Add facilityId to all imported children
    const childrenWithFacility = importedChildren.map(child => ({
      ...child,
      facilityId: currentFacilityIdRef.current,
      createdByUserId: currentUserIdRef.current,
      isDeleted: false,
    }));
    
    setChildren(prev => [...prev, ...childrenWithFacility]);
    
    // Sync each imported child to Firebase
    childrenWithFacility.forEach(child => {
      syncToFirebase(child.id, child, 'add');
    });
  }, [syncToFirebase]);

  return {
    children,
    archivedChildren,
    stats,
    addChild,
    updateChild,
    deleteChild,
    softDeleteChild,
    restoreChild,
    permanentDeleteChild,
    updateVaccine,
    importChildren,
    isOnline,
    isSyncing,
    isLoading,
    syncProgress: syncStatus,
    // Conflict resolution
    conflicts,
    isConflictModalOpen,
    setIsConflictModalOpen,
    handleConflictResolution,
    getConflictDiffs,
  };
}
