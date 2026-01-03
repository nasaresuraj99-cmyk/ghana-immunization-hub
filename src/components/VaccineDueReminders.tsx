import { useMemo, useState } from "react";
import { Bell, Calendar, AlertTriangle, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Child } from "@/types/child";
import { formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VaccineDueRemindersProps {
  children: Child[];
  onViewChild: (child: Child) => void;
}

interface DueVaccine {
  child: Child;
  vaccine: {
    name: string;
    dueDate: string;
  };
  daysUntilDue: number;
}

export function VaccineDueReminders({ children, onViewChild }: VaccineDueRemindersProps) {
  const [filter, setFilter] = useState<"7" | "14" | "30">("7");

  const dueVaccines = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filterDays = parseInt(filter);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + filterDays);

    const results: DueVaccine[] = [];

    children.forEach(child => {
      child.vaccines.forEach(vaccine => {
        if (vaccine.status === "pending") {
          const dueDate = new Date(vaccine.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate >= today && dueDate <= endDate) {
            const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            results.push({
              child,
              vaccine: {
                name: vaccine.name,
                dueDate: vaccine.dueDate,
              },
              daysUntilDue,
            });
          }
        }
      });
    });

    return results.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [children, filter]);

  // Group by days
  const grouped = useMemo(() => {
    const today: DueVaccine[] = [];
    const thisWeek: DueVaccine[] = [];
    const later: DueVaccine[] = [];

    dueVaccines.forEach(item => {
      if (item.daysUntilDue === 0) {
        today.push(item);
      } else if (item.daysUntilDue <= 7) {
        thisWeek.push(item);
      } else {
        later.push(item);
      }
    });

    return { today, thisWeek, later };
  }, [dueVaccines]);

  const getDueBadge = (days: number) => {
    if (days === 0) {
      return <Badge variant="destructive">Today</Badge>;
    } else if (days <= 3) {
      return <Badge className="bg-warning text-warning-foreground">{days}d</Badge>;
    } else if (days <= 7) {
      return <Badge variant="secondary">{days}d</Badge>;
    } else {
      return <Badge variant="outline">{days}d</Badge>;
    }
  };

  const renderVaccineItem = (item: DueVaccine) => (
    <button
      key={`${item.child.id}-${item.vaccine.name}`}
      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
      onClick={() => onViewChild(item.child)}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{item.child.name}</p>
          <p className="text-xs text-muted-foreground">{item.vaccine.name}</p>
          <p className="text-xs text-muted-foreground">
            Due: {formatDate(item.vaccine.dueDate)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getDueBadge(item.daysUntilDue)}
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );

  return (
    <div className="bg-card rounded-lg p-4 shadow-elevation-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Upcoming Vaccinations</h3>
          {dueVaccines.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {dueVaccines.length}
            </Badge>
          )}
        </div>
        <Select value={filter} onValueChange={(value: "7" | "14" | "30") => setFilter(value)}>
          <SelectTrigger className="w-28 h-8">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="14">14 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dueVaccines.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No vaccines due in the next {filter} days</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {grouped.today.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Due Today</span>
              </div>
              <div className="space-y-1">
                {grouped.today.map(renderVaccineItem)}
              </div>
            </div>
          )}

          {grouped.thisWeek.length > 0 && (
            <div>
              <span className="text-sm font-medium text-muted-foreground mb-2 block">This Week</span>
              <div className="space-y-1">
                {grouped.thisWeek.map(renderVaccineItem)}
              </div>
            </div>
          )}

          {grouped.later.length > 0 && (
            <div>
              <span className="text-sm font-medium text-muted-foreground mb-2 block">Coming Up</span>
              <div className="space-y-1">
                {grouped.later.map(renderVaccineItem)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
