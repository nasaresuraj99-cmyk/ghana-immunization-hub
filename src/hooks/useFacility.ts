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
import { Facility, AppRole, FacilityUser, ROLE_PERMISSIONS } from '@/types/facility';

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
        } else {
          // Try loading from cache
          const cached = localStorage.getItem(FACILITY_LOCAL_KEY);
          if (cached) {
            setFacility(JSON.parse(cached));
          }
        }
      } catch (err) {
        console.error('Error loading facility:', err);
        // Try loading from cache
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

    try {
      const facilityId = `facility-${Date.now()}`;
      const newFacility: Facility = {
        id: facilityId,
        name,
        code: code.toUpperCase(),
        address: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId,
      };

      const facilityRef = doc(db, 'facilities', facilityId);
      await setDoc(facilityRef, newFacility);
      
      setFacility(newFacility);
      localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(newFacility));
      
      return facilityId;
    } catch (err) {
      console.error('Error creating facility:', err);
      throw new Error('Failed to create facility');
    }
  }, [userId]);

  const joinFacility = useCallback(async (facilityCode: string): Promise<{ facilityId: string; facilityName: string } | null> => {
    if (!userId) throw new Error('User must be logged in');

    try {
      // Find facility by code
      const facilitiesRef = collection(db, 'facilities');
      const facilityQuery = query(facilitiesRef, where('code', '==', facilityCode.toUpperCase()));
      const snapshot = await getDocs(facilityQuery);
      
      if (snapshot.empty) {
        setError('No facility found with this code');
        return null;
      }

      const facilityDoc = snapshot.docs[0];
      const data = facilityDoc.data();
      const facilityData: Facility = {
        id: facilityDoc.id,
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
    } catch (err) {
      console.error('Error joining facility:', err);
      setError('Failed to join facility');
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