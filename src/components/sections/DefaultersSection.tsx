import { useState, useMemo } from "react";
import { RefreshCw, Download, FileText, Phone, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Defaulter, Child } from "@/types/child";

interface DefaultersSectionProps {
  children: Child[];
  onRefresh: () => void;
}

export function DefaultersSection({ children, onRefresh }: DefaultersSectionProps) {
  const [periodFilter, setPeriodFilter] = useState("7");
  const [vaccineFilter, setVaccineFilter] = useState("all");
  const [communityFilter, setCommunityFilter] = useState("all");

  const defaulters = useMemo(() => {
    const today = new Date();
    const results: Defaulter[] = [];

    children.forEach(child => {
      const overdueVaccines = child.vaccines.filter(v => {
        if (v.status !== 'overdue') return false;
        const dueDate = new Date(v.dueDate);
        const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (periodFilter !== 'all' && daysOverdue < parseInt(periodFilter)) return false;
        if (vaccineFilter !== 'all' && !v.name.toLowerCase().includes(vaccineFilter.toLowerCase())) return false;
        
        return true;
      });

      if (overdueVaccines.length > 0) {
        if (communityFilter !== 'all' && child.community !== communityFilter) return;
        
        const earliestDue = overdueVaccines.reduce((earliest, v) => 
          new Date(v.dueDate) < new Date(earliest.dueDate) ? v : earliest
        );
        
        results.push({
          child,
          missedVaccines: overdueVaccines.map(v => v.name),
          dueDate: earliestDue.dueDate,
          daysOverdue: Math.ceil((today.getTime() - new Date(earliestDue.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        });
      }
    });

    return results.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [children, periodFilter, vaccineFilter, communityFilter]);

  const communities = useMemo(() => {
    const unique = new Set(children.map(c => c.community).filter(Boolean));
    return Array.from(unique);
  }, [children]);

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                   (today.getMonth() - birthDate.getMonth());
    
    if (months < 12) {
      return `${months}m`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-card rounded-lg p-6 shadow-elevation-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Immunization Defaulters List
          </h2>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm">
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button size="sm">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Default Period</Label>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Overdue 7+ days</SelectItem>
                <SelectItem value="14">Overdue 14+ days</SelectItem>
                <SelectItem value="30">Overdue 30+ days</SelectItem>
                <SelectItem value="all">All Defaulters</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vaccine Type</Label>
            <Select value={vaccineFilter} onValueChange={setVaccineFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vaccines</SelectItem>
                <SelectItem value="BCG">BCG</SelectItem>
                <SelectItem value="OPV">OPV</SelectItem>
                <SelectItem value="Penta">Penta</SelectItem>
                <SelectItem value="Measles">Measles Rubella</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Community</Label>
            <Select value={communityFilter} onValueChange={setCommunityFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Communities</SelectItem>
                {communities.map(community => (
                  <SelectItem key={community} value={community}>{community}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            <strong>Note:</strong> Defaulters are automatically removed from this list when their immunization schedule is updated.
          </p>
        </div>

        {defaulters.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground text-sm">No defaulters found. Great work!</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-2 py-2 text-left font-semibold w-8">#</th>
                  <th className="px-2 py-2 text-left font-semibold">Name</th>
                  <th className="px-2 py-2 text-left font-semibold w-12">Age</th>
                  <th className="px-2 py-2 text-left font-semibold hidden sm:table-cell">Mother</th>
                  <th className="px-2 py-2 text-left font-semibold">Phone</th>
                  <th className="px-2 py-2 text-left font-semibold">Missed</th>
                  <th className="px-2 py-2 text-left font-semibold hidden md:table-cell w-20">Due</th>
                  <th className="px-2 py-2 text-left font-semibold w-16">Overdue</th>
                  <th className="px-2 py-2 text-left font-semibold hidden lg:table-cell">Area</th>
                  <th className="px-2 py-2 text-left font-semibold w-14">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {defaulters.map((defaulter, index) => (
                  <tr key={defaulter.child.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-2 py-1.5 text-muted-foreground">{index + 1}</td>
                    <td className="px-2 py-1.5 font-medium truncate max-w-[100px]" title={defaulter.child.name}>
                      {defaulter.child.name}
                    </td>
                    <td className="px-2 py-1.5">{calculateAge(defaulter.child.dateOfBirth)}</td>
                    <td className="px-2 py-1.5 hidden sm:table-cell truncate max-w-[80px]" title={defaulter.child.motherName}>
                      {defaulter.child.motherName}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-[10px]">{defaulter.child.telephoneAddress}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex flex-wrap gap-0.5 max-w-[120px]">
                        {defaulter.missedVaccines.slice(0, 2).map((vaccine, i) => (
                          <Badge key={i} variant="destructive" className="text-[9px] px-1 py-0 h-4">
                            {vaccine.split(' ')[0]}
                          </Badge>
                        ))}
                        {defaulter.missedVaccines.length > 2 && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                            +{defaulter.missedVaccines.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 hidden md:table-cell text-muted-foreground">
                      {new Date(defaulter.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-2 py-1.5">
                      <Badge 
                        variant={defaulter.daysOverdue > 30 ? "destructive" : "secondary"} 
                        className="text-[9px] px-1 py-0 h-4"
                      >
                        {defaulter.daysOverdue}d
                      </Badge>
                    </td>
                    <td className="px-2 py-1.5 hidden lg:table-cell truncate max-w-[80px]" title={defaulter.child.community}>
                      {defaulter.child.community || "—"}
                    </td>
                    <td className="px-2 py-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          const phone = defaulter.child.telephoneAddress;
                          if (phone.match(/^\d{10,}$/)) {
                            window.open(`tel:${phone}`, '_blank');
                          }
                        }}
                        title="Call"
                      >
                        <Phone className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {defaulters.length} defaulter(s)
        </div>
      </div>
    </div>
  );
}
