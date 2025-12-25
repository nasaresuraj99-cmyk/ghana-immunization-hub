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

// Vaccine categories for grouping
const VACCINE_TYPES = [
  'BCG', 'OPV', 'Hepatitis B', 'Penta', 'PCV', 'Rotavirus', 
  'IPV', 'Malaria', 'Measles Rubella', 'Men A', 'LLIN', 'Vitamin A'
];

export function ReportingSection({ stats, children }: ReportingSectionProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [period, setPeriod] = useState('month');

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

    children.forEach(child => {
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
  }, [children]);

  // Detailed vaccination records
  const detailedRecords = useMemo(() => {
    const records: Array<{
      date: string;
      childName: string;
      regNo: string;
      vaccine: string;
      batchNumber: string;
      status: string;
    }> = [];

    children.forEach(child => {
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

    // Sort by date descending
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [children]);

  // Vaccine coverage statistics
  const vaccineCoverage = useMemo(() => {
    const coverage: Record<string, { given: number; pending: number; overdue: number }> = {};

    VACCINE_TYPES.forEach(type => {
      coverage[type] = { given: 0, pending: 0, overdue: 0 };
    });

    children.forEach(child => {
      child.vaccines.forEach(vaccine => {
        const matchedType = VACCINE_TYPES.find(type => vaccine.name.includes(type));
        if (matchedType) {
          if (vaccine.status === 'completed') {
            coverage[matchedType].given++;
          } else if (vaccine.status === 'overdue') {
            coverage[matchedType].overdue++;
          } else {
            coverage[matchedType].pending++;
          }
        }
      });
    });

    return coverage;
  }, [children]);

  // Defaulters list
  const defaultersList = useMemo((): Defaulter[] => {
    const defaulters: Defaulter[] = [];
    const today = new Date();

    children.forEach(child => {
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
  }, [children]);

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

    const filteredRecords = detailedRecords.filter(r => new Date(r.date) >= startDate);
    
    return {
      totalVaccinations: filteredRecords.length,
      records: filteredRecords
    };
  }, [period, detailedRecords]);

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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                value={stats.defaulters}
                variant="danger"
              />
              <StatCard
                title="Completion Rate"
                value={`${Math.round((stats.fullyImmunized / Math.max(stats.totalChildren, 1)) * 100)}%`}
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
                    <span>Total Children Registered</span>
                    <span className="font-bold">{stats.totalChildren}</span>
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
                            width: `${children.length > 0 ? (count / children.length) * 100 : 0}%` 
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

        {/* Detailed Tab */}
        {activeTab === 'detailed' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Individual Vaccination Records</h3>
              </div>
              <Badge variant="secondary">{detailedRecords.length} records</Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="p-3 text-left font-semibold">Date</th>
                    <th className="p-3 text-left font-semibold">Reg No</th>
                    <th className="p-3 text-left font-semibold">Child Name</th>
                    <th className="p-3 text-left font-semibold">Vaccine</th>
                    <th className="p-3 text-left font-semibold">Batch No.</th>
                    <th className="p-3 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No vaccination records found
                      </td>
                    </tr>
                  ) : (
                    detailedRecords.slice(0, 50).map((record, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-muted/50">
                        <td className="p-3">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="p-3 font-mono text-xs">{record.regNo}</td>
                        <td className="p-3 font-medium">{record.childName}</td>
                        <td className="p-3">{record.vaccine}</td>
                        <td className="p-3 font-mono text-xs">{record.batchNumber}</td>
                        <td className="p-3">
                          <Badge variant="default" className="bg-ghs-green">
                            {record.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {detailedRecords.length > 50 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing 50 of {detailedRecords.length} records
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
            <div className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Vaccine Coverage by Type</h3>
            </div>

            <div className="grid gap-4">
              {VACCINE_TYPES.map(type => {
                const data = vaccineCoverage[type];
                const total = data.given + data.pending + data.overdue;
                const coveragePercent = total > 0 ? Math.round((data.given / total) * 100) : 0;

                return (
                  <div key={type} className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{type}</h4>
                      <span className="text-sm font-bold text-primary">{coveragePercent}% coverage</span>
                    </div>
                    
                    <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full bg-ghs-green transition-all duration-500"
                        style={{ width: `${coveragePercent}%` }}
                      />
                    </div>
                    
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-ghs-green" />
                        Given: {data.given}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Pending: {data.pending}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-destructive" />
                        Overdue: {data.overdue}
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
