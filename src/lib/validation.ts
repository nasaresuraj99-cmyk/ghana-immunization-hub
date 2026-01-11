/**
 * Input Validation Utilities
 * Centralized validation functions for form inputs and data integrity
 */

import { z } from 'zod';

// ============================================================
// ZOD SCHEMAS
// ============================================================

export const childNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(100, { message: "Name must be less than 100 characters" })
  .regex(/^[a-zA-Z\s\-']+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" });

export const caregiverNameSchema = z
  .string()
  .trim()
  .min(1, { message: "Caregiver name is required" })
  .max(100, { message: "Name must be less than 100 characters" })
  .regex(/^[a-zA-Z\s\-']+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" });

export const phoneSchema = z
  .string()
  .trim()
  .min(1, { message: "Phone/Address is required" })
  .max(50, { message: "Phone/Address must be less than 50 characters" });

export const communitySchema = z
  .string()
  .trim()
  .max(100, { message: "Community must be less than 100 characters" })
  .optional();

export const batchNumberSchema = z
  .string()
  .trim()
  .min(3, { message: "Batch number must be at least 3 characters" })
  .max(50, { message: "Batch number must be less than 50 characters" })
  .regex(/^[A-Za-z0-9\-_]+$/, { message: "Batch number can only contain letters, numbers, hyphens, and underscores" });

export const childRegistrationSchema = z.object({
  name: childNameSchema,
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid date format" }),
  sex: z.enum(['Male', 'Female'], { message: "Sex must be Male or Female" }),
  regNo: z.string().min(1, { message: "Registration number is required" }),
  motherName: caregiverNameSchema,
  telephoneAddress: phoneSchema,
  community: communitySchema,
  healthFacilityName: z.string().max(150).optional(),
  regionDistrict: z.string().max(100).optional(),
});

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

/**
 * Validates child name - only letters, spaces, hyphens, and apostrophes
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100) return false;
  return /^[a-zA-Z\s\-']+$/.test(trimmed);
}

/**
 * Validates Ghana phone number format
 */
export function isValidGhanaPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Ghana phone numbers: 10 digits starting with 0, or 9 digits without leading 0
  return /^(0\d{9}|\+233\d{9})$/.test(cleaned);
}

/**
 * Validates batch number format
 */
export function isValidBatchNumber(batchNumber: string): boolean {
  if (!batchNumber || typeof batchNumber !== 'string') return false;
  const trimmed = batchNumber.trim();
  if (trimmed.length < 3 || trimmed.length > 50) return false;
  return /^[A-Za-z0-9\-_]+$/.test(trimmed);
}

/**
 * Validates date string format (YYYY-MM-DD)
 */
export function isValidDateString(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Check if date of birth is valid for EPI (0-59 months old)
 */
export function isValidEPIDateOfBirth(dob: string): { valid: boolean; message: string; ageMonths?: number } {
  if (!isValidDateString(dob)) {
    return { valid: false, message: "Invalid date format" };
  }
  
  const birthDate = new Date(dob);
  const today = new Date();
  
  if (birthDate > today) {
    return { valid: false, message: "Date of birth cannot be in the future" };
  }
  
  const ageInMonths = 
    (today.getFullYear() - birthDate.getFullYear()) * 12 + 
    (today.getMonth() - birthDate.getMonth());
  
  if (ageInMonths < 0) {
    return { valid: false, message: "Date of birth cannot be in the future" };
  }
  
  if (ageInMonths >= 60) {
    return { valid: false, message: "Child must be 0-59 months old for EPI" };
  }
  
  return { valid: true, message: `Age: ${ageInMonths} months`, ageMonths: ageInMonths };
}

/**
 * Sanitize string for display (prevent XSS)
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

/**
 * Sanitize for Firebase - remove undefined values
 */
export function sanitizeForFirebase<T extends object>(obj: T): Partial<T> {
  if (!obj || typeof obj !== 'object') return {};
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    
    if (value === null) {
      sanitized[key] = null;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? sanitizeForFirebase(item) 
          : item
      );
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeForFirebase(value as object);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as Partial<T>;
}

/**
 * Validate search query input
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  
  return query
    .trim()
    .slice(0, 100) // Limit length
    .replace(/[<>]/g, ''); // Remove potential XSS chars
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // If starts with +233, format as +233 XX XXX XXXX
  if (cleaned.startsWith('+233') && cleaned.length === 13) {
    return `+233 ${cleaned.slice(4, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  
  // If starts with 0 and is 10 digits, format as 0XX XXX XXXX
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  return phone;
}
