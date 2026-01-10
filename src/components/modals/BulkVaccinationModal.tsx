import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Syringe,
  Search,
  CalendarIcon,
  CheckCircle,
  Users,
  AlertTriangle,
  FileText,
  MapPin,
  Clock,
  AlertCircle,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { Child, VaccineRecord } from "@/types/child";
import { cn, formatDate } from "@/lib/utils";
import { exportOutreachSessionReport, OutreachVaccinationRecord } from "@/lib/pdfExport";
import { 
  getAllVaccineNames, 
  checkVaccineEligibility, 
  EligibilityResult,
  getNextDueVaccines 
} from "@/lib/ghanaEpiSchedule";

interface BulkVaccinationModalProps {
  children: Child[];
  isOpen: boolean;
  onClose: () => void;
  onAdminister: (
    childIds: string[],
    vaccineName: string,
    date: string,
    batchNumber: string,
    outreachDetails?: OutreachSessionDetails
  ) => Promise<void>;
  facilityName?: string;
}

export interface OutreachSessionDetails {
  sessionId: string;
  outreachSite: string;
  sessionDate: string;
  vaccineName: string;
  batchNumber: string;
  conductedBy?: string;
  status: 'in_progress' | 'completed';
  childCount: number;
  maleCount: number;
  femaleCount: number;
}

interface EligibleChild {
  child: Child;
  eligibility: EligibilityResult;
}

// Get unique communities from children for outreach site filtering
function getUniqueCommunities(children: Child[]): string[] {
  const communities = new Set<string>();
  children.forEach(child => {
    if (child.community && child.community.trim()) {
      communities.add(child.community.trim());
    }
  });
  return Array.from(communities).sort();
}

export function BulkVaccinationModal({
  children,
  isOpen,
  onClose,
  onAdminister,
  facilityName = "Health Facility",
}: BulkVaccinationModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVaccine, setSelectedVaccine] = useState("");
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set());
  const [date, setDate] = useState<Date>(new Date());
  const [batchNumber, setBatchNumber] = useState("");
  const [outreachSite, setOutreachSite] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [lastSessionData, setLastSessionData] = useState<{
    records: OutreachVaccinationRecord[];
    sessionDetails: {
      sessionId: string;
      vaccineName: string;
      sessionDate: string;
      batchNumber: string;
      outreachSite: string;
      totalChildren: number;
      totalMales: number;
      totalFemales: number;
    };
  } | null>(null);

  // Get all vaccines from Ghana EPI schedule
  const allVaccines = useMemo(() => getAllVaccineNames(), []);
  
  // Get unique communities for site filtering
  const communities = useMemo(() => getUniqueCommunities(children), [children]);

  // Filter only active children (not deleted, not transferred out)
  const activeChildren = useMemo(() => {
    return children.filter(child => {
      // Must not be deleted
      if (child.isDeleted) return false;
      // Must not have transferred/traveled out status
      if (child.transferStatus === 'traveled_out' || child.transferStatus === 'moved_out') return false;
      return true;
    });
  }, [children]);

  // Filter children who are eligible for selected vaccine with full EPI compliance
  const eligibleChildren = useMemo((): EligibleChild[] => {
    if (!selectedVaccine) return [];
    
    return activeChildren
      .map(child => {
        const eligibility = checkVaccineEligibility(
          child.dateOfBirth,
          selectedVaccine,
          child.vaccines,
          date // Use outreach date for eligibility check
        );
        return { child, eligibility };
      })
      .filter(({ eligibility }) => 
        eligibility.status === 'due' || eligibility.status === 'overdue'
      )
      .sort((a, b) => {
        // Sort overdue first, then by days overdue
        if (a.eligibility.status === 'overdue' && b.eligibility.status !== 'overdue') return -1;
        if (b.eligibility.status === 'overdue' && a.eligibility.status !== 'overdue') return 1;
        return (b.eligibility.daysOverdue || 0) - (a.eligibility.daysOverdue || 0);
      });
  }, [activeChildren, selectedVaccine, date]);

  // Filter by outreach site (community)
  const siteFilteredChildren = useMemo(() => {
    if (outreachSite === "all") return eligibleChildren;
    return eligibleChildren.filter(({ child }) => 
      child.community?.toLowerCase() === outreachSite.toLowerCase()
    );
  }, [eligibleChildren, outreachSite]);

  // Filter by search term
  const filteredChildren = useMemo(() => {
    if (!searchTerm) return siteFilteredChildren;
    const term = searchTerm.toLowerCase().trim();
    return siteFilteredChildren.filter(({ child }) =>
      child.name.toLowerCase().includes(term) ||
      child.regNo.toLowerCase().includes(term) ||
      (child.motherName || "").toLowerCase().includes(term) ||
      (child.community || "").toLowerCase().includes(term)
    );
  }, [siteFilteredChildren, searchTerm]);

  // Count statistics
  const stats = useMemo(() => {
    const overdueCount = filteredChildren.filter(
      ({ eligibility }) => eligibility.status === 'overdue'
    ).length;
    const dueCount = filteredChildren.filter(
      ({ eligibility }) => eligibility.status === 'due'
    ).length;
    return { overdueCount, dueCount, total: overdueCount + dueCount };
  }, [filteredChildren]);

  const toggleChild = useCallback((childId: string) => {
    setSelectedChildren(prev => {
      const next = new Set(prev);
      if (next.has(childId)) {
        next.delete(childId);
      } else {
        next.add(childId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedChildren(new Set(filteredChildren.map(({ child }) => child.id)));
  }, [filteredChildren]);

  const clearSelection = useCallback(() => {
    setSelectedChildren(new Set());
  }, []);

  const validateBatchNumber = (value: string): boolean => {
    // Basic validation: must be non-empty and follow pattern
    if (!value.trim()) return false;
    // Allow alphanumeric with hyphens and underscores, 3-50 chars
    return /^[A-Za-z0-9\-_]{3,50}$/.test(value.trim());
  };

  const handleSubmit = async () => {
    if (selectedChildren.size === 0 || !selectedVaccine || !batchNumber) return;
    
    // Validate batch number
    if (!validateBatchNumber(batchNumber)) {
      return; // Could show toast here
    }

    setIsSubmitting(true);
    try {
      const sessionId = `outreach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const selectedChildrenList = activeChildren.filter(c => selectedChildren.has(c.id));
      
      // Count males and females
      const totalMales = selectedChildrenList.filter(
        c => c.sex.toLowerCase() === "male" || c.sex.toLowerCase() === "m"
      ).length;
      const totalFemales = selectedChildrenList.filter(
        c => c.sex.toLowerCase() === "female" || c.sex.toLowerCase() === "f"
      ).length;
      
      const outreachDetails: OutreachSessionDetails = {
        sessionId,
        outreachSite: outreachSite === "all" ? "Multiple Sites" : outreachSite,
        sessionDate: date.toISOString(),
        vaccineName: selectedVaccine,
        batchNumber: batchNumber.trim(),
        status: 'completed',
        childCount: selectedChildren.size,
        maleCount: totalMales,
        femaleCount: totalFemales,
      };
      
      await onAdminister(
        Array.from(selectedChildren),
        selectedVaccine,
        date.toISOString(),
        batchNumber.trim(),
        outreachDetails
      );
      
      // Store session data for report generation (read-only after completion)
      const records: OutreachVaccinationRecord[] = selectedChildrenList.map(child => ({
        childId: child.id,
        childName: child.name,
        regNo: child.regNo,
        motherName: child.motherName,
        community: child.community,
        vaccine: selectedVaccine,
        dateGiven: date.toISOString(),
        batchNumber: batchNumber.trim(),
        dateOfBirth: child.dateOfBirth,
      }));
      
      setLastSessionData({
        records,
        sessionDetails: {
          sessionId,
          vaccineName: selectedVaccine,
          sessionDate: date.toISOString(),
          batchNumber: batchNumber.trim(),
          outreachSite: outreachSite === "all" ? "Multiple Sites" : outreachSite,
          totalChildren: selectedChildren.size,
          totalMales,
          totalFemales,
        },
      });
      
      setSessionCompleted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportReport = () => {
    if (lastSessionData) {
      exportOutreachSessionReport(
        lastSessionData.records,
        lastSessionData.sessionDetails,
        { facilityName }
      );
    }
  };

  const resetForm = () => {
    setSelectedVaccine("");
    setSelectedChildren(new Set());
    setBatchNumber("");
    setSearchTerm("");
    setOutreachSite("all");
    setDate(new Date());
    setSessionCompleted(false);
  };

  const handleClose = () => {
    resetForm();
    setLastSessionData(null);
    onClose();
  };

  const startNewSession = () => {
    resetForm();
    setLastSessionData(null);
  };

  // Show completed session (read-only view)
  if (sessionCompleted && lastSessionData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-green-500">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              Outreach Session Complete
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Successfully vaccinated {lastSessionData.sessionDetails.totalChildren} children
              </p>
              <div className="mt-2 space-y-1 text-xs text-green-600 dark:text-green-400">
                <p>Males: {lastSessionData.sessionDetails.totalMales} • Females: {lastSessionData.sessionDetails.totalFemales}</p>
                <p>Vaccine: {lastSessionData.sessionDetails.vaccineName}</p>
                <p>Batch: {lastSessionData.sessionDetails.batchNumber}</p>
                <p>Site: {lastSessionData.sessionDetails.outreachSite}</p>
                <p>Date: {formatDate(new Date(lastSessionData.sessionDetails.sessionDate))}</p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Session ID: {lastSessionData.sessionDetails.sessionId}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  This session is now read-only. All vaccinations have been recorded 
                  in the children's immunization history.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleExportReport} className="w-full gradient-ghs text-primary-foreground">
                <FileText className="w-4 h-4 mr-2" />
                Export Outreach Report (PDF)
              </Button>
              <Button variant="outline" onClick={startNewSession} className="w-full">
                <Syringe className="w-4 h-4 mr-2" />
                Start New Session
              </Button>
              <Button variant="ghost" onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg gradient-ghs">
              <Syringe className="w-5 h-5 text-primary-foreground" />
            </div>
            Outreach Vaccination Session
            <Badge variant="secondary" className="ml-2">
              Ghana EPI Compliant
            </Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Automatically filters children based on age, previous doses, and minimum intervals per Ghana EPI schedule.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column - Session Setup */}
          <div className="space-y-4 overflow-y-auto pr-2">
            {/* Step 1: Session Details */}
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full gradient-ghs text-primary-foreground flex items-center justify-center text-xs">
                  1
                </span>
                Session Details
              </Label>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Outreach Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" /> Outreach Date
                  </Label>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-9"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatDate(date)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(d) => {
                          if (d) {
                            setDate(d);
                            setShowCalendar(false);
                            setSelectedChildren(new Set());
                          }
                        }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Outreach Site */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Outreach Site (Community)
                  </Label>
                  <Select value={outreachSite} onValueChange={(val) => {
                    setOutreachSite(val);
                    setSelectedChildren(new Set());
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select community" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Communities</SelectItem>
                      {communities.map((community) => (
                        <SelectItem key={community} value={community}>
                          {community}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Batch Number */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Vaccine Batch Number *</Label>
                  <Input
                    placeholder="e.g., BCG-2024-001"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="h-9"
                    maxLength={50}
                  />
                  {batchNumber && !validateBatchNumber(batchNumber) && (
                    <p className="text-[10px] text-destructive">
                      3-50 alphanumeric characters, hyphens, underscores only
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2: Select Vaccine */}
            <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full gradient-ghs text-primary-foreground flex items-center justify-center text-xs">
                  2
                </span>
                Select Vaccine
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {allVaccines.map((vaccine) => {
                  // Count eligible children for this vaccine
                  const eligibleCount = activeChildren.filter(child => {
                    const elig = checkVaccineEligibility(child.dateOfBirth, vaccine, child.vaccines, date);
                    return elig.status === 'due' || elig.status === 'overdue';
                  }).length;
                  
                  return (
                    <button
                      key={vaccine}
                      onClick={() => {
                        setSelectedVaccine(vaccine);
                        setSelectedChildren(new Set());
                      }}
                      className={cn(
                        "px-3 py-2 text-xs rounded-lg border transition-all text-left relative",
                        selectedVaccine === vaccine
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                      )}
                    >
                      <span>{vaccine}</span>
                      {eligibleCount > 0 && (
                        <Badge 
                          variant={selectedVaccine === vaccine ? "secondary" : "outline"}
                          className="absolute -top-1.5 -right-1.5 h-5 min-w-5 text-[10px] px-1"
                        >
                          {eligibleCount}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selection Summary */}
            {selectedChildren.size > 0 && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">
                      {selectedChildren.size} children selected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ready for {selectedVaccine} vaccination
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Children List (Always Visible) */}
          <div className="flex flex-col border rounded-lg bg-background overflow-hidden">
            <div className="p-3 border-b bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full gradient-ghs text-primary-foreground flex items-center justify-center text-xs">
                    3
                  </span>
                  {selectedVaccine ? `Children Due for ${selectedVaccine}` : "Select a Vaccine First"}
                </Label>
              </div>
              
              {selectedVaccine && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {stats.overdueCount} Overdue
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {stats.dueCount} Due
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {stats.total} Total
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, reg no, caregiver..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-8 text-sm"
                        maxLength={100}
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={selectAll} disabled={filteredChildren.length === 0} className="h-8 text-xs">
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      disabled={selectedChildren.size === 0}
                      className="h-8 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Children List */}
            <ScrollArea className="flex-1 min-h-[300px]">
              {!selectedVaccine ? (
                <div className="p-8 text-center">
                  <Syringe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Select a vaccine to see eligible children
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The list will show only children who are due or overdue
                  </p>
                </div>
              ) : filteredChildren.length === 0 ? (
                <div className="p-8 text-center">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No children are eligible for {selectedVaccine}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {outreachSite !== "all" && "Try selecting 'All Communities' or "}
                    Children may have already received it, not yet due, or missing previous doses.
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredChildren.map(({ child, eligibility }) => {
                    const isSelected = selectedChildren.has(child.id);

                    return (
                      <div
                        key={child.id}
                        onClick={() => toggleChild(child.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected
                            ? "bg-primary/10 border-primary shadow-sm"
                            : "hover:bg-muted border-border"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleChild(child.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {child.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {child.regNo} • {child.motherName}
                          </p>
                          {child.community && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {child.community}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            variant={eligibility.status === "overdue" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {eligibility.status === "overdue" ? "Overdue" : "Due"}
                          </Badge>
                          {eligibility.daysOverdue && eligibility.daysOverdue > 0 && (
                            <span className="text-[10px] text-destructive font-medium">
                              {eligibility.daysOverdue} days overdue
                            </span>
                          )}
                          {eligibility.reason && (
                            <span className="text-[10px] text-muted-foreground max-w-[100px] text-right truncate">
                              {eligibility.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              {selectedVaccine && stats.total > 0 && (
                <span>
                  Showing {filteredChildren.length} of {stats.total} eligible children
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  selectedChildren.size === 0 || 
                  !selectedVaccine || 
                  !batchNumber || 
                  !validateBatchNumber(batchNumber) ||
                  isSubmitting
                }
                className="gradient-ghs text-primary-foreground"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Syringe className="w-4 h-4 mr-2" />
                    Administer to {selectedChildren.size} Children
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
