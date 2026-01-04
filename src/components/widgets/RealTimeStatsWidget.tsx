import { useState, useEffect, useMemo } from "react";
import { Activity, TrendingUp, Users, Syringe, Clock, RefreshCw } from "lucide-react";
import { Child } from "@/types/child";
import { cn } from "@/lib/utils";

interface RealTimeStatsWidgetProps {
  children: Child[];
}

interface LiveStat {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  trend?: number;
}

export function RealTimeStatsWidget({ children }: RealTimeStatsWidgetProps) {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate real-time statistics
  const stats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Today's vaccinations
    let vaccinatedToday = 0;
    let vaccinatedThisWeek = 0;
    let vaccinatedLastWeek = 0;

    children.forEach(child => {
      child.vaccines.forEach(v => {
        if (v.givenDate === today) vaccinatedToday++;
        if (v.givenDate && new Date(v.givenDate) >= thisWeek) vaccinatedThisWeek++;
        if (v.givenDate && new Date(v.givenDate) >= lastWeek && new Date(v.givenDate) < thisWeek) {
          vaccinatedLastWeek++;
        }
      });
    });

    // Active children (registered in last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const activeChildren = children.filter(c => 
      new Date(c.registeredAt) >= thirtyDaysAgo
    ).length;

    // Pending vaccinations (due within next 7 days)
    let pendingVaccinations = 0;
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    children.forEach(child => {
      child.vaccines.forEach(v => {
        if (v.status === 'pending' && v.dueDate) {
          const dueDate = new Date(v.dueDate);
          if (dueDate >= now && dueDate <= nextWeek) {
            pendingVaccinations++;
          }
        }
      });
    });

    // Calculate weekly trend
    const weeklyTrend = vaccinatedLastWeek > 0 
      ? Math.round(((vaccinatedThisWeek - vaccinatedLastWeek) / vaccinatedLastWeek) * 100)
      : vaccinatedThisWeek > 0 ? 100 : 0;

    return {
      vaccinatedToday,
      vaccinatedThisWeek,
      activeChildren,
      pendingVaccinations,
      totalChildren: children.length,
      weeklyTrend,
    };
  }, [children]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const liveStats: LiveStat[] = [
    {
      label: "Today",
      value: stats.vaccinatedToday,
      icon: Syringe,
      color: "text-success",
    },
    {
      label: "This Week",
      value: stats.vaccinatedThisWeek,
      icon: TrendingUp,
      color: "text-primary",
      trend: stats.weeklyTrend,
    },
    {
      label: "Active Children",
      value: stats.activeChildren,
      icon: Users,
      color: "text-info",
    },
    {
      label: "Pending (7 days)",
      value: stats.pendingVaccinations,
      icon: Clock,
      color: "text-warning",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-4 border border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Activity className="w-5 h-5 text-primary" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full animate-pulse" />
          </div>
          <h3 className="font-semibold text-sm">Real-Time Statistics</h3>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1.5 hover:bg-primary/10 rounded-full transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isRefreshing && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {liveStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <stat.icon className={cn("w-4 h-4", stat.color)} />
              {stat.trend !== undefined && (
                <span className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded-full",
                  stat.trend >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}>
                  {stat.trend >= 0 ? "+" : ""}{stat.trend}%
                </span>
              )}
            </div>
            <div className="mt-2">
              <div className={cn("text-2xl font-bold", stat.color)}>
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>Total registered: <strong className="text-foreground">{stats.totalChildren}</strong></span>
        <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
