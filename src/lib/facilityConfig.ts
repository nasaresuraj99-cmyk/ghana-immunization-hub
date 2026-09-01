// Multi-facility configuration
// The app supports any health facility in Ghana. The "active facility" is the
// facility of the currently signed-in user. It is cached in localStorage so
// certificates, exports and offline screens keep working without a network call.

export interface FacilityProfile {
  id: string;
  name: string;
  code: string;
  address: string;
  district: string;
  region: string;
}

export const GHANA_REGIONS = [
  'Ahafo Region',
  'Ashanti Region',
  'Bono Region',
  'Bono East Region',
  'Central Region',
  'Eastern Region',
  'Greater Accra Region',
  'North East Region',
  'Northern Region',
  'Oti Region',
  'Savannah Region',
  'Upper East Region',
  'Upper West Region',
  'Volta Region',
  'Western Region',
  'Western North Region',
] as const;

// Legacy/default facility (the app's original facility). Kept so existing
// records, exports and offline caches continue to resolve correctly.
export const DEFAULT_FACILITY: FacilityProfile = {
  id: 'fian-urban-chps-001',
  name: 'FIAN URBAN CHPS',
  code: 'FUCHPS',
  address: 'Fian Urban, Ghana',
  district: 'DAFFIAMA BUSSIE ISSA',
  region: 'Upper West Region',
};

const ACTIVE_FACILITY_KEY = 'immunization_active_facility_config';

function readStored(): FacilityProfile | null {
  try {
    const raw = localStorage.getItem(ACTIVE_FACILITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.id && parsed.name) return normalize(parsed);
    return null;
  } catch {
    return null;
  }
}

function normalize(input: Partial<FacilityProfile>): FacilityProfile {
  return {
    id: input.id || DEFAULT_FACILITY.id,
    name: input.name || DEFAULT_FACILITY.name,
    code: (input.code || '').toUpperCase() || DEFAULT_FACILITY.code,
    address: input.address || '',
    district: input.district || '',
    region: input.region || '',
  };
}

let activeFacility: FacilityProfile = readStored() || DEFAULT_FACILITY;

export function getActiveFacility(): FacilityProfile {
  return activeFacility;
}

export function setActiveFacility(input: Partial<FacilityProfile>): FacilityProfile {
  activeFacility = normalize(input);
  try {
    localStorage.setItem(ACTIVE_FACILITY_KEY, JSON.stringify(activeFacility));
  } catch {
    /* storage unavailable - keep in memory */
  }
  return activeFacility;
}

export function clearActiveFacility() {
  activeFacility = DEFAULT_FACILITY;
  try {
    localStorage.removeItem(ACTIVE_FACILITY_KEY);
  } catch {
    /* noop */
  }
}

// Helpers
export const slugifyFacilityId = (code: string, name: string): string => {
  const base = (code || name || 'facility')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base || 'facility'}-${Math.random().toString(36).slice(2, 8)}`;
};

export const normalizeFacilityCode = (code: string): string =>
  (code || '').trim().toUpperCase().replace(/\s+/g, '');

/**
 * Live view of the active facility. Every existing `FACILITY_CONFIG.x` call site
 * now resolves against the signed-in user's facility.
 */
export const FACILITY_CONFIG: FacilityProfile & { districtRegion: string } = {
  get id() {
    return activeFacility.id;
  },
  get name() {
    return activeFacility.name;
  },
  get code() {
    return activeFacility.code;
  },
  get address() {
    return activeFacility.address;
  },
  get district() {
    return activeFacility.district;
  },
  get region() {
    return activeFacility.region;
  },
  get districtRegion() {
    const parts = [
      activeFacility.district ? `${activeFacility.district} District` : '',
      activeFacility.region,
    ].filter(Boolean);
    return parts.join(', ') || 'Ghana';
  },
} as FacilityProfile & { districtRegion: string };

export const isAuthorizedFacility = (facilityId: string | null | undefined): boolean =>
  !!facilityId && facilityId === activeFacility.id;

export const isAuthorizedFacilityName = (facilityName: string | null | undefined): boolean => {
  if (!facilityName) return false;
  return facilityName.trim().toUpperCase() === activeFacility.name.trim().toUpperCase();
};

export const getFacilityName = (): string => activeFacility.name;
export const getDistrictRegion = (): string => FACILITY_CONFIG.districtRegion;
export const getDistrict = (): string => activeFacility.district;
