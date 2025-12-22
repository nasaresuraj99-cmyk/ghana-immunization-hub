import { Users, Syringe, Clock, AlertTriangle, UserPlus, List, FileText, Calendar, Download, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "@/types/child";

interface HomeSectionProps {
  stats: DashboardStats;
  onNavigate: (section: string) => void;
}

export function HomeSection({ stats, onNavigate }: HomeSectionProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-card rounded-lg p-6 shadow-elevation-1">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-2">
          🏠 Welcome to Immunization Tracker
        </h2>
        <p className="text-muted-foreground">2030 EPI Agenda - No Child Left Behind</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <StatCard
            title="Total Children (0-59 months)"
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
          <Button onClick={() => onNavigate('registration')} className="flex flex-col h-auto py-4 gap-2">
            <UserPlus className="w-5 h-5" />
            <span className="text-xs">Register Child</span>
          </Button>
          <Button onClick={() => onNavigate('register')} variant="secondary" className="flex flex-col h-auto py-4 gap-2">
            <List className="w-5 h-5" />
            <span className="text-xs">View Register</span>
          </Button>
          <Button onClick={() => onNavigate('defaulters')} className="flex flex-col h-auto py-4 gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-xs">View Defaulters</span>
          </Button>
          <Button variant="secondary" className="flex flex-col h-auto py-4 gap-2">
            <Calendar className="w-5 h-5" />
            <span className="text-xs">Today's Appts</span>
          </Button>
          <Button className="flex flex-col h-auto py-4 gap-2">
            <Download className="w-5 h-5" />
            <span className="text-xs">Download PDF</span>
          </Button>
          <Button onClick={() => onNavigate('reporting')} variant="secondary" className="flex flex-col h-auto py-4 gap-2">
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs">Reports</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
