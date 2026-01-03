import { useState, useMemo, useEffect } from "react";
import { Search, Download, FileText, Edit, Trash2, Syringe, CreditCard, Users, Eye, EyeOff, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Child } from "@/types/child";
import { exportImmunizationCard } from "@/lib/pdfExport";
import { toast } from "sonner";
import { calculateExactAge } from "@/lib/ageCalculator";
import { formatDate } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ChildRegisterSectionProps {
  children: Child[];
  onEdit: (child: Child) => void;
  onDelete: (childId: string) => void;
  onViewVaccines: (child: Child) => void;
  onBulkVaccination?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canAdministerVaccines?: boolean;
  highlightedRegNo?: string;
}

export function ChildRegisterSection({ 
  children, 
  onEdit, 
  onDelete, 
  onViewVaccines, 
  onBulkVaccination,
  canEdit = true, 
  canDelete = true,
  canAdministerVaccines = true,
  highlightedRegNo
}: ChildRegisterSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showChildren, setShowChildren] = useState(true);
  const [showInactiveChildren, setShowInactiveChildren] = useState(true);

  // Auto-search when highlightedRegNo changes
  useEffect(() => {
    if (highlightedRegNo) {
      setSearchTerm(highlightedRegNo);
      setShowChildren(true);
    }
  }, [highlightedRegNo]);

  const filteredChildren = useMemo(() => {
    let result = children;
    
    // Filter out inactive children if toggle is off
    if (!showInactiveChildren) {
      result = result.filter(child => 
        child.transferStatus !== 'traveled_out' && child.transferStatus !== 'moved_out'
      );
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(child =>
        child.name.toLowerCase().includes(term) ||
        child.regNo.toLowerCase().includes(term) ||
        child.telephoneAddress.toLowerCase().includes(term) ||
        child.motherName.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [children, searchTerm, showInactiveChildren]);

  // Count active vs inactive
  const { activeCount, inactiveCount } = useMemo(() => {
    const inactive = children.filter(c => 
      c.transferStatus === 'traveled_out' || c.transferStatus === 'moved_out'
    ).length;
    return { activeCount: children.length - inactive, inactiveCount: inactive };
  }, [children]);


  const getNextVisit = (child: Child) => {
    const pendingVaccines = child.vaccines.filter(v => v.status === 'pending');
    if (pendingVaccines.length === 0) return null;
    
    const sorted = pendingVaccines.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    return sorted[0];
  };

  const getStatus = (child: Child) => {
    // Check transfer status first - inactive takes priority
    if (child.transferStatus === 'traveled_out' || child.transferStatus === 'moved_out') {
      return { 
        label: child.transferStatus === 'moved_out' ? 'Moved Out' : 'Traveled Out', 
        variant: 'secondary' as const,
        isInactive: true
      };
    }

    const hasOverdue = child.vaccines.some(v => v.status === 'overdue');
    const allCompleted = child.vaccines.every(v => v.status === 'completed');
    const hasPending = child.vaccines.some(v => v.status === 'pending');
    
    if (hasOverdue) return { label: 'Defaulter', variant: 'destructive' as const, isInactive: false };
    if (allCompleted) return { label: 'Completed', variant: 'default' as const, isInactive: false };
    if (hasPending) {
      const nextVisit = getNextVisit(child);
      if (nextVisit) {
        const dueDate = new Date(nextVisit.dueDate);
        const today = new Date();
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil <= 7) return { label: 'Due Soon', variant: 'secondary' as const, isInactive: false };
      }
      return { label: 'Active', variant: 'outline' as const, isInactive: false };
    }
    return { label: 'Active', variant: 'outline' as const, isInactive: false };
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-card rounded-lg p-6 shadow-elevation-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">
              📋 Child Health Register (0-59 months)
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChildren(!showChildren)}
              className="flex items-center gap-1"
            >
              {showChildren ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  <span className="hidden sm:inline">Hide</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Show</span>
                </>
              )}
            </Button>
          </div>
          
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                  {!showInactiveChildren && <Badge variant="secondary" className="ml-2 text-xs">Active Only</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem
                  checked={showInactiveChildren}
                  onCheckedChange={setShowInactiveChildren}
                >
                  Show Inactive Children ({inactiveCount})
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canAdministerVaccines && onBulkVaccination && (
              <Button 
                onClick={onBulkVaccination}
                className="gradient-ghs text-primary-foreground"
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                Outreach Session
              </Button>
            )}
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

        <Collapsible open={showChildren} onOpenChange={setShowChildren}>
          <CollapsibleContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Reg No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Age</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Caregiver</th>
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
                      const isHighlighted = highlightedRegNo && child.regNo === highlightedRegNo;
                      const isInactive = status.isInactive;
                      
                      return (
                        <tr 
                          key={child.id} 
                          className={`hover:bg-muted/50 transition-colors ${isHighlighted ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''} ${isInactive ? 'opacity-60 bg-muted/30' : ''}`}
                        >
                          <td className="px-4 py-3 text-sm font-medium">{child.regNo}</td>
                          <td className="px-4 py-3 text-sm">
                            {child.name}
                            {isInactive && child.currentLocation && (
                              <span className="block text-xs text-muted-foreground">
                                📍 {child.currentLocation}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">{calculateExactAge(child.dateOfBirth)}</td>
                          <td className="px-4 py-3 text-sm">{child.motherName}</td>
                          <td className="px-4 py-3 text-sm">{child.telephoneAddress}</td>
                          <td className="px-4 py-3 text-sm">
                            {isInactive ? (
                              <span className="text-xs text-muted-foreground italic">Inactive</span>
                            ) : nextVisit ? (
                              <span className="text-xs">
                                {nextVisit.name} - {formatDate(nextVisit.dueDate)}
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
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => onEdit(child)}
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => onDelete(child.id)}
                                  title="Archive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Showing {filteredChildren.length} of {children.length} children</span>
            <span className="text-xs">
              <Badge variant="outline" className="mr-1">{activeCount} Active</Badge>
              {inactiveCount > 0 && (
                <Badge variant="secondary">{inactiveCount} Inactive</Badge>
              )}
            </span>
          </div>
          {!showChildren && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowChildren(true)}
              className="text-primary"
            >
              <Eye className="w-4 h-4 mr-1" />
              Show Register
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
