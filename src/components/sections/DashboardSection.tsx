import { useMemo } from "react";
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle, TrendingDown, Activity, Users as UsersIcon, UserCircle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardStats, Child } from "@/types/child";
import { VaccinationCoverageChart } from "@/components/charts/VaccinationCoverageChart";
import { MonthlyTrendsChart } from "@/components/charts/MonthlyTrendsChart";
import { AgeDistributionChart } from "@/components/charts/AgeDistributionChart";
import { VaccineDueReminders } from "@/components/VaccineDueReminders";
import { SyncStatusWidget } from "@/components/SyncStatusWidget";
import { SyncProgress } from "@/hooks/useSyncStatus";
import { formatDate } from "@/lib/utils";

interface DashboardSectionProps {
  stats: DashboardStats;
  children: Child[];
  onViewChild: (child: Child) => void;
  syncProgress?: SyncProgress & {
    isOnline: boolean;
    statusMessage: string;
    triggerManualSync: () => boolean;
  };
}

// Dropout rate pairs for calculation
const DROPOUT_PAIRS = [
  { start: 'Penta1', end: 'Penta3', label: 'Penta1 → Penta3' },
  { start: 'BCG', end: 'Measles Rubella1', label: 'BCG → MR1' },
  { start: 'Measles Rubella1', end: 'Measles Rubella2', label: 'MR1 → MR2' },
  { start: 'Malaria1', end: 'Malaria4', label: 'Malaria1 → Malaria4' },
  { start: 'IPV1', end: 'IPV2', label: 'IPV1 → IPV2' },
];

export function DashboardSection({ stats, children, onViewChild, syncProgress }: DashboardSectionProps) {
  // Group vaccines by child and visit date (same date = same visit/session)
  const recentActivity = useMemo(() => {
    const visitMap = new Map<string, {
      date: string;
      childName: string;
      childId: string;
      vaccines: string[];
    }>();

    children.forEach(child => {
      child.vaccines
        .filter(v => v.givenDate)
        .forEach(v => {
          const visitKey = `${child.id}-${v.givenDate}`;
          
          if (visitMap.has(visitKey)) {
            visitMap.get(visitKey)!.vaccines.push(v.name);
          } else {
            visitMap.set(visitKey, {
              date: v.givenDate!,
              childName: child.name,
              childId: child.id,
              vaccines: [v.name],
            });
          }
        });
    });

    return Array.from(visitMap.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [children]);

  const vaccinationStatusData = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let overdue = 0;

    children.forEach(child => {
      child.vaccines.forEach(v => {
        if (v.status === 'completed') completed++;
        else if (v.status === 'pending') pending++;
        else if (v.status === 'overdue') overdue++;
      });
    });

    return { completed, pending, overdue };
  }, [children]);

  // Calculate dropout rates for specific vaccine pairs
  const dropoutRates = useMemo(() => {
    const rates: Record<string, { startCount: number; endCount: number; dropoutRate: number }> = {};

    DROPOUT_PAIRS.forEach(pair => {
      let startCount = 0;
      let endCount = 0;

      children.forEach(child => {
        const startVaccine = child.vaccines.find(v => v.name.includes(pair.start) && v.status === 'completed');
        const endVaccine = child.vaccines.find(v => v.name.includes(pair.end) && v.status === 'completed');

        if (startVaccine) startCount++;
        if (endVaccine) endCount++;
      });

      const dropoutRate = startCount > 0 ? Math.round(((startCount - endCount) / startCount) * 100) : 0;

      rates[pair.label] = {
        startCount,
        endCount,
        dropoutRate: Math.max(0, dropoutRate),
      };
    });

    return rates;
  }, [children]);

  const overallDropoutRate = useMemo(() => {
    const validRates = Object.values(dropoutRates).filter(r => r.startCount > 0);
    if (validRates.length === 0) return 0;
    const sum = validRates.reduce((acc, r) => acc + r.dropoutRate, 0);
    return Math.round(sum / validRates.length);
  }, [dropoutRates]);

  // Gender statistics
  const genderStats = useMemo(() => {
    const males = children.filter(c => c.sex?.toLowerCase() === 'male' || c.sex?.toLowerCase() === 'm').length;
    const females = children.filter(c => c.sex?.toLowerCase() === 'female' || c.sex?.toLowerCase() === 'f').length;
    return { males, females, total: children.length };
  }, [children]);

  const total = vaccinationStatusData.completed + vaccinationStatusData.pending + vaccinationStatusData.overdue;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-card rounded-lg p-6 shadow-elevation-1">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
          📊 Immunization Dashboard
        </h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Coverage Rate"
            value={`${stats.coverageRate}%`}
            icon={TrendingUp}
            variant="default"
          />
          <StatCard
            title="Fully Immunized"
            value={stats.fullyImmunized}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Avg Dropout Rate"
            value={`${overallDropoutRate}%`}
            icon={TrendingDown}
            variant="warning"
          />
          <StatCard
            title="Defaulters"
            value={stats.defaulters}
            icon={AlertTriangle}
            variant="danger"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Vaccine Coverage by Type</h3>
            </div>
            <VaccinationCoverageChart children={children} />
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Monthly Trends</h3>
            </div>
            <MonthlyTrendsChart children={children} />
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <UsersIcon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Age Distribution</h3>
            </div>
            <AgeDistributionChart children={children} />
          </div>
        </div>

        {/* Dropout Rates and Due Reminders Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Dropout Rates */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-sm">Dropout Rates by Vaccine Pair</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DROPOUT_PAIRS.map(pair => {
                const data = dropoutRates[pair.label];
                const isHigh = data.dropoutRate > 10;
                const isCritical = data.dropoutRate > 20;
                
                return (
                  <div 
                    key={pair.label}
                    className={`bg-card rounded-lg p-3 border-2 transition-colors ${
                      isCritical ? 'border-destructive' : isHigh ? 'border-warning' : 'border-success'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">{pair.label}</span>
                      <span className={`text-sm font-bold ${
                        isCritical ? 'text-destructive' : isHigh ? 'text-warning' : 'text-success'
                      }`}>
                        {data.dropoutRate}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          isCritical ? 'bg-destructive' : isHigh ? 'bg-warning' : 'bg-success'
                        }`}
                        style={{ width: `${Math.min(data.dropoutRate, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{data.startCount}</span>
                      <span>{data.endCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                <span className="text-muted-foreground">Good (&lt;10%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-muted-foreground">Moderate (10-20%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-muted-foreground">Critical (&gt;20%)</span>
              </div>
            </div>
          </div>

          {/* Due Reminders */}
          <VaccineDueReminders children={children} onViewChild={onViewChild} />
        </div>

        {/* Sync Status Widget */}
        {syncProgress && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <SyncStatusWidget syncProgress={syncProgress} />
          </div>
        )}

        {/* Vaccination Status & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Vaccination Status</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-success">Completed</span>
                  <span>{vaccinationStatusData.completed} ({total > 0 ? Math.round((vaccinationStatusData.completed / total) * 100) : 0}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-success transition-all duration-500"
                    style={{ width: `${total > 0 ? (vaccinationStatusData.completed / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-info">Pending</span>
                  <span>{vaccinationStatusData.pending} ({total > 0 ? Math.round((vaccinationStatusData.pending / total) * 100) : 0}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-info transition-all duration-500"
                    style={{ width: `${total > 0 ? (vaccinationStatusData.pending / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-destructive">Overdue</span>
                  <span>{vaccinationStatusData.overdue} ({total > 0 ? Math.round((vaccinationStatusData.overdue / total) * 100) : 0}%)</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive transition-all duration-500"
                    style={{ width: `${total > 0 ? (vaccinationStatusData.overdue / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm">Quick Summary</h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-card rounded-lg p-3">
                <div className="text-xl font-bold text-primary">{genderStats.total}</div>
                <div className="text-xs text-muted-foreground">Total Registered</div>
              </div>
              <div className="bg-card rounded-lg p-3">
                <div className="text-xl font-bold text-blue-500">{genderStats.males}</div>
                <div className="text-xs text-muted-foreground">Males</div>
              </div>
              <div className="bg-card rounded-lg p-3">
                <div className="text-xl font-bold text-pink-500">{genderStats.females}</div>
                <div className="text-xs text-muted-foreground">Females</div>
              </div>
              <div className="bg-card rounded-lg p-3">
                <div className="text-xl font-bold text-success">{stats.vaccinatedToday}</div>
                <div className="text-xs text-muted-foreground">Vaccinated Today</div>
              </div>
              <div className="bg-card rounded-lg p-3">
                <div className="text-xl font-bold text-warning">{stats.dueSoon}</div>
                <div className="text-xs text-muted-foreground">Due Soon</div>
              </div>
              <div className="bg-card rounded-lg p-3">
                <div className="text-xl font-bold text-success">{stats.fullyImmunized}</div>
                <div className="text-xs text-muted-foreground">Fully Immunized</div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="font-semibold mb-4 text-sm">Recent Immunization Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-4 py-2 text-left text-xs font-semibold">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Child</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Vaccines Administered</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-sm">
                      No recent activity
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((visit) => (
                    <tr key={`${visit.childId}-${visit.date}`} className="hover:bg-muted/50">
                      <td className="px-4 py-2 text-xs">
                        {formatDate(visit.date)}
                      </td>
                      <td className="px-4 py-2 text-xs font-medium">{visit.childName}</td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-1">
                          {visit.vaccines.slice(0, 3).map((vaccine, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                            >
                              {vaccine.split(' at ')[0]}
                            </span>
                          ))}
                          {visit.vaccines.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{visit.vaccines.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <CheckCircle className="w-3 h-3" />
                          {visit.vaccines.length} given
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
