import { Child } from "@/types/child";

/**
 * Generates a unique registration ID in format GHS-[YEAR]-[SERIAL]
 * Serial resets to 0001 at the start of each year
 * Ensures no duplicate IDs
 */
export function generateRegistrationId(existingChildren: Child[]): string {
  const currentYear = new Date().getFullYear();
  const prefix = `GHS-${currentYear}-`;

  // Filter children registered in the current year
  const currentYearChildren = existingChildren.filter(child => {
    // Check if regNo follows the GHS-YEAR-SERIAL format
    if (!child.regNo || !child.regNo.startsWith("GHS-")) return false;
    
    const parts = child.regNo.split("-");
    if (parts.length !== 3) return false;
    
    const regYear = parseInt(parts[1], 10);
    return regYear === currentYear;
  });

  // Find the highest serial number for current year
  let maxSerial = 0;
  currentYearChildren.forEach(child => {
    const parts = child.regNo.split("-");
    if (parts.length === 3) {
      const serial = parseInt(parts[2], 10);
      if (!isNaN(serial) && serial > maxSerial) {
        maxSerial = serial;
      }
    }
  });

  // Generate new serial (increment by 1)
  const newSerial = maxSerial + 1;
  const newRegNo = `${prefix}${String(newSerial).padStart(4, '0')}`;

  // Double-check for duplicates (should not happen, but safety check)
  const isDuplicate = existingChildren.some(child => child.regNo === newRegNo);
  if (isDuplicate) {
    // If somehow duplicate, find next available
    let nextSerial = newSerial + 1;
    while (existingChildren.some(child => child.regNo === `${prefix}${String(nextSerial).padStart(4, '0')}`)) {
      nextSerial++;
    }
    return `${prefix}${String(nextSerial).padStart(4, '0')}`;
  }

  return newRegNo;
}

/**
 * Validates registration ID format
 */
export function isValidRegistrationId(regNo: string): boolean {
  const pattern = /^GHS-\d{4}-\d{4}$/;
  return pattern.test(regNo);
}
