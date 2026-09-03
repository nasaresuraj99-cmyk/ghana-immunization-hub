import { useState, useMemo } from "react";
import { FileText, Download, Printer, TrendingUp, PieChart, Users, Syringe, AlertTriangle, CalendarDays, ArrowUpDown, ArrowUp, ArrowDown, FileStack, GitCompare, Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Child, DashboardStats, Defaulter } from "@/types/child";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, differenceInMonths } from "date-fns";
import { FACILITY_CONFIG } from "@/lib/facilityConfig";
import {
  exportSummaryReport,
  exportDetailedReport,
  exportVaccineCoverageReport,
  exportDefaultersReport,
  exportConsolidatedReport,
  exportMonthComparisonReport,
  formatDateDDMMYYYY,
} from "@/lib/pdfExport";
import {
  exportSummaryExcel,
  exportDetailedExcel,
  exportVaccineCoverageExcel,
  exportDefaultersExcel,
} from "@/lib/excelExport";
import { exportMonthlyEpiReturn, EPI_RETURN_MONTHS } from "@/lib/epiReports";
import { useDocumentActivityLog } from "@/hooks/useDocumentActivityLog";
import { useAuth } from "@/hooks/useAuth";

interface ReportingSectionProps {
  stats: DashboardStats;
  children: Child[];
  facilityName?: string;
}

type ReportTab = 'summary' | 'detailed' | 'vaccine' | 'defaulters';

// Ghana EPI Immunization Schedule - EXACT match with useChildren.ts vaccine names
const VACCINE_SCHEDULE: Record<string, { vaccines: string[]; ageInWeeks?: number; ageInMonths?: number }> = {
  'At Birth': { 
    vaccines: ['BCG', 'OPV0', 'Hepatitis B'],
    ageInWeeks: 0
  },
  '6 Weeks': { 
    vaccines: ['OPV1', 'Penta1', 'PCV1', 'Rotavirus1'],
    ageInWeeks: 6
  },
  '10 Weeks': { 
    vaccines: ['OPV2', 'Penta2', 'PCV2', 'Rotavirus2'],
    ageInWeeks: 10
  },
  '14 Weeks': { 
    vaccines: ['OPV3', 'Penta3', 'PCV3', 'Rotavirus3', 'IPV1'],
    ageInWeeks: 14
  },
  '6 Months': { 
    vaccines: ['Malaria1', 'Vitamin A'],
    ageInMonths: 6
  },
  '7 Months': { 
    vaccines: ['Malaria2', 'IPV2'],
    ageInMonths: 7
  },
  '9 Months': { 
    vaccines: ['Malaria3', 'Measles Rubella1', 'Yellow Fever'],
    ageInMonths: 9
  },
  '12 Months': { 
    vaccines: ['Vitamin A'],
    ageInMonths: 12
  },
  '18 Months': { 
    vaccines: ['Malaria4', 'Measles Rubella2', 'Men A', 'LLIN', 'Vitamin A'],
    ageInMonths: 18
  },
  '24 Months': {
    vaccines: ['Vitamin A'],
    ageInMonths: 24
  },
  '30 Months': {
    vaccines: ['Vitamin A'],
    ageInMonths: 30
  },
  '36 Months': {
    vaccines: ['Vitamin A'],
    ageInMonths: 36
  },
  '42 Months': {
    vaccines: ['Vitamin A'],
    ageInMonths: 42
  },
  '48 Months': {
    vaccines: ['Vitamin A'],
    ageInMonths: 48
  },
  '54 Months': {
    vaccines: ['Vitamin A'],
    ageInMonths: 54
  },
  '60 Months': {
    vaccines: ['Vitamin A'],
    ageInMonths: 60
  },
};

// All unique vaccines from the schedule for coverage tracking
const ALL_VACCINES = [
  'BCG', 'OPV0', 'OPV1', 'OPV2', 'OPV3', 'Hepatitis B',
  'Penta1', 'Penta2', 'Penta3', 
  'PCV1', 'PCV2', 'PCV3',
  'Rotavirus1', 'Rotavirus2', 'Rotavirus3',
  'IPV1', 'IPV2',
  'Malaria1', 'Malaria2', 'Malaria3', 'Malaria4',
  'Vitamin A',
  'Measles Rubella1', 'Measles Rubella2',
  'Men A', 'LLIN'
];

// Normalize vaccine name for consistent matching
const normalizeVaccineName = (name: string): string => {
  return name
    .replace(/\s+/g, ' ')
    .replace(/at birth/i, '')
    .replace(/at \d+ (weeks?|months?)/i, '')
    .replace(/\s*\(.*?\)/g, '') // Remove parenthetical like (RTS,S)
    .trim()
    .toLowerCase();
};

// Vaccines that are never counted as missed/overdue (clinical rule)
const OPTIONAL_VACCINES = ['Hepatitis B at Birth'];

const isOptionalVaccine = (name: string): boolean =>
  OPTIONAL_VACCINES.some(o => normalizeVaccineName(o) === normalizeVaccineName(name));

const getStartOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// A dose counts as given when it is completed or has an administration date
const isVaccineGiven = (v: { status?: string; givenDate?: string }): boolean =>
  v.status === 'completed' || !!v.givenDate;

// Overdue is derived from the due date, never trusted from a stale stored status
const isVaccineOverdue = (v: { name: string; status?: string; givenDate?: string; dueDate?: string }): boolean => {
  if (isVaccineGiven(v)) return false;
  if (isOptionalVaccine(v.name)) return false;
  if (!v.dueDate) return false;
  const due = new Date(v.dueDate);
  if (isNaN(due.getTime())) return false;
  due.setHours(0, 0, 0, 0);
  return due < getStartOfToday();
};

// Accurate calendar age in months (no 30-day approximations)
const getChildAgeInMonths = (dateOfBirth: string): number => {
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return -1;
  return differenceInMonths(new Date(), dob);
};

// Get schedule group for a vaccine
const getVaccineScheduleGroup = (vaccineName: string): string | null => {
  const normalized = normalizeVaccineName(vaccineName);
  
  for (const [schedule, data] of Object.entries(VACCINE_SCHEDULE)) {
    for (const v of data.vaccines) {
      const normalizedScheduleVaccine = normalizeVaccineName(v);
      if (normalizedScheduleVaccine === normalized || 
          normalized.includes(normalizedScheduleVaccine) ||
          normalizedScheduleVaccine.includes(normalized)) {
        return schedule;
      }
    }
  }
  return null;
};

// Generate month options for the past 2 years
const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  
  for (let i = 0; i < 24; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  
  return options;
};

// Generate year options
const generateYearOptions = () => {
  const options: { value: string; label: string }[] = [];
  const currentYear = new Date().getFullYear();
  
  for (let year = currentYear; year >= currentYear - 5; year--) {
    options.push({ value: year.toString(), label: year.toString() });
  }
  
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();
const YEAR_OPTIONS = generateYearOptions();

export function ReportingSection({ stats, children, facilityName }: ReportingSectionProps) {
  // Always use FIAN URBAN CHPS for reports
  const reportFacilityName = facilityName || FACILITY_CONFIG.name;
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [periodType, setPeriodType] = useState<'preset' | 'monthly' | 'daterange' | 'yearly' | 'compare'>('preset');
  const [period, setPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0]?.value || '');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [dateRangeStart, setDateRangeStart] = useState<Date | undefined>();
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | undefined>();
  const [selectedVaccineType, setSelectedVaccineType] = useState<string>('all');
  const [compareMonth1, setCompareMonth1] = useState(MONTH_OPTIONS[0]?.value || '');
  const [compareMonth2, setCompareMonth2] = useState(MONTH_OPTIONS[1]?.value || '');
  
  // Document activity logging for audit trail
  const { logDocumentGeneration } = useDocumentActivityLog();
  const { user } = useAuth();

  // Filter only active children (exclude transferred out)
  const activeChildren = useMemo(() => {
    return children.filter(child => 
      child.transferStatus !== 'traveled_out' && 
      child.transferStatus !== 'moved_out'
    );
  }, [children]);

  // Helper function to get date range for current filter settings
  const getDateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (periodType === 'monthly' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else if (periodType === 'daterange' && dateRangeStart && dateRangeEnd) {
      startDate = new Date(dateRangeStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'yearly' && selectedYear) {
      const year = parseInt(selectedYear);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    } else {
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }
    return { startDate, endDate };
  }, [period, periodType, selectedMonth, selectedYear, dateRangeStart, dateRangeEnd]);

  // Filter children registered within the selected period
  const periodFilteredChildren = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    return activeChildren.filter(child => {
      const regDate = new Date(child.registeredAt);
      return regDate >= startDate && regDate <= endDate;
    });
  }, [activeChildren, getDateRange]);

  // Age distribution calculation - ONLY for children registered in selected period
  const ageDistribution = useMemo(() => {
    const groups = {
      '0-11 months': 0,
      '12-23 months': 0,
      '24-59 months': 0,
    };

    periodFilteredChildren.forEach(child => {
      const months = getChildAgeInMonths(child.dateOfBirth);
      // Ignore invalid dates and children outside the 0-59 month EPI window
      if (months < 0 || months > 59) return;

      if (months <= 11) groups['0-11 months']++;
      else if (months <= 23) groups['12-23 months']++;
      else groups['24-59 months']++;
    });

    return groups;
  }, [periodFilteredChildren]);

  // Grouped records by unique child - FILTERED BY PERIOD (vaccination given date within period)
  const groupedChildRecords = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    const childMap = new Map<string, {
      regNo: string;
      childName: string;
      mostRecentVisit: string;
      vaccines: Array<{ name: string; batchNumber: string; status: string; givenDate: string }>;
    }>();

    activeChildren.forEach(child => {
      // Only include vaccines given within the selected period
      const completedVaccines = child.vaccines
        .filter(v => {
          if (!isVaccineGiven(v) || !v.givenDate) return false;
          const givenDate = new Date(v.givenDate);
          return givenDate >= startDate && givenDate <= endDate;
        })
        .map(v => ({
          name: v.name,
          batchNumber: v.batchNumber || 'N/A',
          status: 'Completed',
          givenDate: v.givenDate!
        }))
        .sort((a, b) => new Date(b.givenDate).getTime() - new Date(a.givenDate).getTime());

      if (completedVaccines.length > 0) {
        childMap.set(child.regNo, {
          regNo: child.regNo,
          childName: child.name,
          mostRecentVisit: completedVaccines[0].givenDate,
          vaccines: completedVaccines
        });
      }
    });

    // Convert to array and sort by most recent visit
    return Array.from(childMap.values())
      .sort((a, b) => new Date(b.mostRecentVisit).getTime() - new Date(a.mostRecentVisit).getTime());
  }, [activeChildren, getDateRange]);

  // Detailed records - FILTERED BY PERIOD (only vaccinations given within selected period)
  const detailedRecords = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    const records: Array<{
      date: string;
      childName: string;
      regNo: string;
      vaccine: string;
      batchNumber: string;
      status: string;
    }> = [];

    activeChildren.forEach(child => {
      child.vaccines.forEach(vaccine => {
        if (isVaccineGiven(vaccine) && vaccine.givenDate) {
          const givenDate = new Date(vaccine.givenDate);
          // Only include vaccinations given within the selected period
          if (givenDate >= startDate && givenDate <= endDate) {
            records.push({
              date: vaccine.givenDate,
              childName: child.name,
              regNo: child.regNo,
              vaccine: vaccine.name,
              batchNumber: vaccine.batchNumber || 'N/A',
              status: 'Completed'
            });
          }
        }
      });
    });

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeChildren, getDateRange]);

  // Period-filtered stats for exports
  const periodFilteredStats = useMemo(() => {
    const { startDate, endDate } = getDateRange;
    
    // Count children registered in period
    const totalChildren = periodFilteredChildren.length;
    
    // Count fully immunized (among children registered in period)
    const fullyImmunized = periodFilteredChildren.filter(child => {
      if (child.vaccines.length === 0) return false;
      const required = child.vaccines.filter(v => !isOptionalVaccine(v.name));
      return required.length > 0 && required.every(v => isVaccineGiven(v));
    }).length;
    
    // Count vaccinations given today within period
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    let vaccinatedToday = 0;
    activeChildren.forEach(child => {
      child.vaccines.forEach(v => {
        if (v.givenDate) {
          const givenDate = new Date(v.givenDate);
          if (givenDate >= todayStart && givenDate <= todayEnd) {
            vaccinatedToday++;
          }
        }
      });
    });
    
    // Due soon - within next 7 days
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    let dueSoon = 0;
    periodFilteredChildren.forEach(child => {
      child.vaccines.forEach(v => {
        if (!isVaccineGiven(v) && v.dueDate) {
          const dueDate = new Date(v.dueDate);
          if (!isNaN(dueDate.getTime()) && dueDate >= todayStart && dueDate <= nextWeek) {
            dueSoon++;
          }
        }
      });
    });
    
    // Defaulters in period
    const defaulters = periodFilteredChildren.filter(child => 
      child.vaccines.some(v => isVaccineOverdue(v))
    ).length;
    
    // Coverage rate
    const coverageRate = totalChildren > 0 ? Math.round((fullyImmunized / totalChildren) * 100) : 0;
    
    // Dropout rate (children who started but didn't complete)
    const startedVaccination = periodFilteredChildren.filter(child => 
      child.vaccines.some(v => isVaccineGiven(v))
    ).length;
    const dropoutRate = startedVaccination > 0 
      ? Math.round(((startedVaccination - fullyImmunized) / startedVaccination) * 100) 
      : 0;
    
    return {
      totalChildren,
      fullyImmunized,
      vaccinatedToday,
      dueSoon,
      defaulters,
      coverageRate,
      dropoutRate,
    };
  }, [periodFilteredChildren, activeChildren, getDateRange]);

  // Vaccine coverage statistics grouped by schedule
  const vaccineCoverage = useMemo(() => {
    const coverage: Record<string, { 
      given: number; 
      pending: number; 
      overdue: number;
      eligible: number;
      vaccines: string[];
    }> = {};

    // Initialize coverage for each schedule group
    Object.entries(VACCINE_SCHEDULE).forEach(([schedule, data]) => {
      coverage[schedule] = { 
        given: 0, 
        pending: 0, 
        overdue: 0, 
        eligible: 0,
        vaccines: data.vaccines
      };
    });

    // Track which vaccines have been counted for each child per schedule
    activeChildren.forEach(child => {
      Object.entries(VACCINE_SCHEDULE).forEach(([schedule, scheduleData]) => {
        // Check if child is eligible based on age
        const birthDate = new Date(child.dateOfBirth);
        if (isNaN(birthDate.getTime())) return;
        const today = new Date();
        const ageInWeeks = Math.floor((today.getTime() - birthDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const ageInMonths = differenceInMonths(today, birthDate);
        
        let isEligible = false;
        if (scheduleData.ageInWeeks !== undefined && ageInWeeks >= scheduleData.ageInWeeks) {
          isEligible = true;
        } else if (scheduleData.ageInMonths !== undefined && ageInMonths >= scheduleData.ageInMonths) {
          isEligible = true;
        }
        
        if (!isEligible) return;
        
        coverage[schedule].eligible++;
        
        // Check vaccine status for this schedule group
        const scheduleVaccines = scheduleData.vaccines;
        let allCompleted = true;
        let hasOverdue = false;
        
        scheduleVaccines.forEach(vaccineInSchedule => {
          const matchingVaccine = child.vaccines.find(v => 
            normalizeVaccineName(v.name) === normalizeVaccineName(vaccineInSchedule) ||
            normalizeVaccineName(v.name).includes(normalizeVaccineName(vaccineInSchedule)) ||
            normalizeVaccineName(vaccineInSchedule).includes(normalizeVaccineName(v.name))
          );
          
          if (matchingVaccine) {
            if (!isVaccineGiven(matchingVaccine)) {
              if (isOptionalVaccine(matchingVaccine.name)) return; // optional doses never block coverage
              allCompleted = false;
              if (isVaccineOverdue(matchingVaccine)) {
                hasOverdue = true;
              }
            }
          } else if (!isOptionalVaccine(vaccineInSchedule)) {
            allCompleted = false;
          }
        });
        
        if (allCompleted) {
          coverage[schedule].given++;
        } else if (hasOverdue) {
          coverage[schedule].overdue++;
        } else {
          coverage[schedule].pending++;
        }
      });
    });

    return coverage;
  }, [activeChildren]);

  // Defaulters list (unique children with overdue vaccines)
  const defaultersList = useMemo((): Defaulter[] => {
    const defaulters: Defaulter[] = [];
    const today = new Date();

    activeChildren.forEach(child => {
      const overdueVaccines = child.vaccines.filter(v => isVaccineOverdue(v));
      if (overdueVaccines.length > 0) {
        const earliestOverdue = overdueVaccines.reduce((earliest, v) => 
          new Date(v.dueDate) < new Date(earliest.dueDate) ? v : earliest
        );
        const dueDate = new Date(earliestOverdue.dueDate);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        defaulters.push({
          child,
          missedVaccines: overdueVaccines.map(v => v.name),
          dueDate: earliestOverdue.dueDate,
          daysOverdue,
        });
      }
    });

    return defaulters.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [activeChildren]);

  // Helper function to get data for a specific month
  const getMonthData = (monthValue: string) => {
    const [year, month] = monthValue.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const filteredRecords = groupedChildRecords.filter(r => {
      const visitDate = new Date(r.mostRecentVisit);
      return visitDate >= startDate && visitDate <= endDate;
    });
    
    const filteredDefaulters = defaultersList.filter(d => {
      const dueDate = new Date(d.dueDate);
      return dueDate >= startDate && dueDate <= endDate;
    });
    
    return {
      totalVaccinations: filteredRecords.reduce((sum, r) => sum + r.vaccines.length, 0),
      uniqueChildren: filteredRecords.length,
      records: filteredRecords,
      defaulters: filteredDefaulters.length,
      periodLabel: MONTH_OPTIONS.find(m => m.value === monthValue)?.label || monthValue
    };
  };

  // Get period-filtered data with all filter types
  const getFilteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let periodLabel = '';

    if (periodType === 'monthly' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
      periodLabel = MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label || selectedMonth;
    } else if (periodType === 'daterange' && dateRangeStart && dateRangeEnd) {
      startDate = new Date(dateRangeStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999);
      periodLabel = `${format(dateRangeStart, 'dd/MM/yyyy')} - ${format(dateRangeEnd, 'dd/MM/yyyy')}`;
    } else if (periodType === 'yearly' && selectedYear) {
      const year = parseInt(selectedYear);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
      periodLabel = `Year ${selectedYear}`;
    } else if (periodType === 'compare') {
      const [year, month] = compareMonth1.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
      periodLabel = `${MONTH_OPTIONS.find(m => m.value === compareMonth1)?.label || compareMonth1} vs ${MONTH_OPTIONS.find(m => m.value === compareMonth2)?.label || compareMonth2}`;
    } else {
      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          periodLabel = 'Today';
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          periodLabel = 'This Week';
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = 'This Month';
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          periodLabel = 'This Quarter';
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          periodLabel = 'This Year';
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = 'This Month';
      }
    }

    // Filter records by date
    let filteredRecords = groupedChildRecords.filter(r => {
      const visitDate = new Date(r.mostRecentVisit);
      return visitDate >= startDate && visitDate <= endDate;
    });

    // Apply vaccine type filter if selected
    if (selectedVaccineType && selectedVaccineType !== 'all') {
      filteredRecords = filteredRecords.map(record => ({
        ...record,
        vaccines: record.vaccines.filter(v => 
          normalizeVaccineName(v.name).includes(normalizeVaccineName(selectedVaccineType)) ||
          normalizeVaccineName(selectedVaccineType).includes(normalizeVaccineName(v.name.split(' at ')[0]))
        )
      })).filter(record => record.vaccines.length > 0);
    }
    
    return {
      totalVaccinations: filteredRecords.reduce((sum, r) => sum + r.vaccines.length, 0),
      uniqueChildren: filteredRecords.length,
      records: filteredRecords,
      periodLabel,
      startDate,
      endDate
    };
  }, [period, periodType, selectedMonth, selectedYear, dateRangeStart, dateRangeEnd, selectedVaccineType, compareMonth1, compareMonth2, groupedChildRecords]);

  // Clear all filters
  const clearFilters = () => {
    setPeriodType('preset');
    setPeriod('month');
    setSelectedVaccineType('all');
    setDateRangeStart(undefined);
    setDateRangeEnd(undefined);
  };

  // Check if any filters are active
  const hasActiveFilters = periodType !== 'preset' || selectedVaccineType !== 'all';

  // Comparison data for side-by-side view
  const comparisonData = useMemo(() => {
    if (periodType !== 'compare') return null;
    return {
      month1: getMonthData(compareMonth1),
      month2: getMonthData(compareMonth2)
    };
  }, [periodType, compareMonth1, compareMonth2, groupedChildRecords, defaultersList]);

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'Summary', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'detailed', label: 'Detailed', icon: <FileText className="w-4 h-4" /> },
    { id: 'vaccine', label: 'Vaccine', icon: <Syringe className="w-4 h-4" /> },
    { id: 'defaulters', label: 'Defaulters Report', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  const handleExportPDF = async () => {
    try {
      const periodLabel = getFilteredData.periodLabel;
      const options = { 
        facilityName: reportFacilityName, 
        reportDate: formatDateDDMMYYYY(new Date()),
        periodLabel
      };
      
      let reportName = '';
      switch (activeTab) {
        case "summary":
          exportSummaryReport(periodFilteredStats, ageDistribution, periodLabel, options);
          reportName = 'Summary Report';
          break;
        case "detailed":
          exportDetailedReport(detailedRecords, options);
          reportName = 'Detailed Report';
          break;
        case "vaccine":
          exportVaccineCoverageReport(vaccineCoverage, options);
          reportName = 'Vaccine Coverage Report';
          break;
        case "defaulters":
          exportDefaultersReport(defaultersList, options);
          reportName = 'Defaulters Report';
          break;
      }
      
      // Log the document generation for audit trail
      if (user) {
        await logDocumentGeneration({
          userId: user.uid,
          userName: user.name || user.email || 'Unknown',
          documentType: 'report',
          documentName: reportName,
          reportType: activeTab,
          format: 'pdf',
          periodLabel,
        });
      }
      
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  const handleExportConsolidated = async () => {
    try {
      const periodLabel = getFilteredData.periodLabel;
      exportConsolidatedReport(
        {
          stats: periodFilteredStats,
          ageDistribution,
          detailedRecords,
          vaccineCoverage,
          defaulters: defaultersList,
        },
        { 
          facilityName: reportFacilityName, 
          reportDate: formatDateDDMMYYYY(new Date()),
          periodLabel
        }
      );
      
      // Log the document generation for audit trail
      if (user) {
        await logDocumentGeneration({
          userId: user.uid,
          userName: user.name || user.email || 'Unknown',
          documentType: 'report',
          documentName: 'Consolidated Report',
          reportType: 'consolidated',
          format: 'pdf',
          periodLabel,
        });
      }
      
      toast.success("Consolidated PDF exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export consolidated PDF");
    }
  };

  const handleExportMonthlyReturn = async () => {
    try {
      const now = new Date();
      exportMonthlyEpiReturn(children, now.getFullYear(), now.getMonth());
      if (user) {
        await logDocumentGeneration({
          userId: user.uid,
          userName: user.name || user.email || 'Unknown',
          documentType: 'report',
          documentName: `Monthly EPI Return - ${EPI_RETURN_MONTHS[now.getMonth()]} ${now.getFullYear()}`,
          reportType: 'monthly_epi_return',
          format: 'pdf',
        });
      }
      toast.success("Monthly EPI Return exported!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Monthly EPI Return");
    }
  };



  const handleExportComparisonPDF = async () => {
    if (!comparisonData) {
      toast.error("Please select two months to compare");
      return;
    }
    try {
      const periodLabel = `${comparisonData.month1.periodLabel} vs ${comparisonData.month2.periodLabel}`;
      exportMonthComparisonReport(comparisonData, { 
        facilityName: reportFacilityName, 
        reportDate: formatDateDDMMYYYY(new Date()) 
      });
      
      // Log the document generation for audit trail
      if (user) {
        await logDocumentGeneration({
          userId: user.uid,
          userName: user.name || user.email || 'Unknown',
          documentType: 'report',
          documentName: 'Month Comparison Report',
          reportType: 'month_comparison',
          format: 'pdf',
          periodLabel,
        });
      }
      
      toast.success("Comparison PDF exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export comparison PDF");
    }
  };

  const handleExportExcel = async () => {
    try {
      const periodLabel = getFilteredData.periodLabel;
      let reportName = '';
      
      switch (activeTab) {
        case "summary":
          exportSummaryExcel(periodFilteredStats, ageDistribution, getFilteredData.periodLabel);
          reportName = 'Summary Report';
          break;
        case "detailed":
          exportDetailedExcel(detailedRecords);
          reportName = 'Detailed Report';
          break;
        case "vaccine":
          exportVaccineCoverageExcel(vaccineCoverage);
          reportName = 'Vaccine Coverage Report';
          break;
        case "defaulters":
          exportDefaultersExcel(defaultersList);
          reportName = 'Defaulters Report';
          break;
      }
      
      // Log the document generation for audit trail
      if (user) {
        await logDocumentGeneration({
          userId: user.uid,
          userName: user.name || user.email || 'Unknown',
          documentType: 'data_export',
          documentName: reportName,
          reportType: activeTab,
          format: 'csv',
          periodLabel,
        });
      }
      
      toast.success("Excel (CSV) exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-card rounded-lg p-6 shadow-elevation-1">
        <h2 className="text-xl font-bold text-foreground mb-6">
          📈 Reports & Analytics
        </h2>

        <div className="flex border-b border-border mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Advanced Filter Section */}
            <div className="bg-muted/30 rounded-lg p-4 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Report Filters</h3>
                </div>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Filter Type */}
                <div className="space-y-2">
                  <Label>Filter Type</Label>
                  <Select value={periodType} onValueChange={(v: 'preset' | 'monthly' | 'daterange' | 'yearly' | 'compare') => setPeriodType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preset">Quick Range</SelectItem>
                      <SelectItem value="monthly">By Month</SelectItem>
                      <SelectItem value="daterange">Date Range</SelectItem>
                      <SelectItem value="yearly">By Year</SelectItem>
                      <SelectItem value="compare">Compare Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Quick Range Options */}
                {periodType === 'preset' && (
                  <div className="space-y-2">
                    <Label>Quick Range</Label>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                        <SelectItem value="quarter">This Quarter</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Monthly Select */}
                {periodType === 'monthly' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      Select Month
                    </Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {MONTH_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Date Range */}
                {periodType === 'daterange' && (
                  <>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateRangeStart && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {dateRangeStart ? format(dateRangeStart, "dd/MM/yyyy") : "Pick start date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dateRangeStart}
                            onSelect={setDateRangeStart}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateRangeEnd && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {dateRangeEnd ? format(dateRangeEnd, "dd/MM/yyyy") : "Pick end date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={dateRangeEnd}
                            onSelect={setDateRangeEnd}
                            disabled={(date) => date > new Date() || (dateRangeStart && date < dateRangeStart)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                )}
                
                {/* Yearly Select */}
                {periodType === 'yearly' && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Select Year
                    </Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year..." />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Compare Months */}
                {periodType === 'compare' && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" />
                        First Month
                      </Label>
                      <Select value={compareMonth1} onValueChange={setCompareMonth1}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {MONTH_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4" />
                        Compare With
                      </Label>
                      <Select value={compareMonth2} onValueChange={setCompareMonth2}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {MONTH_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {/* Vaccine Type Filter */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Syringe className="w-4 h-4" />
                    Vaccine Type
                  </Label>
                  <Select value={selectedVaccineType} onValueChange={setSelectedVaccineType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All vaccines" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value="all">All Vaccines</SelectItem>
                      {ALL_VACCINES.map(vaccine => (
                        <SelectItem key={vaccine} value={vaccine}>
                          {vaccine}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Active Filter Indicator */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  <Badge variant="secondary" className="text-sm py-1 px-3">
                    <CalendarDays className="w-3 h-3 mr-1" />
                    {getFilteredData.periodLabel}
                  </Badge>
                  {selectedVaccineType !== 'all' && (
                    <Badge variant="secondary" className="text-sm py-1 px-3">
                      <Syringe className="w-3 h-3 mr-1" />
                      {selectedVaccineType}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Month Comparison View */}
            {periodType === 'compare' && comparisonData && (
              <div className="bg-muted/20 rounded-lg p-6 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <ArrowUpDown className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Month-to-Month Comparison</h3>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Month 1 */}
                  <div className="bg-background rounded-lg p-4 border">
                    <h4 className="font-medium text-primary mb-3">{comparisonData.month1.periodLabel}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unique Children</span>
                        <span className="font-bold">{comparisonData.month1.uniqueChildren}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Vaccinations</span>
                        <span className="font-bold">{comparisonData.month1.totalVaccinations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Defaulters</span>
                        <span className="font-bold text-destructive">{comparisonData.month1.defaulters}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Month 2 */}
                  <div className="bg-background rounded-lg p-4 border">
                    <h4 className="font-medium text-primary mb-3">{comparisonData.month2.periodLabel}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unique Children</span>
                        <span className="font-bold">{comparisonData.month2.uniqueChildren}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Vaccinations</span>
                        <span className="font-bold">{comparisonData.month2.totalVaccinations}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Defaulters</span>
                        <span className="font-bold text-destructive">{comparisonData.month2.defaulters}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Change Indicators */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-3">Change Summary</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(() => {
                      const childrenDiff = comparisonData.month1.uniqueChildren - comparisonData.month2.uniqueChildren;
                      const vaccDiff = comparisonData.month1.totalVaccinations - comparisonData.month2.totalVaccinations;
                      const defaulterDiff = comparisonData.month1.defaulters - comparisonData.month2.defaulters;
                      
                      return (
                        <>
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            {childrenDiff > 0 ? (
                              <ArrowUp className="w-4 h-4 text-green-600" />
                            ) : childrenDiff < 0 ? (
                              <ArrowDown className="w-4 h-4 text-red-600" />
                            ) : null}
                            <span className="text-sm">Children: {childrenDiff > 0 ? '+' : ''}{childrenDiff}</span>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            {vaccDiff > 0 ? (
                              <ArrowUp className="w-4 h-4 text-green-600" />
                            ) : vaccDiff < 0 ? (
                              <ArrowDown className="w-4 h-4 text-red-600" />
                            ) : null}
                            <span className="text-sm">Vaccinations: {vaccDiff > 0 ? '+' : ''}{vaccDiff}</span>
                          </div>
                          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                            {defaulterDiff < 0 ? (
                              <ArrowUp className="w-4 h-4 text-green-600" />
                            ) : defaulterDiff > 0 ? (
                              <ArrowDown className="w-4 h-4 text-red-600" />
                            ) : null}
                            <span className="text-sm">Defaulters: {defaulterDiff > 0 ? '+' : ''}{defaulterDiff}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="Unique Children"
                value={getFilteredData.uniqueChildren}
                variant="default"
              />
              <StatCard
                title="Total Vaccinations"
                value={getFilteredData.totalVaccinations}
                variant="default"
              />
              <StatCard
                title="Average Coverage"
                value={`${stats.coverageRate}%`}
                variant="success"
              />
              <StatCard
                title="Defaulters"
                value={defaultersList.length}
                variant="danger"
              />
              <StatCard
                title="Completion Rate"
                value={`${Math.round((stats.fullyImmunized / Math.max(activeChildren.length, 1)) * 100)}%`}
                variant="info"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-muted/30 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Vaccination Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-background rounded-lg">
                    <span>Active Children</span>
                    <span className="font-bold">{activeChildren.length}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-background rounded-lg">
                    <span>Total Registered</span>
                    <span className="font-bold text-muted-foreground">{children.length}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-background rounded-lg">
                    <span>Fully Immunized</span>
                    <span className="font-bold text-ghs-green">{stats.fullyImmunized}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-background rounded-lg">
                    <span>Vaccinated Today</span>
                    <span className="font-bold text-primary">{stats.vaccinatedToday}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-background rounded-lg">
                    <span>Due This Week</span>
                    <span className="font-bold text-amber-600">{stats.dueSoon}</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Age Distribution</h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(ageDistribution).map(([group, count]) => (
                    <div key={group}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{group}</span>
                        <span>{count} children</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500"
                          style={{ 
                            width: `${activeChildren.length > 0 ? (count / activeChildren.length) * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="secondary" onClick={handleExportConsolidated}>
                <FileStack className="w-4 h-4 mr-2" />
                Export All Reports (PDF)
              </Button>
              <Button variant="outline" onClick={handleExportMonthlyReturn}>
                <CalendarDays className="w-4 h-4 mr-2" />
                Monthly EPI Return
              </Button>
              {periodType === 'compare' && comparisonData && (
                <Button variant="outline" onClick={handleExportComparisonPDF} className="border-primary text-primary">
                  <GitCompare className="w-4 h-4 mr-2" />
                  Export Comparison PDF
                </Button>
              )}
              <Button variant="secondary" onClick={handleExportExcel}>
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        )}

        {/* Detailed Tab - Grouped by unique child */}
        {activeTab === 'detailed' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Individual Vaccination Records</h3>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{groupedChildRecords.length} unique children</Badge>
                <Badge variant="outline">{detailedRecords.length} total vaccines</Badge>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="p-3 text-left font-semibold">Last Visit</th>
                    <th className="p-3 text-left font-semibold">Reg No</th>
                    <th className="p-3 text-left font-semibold">Child Name</th>
                    <th className="p-3 text-left font-semibold">Vaccines Received</th>
                    <th className="p-3 text-left font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedChildRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No vaccination records found
                      </td>
                    </tr>
                  ) : (
                    groupedChildRecords.slice(0, 50).map((record, idx) => (
                      <tr key={record.regNo} className="border-b border-border hover:bg-muted/50">
                        <td className="p-3">{formatDateDDMMYYYY(record.mostRecentVisit)}</td>
                        <td className="p-3 font-mono text-xs">{record.regNo}</td>
                        <td className="p-3 font-medium">{record.childName}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {record.vaccines.slice(0, 4).map((v, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {v.name.split(' at ')[0]}
                              </Badge>
                            ))}
                            {record.vaccines.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{record.vaccines.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="default" className="bg-ghs-green">
                            {record.vaccines.length}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {groupedChildRecords.length > 50 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing 50 of {groupedChildRecords.length} children
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="secondary" onClick={handleExportExcel}>
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        )}

        {/* Vaccine Coverage Tab */}
        {activeTab === 'vaccine' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Vaccine Coverage by Type</h3>
              </div>
              <Badge variant="secondary">{activeChildren.length} eligible children</Badge>
            </div>

            {/* Schedule-based grouping info */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium mb-3 text-sm">Ghana EPI Schedule Reference</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                {Object.entries(VACCINE_SCHEDULE).map(([schedule, data]) => (
                  <div key={schedule} className="p-2 bg-background rounded">
                    <span className="font-medium text-primary">{schedule}</span>
                    <p className="text-muted-foreground mt-1">{data.vaccines.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {Object.entries(VACCINE_SCHEDULE).map(([schedule, scheduleData]) => {
                const data = vaccineCoverage[schedule];
                if (!data) return null;
                const eligible = data.eligible || 0;
                const coveragePercent = eligible > 0 ? Math.round((data.given / eligible) * 100) : 0;

                return (
                  <div key={schedule} className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{schedule}</h4>
                        <span className="text-xs text-muted-foreground">
                          {scheduleData.vaccines.join(', ')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-primary">{coveragePercent}%</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({data.given}/{eligible})
                        </span>
                      </div>
                    </div>
                    
                    <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full bg-ghs-green transition-all duration-500"
                        style={{ width: `${coveragePercent}%` }}
                      />
                    </div>
                    
                    <div className="flex gap-4 text-xs flex-wrap">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-ghs-green" />
                        Completed: {data.given}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Pending: {data.pending}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                        Overdue: {data.overdue}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                        Eligible: {eligible}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="secondary" onClick={handleExportExcel}>
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        )}

        {/* Defaulters Report Tab */}
        {activeTab === 'defaulters' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h3 className="font-semibold">Defaulters Analysis Report</h3>
              </div>
              <Badge variant="destructive">{defaultersList.length} defaulters</Badge>
            </div>

            {/* Defaulters Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/20">
                <p className="text-sm text-muted-foreground">Critical (&gt;30 days)</p>
                <p className="text-2xl font-bold text-destructive">
                  {defaultersList.filter(d => d.daysOverdue > 30).length}
                </p>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
                <p className="text-sm text-muted-foreground">Moderate (14-30 days)</p>
                <p className="text-2xl font-bold text-amber-600">
                  {defaultersList.filter(d => d.daysOverdue >= 14 && d.daysOverdue <= 30).length}
                </p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <p className="text-sm text-muted-foreground">Recent (&lt;14 days)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {defaultersList.filter(d => d.daysOverdue < 14).length}
                </p>
              </div>
            </div>

            {/* Defaulters by Schedule Group */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium mb-3">Defaulters by Schedule Group</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.keys(VACCINE_SCHEDULE).map(schedule => {
                  const scheduleVaccines = VACCINE_SCHEDULE[schedule].vaccines;
                  const count = defaultersList.filter(d => 
                    d.missedVaccines.some(missed => 
                      scheduleVaccines.some(sv => 
                        normalizeVaccineName(missed).includes(normalizeVaccineName(sv)) ||
                        normalizeVaccineName(sv).includes(normalizeVaccineName(missed))
                      )
                    )
                  ).length;
                  if (count === 0) return null;
                  return (
                    <div key={schedule} className="flex justify-between p-2 bg-background rounded">
                      <span className="text-sm">{schedule}</span>
                      <Badge variant="destructive" className="text-xs">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Defaulters Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="bg-primary text-primary-foreground">
                    <th className="p-3 text-left font-semibold">#</th>
                    <th className="p-3 text-left font-semibold">Child Name</th>
                    <th className="p-3 text-left font-semibold">Caregiver</th>
                    <th className="p-3 text-left font-semibold">Contact</th>
                    <th className="p-3 text-left font-semibold">Missed Vaccine</th>
                    <th className="p-3 text-left font-semibold">Due Date</th>
                    <th className="p-3 text-left font-semibold">Days Overdue</th>
                    <th className="p-3 text-left font-semibold">Community</th>
                  </tr>
                </thead>
                <tbody>
                  {defaultersList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">
                        <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        No defaulters found. Great job!
                      </td>
                    </tr>
                  ) : (
                    defaultersList.slice(0, 100).map((defaulter, idx) => (
                      <tr key={`${defaulter.child.id}-${idx}`} className="border-b border-border hover:bg-muted/50">
                        <td className="p-3">{idx + 1}</td>
                        <td className="p-3 font-medium">{defaulter.child.name}</td>
                        <td className="p-3">{defaulter.child.motherName}</td>
                        <td className="p-3">{defaulter.child.telephoneAddress || 'N/A'}</td>
                        <td className="p-3 text-xs">{defaulter.missedVaccines.slice(0, 2).join(', ')}{defaulter.missedVaccines.length > 2 ? ` +${defaulter.missedVaccines.length - 2}` : ''}</td>
                        <td className="p-3">{formatDateDDMMYYYY(defaulter.dueDate)}</td>
                        <td className="p-3">
                          <Badge 
                            variant={defaulter.daysOverdue > 30 ? 'destructive' : defaulter.daysOverdue > 14 ? 'default' : 'secondary'}
                            className={defaulter.daysOverdue > 14 && defaulter.daysOverdue <= 30 ? 'bg-amber-500' : ''}
                          >
                            {defaulter.daysOverdue} days
                          </Badge>
                        </td>
                        <td className="p-3">{defaulter.child.community || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="secondary" onClick={handleExportExcel}>
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
