export interface VaccineInventory {
  id: string;
  facility_id: string;
  vaccine_name: string;
  batch_number: string;
  quantity: number;
  initial_quantity: number;
  unit: string;
  expiry_date: string;
  received_date: string;
  supplier?: string;
  storage_location?: string;
  temperature_requirement?: string;
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
  transaction_type: 'received' | 'administered' | 'wasted' | 'expired' | 'transferred' | 'adjusted';
  quantity: number;
  child_id?: string;
  session_id?: string;
  reason?: string;
  performed_by_user_id: string;
  created_at: string;
}

export interface InventoryFormData {
  vaccine_name: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  received_date: string;
  supplier?: string;
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

// Ghana EPI vaccine list for inventory
export const GHANA_EPI_VACCINES = [
  'BCG',
  'OPV',
  'Penta',
  'PCV',
  'Rota',
  'IPV',
  'Vitamin A',
  'Measles-Rubella',
  'Meningitis A',
  'Yellow Fever'
] as const;

export type GhanaEpiVaccine = typeof GHANA_EPI_VACCINES[number];
