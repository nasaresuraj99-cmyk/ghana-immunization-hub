import { differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from "date-fns";

export function calculateExactAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  
  const totalDays = differenceInDays(today, dob);
  const totalWeeks = differenceInWeeks(today, dob);
  const totalMonths = differenceInMonths(today, dob);
  const years = differenceInYears(today, dob);
  
  // Less than 7 days - show days
  if (totalDays < 7) {
    return totalDays === 0 ? "Born today" : totalDays === 1 ? "1 day old" : `${totalDays} days old`;
  }
  
  // Less than 4 weeks - show weeks and days
  if (totalWeeks < 4) {
    const remainingDays = totalDays - (totalWeeks * 7);
    if (remainingDays === 0) {
      return totalWeeks === 1 ? "1 week old" : `${totalWeeks} weeks old`;
    }
    return `${totalWeeks} week${totalWeeks > 1 ? 's' : ''}, ${remainingDays} day${remainingDays > 1 ? 's' : ''} old`;
  }
  
  // Less than 12 months - show months and weeks
  if (totalMonths < 12) {
    const monthStart = new Date(dob);
    monthStart.setMonth(monthStart.getMonth() + totalMonths);
    const remainingWeeks = differenceInWeeks(today, monthStart);
    
    if (remainingWeeks === 0) {
      return totalMonths === 1 ? "1 month old" : `${totalMonths} months old`;
    }
    return `${totalMonths} month${totalMonths > 1 ? 's' : ''}, ${remainingWeeks} week${remainingWeeks > 1 ? 's' : ''} old`;
  }
  
  // 12 months or more - show years and months
  const remainingMonths = totalMonths - (years * 12);
  if (remainingMonths === 0) {
    return years === 1 ? "1 year old" : `${years} years old`;
  }
  return `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''} old`;
}

export function isVaccineDue(dueDate: string): boolean {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due <= today;
}
