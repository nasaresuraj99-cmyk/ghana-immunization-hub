// FIAN URBAN CHPS - Exclusive Facility Configuration
// This app is configured to work only with FIAN URBAN CHPS health facility

export const FACILITY_CONFIG = {
  id: 'fian-urban-chps-001',
  name: 'FIAN URBAN CHPS',
  code: 'FUCHPS',
  address: 'Fian Urban, Ghana',
  district: 'Daffiama Bussie Issa (DBI)',
  region: 'Upper West Region, Ghana',
  districtRegion: 'Daffiama Bussie Issa District, Upper West Region',
} as const;

// Lock the app to this facility only
export const isAuthorizedFacility = (facilityId: string | null | undefined): boolean => {
  return facilityId === FACILITY_CONFIG.id;
};

export const isAuthorizedFacilityName = (facilityName: string | null | undefined): boolean => {
  if (!facilityName) return false;
  return facilityName.toUpperCase().includes('FIAN') && facilityName.toUpperCase().includes('URBAN');
};

// Get facility name for certificates and reports
export const getFacilityName = (): string => FACILITY_CONFIG.name;
export const getDistrictRegion = (): string => FACILITY_CONFIG.districtRegion;
export const getDistrict = (): string => FACILITY_CONFIG.district;
