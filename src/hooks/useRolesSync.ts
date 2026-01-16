import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { db, collection, getDocs, query, where } from '@/lib/firebase';
import { isUuid } from '@/lib/validation';
import { AppRole } from '@/types/facility';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Hook for syncing Firebase roles to the backend user_roles table.
 * Ensures consistent permissions across the app.
 */
export function useRolesSync() {
  /**
   * Sync a single user's role from Firebase to backend
   */
  const syncUserRole = useCallback(async (
    userId: string,
    facilityId: string,
    role: AppRole
  ): Promise<boolean> => {
    if (!userId || !facilityId || !isUuid(facilityId)) {
      console.warn('Invalid params for role sync:', { userId, facilityId, role });
      return false;
    }

    try {
      // Check if role exists in backend
      const { data: existing, error: fetchError } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', userId)
        .eq('facility_id', facilityId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing role:', fetchError);
        return false;
      }

      if (existing) {
        // Update if role changed
        if (existing.role !== role) {
          const { error: updateError } = await supabase
            .from('user_roles')
            .update({ role })
            .eq('id', existing.id);

          if (updateError) {
            console.error('Error updating role:', updateError);
            return false;
          }
        }
      } else {
        // Insert new role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            facility_id: facilityId,
            role,
          });

        if (insertError) {
          console.error('Error inserting role:', insertError);
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('Error syncing user role:', err);
      return false;
    }
  }, []);

  /**
   * Sync a user's profile to backend profiles table
   */
  const syncUserProfile = useCallback(async (
    userId: string,
    displayName: string | null,
    email: string | null,
    facilityId: string | null
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      // Check if profile exists
      const { data: existing, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing profile:', fetchError);
        return false;
      }

      const profileData = {
        user_id: userId,
        display_name: displayName,
        email,
        facility_id: facilityId && isUuid(facilityId) ? facilityId : null,
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', existing.id);

        if (updateError) {
          console.error('Error updating profile:', updateError);
          return false;
        }
      } else {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileData);

        if (insertError) {
          console.error('Error inserting profile:', insertError);
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('Error syncing user profile:', err);
      return false;
    }
  }, []);

  /**
   * Sync all users in a facility from Firebase to backend
   */
  const syncFacilityUsers = useCallback(async (facilityId: string): Promise<SyncResult> => {
    const result: SyncResult = {
      success: false,
      synced: 0,
      failed: 0,
      errors: [],
    };

    if (!facilityId || !isUuid(facilityId)) {
      result.errors.push('Invalid facility ID');
      return result;
    }

    try {
      // Get all users from Firebase for this facility
      const usersRef = collection(db, 'userProfiles');
      const usersQuery = query(usersRef, where('facilityId', '==', facilityId));
      const snapshot = await getDocs(usersQuery);

      const syncPromises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const userId = docSnap.id;
        const role = (data.role as AppRole) || 'staff';

        try {
          // Sync profile
          await syncUserProfile(
            userId,
            data.displayName || null,
            data.email || null,
            facilityId
          );

          // Sync role
          const roleSync = await syncUserRole(userId, facilityId, role);
          if (roleSync) {
            return { success: true };
          }
          return { success: false, error: `Failed to sync role for ${userId}` };
        } catch (err: any) {
          return { success: false, error: err?.message || `Error syncing ${userId}` };
        }
      });

      const results = await Promise.all(syncPromises);

      results.forEach((r) => {
        if (r.success) {
          result.synced++;
        } else {
          result.failed++;
          if (r.error) result.errors.push(r.error);
        }
      });

      result.success = result.failed === 0;
      return result;
    } catch (err: any) {
      result.errors.push(err?.message || 'Unknown error during sync');
      return result;
    }
  }, [syncUserRole, syncUserProfile]);

  /**
   * Remove a user's role from backend when they're removed from a facility
   */
  const removeUserRole = useCallback(async (
    userId: string,
    facilityId: string
  ): Promise<boolean> => {
    if (!userId || !facilityId) return false;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('facility_id', facilityId);

      if (error) {
        console.error('Error removing user role:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error removing user role:', err);
      return false;
    }
  }, []);

  return {
    syncUserRole,
    syncUserProfile,
    syncFacilityUsers,
    removeUserRole,
  };
}
