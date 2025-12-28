export interface Child {
  id: string;
  userId: string; // Owner's Firebase UID for data isolation
  regNo: string;
  name: string;
  dateOfBirth: string;
  sex: 'Male' | 'Female';
  motherName: string;
  telephoneAddress: string;
  community: string;
  registeredAt: string;
  vaccines: VaccineRecord[];
}

export interface VaccineRecord {
  name: string;
  dueDate: string;
  givenDate?: string;
  batchNumber?: string;
  administeredBy?: string;
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
}
