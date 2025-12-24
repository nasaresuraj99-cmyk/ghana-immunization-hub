import { useState, useMemo } from "react";
import { Search, Download, FileText, Edit, Trash2, Syringe, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Child } from "@/types/child";
import { exportImmunizationCard } from "@/lib/pdfExport";
import { toast } from "sonner";
interface ChildRegisterSectionProps {
  children: Child[];
  onEdit: (child: Child) => void;
  onDelete: (childId: string) => void;
  onViewVaccines: (child: Child) => void;
}

export function ChildRegisterSection({ children, onEdit, onDelete, onViewVaccines }: ChildRegisterSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredChildren = useMemo(() => {
    if (!searchTerm) return children;
    const term = searchTerm.toLowerCase();
    return children.filter(child =>
      child.name.toLowerCase().includes(term) ||
      child.regNo.toLowerCase().includes(term) ||
      child.telephoneAddress.toLowerCase().includes(term) ||
      child.motherName.toLowerCase().includes(term)
    );
  }, [children, searchTerm]);

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                   (today.getMonth() - birthDate.getMonth());
    
    if (months < 12) {
      return `${months} months`;
    } else {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`;
    }
  };

  const getNextVisit = (child: Child) => {
    const pendingVaccines = child.vaccines.filter(v => v.status === 'pending');
    if (pendingVaccines.length === 0) return null;
    
    const sorted = pendingVaccines.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    return sorted[0];
  };

  const getStatus = (child: Child) => {
    const hasOverdue = child.vaccines.some(v => v.status === 'overdue');
    const allCompleted = child.vaccines.every(v => v.status === 'completed');
    const hasPending = child.vaccines.some(v => v.status === 'pending');
    
    if (hasOverdue) return { label: 'Defaulter', variant: 'destructive' as const };
    if (allCompleted) return { label: 'Completed', variant: 'default' as const };
    if (hasPending) {
      const nextVisit = getNextVisit(child);
      if (nextVisit) {
        const dueDate = new Date(nextVisit.dueDate);
        const today = new Date();
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 7) return { label: 'Due Soon', variant: 'secondary' as const };
      }
      return { label: 'Active', variant: 'outline' as const };
    }
    return { label: 'Active', variant: 'outline' as const };
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-card rounded-lg p-6 shadow-elevation-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-foreground">
            📋 Child Health Register (0-59 months)
          </h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, reg no, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button size="sm">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Reg No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Age</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Mother</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Telephone/Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Next Visit</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredChildren.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    {searchTerm ? "No children found matching your search" : "No children registered yet"}
                  </td>
                </tr>
              ) : (
                filteredChildren.map((child) => {
                  const nextVisit = getNextVisit(child);
                  const status = getStatus(child);
                  
                  return (
                    <tr key={child.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">{child.regNo}</td>
                      <td className="px-4 py-3 text-sm">{child.name}</td>
                      <td className="px-4 py-3 text-sm">{calculateAge(child.dateOfBirth)}</td>
                      <td className="px-4 py-3 text-sm">{child.motherName}</td>
                      <td className="px-4 py-3 text-sm">{child.telephoneAddress}</td>
                      <td className="px-4 py-3 text-sm">
                        {nextVisit ? (
                          <span className="text-xs">
                            {nextVisit.name} - {new Date(nextVisit.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onViewVaccines(child)}
                            title="View Vaccines"
                          >
                            <Syringe className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={async () => {
                              toast.loading("Generating immunization card...");
                              await exportImmunizationCard(child);
                              toast.dismiss();
                              toast.success("Immunization card downloaded!");
                            }}
                            title="Print Immunization Card"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onEdit(child)}
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => onDelete(child.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredChildren.length} of {children.length} children
        </div>
      </div>
    </div>
  );
}
