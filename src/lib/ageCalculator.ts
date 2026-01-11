import { differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears, isValid, parseISO } from "date-fns";

/**
 * Calculate exact age in a human-readable format
 * Handles edge cases for invalid dates
 */
export function calculateExactAge(dateOfBirth: string): string {
  if (!dateOfBirth) return "Unknown";
  
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : new Date(dateOfBirth);
  
  if (!isValid(dob)) return "Invalid date";
  
  const today = new Date();
  
  // Future date check
  if (dob > today) return "Invalid (future date)";
  
  const totalDays = differenceInDays(today, dob);
  const totalWeeks = differenceInWeeks(today, dob);
  const totalMonths = differenceInMonths(today, dob);
  const years = differenceInYears(today, dob);
  
  // Negative check (shouldn't happen after future date check, but safety)
  if (totalDays < 0) return "Invalid date";
  
  // Less than 7 days - show days
  if (totalDays < 7) {
    return totalDays === 0 ? "Born today" : totalDays === 1 ? "1 day" : `${totalDays} days`;
  }
  
  // Less than 4 weeks - show weeks and days
  if (totalWeeks < 4) {
    const remainingDays = totalDays - (totalWeeks * 7);
    if (remainingDays === 0) {
      return totalWeeks === 1 ? "1 wk" : `${totalWeeks} wks`;
    }
    return `${totalWeeks}w ${remainingDays}d`;
  }
  
  // Less than 12 months - show months and weeks
  if (totalMonths < 12) {
    const monthStart = new Date(dob);
    monthStart.setMonth(monthStart.getMonth() + totalMonths);
    const remainingWeeks = Math.max(0, differenceInWeeks(today, monthStart));
    
    if (remainingWeeks === 0) {
      return totalMonths === 1 ? "1 mo" : `${totalMonths} mo`;
    }
    return `${totalMonths}m ${remainingWeeks}w`;
  }
  
  // 12 months or more - show years and months
  const remainingMonths = totalMonths - (years * 12);
  if (remainingMonths === 0) {
    return years === 1 ? "1 yr" : `${years} yrs`;
  }
  return `${years}y ${remainingMonths}m`;
}

/**
 * Get age in months for EPI eligibility calculations
 */
export function getAgeInMonths(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : new Date(dateOfBirth);
  if (!isValid(dob)) return 0;
  
  return Math.max(0, differenceInMonths(new Date(), dob));
}

/**
 * Get age in weeks for vaccine eligibility
 */
export function getAgeInWeeks(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  
  const dob = typeof dateOfBirth === 'string' ? parseISO(dateOfBirth) : new Date(dateOfBirth);
  if (!isValid(dob)) return 0;
  
  return Math.max(0, differenceInWeeks(new Date(), dob));
}

export function isVaccineDue(dueDate: string): boolean {
  if (!dueDate) return false;
  
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : new Date(dueDate);
  if (!isValid(due)) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due <= today;
}

/**
 * Check if child is within EPI age range (0-59 months)
 */
export function isWithinEPIAge(dateOfBirth: string): boolean {
  const months = getAgeInMonths(dateOfBirth);
  return months >= 0 && months < 60;
}
