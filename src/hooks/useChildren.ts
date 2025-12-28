import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Child, VaccineRecord, DashboardStats } from "@/types/child";
import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc,
  query,
  where
} from "@/lib/firebase";
import { useSyncStatus, SyncProgress } from "./useSyncStatus";
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
  action: 'add' | 'update' | 'delete';
  childId: string;
  data?: Child;
  timestamp: number;
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

export function useChildren(userId?: string) {
  const [children, setChildren] = useState<Child[]>(() => loadFromLocalStorage());
  const [isLoading, setIsLoading] = useState(true);
  const hasSyncedRef = useRef(false);
  const currentUserIdRef = useRef(userId);
  
  const syncStatus = useSyncStatus();
  const { isOnline, startSync, updateProgress, completeSync, setPendingCount, isSyncing, manualSyncTrigger } = syncStatus;
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

  // Update userId ref when it changes
  useEffect(() => {
    if (userId && userId !== currentUserIdRef.current) {
      currentUserIdRef.current = userId;
      hasSyncedRef.current = false; // Reset to re-fetch for new user
    }
  }, [userId]);

  // Initial fetch from Firebase - Always fetch to ensure data is persistent
  useEffect(() => {
    if (hasSyncedRef.current || !userId) return;
    
    const fetchFromFirebase = async () => {
      setIsLoading(true);
      
      // If offline, just use local data filtered by userId
      if (!navigator.onLine) {
        const localData = loadFromLocalStorage().filter(c => c.userId === userId);
        setChildren(localData);
        setIsLoading(false);
        return;
      }
      
      try {
        hasSyncedRef.current = true;
        const childrenRef = collection(db, 'children');
        // Query only children belonging to current user
        const userQuery = query(childrenRef, where('userId', '==', userId));
        const snapshot = await getDocs(userQuery);
        
        const firebaseChildren: Child[] = [];
        snapshot.forEach((docSnap) => {
          firebaseChildren.push(docSnap.data() as Child);
        });
        
        // Firebase is the source of truth - merge local pending changes
        const localChildren = loadFromLocalStorage().filter(c => c.userId === userId);
        const merged = mergeChildren(localChildren, firebaseChildren);
        
        setChildren(merged);
        saveToLocalStorage(merged);
        
        // Mark as synced
        localStorage.setItem(FIREBASE_SYNCED_KEY, 'true');
        
        // Sync any pending changes
        await syncPendingChanges();
      } catch (error) {
        console.error('Firebase fetch error:', error);
        // If Firebase fails, continue with local data
        const localData = loadFromLocalStorage().filter(c => c.userId === userId);
        setChildren(localData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFromFirebase();
  }, [userId, syncPendingChanges]);

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
    
    // Then check local children - only add if newer or not in Firebase
    local.forEach(child => {
      const existing = merged.get(child.id);
      if (!existing) {
        merged.set(child.id, child);
      } else if (new Date(child.registeredAt) > new Date(existing.registeredAt)) {
        merged.set(child.id, child);
      }
    });
    
    return Array.from(merged.values());
  };

  // Save to localStorage whenever children change
  useEffect(() => {
    if (!isLoading) {
      saveToLocalStorage(children);
    }
  }, [children, isLoading]);

  const addPendingSync = useCallback((sync: PendingSync) => {
    const pending = loadPendingSyncs();
    const filtered = pending.filter(p => p.childId !== sync.childId);
    filtered.push(sync);
    savePendingSyncs(filtered);
  }, []);

  const syncToFirebase = useCallback(async (childId: string, data: Child | null, action: 'add' | 'update' | 'delete') => {
    // Always add to pending first for reliability
    if (data) {
      addPendingSync({ action, childId, data, timestamp: Date.now() });
    } else {
      addPendingSync({ action, childId, timestamp: Date.now() });
    }

    // If online, try to sync immediately
    if (navigator.onLine) {
      try {
        const childRef = doc(db, 'children', childId);
        if (action === 'delete') {
          await deleteDoc(childRef);
        } else if (data) {
          await setDoc(childRef, data);
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

  const addChild = useCallback((childData: Omit<Child, 'id' | 'userId' | 'registeredAt' | 'vaccines'>) => {
    if (!currentUserIdRef.current) {
      throw new Error('User must be logged in to add children');
    }
    
    const newChild: Child = {
      ...childData,
      id: `child-${Date.now()}`,
      userId: currentUserIdRef.current,
      registeredAt: new Date().toISOString(),
      vaccines: getVaccineSchedule(childData.dateOfBirth),
    };
    
    setChildren(prev => [...prev, newChild]);
    syncToFirebase(newChild.id, newChild, 'add');

    return newChild;
  }, [syncToFirebase]);

  const updateChild = useCallback((childId: string, childData: Partial<Child>) => {
    setChildren(prev => {
      const updated = prev.map(child => 
        child.id === childId 
          ? { ...child, ...childData, registeredAt: new Date().toISOString() }
          : child
      );
      
      const updatedChild = updated.find(c => c.id === childId);
      if (updatedChild) {
        syncToFirebase(childId, updatedChild, 'update');
      }
      
      return updated;
    });
  }, [syncToFirebase]);

  const deleteChild = useCallback((childId: string) => {
    setChildren(prev => prev.filter(child => child.id !== childId));
    syncToFirebase(childId, null, 'delete');
  }, [syncToFirebase]);

  const updateVaccine = useCallback((childId: string, vaccineName: string, givenDate: string, batchNumber?: string) => {
    setChildren(prev => {
      const updated = prev.map(child => {
        if (child.id !== childId) return child;
        
        return {
          ...child,
          registeredAt: new Date().toISOString(),
          vaccines: child.vaccines.map(vaccine => 
            vaccine.name === vaccineName
              ? { 
                  ...vaccine, 
                  status: 'completed' as const, 
                  givenDate,
                  batchNumber: batchNumber || undefined,
                  administeredBy: 'Current User'
                }
              : vaccine
          ),
        };
      });

      const updatedChild = updated.find(c => c.id === childId);
      if (updatedChild) {
        syncToFirebase(childId, updatedChild, 'update');
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
    };
  }, [children]);

  const importChildren = useCallback((importedChildren: Child[]) => {
    // Add all imported children
    setChildren(prev => {
      const newChildren = [...prev, ...importedChildren];
      return newChildren;
    });
    
    // Sync each imported child to Firebase
    importedChildren.forEach(child => {
      syncToFirebase(child.id, child, 'add');
    });
  }, [syncToFirebase]);

  return {
    children,
    stats,
    addChild,
    updateChild,
    deleteChild,
    updateVaccine,
    importChildren,
    isOnline,
    isSyncing,
    isLoading,
    syncProgress: syncStatus,
  };
}
