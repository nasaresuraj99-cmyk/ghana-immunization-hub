export type AppRole = 'facility_admin' | 'staff' | 'read_only';

export interface Facility {
  id: string;
  name: string;
  code: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  facility_id: string;
  role: AppRole;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name?: string;
  email?: string;
  facility_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FacilityUser {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: AppRole;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  facility_id: string;
  user_id: string;
  action: 'create' | 'update' | 'soft_delete' | 'restore' | 'permanent_delete';
  entity_type: 'child' | 'vaccine' | 'user';
  entity_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  description?: string;
  created_at: string;
}

export interface SyncHistoryRecord {
  id: string;
  user_id: string;
  facility_id?: string;
  status: 'success' | 'failed' | 'partial';
  synced_count: number;
  failed_count: number;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export const ROLE_PERMISSIONS = {
  facility_admin: {
    canView: true,
    canAdd: true,
    canEdit: true,
    canSoftDelete: true,
    canPermanentDelete: true,
    canManageUsers: true,
    canViewArchive: true,
    canRestoreArchived: true,
  },
  staff: {
    canView: true,
    canAdd: true,
    canEdit: true,
    canSoftDelete: true,
    canPermanentDelete: false,
    canManageUsers: false,
    canViewArchive: true,
    canRestoreArchived: false,
  },
  read_only: {
    canView: true,
    canAdd: false,
    canEdit: false,
    canSoftDelete: false,
    canPermanentDelete: false,
    canManageUsers: false,
    canViewArchive: false,
    canRestoreArchived: false,
  },
} as const;
