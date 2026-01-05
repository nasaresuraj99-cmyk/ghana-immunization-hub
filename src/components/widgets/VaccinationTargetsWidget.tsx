import { useState, useMemo } from "react";
import { Target, TrendingUp, Calendar, ChevronDown, ChevronUp, Settings, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Child, DashboardStats } from "@/types/child";
import { formatDate } from "@/lib/utils";

interface VaccinationTargetsWidgetProps {
  children: Child[];
  stats: DashboardStats;
}

interface VaccinationTarget {
  id: string;
  name: string;
  monthlyTarget: number;
  yearlyTarget: number;
}

const DEFAULT_TARGETS: VaccinationTarget[] = [
  { id: "vaccinations", name: "Total Vaccinations", monthlyTarget: 100, yearlyTarget: 1200 },
  { id: "registrations", name: "New Registrations", monthlyTarget: 20, yearlyTarget: 240 },
  { id: "fully_immunized", name: "Fully Immunized", monthlyTarget: 15, yearlyTarget: 180 },
  { id: "coverage_rate", name: "Coverage Rate (%)", monthlyTarget: 90, yearlyTarget: 95 },
];

const TARGETS_STORAGE_KEY = "vaccination_targets";

export function VaccinationTargetsWidget({ children, stats }: VaccinationTargetsWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [targets, setTargets] = useState<VaccinationTarget[]>(() => {
    const stored = localStorage.getItem(TARGETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_TARGETS;
  });
  const [editTargets, setEditTargets] = useState<VaccinationTarget[]>(targets);

  // Calculate current month and year progress
  const progressData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const startOfYear = new Date(currentYear, 0, 1);

    // Filter children by date ranges
    const childrenThisMonth = children.filter(child => {
      const regDate = new Date(child.registeredAt);
      return regDate >= startOfMonth;
    });

    const childrenThisYear = children.filter(child => {
      const regDate = new Date(child.registeredAt);
      return regDate >= startOfYear;
    });

    // Count vaccinations this month
    let vaccinationsThisMonth = 0;
    let vaccinationsThisYear = 0;

    children.forEach(child => {
      child.vaccines.forEach(vaccine => {
        if (vaccine.status === "completed" && vaccine.givenDate) {
          const givenDate = new Date(vaccine.givenDate);
          if (givenDate >= startOfMonth) {
            vaccinationsThisMonth++;
          }
          if (givenDate >= startOfYear) {
            vaccinationsThisYear++;
          }
        }
      });
    });

    // Count fully immunized this month/year
    const fullyImmunizedThisMonth = childrenThisMonth.filter(child =>
      child.vaccines.every(v => v.status === "completed")
    ).length;

    const fullyImmunizedThisYear = childrenThisYear.filter(child =>
      child.vaccines.every(v => v.status === "completed")
    ).length;

    return {
      vaccinations: {
        monthly: vaccinationsThisMonth,
        yearly: vaccinationsThisYear,
      },
      registrations: {
        monthly: childrenThisMonth.length,
        yearly: childrenThisYear.length,
      },
      fully_immunized: {
        monthly: fullyImmunizedThisMonth,
        yearly: fullyImmunizedThisYear,
      },
      coverage_rate: {
        monthly: stats.coverageRate,
        yearly: stats.coverageRate,
      },
    };
  }, [children, stats]);

  const getProgress = (targetId: string, period: "monthly" | "yearly") => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return { current: 0, target: 0, percentage: 0 };

    const current = progressData[targetId as keyof typeof progressData]?.[period] || 0;
    const targetValue = period === "monthly" ? target.monthlyTarget : target.yearlyTarget;
    const percentage = targetValue > 0 ? Math.min(Math.round((current / targetValue) * 100), 100) : 0;

    return { current, target: targetValue, percentage };
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-emerald-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const handleSaveTargets = () => {
    setTargets(editTargets);
    localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(editTargets));
    setIsSettingsOpen(false);
  };

  const now = new Date();
  const currentMonthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <Card className="border shadow-elevation-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Vaccination Targets
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Track progress against monthly and yearly goals
          </p>
        </CardHeader>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent>
            <CardContent className="pt-2 space-y-4">
              {/* Monthly Progress */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{currentMonthName}</span>
                  <Badge variant="outline" className="text-xs">Monthly</Badge>
                </div>

                {targets.map(target => {
                  const progress = getProgress(target.id, "monthly");
                  return (
                    <div key={`monthly-${target.id}`} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{target.name}</span>
                        <span className="font-medium">
                          {progress.current}
                          {target.id === "coverage_rate" ? "%" : ""} / {progress.target}
                          {target.id === "coverage_rate" ? "%" : ""}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${getProgressColor(progress.percentage)}`}
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-end">
                        <span className={`text-xs font-medium ${progress.percentage >= 100 ? "text-green-600" : "text-muted-foreground"}`}>
                          {progress.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Yearly Progress */}
              <div className="pt-3 border-t space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{now.getFullYear()}</span>
                  <Badge variant="secondary" className="text-xs">Yearly</Badge>
                </div>

                {targets.map(target => {
                  const progress = getProgress(target.id, "yearly");
                  return (
                    <div key={`yearly-${target.id}`} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{target.name}</span>
                        <span className="font-medium">
                          {progress.current}
                          {target.id === "coverage_rate" ? "%" : ""} / {progress.target}
                          {target.id === "coverage_rate" ? "%" : ""}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${getProgressColor(progress.percentage)}`}
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Target Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Set Vaccination Targets
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editTargets.map((target, index) => (
              <div key={target.id} className="grid grid-cols-3 gap-3 items-center">
                <Label className="text-sm">{target.name}</Label>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Monthly</Label>
                  <Input
                    type="number"
                    min={0}
                    value={target.monthlyTarget}
                    onChange={(e) => {
                      const updated = [...editTargets];
                      updated[index].monthlyTarget = parseInt(e.target.value) || 0;
                      setEditTargets(updated);
                    }}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Yearly</Label>
                  <Input
                    type="number"
                    min={0}
                    value={target.yearlyTarget}
                    onChange={(e) => {
                      const updated = [...editTargets];
                      updated[index].yearlyTarget = parseInt(e.target.value) || 0;
                      setEditTargets(updated);
                    }}
                    className="h-8"
                  />
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveTargets}>
              <Save className="w-4 h-4 mr-2" />
              Save Targets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
