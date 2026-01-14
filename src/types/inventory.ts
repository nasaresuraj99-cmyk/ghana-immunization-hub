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
  child_id?: string | null;
  session_id?: string | null;
  outreach_session_id?: string | null;
  batch_number?: string | null;
  old_quantity?: number | null;
  new_quantity?: number | null;
  reason?: string | null;
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

// Ghana EPI vaccine list for inventory (base vaccine names)
export const GHANA_EPI_VACCINES = [
  'BCG',
  'OPV',
  'Hepatitis B',
  'Penta',
  'PCV',
  'Rotavirus',
  'IPV',
  'Malaria',
  'Vitamin A',
  'Measles-Rubella',
  'Men A',
  'LLIN',
  'Yellow Fever'
] as const;

export type GhanaEpiVaccine = typeof GHANA_EPI_VACCINES[number];

// Map full vaccine names (from schedule) to inventory base vaccine names
export const VACCINE_NAME_MAPPING: Record<string, GhanaEpiVaccine> = {
  'BCG': 'BCG',
  'OPV0': 'OPV',
  'OPV1': 'OPV',
  'OPV2': 'OPV',
  'OPV3': 'OPV',
  'Hepatitis': 'Hepatitis B',
  'Penta1': 'Penta',
  'Penta2': 'Penta',
  'Penta3': 'Penta',
  'PCV1': 'PCV',
  'PCV2': 'PCV',
  'PCV3': 'PCV',
  'Rotavirus1': 'Rotavirus',
  'Rotavirus2': 'Rotavirus',
  'Rotavirus3': 'Rotavirus',
  'IPV1': 'IPV',
  'IPV2': 'IPV',
  'Malaria1': 'Malaria',
  'Malaria2': 'Malaria',
  'Malaria3': 'Malaria',
  'Malaria4': 'Malaria',
  'Vitamin': 'Vitamin A',
  'Measles': 'Measles-Rubella',
  'Men': 'Men A',
  'LLIN': 'LLIN',
  'Yellow': 'Yellow Fever',
};

// Helper function to get inventory vaccine name from schedule vaccine name
export function getInventoryVaccineName(scheduleVaccineName: string): GhanaEpiVaccine | null {
  // Try exact match first
  const firstWord = scheduleVaccineName.split(' ')[0];
  if (VACCINE_NAME_MAPPING[firstWord]) {
    return VACCINE_NAME_MAPPING[firstWord];
  }
  
  // Check if the schedule name starts with any of the base vaccine names
  for (const baseVaccine of GHANA_EPI_VACCINES) {
    if (scheduleVaccineName.toLowerCase().includes(baseVaccine.toLowerCase())) {
      return baseVaccine;
    }
  }
  
  return null;
}
