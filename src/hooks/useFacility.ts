import { useState, useCallback, useEffect } from 'react';
import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  query, 
  where 
} from '@/lib/firebase';
import { Facility, AppRole, FacilityUser } from '@/types/facility';
import {
  FACILITY_CONFIG,
  getActiveFacility,
  setActiveFacility,
  slugifyFacilityId,
  normalizeFacilityCode,
} from '@/lib/facilityConfig';

const FACILITY_LOCAL_KEY = 'immunization_current_facility';

export const MAX_USERS_PER_FACILITY = 3;

export function useFacility(userId?: string, userFacilityId?: string) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [facilityUsers, setFacilityUsers] = useState<FacilityUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeId = userFacilityId || getActiveFacility().id;

  // Load the current user's facility
  useEffect(() => {
    const loadFacility = async () => {
      try {
        setIsLoading(true);
        const facilityRef = doc(db, 'facilities', activeId);
        const facilitySnap = await getDoc(facilityRef);
        
        if (facilitySnap.exists()) {
          const data = facilitySnap.data() as any;
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
          setActiveFacility({
            id: facilitySnap.id,
            name: data.name,
            code: data.code,
            address: data.address,
            district: data.district,
            region: data.region,
          });
          localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(facilityData));
        } else {
          // Fall back to the cached active facility details
          const cached = getActiveFacility();
          setFacility({
            id: cached.id,
            name: cached.name,
            code: cached.code,
            address: cached.address,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error('Error loading facility:', err);
        const cached = getActiveFacility();
        setFacility({
          id: cached.id,
          name: cached.name,
          code: cached.code,
          address: cached.address,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadFacility();
  }, [activeId]);

  const fetchUsers = useCallback(async () => {
    try {
      const usersRef = collection(db, 'userProfiles');
      const usersQuery = query(usersRef, where('facilityId', '==', activeId));
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
  }, [activeId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createFacility = useCallback(async (
    name: string,
    code: string,
    extra?: { address?: string; district?: string; region?: string }
  ): Promise<string> => {
    const facilityCode = normalizeFacilityCode(code);
    if (!name.trim()) throw new Error('Facility name is required');
    if (!facilityCode) throw new Error('Facility code is required');

    // Ensure the code is not already taken
    const existing = await getDocs(
      query(collection(db, 'facilities'), where('code', '==', facilityCode))
    );
    if (!existing.empty) {
      throw new Error('That facility code is already in use. Choose another one or join with it.');
    }

    const id = slugifyFacilityId(facilityCode, name);
    const now = new Date().toISOString();
    const newFacility = {
      id,
      name: name.trim().toUpperCase(),
      code: facilityCode,
      address: extra?.address || '',
      district: extra?.district || '',
      region: extra?.region || '',
      createdAt: now,
      updatedAt: now,
      createdBy: userId || null,
    };
    await setDoc(doc(db, 'facilities', id), newFacility);
    setActiveFacility(newFacility);
    return id;
  }, [userId]);

  const joinFacility = useCallback(async (
    facilityCode: string
  ): Promise<{ facilityId: string; facilityName: string } | null> => {
    const code = normalizeFacilityCode(facilityCode);
    if (!code) return null;

    const snapshot = await getDocs(
      query(collection(db, 'facilities'), where('code', '==', code))
    );
    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data() as any;
    setActiveFacility({
      id: docSnap.id,
      name: data.name,
      code: data.code,
      address: data.address,
      district: data.district,
      region: data.region,
    });
    return { facilityId: docSnap.id, facilityName: data.name };
  }, []);

  const updateFacilityDetails = useCallback(async (updates: Partial<Facility> & { district?: string; region?: string }) => {
    if (!facility) return;
    const payload = { ...updates, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'facilities', facility.id), payload, { merge: true });
    setFacility(prev => (prev ? { ...prev, ...payload } as Facility : prev));
    setActiveFacility({ ...getActiveFacility(), ...payload } as any);
  }, [facility]);

  const updateUserRole = useCallback(async (targetUserId: string, newRole: AppRole) => {
    try {
      const profileRef = doc(db, 'userProfiles', targetUserId);
      await setDoc(profileRef, {
        role: newRole,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

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

      setFacilityUsers(prev => prev.filter(u => u.id !== targetUserId));
    } catch (err) {
      console.error('Error removing user from facility:', err);
      throw new Error('Failed to remove user from facility');
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  return {
    facility,
    facilityUsers,
    isLoading,
    error,
    createFacility,
    joinFacility,
    updateFacilityDetails,
    updateUserRole,
    removeUserFromFacility,
    refreshUsers,
  };
}
