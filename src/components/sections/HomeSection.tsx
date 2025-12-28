import { Users, Syringe, Clock, AlertTriangle, UserPlus, List, FileText, Calendar, Download, BarChart3, Sparkles, TrendingUp, CalendarDays } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/types/child";

interface HomeSectionProps {
  stats: DashboardStats;
  onNavigate: (section: string) => void;
}

export function HomeSection({ stats, onNavigate }: HomeSectionProps) {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative bg-card rounded-2xl p-8 shadow-elevation-2 overflow-hidden border border-border/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-primary/10">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Welcome to Immunization Tracker
              </h2>
              <p className="text-muted-foreground mt-1 font-medium">2030 EPI Agenda - No Child Left Behind</p>
            </div>
          </div>

          {/* Coverage Banner */}
          <div className="bg-primary/5 rounded-xl p-4 mb-6 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Overall Coverage Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{stats.coverageRate}%</span>
                <span className="text-xs text-muted-foreground">of scheduled vaccinations completed</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Children"
              value={stats.totalChildren}
              icon={Users}
              variant="default"
            />
            <StatCard
              title="Vaccinated Today"
              value={stats.vaccinatedToday}
              icon={Syringe}
              variant="success"
            />
            <StatCard
              title="Due Soon (7 days)"
              value={stats.dueSoon}
              icon={Clock}
              variant="warning"
            />
            <StatCard
              title="Active Defaulters"
              value={stats.defaulters}
              icon={AlertTriangle}
              variant="danger"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-2xl p-6 shadow-elevation-1 border border-border/50">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-primary rounded-full" />
          Quick Actions
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Button 
            onClick={() => onNavigate('registration')} 
            className="flex flex-col h-auto py-5 gap-3 rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            <UserPlus className="w-6 h-6" />
            <span className="text-xs font-medium">Register Child</span>
          </Button>
          <Button 
            onClick={() => onNavigate('register')} 
            variant="secondary" 
            className="flex flex-col h-auto py-5 gap-3 rounded-xl hover:bg-secondary/80 transition-all"
          >
            <List className="w-6 h-6" />
            <span className="text-xs font-medium">View Register</span>
          </Button>
          <Button 
            onClick={() => onNavigate('defaulters')} 
            variant="secondary"
            className="flex flex-col h-auto py-5 gap-3 rounded-xl hover:bg-secondary/80 transition-all"
          >
            <AlertTriangle className="w-6 h-6" />
            <span className="text-xs font-medium">View Defaulters</span>
          </Button>
          <Button 
            onClick={() => onNavigate('schedule')}
            variant="secondary" 
            className="flex flex-col h-auto py-5 gap-3 rounded-xl hover:bg-secondary/80 transition-all"
          >
            <CalendarDays className="w-6 h-6" />
            <span className="text-xs font-medium">EPI Schedule</span>
          </Button>
          <Button 
            onClick={() => onNavigate('dashboard')}
            variant="secondary" 
            className="flex flex-col h-auto py-5 gap-3 rounded-xl hover:bg-secondary/80 transition-all"
          >
            <Calendar className="w-6 h-6" />
            <span className="text-xs font-medium">Dashboard</span>
          </Button>
          <Button 
            onClick={() => onNavigate('reporting')}
            variant="secondary"
            className="flex flex-col h-auto py-5 gap-3 rounded-xl hover:bg-secondary/80 transition-all"
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs font-medium">Reports</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
