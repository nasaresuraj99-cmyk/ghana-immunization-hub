export type TransferStatus = 'active' | 'traveled_out' | 'moved_out' | 'traveled_in' | 'moved_in';

export interface TransferRecord {
  type: 'in' | 'out';
  date: string;
  location: string; // source or destination
  reason: string;
  recordedAt: string;
  recordedByUserId?: string;
}

export interface Child {
  id: string;
  userId: string; // Owner's Firebase UID for data isolation
  facilityId?: string; // Facility ID for multi-facility support
  createdByUserId?: string; // User who created this record
  regNo: string;
  name: string;
  dateOfBirth: string;
  sex: 'Male' | 'Female';
  motherName: string; // Now represents caregiver/parent
  telephoneAddress: string;
  community: string;
  healthFacilityName?: string; // Health facility name
  regionDistrict?: string; // Region/District
  registeredAt: string;
  updatedAt?: string;
  vaccines: VaccineRecord[];
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string;
  deletedByUserId?: string;
  // Transfer/Travel fields
  transferStatus?: TransferStatus;
  transferHistory?: TransferRecord[];
  currentLocation?: string; // For traveled out children
}

export interface VaccineRecord {
  name: string;
  dueDate: string;
  givenDate?: string;
  batchNumber?: string;
  administeredBy?: string;
  administeredByUserId?: string;
  status: 'pending' | 'completed' | 'overdue';
}

export interface Defaulter {
  child: Child;
  missedVaccines: string[];
  dueDate: string;
  daysOverdue: number;
}

export interface DashboardStats {
  totalChildren: number;
  vaccinatedToday: number;
  dueSoon: number;
  defaulters: number;
  coverageRate: number;
  fullyImmunized: number;
  dropoutRate: number;
  archivedChildren?: number;
}
