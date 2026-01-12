export interface VaccineInventory {
  id: string;
  facility_id: string;
  vaccine_name: string;
  batch_number: string;
  manufacturer?: string;
  quantity: number;
  initial_quantity: number;
  unit: string;
  expiry_date: string;
  received_date: string;
  supplier?: string;
  source?: 'GHS' | 'Donor' | 'Transfer' | 'Other';
  storage_location?: string;
  temperature_requirement?: string;
  status: 'available' | 'low' | 'critical' | 'out-of-stock' | 'near-expiry' | 'expired';
  minimum_stock_level: number;
  critical_stock_level: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
}

export interface InventoryTransaction {
  id: string;
  facility_id: string;
  inventory_id: string;
  transaction_type: 'received' | 'administered' | 'wasted' | 'expired' | 'transferred' | 'adjusted' | 'allocated' | 'returned';
  quantity: number;
  old_quantity?: number;
  new_quantity?: number;
  batch_number?: string;
  child_id?: string;
  session_id?: string;
  outreach_session_id?: string;
  reason?: string;
  performed_by_user_id: string;
  created_at: string;
}

export interface OutreachSession {
  id: string;
  facility_id: string;
  session_name: string;
  session_date: string;
  location?: string;
  status: 'planned' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface OutreachInventoryAllocation {
  id: string;
  facility_id: string;
  outreach_session_id: string;
  inventory_id: string;
  allocated_quantity: number;
  used_quantity: number;
  returned_quantity: number;
  wasted_quantity: number;
  status: 'allocated' | 'in-use' | 'reconciled';
  reconciled_at?: string;
  reconciled_by_user_id?: string;
  notes?: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface VaccineWastage {
  id: string;
  facility_id: string;
  inventory_id: string;
  quantity: number;
  reason: string;
  wastage_type: 'expired' | 'broken_vial' | 'power_failure' | 'open_vial' | 'contaminated' | 'cold_chain_failure' | 'other';
  outreach_session_id?: string;
  notes?: string;
  recorded_by_user_id: string;
  created_at: string;
}

export interface InventoryStockSettings {
  id: string;
  facility_id: string;
  default_minimum_stock: number;
  default_critical_stock: number;
  near_expiry_warning_days: number;
  critical_expiry_warning_days: number;
  vaccine_specific_settings: Record<string, { minimum: number; critical: number }>;
  created_at: string;
  updated_at: string;
}

export interface InventoryFormData {
  vaccine_name: string;
  batch_number: string;
  manufacturer?: string;
  quantity: number;
  expiry_date: string;
  received_date: string;
  supplier?: string;
  source?: VaccineInventory['source'];
  storage_location?: string;
  temperature_requirement?: string;
  notes?: string;
}

export interface TransactionFormData {
  inventory_id: string;
  transaction_type: InventoryTransaction['transaction_type'];
  quantity: number;
  reason?: string;
}

export interface WastageFormData {
  inventory_id: string;
  quantity: number;
  reason: string;
  wastage_type: VaccineWastage['wastage_type'];
  outreach_session_id?: string;
  notes?: string;
}

export interface StockAlert {
  type: 'low' | 'critical' | 'out-of-stock' | 'near-expiry' | 'expired';
  vaccine_name: string;
  batch_number: string;
  inventory_id: string;
  quantity: number;
  expiry_date?: string;
  days_until_expiry?: number;
  message: string;
}

export interface InventoryReport {
  type: 'stock_balance' | 'consumption' | 'expiry' | 'wastage' | 'audit_trail';
  generated_at: string;
  facility_id: string;
  date_range: { start: string; end: string };
  data: any[];
}

// Ghana EPI vaccine list for inventory
export const GHANA_EPI_VACCINES = [
  'BCG',
  'OPV',
  'Penta',
  'PCV',
  'Rotavirus',
  'IPV',
  'Vitamin A',
  'Measles-Rubella',
  'Meningitis A',
  'Yellow Fever',
  'Malaria',
  'Hepatitis B',
  'LLIN'
] as const;

export type GhanaEpiVaccine = typeof GHANA_EPI_VACCINES[number];

// Wastage reasons
export const WASTAGE_REASONS = [
  { value: 'expired', label: 'Expired' },
  { value: 'broken_vial', label: 'Broken Vial' },
  { value: 'power_failure', label: 'Power Failure / Cold Chain Failure' },
  { value: 'open_vial', label: 'Open Vial Policy (Unused after opening)' },
  { value: 'contaminated', label: 'Contaminated' },
  { value: 'cold_chain_failure', label: 'Cold Chain Breach' },
  { value: 'other', label: 'Other' }
] as const;

// Stock sources
export const STOCK_SOURCES = [
  { value: 'GHS', label: 'Ghana Health Service' },
  { value: 'Donor', label: 'Donor/NGO' },
  { value: 'Transfer', label: 'Facility Transfer' },
  { value: 'Other', label: 'Other Source' }
] as const;
