// FIAN URBAN CHPS - Exclusive Facility Configuration
// This app is configured to work only with FIAN URBAN CHPS health facility

export const FACILITY_CONFIG = {
  id: 'fian-urban-chps-001',
  name: 'FIAN URBAN CHPS',
  code: 'FUCHPS',
  address: 'Fian Urban, Ghana',
  region: 'Ghana Health Service',
} as const;

// Lock the app to this facility only
export const isAuthorizedFacility = (facilityId: string | null | undefined): boolean => {
  return facilityId === FACILITY_CONFIG.id;
};

export const isAuthorizedFacilityName = (facilityName: string | null | undefined): boolean => {
  if (!facilityName) return false;
  return facilityName.toUpperCase().includes('FIAN') && facilityName.toUpperCase().includes('URBAN');
};
