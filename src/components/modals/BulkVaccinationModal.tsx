import { useState, useMemo } from "react";
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
  Syringe,
  Search,
  CalendarIcon,
  CheckCircle,
  Users,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Child, VaccineRecord } from "@/types/child";
import { cn } from "@/lib/utils";
import { exportOutreachSessionReport, OutreachVaccinationRecord } from "@/lib/pdfExport";

interface BulkVaccinationModalProps {
  children: Child[];
  isOpen: boolean;
  onClose: () => void;
  onAdminister: (
    childIds: string[],
    vaccineName: string,
    date: string,
    batchNumber: string
  ) => Promise<void>;
  facilityName?: string;
}

// Common vaccines for bulk administration
const COMMON_VACCINES = [
  "BCG at Birth",
  "OPV 0 at Birth",
  "OPV 1 at 6 weeks",
  "Penta 1 at 6 weeks",
  "PCV 1 at 6 weeks",
  "Rota 1 at 6 weeks",
  "OPV 2 at 10 weeks",
  "Penta 2 at 10 weeks",
  "PCV 2 at 10 weeks",
  "Rota 2 at 10 weeks",
  "OPV 3 at 14 weeks",
  "Penta 3 at 14 weeks",
  "PCV 3 at 14 weeks",
  "IPV at 14 weeks",
  "Vitamin A (Blue) at 6 months",
  "Vitamin A (Red) at 12 months",
  "Measles-Rubella 1 at 9 months",
  "Measles-Rubella 2 at 18 months",
  "Yellow Fever at 9 months",
  "Meningitis A at 18 months",
];

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [lastSessionData, setLastSessionData] = useState<{
    records: OutreachVaccinationRecord[];
    sessionDetails: {
      vaccineName: string;
      sessionDate: string;
      batchNumber: string;
      totalChildren: number;
      totalMales: number;
      totalFemales: number;
    };
  } | null>(null);

  // Filter children who are eligible for selected vaccine
  const eligibleChildren = useMemo(() => {
    if (!selectedVaccine) return [];
    return children.filter((child) => {
      const vaccine = child.vaccines.find(
        (v) => v.name === selectedVaccine && v.status !== "completed"
      );
      return vaccine !== undefined;
    });
  }, [children, selectedVaccine]);

  // Filter by search term
  const filteredChildren = useMemo(() => {
    if (!searchTerm) return eligibleChildren;
    const term = searchTerm.toLowerCase();
    return eligibleChildren.filter(
      (child) =>
        child.name.toLowerCase().includes(term) ||
        child.regNo.toLowerCase().includes(term) ||
        child.motherName.toLowerCase().includes(term)
    );
  }, [eligibleChildren, searchTerm]);

  const toggleChild = (childId: string) => {
    setSelectedChildren((prev) => {
      const next = new Set(prev);
      if (next.has(childId)) {
        next.delete(childId);
      } else {
        next.add(childId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedChildren(new Set(filteredChildren.map((c) => c.id)));
  };

  const clearSelection = () => {
    setSelectedChildren(new Set());
  };

  const handleSubmit = async () => {
    if (selectedChildren.size === 0 || !selectedVaccine || !batchNumber) return;

    setIsSubmitting(true);
    try {
      const selectedChildrenList = children.filter(c => selectedChildren.has(c.id));
      
      // Count males and females
      const totalMales = selectedChildrenList.filter(c => c.sex.toLowerCase() === "male" || c.sex.toLowerCase() === "m").length;
      const totalFemales = selectedChildrenList.filter(c => c.sex.toLowerCase() === "female" || c.sex.toLowerCase() === "f").length;
      
      await onAdminister(
        Array.from(selectedChildren),
        selectedVaccine,
        date.toISOString(),
        batchNumber
      );
      
      // Store session data for report generation
      const records: OutreachVaccinationRecord[] = selectedChildrenList.map(child => ({
        childId: child.id,
        childName: child.name,
        regNo: child.regNo,
        motherName: child.motherName,
        community: child.community,
        vaccine: selectedVaccine,
        dateGiven: date.toISOString(),
        batchNumber: batchNumber,
      }));
      
      setLastSessionData({
        records,
        sessionDetails: {
          vaccineName: selectedVaccine,
          sessionDate: date.toISOString(),
          batchNumber: batchNumber,
          totalChildren: selectedChildren.size,
          totalMales,
          totalFemales,
        },
      });
      
      resetForm();
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
    setDate(new Date());
  };

  const handleClose = () => {
    resetForm();
    setLastSessionData(null);
    onClose();
  };

  // Show success state after administration
  if (lastSessionData) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 rounded-lg bg-green-500">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              Session Complete
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Successfully vaccinated {lastSessionData.sessionDetails.totalChildren} children
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Males: {lastSessionData.sessionDetails.totalMales} • Females: {lastSessionData.sessionDetails.totalFemales}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Vaccine: {lastSessionData.sessionDetails.vaccineName}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Batch: {lastSessionData.sessionDetails.batchNumber}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleExportReport} className="w-full gradient-ghs text-primary-foreground">
                <FileText className="w-4 h-4 mr-2" />
                Export Outreach Report (PDF)
              </Button>
              <Button variant="outline" onClick={() => setLastSessionData(null)} className="w-full">
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg gradient-ghs">
              <Syringe className="w-5 h-5 text-primary-foreground" />
            </div>
            Bulk Vaccine Administration
            <Badge variant="secondary" className="ml-2">
              Outreach Session
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* Step 1: Select Vaccine */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <span className="w-6 h-6 rounded-full gradient-ghs text-primary-foreground flex items-center justify-center text-xs">
                1
              </span>
              Select Vaccine to Administer
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg bg-muted/30">
              {COMMON_VACCINES.map((vaccine) => (
                <button
                  key={vaccine}
                  onClick={() => {
                    setSelectedVaccine(vaccine);
                    setSelectedChildren(new Set());
                  }}
                  className={cn(
                    "px-3 py-2 text-xs rounded-lg border transition-all text-left",
                    selectedVaccine === vaccine
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  )}
                >
                  {vaccine}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Select Children */}
          {selectedVaccine && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full gradient-ghs text-primary-foreground flex items-center justify-center text-xs">
                  2
                </span>
                Select Children ({eligibleChildren.length} eligible)
              </Label>

              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, reg no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedChildren.size === 0}
                >
                  Clear
                </Button>
              </div>

              {eligibleChildren.length === 0 ? (
                <div className="p-8 text-center border rounded-lg bg-muted/30">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No children are eligible for this vaccine.
                    <br />
                    They may have already received it or it's not yet due.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-48 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredChildren.map((child) => {
                      const vaccine = child.vaccines.find(
                        (v) => v.name === selectedVaccine
                      );
                      const isSelected = selectedChildren.has(child.id);

                      return (
                        <div
                          key={child.id}
                          onClick={() => toggleChild(child.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                            isSelected
                              ? "bg-primary/10 border-primary"
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
                            <p className="text-xs text-muted-foreground">
                              {child.regNo} • Mother: {child.motherName}
                            </p>
                          </div>
                          <Badge
                            variant={
                              vaccine?.status === "overdue"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {vaccine?.status === "overdue" ? "Overdue" : "Due"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {selectedChildren.size > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {selectedChildren.size} children selected
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Date and Batch Number */}
          {selectedChildren.size > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="w-6 h-6 rounded-full gradient-ghs text-primary-foreground flex items-center justify-center text-xs">
                  3
                </span>
                Administration Details
              </Label>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Date</Label>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(date, "PPP")}
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
                          }
                        }}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Batch Number *</Label>
                  <Input
                    placeholder="e.g., BCG-2024-001"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              selectedChildren.size === 0 || !selectedVaccine || !batchNumber || isSubmitting
            }
            className="gradient-ghs text-primary-foreground"
          >
            {isSubmitting ? (
              <>
                <Syringe className="w-4 h-4 mr-2 animate-pulse" />
                Administering...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Administer to {selectedChildren.size} Children
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
