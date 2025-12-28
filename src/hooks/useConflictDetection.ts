import { useState, useCallback, useEffect } from 'react';
import { Child } from '@/types/child';
import { ConflictRecord, ConflictDiff } from '@/types/conflict';

const CONFLICTS_STORAGE_KEY = 'immunization_conflicts';

const loadConflicts = (): ConflictRecord[] => {
  try {
    const stored = localStorage.getItem(CONFLICTS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading conflicts:', e);
  }
  return [];
};

const saveConflicts = (conflicts: ConflictRecord[]) => {
  try {
    localStorage.setItem(CONFLICTS_STORAGE_KEY, JSON.stringify(conflicts));
  } catch (e) {
    console.error('Error saving conflicts:', e);
  }
};

export function useConflictDetection() {
  const [conflicts, setConflicts] = useState<ConflictRecord[]>(() => loadConflicts());
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // Save conflicts whenever they change
  useEffect(() => {
    saveConflicts(conflicts);
  }, [conflicts]);

  // Open modal if there are unresolved conflicts
  useEffect(() => {
    const unresolvedConflicts = conflicts.filter(c => !c.resolved);
    if (unresolvedConflicts.length > 0 && !isConflictModalOpen) {
      setIsConflictModalOpen(true);
    }
  }, [conflicts, isConflictModalOpen]);

  const detectConflict = useCallback((localChild: Child, remoteChild: Child): boolean => {
    // A conflict exists if both versions have different data and both were modified after sync
    const localTime = new Date(localChild.registeredAt).getTime();
    const remoteTime = new Date(remoteChild.registeredAt).getTime();
    
    // If timestamps are within 1 second, likely the same update
    if (Math.abs(localTime - remoteTime) < 1000) {
      return false;
    }
    
    // Check for actual data differences
    const hasDifferences = 
      localChild.name !== remoteChild.name ||
      localChild.dateOfBirth !== remoteChild.dateOfBirth ||
      localChild.sex !== remoteChild.sex ||
      localChild.motherName !== remoteChild.motherName ||
      localChild.telephoneAddress !== remoteChild.telephoneAddress ||
      localChild.community !== remoteChild.community ||
      JSON.stringify(localChild.vaccines) !== JSON.stringify(remoteChild.vaccines);
    
    return hasDifferences;
  }, []);

  const addConflict = useCallback((localChild: Child, remoteChild: Child) => {
    const existingConflict = conflicts.find(c => c.childId === localChild.id && !c.resolved);
    
    if (existingConflict) {
      // Update existing conflict
      setConflicts(prev => prev.map(c => 
        c.id === existingConflict.id 
          ? {
              ...c,
              localVersion: localChild,
              remoteVersion: remoteChild,
              localTimestamp: new Date(localChild.registeredAt).getTime(),
              remoteTimestamp: new Date(remoteChild.registeredAt).getTime(),
              detectedAt: Date.now(),
            }
          : c
      ));
    } else {
      // Add new conflict
      const newConflict: ConflictRecord = {
        id: `conflict-${Date.now()}`,
        childId: localChild.id,
        localVersion: localChild,
        remoteVersion: remoteChild,
        localTimestamp: new Date(localChild.registeredAt).getTime(),
        remoteTimestamp: new Date(remoteChild.registeredAt).getTime(),
        detectedAt: Date.now(),
        resolved: false,
      };
      
      setConflicts(prev => [...prev, newConflict]);
    }
  }, [conflicts]);

  const resolveConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.map(c => 
      c.id === conflictId ? { ...c, resolved: true } : c
    ));
  }, []);

  const clearResolvedConflicts = useCallback(() => {
    setConflicts(prev => prev.filter(c => !c.resolved));
  }, []);

  const getConflictDiffs = useCallback((conflict: ConflictRecord): ConflictDiff[] => {
    const diffs: ConflictDiff[] = [];
    const local = conflict.localVersion;
    const remote = conflict.remoteVersion;
    
    if (local.name !== remote.name) {
      diffs.push({ field: 'Name', localValue: local.name, remoteValue: remote.name });
    }
    if (local.dateOfBirth !== remote.dateOfBirth) {
      diffs.push({ field: 'Date of Birth', localValue: local.dateOfBirth, remoteValue: remote.dateOfBirth });
    }
    if (local.sex !== remote.sex) {
      diffs.push({ field: 'Sex', localValue: local.sex, remoteValue: remote.sex });
    }
    if (local.motherName !== remote.motherName) {
      diffs.push({ field: 'Mother\'s Name', localValue: local.motherName, remoteValue: remote.motherName });
    }
    if (local.telephoneAddress !== remote.telephoneAddress) {
      diffs.push({ field: 'Contact', localValue: local.telephoneAddress, remoteValue: remote.telephoneAddress });
    }
    if (local.community !== remote.community) {
      diffs.push({ field: 'Community', localValue: local.community, remoteValue: remote.community });
    }
    
    // Check vaccine differences
    const localVaccineCount = local.vaccines.filter(v => v.status === 'completed').length;
    const remoteVaccineCount = remote.vaccines.filter(v => v.status === 'completed').length;
    
    if (localVaccineCount !== remoteVaccineCount) {
      diffs.push({ 
        field: 'Vaccines Given', 
        localValue: `${localVaccineCount} vaccines`, 
        remoteValue: `${remoteVaccineCount} vaccines` 
      });
    }
    
    return diffs;
  }, []);

  const unresolvedConflicts = conflicts.filter(c => !c.resolved);

  return {
    conflicts: unresolvedConflicts,
    allConflicts: conflicts,
    isConflictModalOpen,
    setIsConflictModalOpen,
    detectConflict,
    addConflict,
    resolveConflict,
    clearResolvedConflicts,
    getConflictDiffs,
    hasConflicts: unresolvedConflicts.length > 0,
  };
}
