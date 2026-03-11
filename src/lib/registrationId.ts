import { Child } from "@/types/child";

/**
 * Generates a collision-resistant registration ID in format:
 * IMU-YYYYMMDD-UXXXX-RANDOM
 * 
 * - YYYYMMDD: current date
 * - UXXXX: short hash derived from Firebase user ID
 * - RANDOM: 4-digit random number for offline collision resistance
 * 
 * Works fully offline. Backward compatible with existing GHS-YYYY-SERIAL format.
 */
export function generateRegistrationId(existingChildren: Child[], firebaseUserId?: string): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  
  // Derive a short user segment from Firebase UID (last 4 chars or fallback)
  const userSegment = firebaseUserId 
    ? `U${firebaseUserId.slice(-4).toUpperCase()}`
    : `U${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  
  // Generate a 4-digit random number
  const randomPart = String(Math.floor(1000 + Math.random() * 9000));
  
  const newRegNo = `IMU-${datePart}-${userSegment}-${randomPart}`;

  // Check for collision against existing children (extremely unlikely)
  const isDuplicate = existingChildren.some(child => child.regNo === newRegNo);
  if (isDuplicate) {
    // Recurse with a new random value
    return generateRegistrationId(existingChildren, firebaseUserId);
  }

  return newRegNo;
}

/**
 * Validates registration ID format.
 * Supports both legacy GHS-YYYY-SERIAL and new IMU-YYYYMMDD-UXXXX-RANDOM formats.
 */
export function isValidRegistrationId(regNo: string): boolean {
  const legacyPattern = /^GHS-\d{4}-\d{4}$/;
  const newPattern = /^IMU-\d{8}-U[A-Z0-9]{4}-\d{4}$/;
  return legacyPattern.test(regNo) || newPattern.test(regNo);
}
