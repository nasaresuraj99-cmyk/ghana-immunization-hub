import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Save, X, Syringe, AlertTriangle } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VaccineRecord } from "@/types/child";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VaccineEditModalProps {
  vaccine: VaccineRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedVaccine: VaccineRecord) => void;
  canEdit?: boolean;
}

export function VaccineEditModal({
  vaccine,
  isOpen,
  onClose,
  onSave,
  canEdit = true,
}: VaccineEditModalProps) {
  const [givenDate, setGivenDate] = useState<Date | undefined>();
  const [batchNumber, setBatchNumber] = useState("");
  const [status, setStatus] = useState<VaccineRecord["status"]>("completed");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset form when vaccine changes
  useEffect(() => {
    if (vaccine) {
      setGivenDate(vaccine.givenDate ? new Date(vaccine.givenDate) : undefined);
      setBatchNumber(vaccine.batchNumber || "");
      setStatus(vaccine.status);
    }
  }, [vaccine]);

  if (!vaccine) return null;

  const handleSave = async () => {
    if (!canEdit) return;
    
    setIsSaving(true);
    
    try {
      const updatedVaccine: VaccineRecord = {
        ...vaccine,
        givenDate: givenDate ? format(givenDate, "yyyy-MM-dd") : undefined,
        batchNumber: batchNumber.trim() || undefined,
        status: status,
      };

      // If status is completed but no given date, set to today
      if (status === "completed" && !updatedVaccine.givenDate) {
        updatedVaccine.givenDate = format(new Date(), "yyyy-MM-dd");
      }

      // If status is not completed, clear given date
      if (status !== "completed") {
        updatedVaccine.givenDate = undefined;
        updatedVaccine.batchNumber = undefined;
        updatedVaccine.administeredBy = undefined;
        updatedVaccine.administeredByUserId = undefined;
      }

      onSave(updatedVaccine);
      toast.success(`${vaccine.name} updated successfully`);
      onClose();
    } catch (error) {
      toast.error("Failed to update vaccine");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset to original values
    if (vaccine) {
      setGivenDate(vaccine.givenDate ? new Date(vaccine.givenDate) : undefined);
      setBatchNumber(vaccine.batchNumber || "");
      setStatus(vaccine.status);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Syringe className="w-5 h-5 text-primary" />
            Edit Vaccination Record
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Read-only notice */}
          {!canEdit && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                You don't have permission to edit vaccination records.
              </p>
            </div>
          )}

          {/* Vaccine Name */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Vaccine</Label>
            <div className="p-3 rounded-lg bg-muted/50 font-medium">
              {vaccine.name}
            </div>
          </div>

          {/* Due Date (read-only) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Due Date</Label>
            <div className="p-3 rounded-lg bg-muted/50">
              {new Date(vaccine.dueDate).toLocaleDateString()}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as VaccineRecord["status"])}
              disabled={!canEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-ghs-green" />
                    Completed
                  </span>
                </SelectItem>
                <SelectItem value="pending">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Pending
                  </span>
                </SelectItem>
                <SelectItem value="overdue">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    Overdue
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Given Date - only show if status is completed */}
          {status === "completed" && (
            <div className="space-y-2">
              <Label htmlFor="givenDate">Date Given</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!canEdit}
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
          )}

          {/* Batch Number - only show if status is completed */}
          {status === "completed" && (
            <div className="space-y-2">
              <Label htmlFor="batchNumber">Batch Number (optional)</Label>
              <Input
                id="batchNumber"
                placeholder="e.g., BCG-2024-001"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          )}

          {/* Administered By - read only if exists */}
          {vaccine.administeredBy && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Administered By</Label>
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                {vaccine.administeredBy}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
