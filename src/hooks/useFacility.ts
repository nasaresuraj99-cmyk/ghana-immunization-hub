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
import { FACILITY_CONFIG } from '@/lib/facilityConfig';

const FACILITY_LOCAL_KEY = 'immunization_current_facility';

export function useFacility(userId?: string, userFacilityId?: string) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [facilityUsers, setFacilityUsers] = useState<FacilityUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load FIAN URBAN CHPS facility
  useEffect(() => {
    const loadFacility = async () => {
      try {
        setIsLoading(true);
        const facilityRef = doc(db, 'facilities', FACILITY_CONFIG.id);
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
          // Create FIAN URBAN CHPS if doesn't exist
          const newFacility: Facility = {
            id: FACILITY_CONFIG.id,
            name: FACILITY_CONFIG.name,
            code: FACILITY_CONFIG.code,
            address: FACILITY_CONFIG.address,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(facilityRef, newFacility);
          setFacility(newFacility);
          localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(newFacility));
        }
      } catch (err) {
        console.error('Error loading facility:', err);
        // Use config as fallback
        const fallbackFacility: Facility = {
          id: FACILITY_CONFIG.id,
          name: FACILITY_CONFIG.name,
          code: FACILITY_CONFIG.code,
          address: FACILITY_CONFIG.address,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setFacility(fallbackFacility);
      } finally {
        setIsLoading(false);
      }
    };

    loadFacility();
  }, []);

  // Load facility users
  useEffect(() => {
    const loadFacilityUsers = async () => {
      try {
        const usersRef = collection(db, 'userProfiles');
        const usersQuery = query(usersRef, where('facilityId', '==', FACILITY_CONFIG.id));
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
  }, []);

  const createFacility = useCallback(async (name: string, code: string): Promise<string> => {
    // Always use FIAN URBAN CHPS - don't allow creating other facilities
    return FACILITY_CONFIG.id;
  }, []);

  const joinFacility = useCallback(async (facilityCode: string): Promise<{ facilityId: string; facilityName: string } | null> => {
    // Always join FIAN URBAN CHPS
    if (facilityCode.toUpperCase() === FACILITY_CONFIG.code || facilityCode.toUpperCase().includes('FIAN')) {
      return {
        facilityId: FACILITY_CONFIG.id,
        facilityName: FACILITY_CONFIG.name,
      };
    }
    
    // For any code, redirect to FIAN URBAN CHPS
    return {
      facilityId: FACILITY_CONFIG.id,
      facilityName: FACILITY_CONFIG.name,
    };
  }, []);

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
    try {
      const usersRef = collection(db, 'userProfiles');
      const usersQuery = query(usersRef, where('facilityId', '==', FACILITY_CONFIG.id));
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
  }, []);

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
