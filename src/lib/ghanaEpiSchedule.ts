/**
 * Ghana Expanded Programme on Immunization (EPI) Schedule
 * Complete vaccine definitions with age requirements, dose dependencies, and intervals
 */

import { differenceInWeeks, differenceInDays } from "date-fns";

export interface VaccineDefinition {
  name: string;
  minAgeWeeks: number;
  maxAgeWeeks: number; // 260 weeks = 5 years (59 months)
  previousDose?: string; // Required previous vaccine
  minIntervalDays?: number; // Minimum days after previous dose
  category: 'routine' | 'supplementary';
}

// Weeks per month for calculations
const WEEKS_PER_MONTH = 4.33;

// Ghana EPI Schedule with complete dose dependencies
export const GHANA_EPI_VACCINES: VaccineDefinition[] = [
  // At Birth (0 weeks)
  { name: "BCG at Birth", minAgeWeeks: 0, maxAgeWeeks: 52, category: 'routine' },
  { name: "OPV0 at Birth", minAgeWeeks: 0, maxAgeWeeks: 4, category: 'routine' },
  { name: "Hepatitis B at Birth", minAgeWeeks: 0, maxAgeWeeks: 1, category: 'routine' },
  
  // 6 Weeks
  { name: "OPV1 at 6 weeks", minAgeWeeks: 6, maxAgeWeeks: 260, previousDose: "OPV0 at Birth", minIntervalDays: 28, category: 'routine' },
  { name: "Penta1 at 6 weeks", minAgeWeeks: 6, maxAgeWeeks: 260, category: 'routine' },
  { name: "PCV1 at 6 weeks", minAgeWeeks: 6, maxAgeWeeks: 260, category: 'routine' },
  { name: "Rotavirus1 at 6 weeks", minAgeWeeks: 6, maxAgeWeeks: 32, category: 'routine' }, // Max 8 months for Rotavirus
  
  // 10 Weeks
  { name: "OPV2 at 10 weeks", minAgeWeeks: 10, maxAgeWeeks: 260, previousDose: "OPV1 at 6 weeks", minIntervalDays: 28, category: 'routine' },
  { name: "Penta2 at 10 weeks", minAgeWeeks: 10, maxAgeWeeks: 260, previousDose: "Penta1 at 6 weeks", minIntervalDays: 28, category: 'routine' },
  { name: "PCV2 at 10 weeks", minAgeWeeks: 10, maxAgeWeeks: 260, previousDose: "PCV1 at 6 weeks", minIntervalDays: 28, category: 'routine' },
  { name: "Rotavirus2 at 10 weeks", minAgeWeeks: 10, maxAgeWeeks: 32, previousDose: "Rotavirus1 at 6 weeks", minIntervalDays: 28, category: 'routine' },
  
  // 14 Weeks
  { name: "OPV3 at 14 weeks", minAgeWeeks: 14, maxAgeWeeks: 260, previousDose: "OPV2 at 10 weeks", minIntervalDays: 28, category: 'routine' },
  { name: "Penta3 at 14 weeks", minAgeWeeks: 14, maxAgeWeeks: 260, previousDose: "Penta2 at 10 weeks", minIntervalDays: 28, category: 'routine' },
  { name: "PCV3 at 14 weeks", minAgeWeeks: 14, maxAgeWeeks: 260, previousDose: "PCV2 at 10 weeks", minIntervalDays: 28, category: 'routine' },
  { name: "Rotavirus3 at 14 weeks", minAgeWeeks: 14, maxAgeWeeks: 32, previousDose: "Rotavirus2 at 10 weeks", minIntervalDays: 28, category: 'routine' },
  { name: "IPV1 at 14 weeks", minAgeWeeks: 14, maxAgeWeeks: 260, category: 'routine' },
  
  // 6 Months (26 weeks)
  { name: "Malaria1 at 6 months", minAgeWeeks: Math.round(6 * WEEKS_PER_MONTH), maxAgeWeeks: 260, category: 'routine' },
  { name: "Vitamin A at 6 months", minAgeWeeks: Math.round(6 * WEEKS_PER_MONTH), maxAgeWeeks: Math.round(12 * WEEKS_PER_MONTH), category: 'supplementary' },
  
  // 7 Months (30 weeks)
  { name: "Malaria2 at 7 months", minAgeWeeks: Math.round(7 * WEEKS_PER_MONTH), maxAgeWeeks: 260, previousDose: "Malaria1 at 6 months", minIntervalDays: 28, category: 'routine' },
  { name: "IPV2 at 7 months", minAgeWeeks: Math.round(7 * WEEKS_PER_MONTH), maxAgeWeeks: 260, previousDose: "IPV1 at 14 weeks", minIntervalDays: 112, category: 'routine' }, // 16 weeks interval
  
  // 9 Months (39 weeks)
  { name: "Malaria3 at 9 months", minAgeWeeks: Math.round(9 * WEEKS_PER_MONTH), maxAgeWeeks: 260, previousDose: "Malaria2 at 7 months", minIntervalDays: 28, category: 'routine' },
  { name: "Measles Rubella1 at 9 months", minAgeWeeks: Math.round(9 * WEEKS_PER_MONTH), maxAgeWeeks: 260, category: 'routine' },
  
  // 12 Months (52 weeks)
  { name: "Vitamin A at 12 months", minAgeWeeks: Math.round(12 * WEEKS_PER_MONTH), maxAgeWeeks: Math.round(18 * WEEKS_PER_MONTH), previousDose: "Vitamin A at 6 months", minIntervalDays: 180, category: 'supplementary' },
  
  // 18 Months (78 weeks)
  { name: "Malaria4 at 18 months", minAgeWeeks: Math.round(18 * WEEKS_PER_MONTH), maxAgeWeeks: 260, previousDose: "Malaria3 at 9 months", minIntervalDays: 180, category: 'routine' },
  { name: "Measles Rubella2 at 18 months", minAgeWeeks: Math.round(18 * WEEKS_PER_MONTH), maxAgeWeeks: 260, previousDose: "Measles Rubella1 at 9 months", minIntervalDays: 180, category: 'routine' },
  { name: "Men A at 18 months", minAgeWeeks: Math.round(18 * WEEKS_PER_MONTH), maxAgeWeeks: 260, category: 'routine' },
  { name: "LLIN at 18 months", minAgeWeeks: Math.round(18 * WEEKS_PER_MONTH), maxAgeWeeks: 260, category: 'supplementary' },
  { name: "Vitamin A at 18 months", minAgeWeeks: Math.round(18 * WEEKS_PER_MONTH), maxAgeWeeks: Math.round(24 * WEEKS_PER_MONTH), previousDose: "Vitamin A at 12 months", minIntervalDays: 180, category: 'supplementary' },
  
  // Vitamin A supplements every 6 months
  { name: "Vitamin A at 24 months", minAgeWeeks: Math.round(24 * WEEKS_PER_MONTH), maxAgeWeeks: Math.round(30 * WEEKS_PER_MONTH), previousDose: "Vitamin A at 18 months", minIntervalDays: 180, category: 'supplementary' },
  { name: "Vitamin A at 30 months", minAgeWeeks: Math.round(30 * WEEKS_PER_MONTH), maxAgeWeeks: Math.round(36 * WEEKS_PER_MONTH), previousDose: "Vitamin A at 24 months", minIntervalDays: 180, category: 'supplementary' },
  { name: "Vitamin A at 36 months", minAgeWeeks: Math.round(36 * WEEKS_PER_MONTH), maxAgeWeeks: Math.round(42 * WEEKS_PER_MONTH), previousDose: "Vitamin A at 30 months", minIntervalDays: 180, category: 'supplementary' },
  { name: "Vitamin A at 42 months", minAgeWeeks: Math.round(42 * WEEKS_PER_MONTH), maxAgeWeeks: Math.round(48 * WEEKS_PER_MONTH), previousDose: "Vitamin A at 36 months", minIntervalDays: 180, category: 'supplementary' },
  { name: "Vitamin A at 48 months", minAgeWeeks: Math.round(48 * WEEKS_PER_MONTH), maxAgeWeeks: Math.round(54 * WEEKS_PER_MONTH), previousDose: "Vitamin A at 42 months", minIntervalDays: 180, category: 'supplementary' },
  { name: "Vitamin A at 54 months", minAgeWeeks: Math.round(54 * WEEKS_PER_MONTH), maxAgeWeeks: Math.round(60 * WEEKS_PER_MONTH), previousDose: "Vitamin A at 48 months", minIntervalDays: 180, category: 'supplementary' },
  { name: "Vitamin A at 60 months", minAgeWeeks: Math.round(60 * WEEKS_PER_MONTH), maxAgeWeeks: 260, previousDose: "Vitamin A at 54 months", minIntervalDays: 180, category: 'supplementary' },
];

export type EligibilityStatus = 'due' | 'overdue' | 'not_due' | 'already_given' | 'ineligible';

export interface EligibilityResult {
  status: EligibilityStatus;
  reason: string;
  dueDate?: string;
  daysOverdue?: number;
}

/**
 * Get the vaccine definition by name
 */
export function getVaccineDefinition(vaccineName: string): VaccineDefinition | undefined {
  return GHANA_EPI_VACCINES.find(v => v.name === vaccineName);
}

/**
 * Check if a child is eligible for a specific vaccine
 * @param dateOfBirth Child's date of birth
 * @param vaccineName Name of the vaccine to check
 * @param vaccines Child's existing vaccine records
 * @param referenceDate Date to check against (outreach date)
 */
export function checkVaccineEligibility(
  dateOfBirth: string,
  vaccineName: string,
  vaccines: { name: string; givenDate?: string; status: string }[],
  referenceDate: Date = new Date()
): EligibilityResult {
  const definition = getVaccineDefinition(vaccineName);
  
  if (!definition) {
    return { status: 'ineligible', reason: 'Unknown vaccine' };
  }
  
  const dob = new Date(dateOfBirth);
  const ageInWeeks = differenceInWeeks(referenceDate, dob);
  
  // Check if already vaccinated
  const existingVaccine = vaccines.find(v => v.name === vaccineName);
  if (existingVaccine?.status === 'completed' || existingVaccine?.givenDate) {
    return { status: 'already_given', reason: 'Already vaccinated' };
  }
  
  // Check age constraints
  if (ageInWeeks < definition.minAgeWeeks) {
    return { 
      status: 'not_due', 
      reason: `Not yet due - child must be at least ${definition.minAgeWeeks} weeks old` 
    };
  }
  
  if (ageInWeeks > definition.maxAgeWeeks) {
    return { 
      status: 'ineligible', 
      reason: `Child has exceeded the maximum age of ${definition.maxAgeWeeks} weeks for this vaccine` 
    };
  }
  
  // Check previous dose dependency
  if (definition.previousDose) {
    const previousVaccine = vaccines.find(v => v.name === definition.previousDose);
    
    if (!previousVaccine?.givenDate) {
      return { 
        status: 'not_due', 
        reason: `Previous dose required: ${definition.previousDose}` 
      };
    }
    
    // Check minimum interval
    if (definition.minIntervalDays) {
      const previousDate = new Date(previousVaccine.givenDate);
      const daysSincePrevious = differenceInDays(referenceDate, previousDate);
      
      if (daysSincePrevious < definition.minIntervalDays) {
        return { 
          status: 'not_due', 
          reason: `Minimum interval of ${definition.minIntervalDays} days from previous dose not met (${daysSincePrevious} days since last dose)` 
        };
      }
    }
  }
  
  // Calculate due date
  const dueDateFromAge = new Date(dob);
  dueDateFromAge.setDate(dueDateFromAge.getDate() + definition.minAgeWeeks * 7);
  
  let actualDueDate = dueDateFromAge;
  
  // If there's a previous dose, consider the interval
  if (definition.previousDose && definition.minIntervalDays) {
    const previousVaccine = vaccines.find(v => v.name === definition.previousDose);
    if (previousVaccine?.givenDate) {
      const intervalDueDate = new Date(previousVaccine.givenDate);
      intervalDueDate.setDate(intervalDueDate.getDate() + definition.minIntervalDays);
      
      // Use the later of the two dates
      if (intervalDueDate > dueDateFromAge) {
        actualDueDate = intervalDueDate;
      }
    }
  }
  
  const daysOverdue = differenceInDays(referenceDate, actualDueDate);
  
  if (daysOverdue > 0) {
    return { 
      status: 'overdue', 
      reason: `Overdue by ${daysOverdue} days`,
      dueDate: actualDueDate.toISOString().split('T')[0],
      daysOverdue
    };
  }
  
  if (daysOverdue >= -7) {
    // Due within a week
    return { 
      status: 'due', 
      reason: 'Due now',
      dueDate: actualDueDate.toISOString().split('T')[0]
    };
  }
  
  return { 
    status: 'not_due', 
    reason: `Due on ${actualDueDate.toISOString().split('T')[0]}`,
    dueDate: actualDueDate.toISOString().split('T')[0]
  };
}

/**
 * Get the list of all vaccine names
 */
export function getAllVaccineNames(): string[] {
  return GHANA_EPI_VACCINES.map(v => v.name);
}

/**
 * Calculate next due vaccines for a child
 */
export function getNextDueVaccines(
  dateOfBirth: string,
  vaccines: { name: string; givenDate?: string; status: string }[],
  referenceDate: Date = new Date(),
  limit: number = 5
): { name: string; eligibility: EligibilityResult }[] {
  const results: { name: string; eligibility: EligibilityResult }[] = [];
  
  for (const definition of GHANA_EPI_VACCINES) {
    const eligibility = checkVaccineEligibility(dateOfBirth, definition.name, vaccines, referenceDate);
    
    if (eligibility.status === 'due' || eligibility.status === 'overdue') {
      results.push({ name: definition.name, eligibility });
    }
    
    if (results.length >= limit) break;
  }
  
  // Sort by overdue first, then by due date
  results.sort((a, b) => {
    if (a.eligibility.status === 'overdue' && b.eligibility.status !== 'overdue') return -1;
    if (b.eligibility.status === 'overdue' && a.eligibility.status !== 'overdue') return 1;
    return (b.eligibility.daysOverdue || 0) - (a.eligibility.daysOverdue || 0);
  });
  
  return results;
}
