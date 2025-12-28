export interface Child {
  id: string;
  userId: string; // Owner's Firebase UID for data isolation
  facilityId?: string; // Facility ID for multi-facility support
  createdByUserId?: string; // User who created this record
  regNo: string;
  name: string;
  dateOfBirth: string;
  sex: 'Male' | 'Female';
  motherName: string;
  telephoneAddress: string;
  community: string;
  registeredAt: string;
  updatedAt?: string;
  vaccines: VaccineRecord[];
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string;
  deletedByUserId?: string;
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
