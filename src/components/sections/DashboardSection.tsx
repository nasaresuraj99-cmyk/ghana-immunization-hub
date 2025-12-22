import { useMemo } from "react";
import { PieChart, BarChart3, TrendingUp, Users, Syringe, AlertTriangle, CheckCircle } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardStats, Child } from "@/types/child";

interface DashboardSectionProps {
  stats: DashboardStats;
  children: Child[];
}

export function DashboardSection({ stats, children }: DashboardSectionProps) {
  const recentActivity = useMemo(() => {
    const activities: Array<{
      date: string;
      childName: string;
      vaccine: string;
      status: 'completed' | 'pending';
    }> = [];

    children.forEach(child => {
      child.vaccines
        .filter(v => v.givenDate)
        .forEach(v => {
          activities.push({
            date: v.givenDate!,
            childName: child.name,
            vaccine: v.name,
            status: 'completed',
          });
        });
    });

    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
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

  const total = vaccinationStatusData.completed + vaccinationStatusData.pending + vaccinationStatusData.overdue;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-card rounded-lg p-6 shadow-elevation-1">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
          📊 Immunization Dashboard
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            title="Dropout Rate"
            value={`${stats.dropoutRate}%`}
            icon={Users}
            variant="warning"
          />
          <StatCard
            title="Defaulters"
            value={stats.defaulters}
            icon={AlertTriangle}
            variant="danger"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-muted/30 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Vaccination Status</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-success">Completed</span>
                  <span>{vaccinationStatusData.completed} ({total > 0 ? Math.round((vaccinationStatusData.completed / total) * 100) : 0}%)</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
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
                <div className="h-3 bg-muted rounded-full overflow-hidden">
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
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive transition-all duration-500"
                    style={{ width: `${total > 0 ? (vaccinationStatusData.overdue / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Monthly Summary</h3>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-card rounded-lg p-4">
                <div className="text-2xl font-bold text-primary">{children.length}</div>
                <div className="text-xs text-muted-foreground">Total Children</div>
              </div>
              <div className="bg-card rounded-lg p-4">
                <div className="text-2xl font-bold text-success">{stats.vaccinatedToday}</div>
                <div className="text-xs text-muted-foreground">Today</div>
              </div>
              <div className="bg-card rounded-lg p-4">
                <div className="text-2xl font-bold text-warning">{stats.dueSoon}</div>
                <div className="text-xs text-muted-foreground">Due Soon</div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Recent Immunization Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-4 py-3 text-left text-xs font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Child</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Vaccine</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No recent activity
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((activity, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">
                        {new Date(activity.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm">{activity.childName}</td>
                      <td className="px-4 py-3 text-sm">{activity.vaccine}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <CheckCircle className="w-3 h-3" />
                          Completed
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
