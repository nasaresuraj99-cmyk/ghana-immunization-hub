import { useState, useMemo } from "react";
import { FileText, Download, Printer, TrendingUp, PieChart, Users, Syringe, AlertTriangle } from "lucide-react";
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
}

type ReportTab = 'summary' | 'detailed' | 'vaccine' | 'defaulters';

// EPI Immunization Schedule mapping
const VACCINE_SCHEDULE = {
  'At Birth': ['BCG', 'OPV 0', 'Hepatitis B'],
  '6 weeks': ['OPV 1', 'Penta 1', 'PCV 1', 'Rotavirus 1'],
  '10 weeks': ['OPV 2', 'Penta 2', 'PCV 2', 'Rotavirus 2'],
  '14 weeks': ['OPV 3', 'Penta 3', 'PCV 3', 'Rotavirus 3', 'IPV'],
  '6 months': ['Vitamin A 1'],
  '9 months': ['Measles Rubella 1', 'Yellow Fever'],
  '12 months': ['Vitamin A 2', 'Men A'],
  '18 months': ['Measles Rubella 2'],
};

// Normalized vaccine types for consistent matching
const VACCINE_TYPES = [
  'BCG', 'OPV', 'Hepatitis B', 'Penta', 'PCV', 'Rotavirus', 
  'IPV', 'Vitamin A', 'Measles Rubella', 'Yellow Fever', 'Men A'
];

// Normalize vaccine name for consistent matching
const normalizeVaccineName = (name: string): string => {
  return name
    .replace(/\s+/g, ' ')
    .replace(/at birth/i, '')
    .replace(/at \d+ (weeks?|months?)/i, '')
    .trim();
};

// Get vaccine type from full name
const getVaccineType = (vaccineName: string): string | null => {
  const normalized = normalizeVaccineName(vaccineName).toLowerCase();
  for (const type of VACCINE_TYPES) {
    if (normalized.includes(type.toLowerCase())) {
      return type;
    }
  }
  return null;
};

export function ReportingSection({ stats, children }: ReportingSectionProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [period, setPeriod] = useState('month');

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

  // Vaccine coverage statistics with proper schedule mapping
  const vaccineCoverage = useMemo(() => {
    const coverage: Record<string, { 
      given: number; 
      pending: number; 
      overdue: number;
      eligible: number;
      scheduleGroup: string;
    }> = {};

    // Initialize coverage for each vaccine type
    VACCINE_TYPES.forEach(type => {
      coverage[type] = { given: 0, pending: 0, overdue: 0, eligible: 0, scheduleGroup: '' };
    });

    // Map schedule groups to vaccine types
    Object.entries(VACCINE_SCHEDULE).forEach(([schedule, vaccines]) => {
      vaccines.forEach(vaccine => {
        const type = getVaccineType(vaccine);
        if (type && coverage[type]) {
          coverage[type].scheduleGroup = schedule;
        }
      });
    });

    // Track unique children per vaccine type to avoid duplicates
    const childVaccineTracker: Record<string, Set<string>> = {};
    VACCINE_TYPES.forEach(type => {
      childVaccineTracker[type] = new Set();
    });

    activeChildren.forEach(child => {
      child.vaccines.forEach(vaccine => {
        const matchedType = getVaccineType(vaccine.name);
        if (matchedType && coverage[matchedType]) {
          // Only count each child once per vaccine type
          if (!childVaccineTracker[matchedType].has(child.regNo)) {
            childVaccineTracker[matchedType].add(child.regNo);
            coverage[matchedType].eligible++;
            
            if (vaccine.status === 'completed') {
              coverage[matchedType].given++;
            } else if (vaccine.status === 'overdue') {
              coverage[matchedType].overdue++;
            } else {
              coverage[matchedType].pending++;
            }
          }
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

  // Get period-filtered data
  const getFilteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

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

    const filteredRecords = groupedChildRecords.filter(r => new Date(r.mostRecentVisit) >= startDate);
    
    return {
      totalVaccinations: filteredRecords.reduce((sum, r) => sum + r.vaccines.length, 0),
      uniqueChildren: filteredRecords.length,
      records: filteredRecords
    };
  }, [period, groupedChildRecords]);

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: 'Summary', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'detailed', label: 'Detailed', icon: <FileText className="w-4 h-4" /> },
    { id: 'vaccine', label: 'Vaccine', icon: <Syringe className="w-4 h-4" /> },
    { id: 'defaulters', label: 'Defaulters Report', icon: <AlertTriangle className="w-4 h-4" /> },
  ];

  const handleExportPDF = () => {
    try {
      const options = { facilityName: "Health Facility", reportDate: new Date().toLocaleDateString() };
      
      switch (activeTab) {
        case "summary":
          exportSummaryReport(stats, ageDistribution, period, options);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </div>

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
              <h4 className="font-medium mb-3 text-sm">EPI Schedule Reference</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(VACCINE_SCHEDULE).map(([schedule, vaccines]) => (
                  <div key={schedule} className="p-2 bg-background rounded">
                    <span className="font-medium text-primary">{schedule}</span>
                    <p className="text-muted-foreground mt-1">{vaccines.join(', ')}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {VACCINE_TYPES.map(type => {
                const data = vaccineCoverage[type];
                const eligible = data.eligible || activeChildren.length;
                const coveragePercent = eligible > 0 ? Math.round((data.given / eligible) * 100) : 0;

                return (
                  <div key={type} className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{type}</h4>
                        {data.scheduleGroup && (
                          <span className="text-xs text-muted-foreground">{data.scheduleGroup}</span>
                        )}
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
                        Vaccinated: {data.given}
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

            {/* Defaulters by Vaccine Type */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-medium mb-3">Defaulters by Vaccine Type</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {VACCINE_TYPES.map(type => {
                  const count = defaultersList.filter(d => d.missedVaccines.some(v => v.includes(type))).length;
                  if (count === 0) return null;
                  return (
                    <div key={type} className="flex justify-between p-2 bg-background rounded">
                      <span className="text-sm">{type}</span>
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
