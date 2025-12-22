import { useState, useMemo } from "react";
import { FileText, Download, Printer, TrendingUp, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/ui/stat-card";
import { Child, DashboardStats } from "@/types/child";
import { cn } from "@/lib/utils";

interface ReportingSectionProps {
  stats: DashboardStats;
  children: Child[];
}

type ReportTab = 'summary' | 'detailed' | 'vaccine' | 'defaulters';

export function ReportingSection({ stats, children }: ReportingSectionProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');
  const [period, setPeriod] = useState('month');

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

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'detailed', label: 'Detailed' },
    { id: 'vaccine', label: 'Vaccine' },
    { id: 'defaulters', label: 'Defaulters Report' },
  ];

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
                "px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

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
                value={stats.totalChildren * 5}
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
                  <h3 className="font-semibold">Vaccination Trend</h3>
                </div>
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Chart visualization would go here</p>
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
              <Button>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="secondary">
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'detailed' && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Detailed reports will show individual vaccination records</p>
          </div>
        )}

        {activeTab === 'vaccine' && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Vaccine-specific reports will show coverage by vaccine type</p>
          </div>
        )}

        {activeTab === 'defaulters' && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Defaulters report will show detailed defaulter analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
