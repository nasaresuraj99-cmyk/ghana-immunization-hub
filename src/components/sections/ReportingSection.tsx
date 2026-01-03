import { useState, useMemo } from "react";
import { FileText, Download, Printer, TrendingUp, PieChart, Users, Syringe, AlertTriangle, CalendarDays, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Child, DashboardStats, Defaulter } from "@/types/child";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  exportSummaryReport,
  exportDetailedReport,
  exportVaccineCoverageReport,
  exportDefaultersReport,
} from "@/lib/pdfExport";
import {
  exportSummaryExcel,
  exportDetailedExcel,
  exportVaccineCoverageExcel,
  exportDefaultersExcel,
} from "@/lib/excelExport";

interface ReportingSectionProps {
  stats: DashboardStats;
  children: Child[];
  facilityName?: string;
}

type ReportTab = 'summary' | 'detailed' | 'vaccine' | 'defaulters';

// Ghana EPI Immunization Schedule - EXACT match with official schedule
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
    vaccines: ['Malaria1 (RTS,S)', 'Vitamin A'],
    ageInMonths: 6
  },
  '7 Months': { 
    vaccines: ['Malaria2 (RTS,S)', 'IPV2'],
    ageInMonths: 7
  },
  '9 Months': { 
    vaccines: ['Malaria3 (RTS,S)', 'Measles Rubella 1'],
    ageInMonths: 9
  },
  '12 Months': { 
    vaccines: ['Vitamin A'],
    ageInMonths: 12
  },
  '18 Months': { 
    vaccines: ['Malaria4 (RTS,S)', 'Measles Rubella 2', 'Men A'],
    ageInMonths: 18
  },
};

// All unique vaccines from the schedule for coverage tracking
const ALL_VACCINES = [
  'BCG', 'OPV0', 'OPV1', 'OPV2', 'OPV3', 'Hepatitis B',
  'Penta1', 'Penta2', 'Penta3', 
  'PCV1', 'PCV2', 'PCV3',
  'Rotavirus1', 'Rotavirus2', 'Rotavirus3',
  'IPV1', 'IPV2',
  'Malaria1 (RTS,S)', 'Malaria2 (RTS,S)', 'Malaria3 (RTS,S)', 'Malaria4 (RTS,S)',
  'Vitamin A',
  'Measles Rubella 1', 'Measles Rubella 2',
  'Men A'
];

// Normalize vaccine name for consistent matching
const normalizeVaccineName = (name: string): string => {
  return name
    .replace(/\s+/g, ' ')
    .replace(/at birth/i, '')
    .replace(/at \d+ (weeks?|months?)/i, '')
    .trim()
    .toLowerCase();
};

// Get schedule group for a vaccine
const getVaccineScheduleGroup = (vaccineName: string): string | null => {
  const normalized = normalizeVaccineName(vaccineName);
  
  for (const [schedule, data] of Object.entries(VACCINE_SCHEDULE)) {
    for (const v of data.vaccines) {
      if (normalizeVaccineName(v) === normalized || 
          normalized.includes(normalizeVaccineName(v)) ||
          normalizeVaccineName(v).includes(normalized)) {
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

const MONTH_OPTIONS = generateMonthOptions();

export function ReportingSection({ stats, children, facilityName = "Health Facility" }: ReportingSectionProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [periodType, setPeriodType] = useState<'preset' | 'monthly' | 'compare'>('preset');
  const [period, setPeriod] = useState('month');
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0]?.value || '');
  const [compareMonth1, setCompareMonth1] = useState(MONTH_OPTIONS[0]?.value || '');
  const [compareMonth2, setCompareMonth2] = useState(MONTH_OPTIONS[1]?.value || '');

  // Filter only active children (exclude transferred out)
  const activeChildren = useMemo(() => {
    return children.filter(child => 
      child.transferStatus !== 'traveled_out' && 
      child.transferStatus !== 'moved_out'
    );
  }, [children]);

  // Age distribution calculation
  const ageDistribution = useMemo(() => {
    const groups = {
      '0-6 months': 0,
      '7-12 months': 0,
      '13-24 months': 0,
      '25-36 months': 0,
      '37-48 months': 0,
      '49-59 months': 0,
    };

    activeChildren.forEach(child => {
      const birthDate = new Date(child.dateOfBirth);
      const today = new Date();
      const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                     (today.getMonth() - birthDate.getMonth());

      if (months <= 6) groups['0-6 months']++;
      else if (months <= 12) groups['7-12 months']++;
      else if (months <= 24) groups['13-24 months']++;
      else if (months <= 36) groups['25-36 months']++;
      else if (months <= 48) groups['37-48 months']++;
      else groups['49-59 months']++;
    });

    return groups;
  }, [activeChildren]);

  // Grouped records by unique child (each child appears once)
  const groupedChildRecords = useMemo(() => {
    const childMap = new Map<string, {
      regNo: string;
      childName: string;
      mostRecentVisit: string;
      vaccines: Array<{ name: string; batchNumber: string; status: string; givenDate: string }>;
    }>();

    activeChildren.forEach(child => {
      const completedVaccines = child.vaccines
        .filter(v => v.status === 'completed' && v.givenDate)
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
  }, [activeChildren]);

  // Legacy detailed records (for backward compatibility with exports)
  const detailedRecords = useMemo(() => {
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
        if (vaccine.status === 'completed' && vaccine.givenDate) {
          records.push({
            date: vaccine.givenDate,
            childName: child.name,
            regNo: child.regNo,
            vaccine: vaccine.name,
            batchNumber: vaccine.batchNumber || 'N/A',
            status: 'Completed'
          });
        }
      });
    });

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeChildren]);

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
        const today = new Date();
        const ageInWeeks = Math.floor((today.getTime() - birthDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const ageInMonths = Math.floor((today.getTime() - birthDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
        
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
            if (matchingVaccine.status !== 'completed') {
              allCompleted = false;
              if (matchingVaccine.status === 'overdue') {
                hasOverdue = true;
              }
            }
          } else {
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
      const overdueVaccines = child.vaccines.filter(v => v.status === 'overdue');
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

  // Get period-filtered data with monthly support
  const getFilteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (periodType === 'monthly' && selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else if (periodType === 'compare') {
      // For compare mode, use the first comparison month
      const [year, month] = compareMonth1.split('-').map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
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

    const filteredRecords = groupedChildRecords.filter(r => {
      const visitDate = new Date(r.mostRecentVisit);
      return visitDate >= startDate && visitDate <= endDate;
    });
    
    return {
      totalVaccinations: filteredRecords.reduce((sum, r) => sum + r.vaccines.length, 0),
      uniqueChildren: filteredRecords.length,
      records: filteredRecords,
      periodLabel: periodType === 'monthly' && selectedMonth 
        ? MONTH_OPTIONS.find(m => m.value === selectedMonth)?.label || selectedMonth
        : periodType === 'compare'
        ? `${MONTH_OPTIONS.find(m => m.value === compareMonth1)?.label || compareMonth1} vs ${MONTH_OPTIONS.find(m => m.value === compareMonth2)?.label || compareMonth2}`
        : period === 'today' ? 'Today' 
        : period === 'week' ? 'This Week'
        : period === 'month' ? 'This Month'
        : period === 'quarter' ? 'This Quarter'
        : 'This Year'
    };
  }, [period, periodType, selectedMonth, compareMonth1, compareMonth2, groupedChildRecords]);

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

  const handleExportPDF = () => {
    try {
      const periodLabel = getFilteredData.periodLabel;
      const options = { 
        facilityName, 
        reportDate: new Date().toLocaleDateString(),
        periodLabel
      };
      
      switch (activeTab) {
        case "summary":
          exportSummaryReport(stats, ageDistribution, periodLabel, options);
          break;
        case "detailed":
          exportDetailedReport(detailedRecords, options);
          break;
        case "vaccine":
          exportVaccineCoverageReport(vaccineCoverage, options);
          break;
        case "defaulters":
          exportDefaultersReport(defaultersList, options);
          break;
      }
      
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF");
    }
  };

  const handleExportExcel = () => {
    try {
      switch (activeTab) {
        case "summary":
          exportSummaryExcel(stats, ageDistribution, period);
          break;
        case "detailed":
          exportDetailedExcel(detailedRecords);
          break;
        case "vaccine":
          exportVaccineCoverageExcel(vaccineCoverage);
          break;
        case "defaulters":
          exportDefaultersExcel(defaultersList);
          break;
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
            {/* Period Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={periodType} onValueChange={(v: 'preset' | 'monthly' | 'compare') => setPeriodType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preset">Quick Range</SelectItem>
                    <SelectItem value="monthly">Monthly Report</SelectItem>
                    <SelectItem value="compare">Compare Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {periodType === 'preset' && (
                <div className="space-y-2">
                  <Label>Date Range</Label>
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
              
              {(periodType === 'monthly' || periodType === 'compare') && (
                <div className="flex items-end">
                  <Badge variant="secondary" className="text-sm py-2 px-4">
                    <CalendarDays className="w-4 h-4 mr-2" />
                    {getFilteredData.periodLabel}
                  </Badge>
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
                        <td className="p-3">{new Date(record.mostRecentVisit).toLocaleDateString()}</td>
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
                    <th className="p-3 text-left font-semibold">Mother</th>
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
                        <td className="p-3">{new Date(defaulter.dueDate).toLocaleDateString()}</td>
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
