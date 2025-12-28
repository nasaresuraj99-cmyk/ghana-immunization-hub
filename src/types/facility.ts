export type AppRole = 'facility_admin' | 'staff' | 'read_only';

export interface Facility {
  id: string;
  name: string;
  code: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface UserRole {
  id: string;
  userId: string;
  facilityId: string;
  role: AppRole;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  displayName?: string;
  email?: string;
  facilityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  facilityId: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  facilityId: string;
  userId: string;
  userName?: string;
  action: 'create' | 'update' | 'soft_delete' | 'restore' | 'permanent_delete';
  entityType: 'child' | 'vaccine' | 'user';
  entityId?: string;
  entityName?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  description?: string;
  createdAt: string;
}

export interface SyncHistoryRecord {
  id: string;
  userId: string;
  facilityId?: string;
  status: 'success' | 'failed' | 'partial';
  syncedCount: number;
  failedCount: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export const ROLE_PERMISSIONS = {
  facility_admin: {
    canView: true,
    canAdd: true,
    canEdit: true,
    canAdministerVaccines: true,
    canSoftDelete: true,
    canPermanentDelete: true,
    canManageUsers: true,
    canViewArchive: true,
    canRestoreArchived: true,
    canViewActivityLog: true,
    canExportData: true,
    canViewDefaulters: true,
  },
  staff: {
    canView: true,
    canAdd: true,
    canEdit: true,
    canAdministerVaccines: true,
    canSoftDelete: true,
    canPermanentDelete: false,
    canManageUsers: false,
    canViewArchive: true,
    canRestoreArchived: false,
    canViewActivityLog: true,
    canExportData: true,
    canViewDefaulters: true,
  },
  read_only: {
    canView: true,
    canAdd: false,
    canEdit: false,
    canAdministerVaccines: false,
    canSoftDelete: false,
    canPermanentDelete: false,
    canManageUsers: false,
    canViewArchive: false,
    canRestoreArchived: false,
    canViewActivityLog: false,
    canExportData: false,
    canViewDefaulters: true,
  },
} as const;

export type RolePermissions = typeof ROLE_PERMISSIONS[AppRole];
