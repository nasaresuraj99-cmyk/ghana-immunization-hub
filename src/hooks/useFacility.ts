import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Facility, UserRole, FacilityUser, AppRole, ROLE_PERMISSIONS } from '@/types/facility';

const FACILITY_LOCAL_KEY = 'immunization_current_facility';
const USER_ROLE_LOCAL_KEY = 'immunization_user_role';

interface UseFacilityOptions {
  userId?: string;
}

export function useFacility({ userId }: UseFacilityOptions = {}) {
  const [facility, setFacility] = useState<Facility | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [facilityUsers, setFacilityUsers] = useState<FacilityUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get permissions based on current role
  const permissions = userRole 
    ? ROLE_PERMISSIONS[userRole.role] 
    : ROLE_PERMISSIONS.read_only;

  // Load from local storage first, then sync with server
  const loadFacilityData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Load from local storage first
    try {
      const localFacility = localStorage.getItem(FACILITY_LOCAL_KEY);
      const localRole = localStorage.getItem(USER_ROLE_LOCAL_KEY);
      
      if (localFacility) {
        setFacility(JSON.parse(localFacility));
      }
      if (localRole) {
        setUserRole(JSON.parse(localRole));
      }
    } catch (e) {
      console.error('Error loading facility from localStorage:', e);
    }

    // If online, sync with server
    if (navigator.onLine) {
      try {
        // Get user's role and facility
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*, facilities(*)')
          .eq('user_id', userId)
          .single();

        if (roleError) {
          // User might not have a facility assigned yet
          if (roleError.code !== 'PGRST116') { // Not found
            console.error('Error fetching user role:', roleError);
          }
        } else if (roleData) {
          const role: UserRole = {
            id: roleData.id,
            user_id: roleData.user_id,
            facility_id: roleData.facility_id,
            role: roleData.role as AppRole,
            created_at: roleData.created_at,
          };
          
          const facilityData = (roleData as any).facilities as Facility;
          
          setUserRole(role);
          setFacility(facilityData);
          
          // Save to local storage
          localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(facilityData));
          localStorage.setItem(USER_ROLE_LOCAL_KEY, JSON.stringify(role));

          // Fetch facility users if admin
          if (role.role === 'facility_admin') {
            await loadFacilityUsers(facilityData.id);
          }
        }
      } catch (e) {
        console.error('Error loading facility data:', e);
        setError('Failed to load facility data');
      }
    }

    setIsLoading(false);
  }, [userId]);

  // Load users in the facility (for admins)
  const loadFacilityUsers = useCallback(async (facilityId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles!inner(display_name, email)
        `)
        .eq('facility_id', facilityId);

      if (error) {
        console.error('Error fetching facility users:', error);
        return;
      }

      if (data) {
        const users: FacilityUser[] = data.map((item: any) => ({
          id: item.id,
          user_id: item.user_id,
          display_name: item.profiles?.display_name || 'Unknown',
          email: item.profiles?.email || '',
          role: item.role as AppRole,
          created_at: item.created_at,
        }));
        setFacilityUsers(users);
      }
    } catch (e) {
      console.error('Error loading facility users:', e);
    }
  }, []);

  useEffect(() => {
    loadFacilityData();
  }, [loadFacilityData]);

  // Create a new facility (used during signup)
  const createFacility = useCallback(async (
    name: string,
    code?: string,
    address?: string
  ): Promise<Facility | null> => {
    if (!userId) return null;

    const facilityCode = code || name.toUpperCase().replace(/\s+/g, '-').slice(0, 20);

    try {
      const { data: facilityData, error: facilityError } = await supabase
        .from('facilities')
        .insert({
          name,
          code: facilityCode,
          address,
        })
        .select()
        .single();

      if (facilityError) {
        console.error('Error creating facility:', facilityError);
        setError('Failed to create facility');
        return null;
      }

      // Assign user as facility admin
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          facility_id: facilityData.id,
          role: 'facility_admin' as AppRole,
        });

      if (roleError) {
        console.error('Error assigning user role:', roleError);
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          facility_id: facilityData.id,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      const facility = facilityData as Facility;
      setFacility(facility);
      
      const role: UserRole = {
        id: '',
        user_id: userId,
        facility_id: facility.id,
        role: 'facility_admin',
        created_at: new Date().toISOString(),
      };
      setUserRole(role);

      localStorage.setItem(FACILITY_LOCAL_KEY, JSON.stringify(facility));
      localStorage.setItem(USER_ROLE_LOCAL_KEY, JSON.stringify(role));

      return facility;
    } catch (e) {
      console.error('Error creating facility:', e);
      setError('Failed to create facility');
      return null;
    }
  }, [userId]);

  // Join an existing facility with a code
  const joinFacility = useCallback(async (
    facilityCode: string,
    role: AppRole = 'staff'
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Find facility by code
      const { data: facilityData, error: facilityError } = await supabase
        .from('facilities')
        .select()
        .eq('code', facilityCode.toUpperCase())
        .single();

      if (facilityError || !facilityData) {
        setError('Facility not found');
        return false;
      }

      // Check if user already has a role in this facility
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select()
        .eq('user_id', userId)
        .eq('facility_id', facilityData.id)
        .single();

      if (existingRole) {
        setError('You are already a member of this facility');
        return false;
      }

      // Add user to facility
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          facility_id: facilityData.id,
          role,
        });

      if (roleError) {
        console.error('Error joining facility:', roleError);
        setError('Failed to join facility');
        return false;
      }

      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          facility_id: facilityData.id,
        });

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      await loadFacilityData();
      return true;
    } catch (e) {
      console.error('Error joining facility:', e);
      setError('Failed to join facility');
      return false;
    }
  }, [userId, loadFacilityData]);

  // Update user role (admin only)
  const updateUserRole = useCallback(async (
    targetUserId: string,
    newRole: AppRole
  ): Promise<boolean> => {
    if (!facility || userRole?.role !== 'facility_admin') {
      setError('Only facility admins can update roles');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', targetUserId)
        .eq('facility_id', facility.id);

      if (error) {
        console.error('Error updating user role:', error);
        setError('Failed to update user role');
        return false;
      }

      // Refresh facility users
      await loadFacilityUsers(facility.id);
      return true;
    } catch (e) {
      console.error('Error updating user role:', e);
      setError('Failed to update user role');
      return false;
    }
  }, [facility, userRole, loadFacilityUsers]);

  // Remove user from facility (admin only)
  const removeUser = useCallback(async (
    targetUserId: string
  ): Promise<boolean> => {
    if (!facility || userRole?.role !== 'facility_admin') {
      setError('Only facility admins can remove users');
      return false;
    }

    if (targetUserId === userId) {
      setError('You cannot remove yourself');
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', targetUserId)
        .eq('facility_id', facility.id);

      if (error) {
        console.error('Error removing user:', error);
        setError('Failed to remove user');
        return false;
      }

      await loadFacilityUsers(facility.id);
      return true;
    } catch (e) {
      console.error('Error removing user:', e);
      setError('Failed to remove user');
      return false;
    }
  }, [facility, userRole, userId, loadFacilityUsers]);

  return {
    facility,
    userRole,
    facilityUsers,
    permissions,
    isLoading,
    error,
    createFacility,
    joinFacility,
    updateUserRole,
    removeUser,
    refreshFacility: loadFacilityData,
  };
}
