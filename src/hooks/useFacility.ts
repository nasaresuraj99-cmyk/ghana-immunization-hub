import { useState, useCallback, useEffect } from 'react';
import {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
} from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
import { isUuid } from '@/lib/validation';
import { Facility, AppRole, FacilityUser } from '@/types/facility';

const FACILITY_LOCAL_KEY = 'immunization_current_facility';

export function useFacility(userId?: string, userFacilityId?: string) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [facilityUsers, setFacilityUsers] = useState<FacilityUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load facility data
  useEffect(() => {
    if (!userFacilityId) {
      setIsLoading(false);
      return;
    }

    const loadFacility = async () => {
      try {
        setIsLoading(true);

        // 1) Try Firebase (fast path / offline cache)
        const facilityRef = doc(db, 'facilities', userFacilityId);
        const facilitySnap = await getDoc(facilityRef);

        if (facilitySnap.exists()) {
          const data = facilitySnap.data();
          const facilityData: Facility = {
            id: facilitySnap.id,
            name: data.name,
            code: data.code,
            address: data.address,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            createdBy: data.createdBy,
          };
          setFacility(facilityData);
          localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(facilityData));
          return;
        }

        // 2) Fallback: load from backend by UUID
        if (isUuid(userFacilityId)) {
          const { data, error: dbError } = await supabase
            .from('facilities')
            .select('*')
            .eq('id', userFacilityId)
            .maybeSingle();

          if (dbError) throw dbError;

          if (data) {
            const facilityData: Facility = {
              id: data.id,
              name: data.name,
              code: data.code,
              address: data.address || '',
              createdAt: data.created_at,
              updatedAt: data.updated_at,
              createdBy: undefined,
            };
            setFacility(facilityData);
            localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(facilityData));
            return;
          }
        }

        // 3) Last resort: try local cache
        const cached = localStorage.getItem(FACILITY_LOCAL_KEY);
        if (cached) {
          setFacility(JSON.parse(cached));
        }
      } catch (err) {
        console.error('Error loading facility:', err);
        const cached = localStorage.getItem(FACILITY_LOCAL_KEY);
        if (cached) {
          setFacility(JSON.parse(cached));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadFacility();
  }, [userFacilityId]);

  // Load facility users
  useEffect(() => {
    if (!userFacilityId) return;

    const loadFacilityUsers = async () => {
      try {
        const usersRef = collection(db, 'userProfiles');
        const usersQuery = query(usersRef, where('facilityId', '==', userFacilityId));
        const snapshot = await getDocs(usersQuery);
        
        const users: FacilityUser[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          users.push({
            id: docSnap.id,
            name: data.displayName || 'Unknown',
            email: data.email || '',
            role: data.role || 'staff',
            facilityId: data.facilityId,
            createdAt: data.createdAt,
          });
        });
        
        setFacilityUsers(users);
      } catch (err) {
        console.error('Error loading facility users:', err);
      }
    };

    loadFacilityUsers();
  }, [userFacilityId]);

  const createFacility = useCallback(async (name: string, code: string): Promise<string> => {
    if (!userId) throw new Error('User must be logged in');

    const normalizedCode = code.toUpperCase().trim();
    if (!normalizedCode) throw new Error('Facility code is required');

    try {
      // Enforce unique code (best-effort)
      const { data: existing, error: existingError } = await supabase
        .from('facilities')
        .select('id')
        .eq('code', normalizedCode)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        throw new Error('A facility with this code already exists. Please choose a different code.');
      }

      // Create facility in backend (UUID)
      const { data: created, error: createError } = await supabase
        .from('facilities')
        .insert({
          name: name.trim(),
          code: normalizedCode,
          address: '',
        })
        .select('*')
        .single();

      if (createError) throw createError;

      const facilityId = created.id as string;
      const newFacility: Facility = {
        id: facilityId,
        name: created.name,
        code: created.code,
        address: created.address || '',
        createdAt: created.created_at,
        updatedAt: created.updated_at,
        createdBy: userId,
      };

      // Mirror in Firebase for offline + user management screens
      const facilityRef = doc(db, 'facilities', facilityId);
      await setDoc(facilityRef, newFacility);

      setFacility(newFacility);
      localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(newFacility));

      return facilityId;
    } catch (err: any) {
      console.error('Error creating facility:', err);
      throw new Error(err?.message || 'Failed to create facility');
    }
  }, [userId]);

  const joinFacility = useCallback(async (facilityCode: string): Promise<{ facilityId: string; facilityName: string } | null> => {
    if (!userId) throw new Error('User must be logged in');

    const normalizedCode = facilityCode.toUpperCase().trim();
    if (!normalizedCode) return null;

    try {
      // 1) Prefer backend source of truth
      const { data: dbFacility, error: dbError } = await supabase
        .from('facilities')
        .select('*')
        .eq('code', normalizedCode)
        .maybeSingle();

      if (dbError) throw dbError;

      if (dbFacility) {
        const facilityData: Facility = {
          id: dbFacility.id,
          name: dbFacility.name,
          code: dbFacility.code,
          address: dbFacility.address || '',
          createdAt: dbFacility.created_at,
          updatedAt: dbFacility.updated_at,
          createdBy: undefined,
        };

        // Mirror to Firebase for offline + user management screens
        await setDoc(doc(db, 'facilities', facilityData.id), {
          ...facilityData,
          createdBy: facilityData.createdBy ?? null,
        } as any, { merge: true });

        setFacility(facilityData);
        localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(facilityData));

        return { facilityId: facilityData.id, facilityName: facilityData.name };
      }

      // 2) Backward compatibility: legacy Firebase-only facilities
      const facilitiesRef = collection(db, 'facilities');
      const facilityQuery = query(facilitiesRef, where('code', '==', normalizedCode));
      const snapshot = await getDocs(facilityQuery);

      if (snapshot.empty) {
        setError('No facility found with this code');
        return null;
      }

      const facilityDoc = snapshot.docs[0];
      const data = facilityDoc.data();

      // If legacy ID is not a UUID, migrate it by creating a backend facility
      const legacyId = facilityDoc.id;
      if (!isUuid(legacyId)) {
        const { data: migrated, error: migrateError } = await supabase
          .from('facilities')
          .insert({
            name: (data.name || '').toString().trim(),
            code: normalizedCode,
            address: (data.address || '').toString(),
          })
          .select('*')
          .single();

        if (migrateError) throw migrateError;

        const migratedFacility: Facility = {
          id: migrated.id,
          name: migrated.name,
          code: migrated.code,
          address: migrated.address || '',
          createdAt: migrated.created_at,
          updatedAt: migrated.updated_at,
          createdBy: data.createdBy,
        };

        await setDoc(doc(db, 'facilities', migratedFacility.id), migratedFacility, { merge: true });
        setFacility(migratedFacility);
        localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(migratedFacility));

        return { facilityId: migratedFacility.id, facilityName: migratedFacility.name };
      }

      const facilityData: Facility = {
        id: legacyId,
        name: data.name,
        code: data.code,
        address: data.address,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
      };

      setFacility(facilityData);
      localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(facilityData));

      return {
        facilityId: facilityDoc.id,
        facilityName: data.name,
      };
    } catch (err: any) {
      console.error('Error joining facility:', err);
      setError(err?.message || 'Failed to join facility');
      return null;
    }
  }, [userId]);

  const updateUserRole = useCallback(async (targetUserId: string, newRole: AppRole) => {
    try {
      const profileRef = doc(db, 'userProfiles', targetUserId);
      await setDoc(profileRef, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Update local state
      setFacilityUsers(prev => prev.map(u => 
        u.id === targetUserId ? { ...u, role: newRole } : u
      ));
    } catch (err) {
      console.error('Error updating user role:', err);
      throw new Error('Failed to update user role');
    }
  }, []);

  const removeUserFromFacility = useCallback(async (targetUserId: string) => {
    try {
      const profileRef = doc(db, 'userProfiles', targetUserId);
      await setDoc(profileRef, {
        facilityId: null,
        facilityName: null,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Update local state
      setFacilityUsers(prev => prev.filter(u => u.id !== targetUserId));
    } catch (err) {
      console.error('Error removing user from facility:', err);
      throw new Error('Failed to remove user from facility');
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    if (!userFacilityId) return;

    try {
      const usersRef = collection(db, 'userProfiles');
      const usersQuery = query(usersRef, where('facilityId', '==', userFacilityId));
      const snapshot = await getDocs(usersQuery);
      
      const users: FacilityUser[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({
          id: docSnap.id,
          name: data.displayName || 'Unknown',
          email: data.email || '',
          role: data.role || 'staff',
          facilityId: data.facilityId,
          createdAt: data.createdAt,
        });
      });
      
      setFacilityUsers(users);
    } catch (err) {
      console.error('Error refreshing facility users:', err);
    }
  }, [userFacilityId]);

  return {
    facility,
    facilityUsers,
    isLoading,
    error,
    createFacility,
    joinFacility,
    updateUserRole,
    removeUserFromFacility,
    refreshUsers,
  };
}