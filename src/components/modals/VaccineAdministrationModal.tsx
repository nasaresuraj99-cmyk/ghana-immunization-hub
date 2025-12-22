import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Syringe, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Child, VaccineRecord } from "@/types/child";
import { cn } from "@/lib/utils";

interface VaccineAdministrationModalProps {
  child: Child | null;
  isOpen: boolean;
  onClose: () => void;
  onAdminister: (childId: string, vaccineName: string, givenDate: string, batchNumber: string) => void;
}

export function VaccineAdministrationModal({
  child,
  isOpen,
  onClose,
  onAdminister,
}: VaccineAdministrationModalProps) {
  const [selectedVaccine, setSelectedVaccine] = useState<VaccineRecord | null>(null);
  const [givenDate, setGivenDate] = useState<Date | undefined>(new Date());
  const [batchNumber, setBatchNumber] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleAdminister = () => {
    if (!child || !selectedVaccine || !givenDate) return;
    
    onAdminister(
      child.id,
      selectedVaccine.name,
      format(givenDate, "yyyy-MM-dd"),
      batchNumber.trim()
    );
    
    // Reset form
    setSelectedVaccine(null);
    setGivenDate(new Date());
    setBatchNumber("");
  };

  const handleClose = () => {
    setSelectedVaccine(null);
    setGivenDate(new Date());
    setBatchNumber("");
    onClose();
  };

  const getStatusBadge = (status: VaccineRecord['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-ghs-green">Completed</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const pendingVaccines = child?.vaccines.filter(v => v.status !== 'completed') || [];
  const completedVaccines = child?.vaccines.filter(v => v.status === 'completed') || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Syringe className="w-5 h-5" />
            Vaccine Administration - {child?.name}
          </DialogTitle>
        </DialogHeader>

        {child && (
          <div className="space-y-6">
            {/* Child Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Reg No:</span>
                  <p className="font-medium">{child.regNo}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">DOB:</span>
                  <p className="font-medium">{new Date(child.dateOfBirth).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Mother:</span>
                  <p className="font-medium">{child.motherName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Progress:</span>
                  <p className="font-medium">{completedVaccines.length}/{child.vaccines.length} vaccines</p>
                </div>
              </div>
            </div>

            {/* Vaccine Selection */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">
                Select Vaccine to Administer
              </Label>
              
              {pendingVaccines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Check className="w-12 h-12 mx-auto mb-2 text-ghs-green" />
                  <p>All vaccines have been administered!</p>
                </div>
              ) : (
                <div className="grid gap-2 max-h-48 overflow-y-auto">
                  {pendingVaccines.map((vaccine) => (
                    <button
                      key={vaccine.name}
                      onClick={() => setSelectedVaccine(vaccine)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border transition-all text-left",
                        selectedVaccine?.name === vaccine.name
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Syringe className={cn(
                          "w-4 h-4",
                          selectedVaccine?.name === vaccine.name ? "text-primary" : "text-muted-foreground"
                        )} />
                        <div>
                          <p className="font-medium text-sm">{vaccine.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(vaccine.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(vaccine.status)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Administration Form */}
            {selectedVaccine && (
              <div className="border-t pt-4 space-y-4 animate-fade-in">
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <p className="font-semibold text-primary">
                    Administering: {selectedVaccine.name}
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="givenDate">Date Given *</Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !givenDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {givenDate ? format(givenDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={givenDate}
                          onSelect={(date) => {
                            setGivenDate(date);
                            setIsCalendarOpen(false);
                          }}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batchNumber">Batch Number</Label>
                    <Input
                      id="batchNumber"
                      placeholder="e.g., BCG-2024-001"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleAdminister}
                    disabled={!givenDate}
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Confirm Administration
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedVaccine(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Completed Vaccines */}
            {completedVaccines.length > 0 && (
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-3 block text-muted-foreground">
                  Completed Vaccines ({completedVaccines.length})
                </Label>
                <div className="grid gap-2 max-h-32 overflow-y-auto">
                  {completedVaccines.map((vaccine) => (
                    <div
                      key={vaccine.name}
                      className="flex items-center justify-between p-2 rounded-lg bg-ghs-green/10 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-ghs-green" />
                        <span>{vaccine.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {vaccine.batchNumber && (
                          <span>Batch: {vaccine.batchNumber}</span>
                        )}
                        <span>
                          {vaccine.givenDate && new Date(vaccine.givenDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
