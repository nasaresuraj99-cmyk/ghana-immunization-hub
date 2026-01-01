import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Child } from "@/types/child";
import { ArrowRightLeft, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

interface ChildTransferModalProps {
  child: Child | null;
  isOpen: boolean;
  onClose: () => void;
  onTransferOut: (childId: string, destination: string, reason: string, transferDate: string) => void;
  onTransferIn: (childData: Partial<Child>, source: string, reason: string, transferDate: string) => void;
  mode: 'in' | 'out';
}

export function ChildTransferModal({
  child,
  isOpen,
  onClose,
  onTransferOut,
  onTransferIn,
  mode,
}: ChildTransferModalProps) {
  const [destination, setDestination] = useState("");
  const [source, setSource] = useState("");
  const [reason, setReason] = useState<string>("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");

  const reasons = [
    "Traveled temporarily",
    "Moved permanently",
    "Family relocation",
    "Returned from travel",
    "Moved in from another facility",
    "Other",
  ];

  const handleSubmit = () => {
    if (mode === 'out' && child) {
      if (!destination.trim()) {
        toast.error("Please enter the destination facility/location");
        return;
      }
      if (!reason) {
        toast.error("Please select a reason");
        return;
      }
      onTransferOut(child.id, destination, `${reason}${notes ? ': ' + notes : ''}`, transferDate);
      toast.success(`${child.name} marked as traveled out`);
    } else if (mode === 'in') {
      if (!source.trim()) {
        toast.error("Please enter the source facility/location");
        return;
      }
      if (!reason) {
        toast.error("Please select a reason");
        return;
      }
      if (child) {
        onTransferIn(child, source, `${reason}${notes ? ': ' + notes : ''}`, transferDate);
        toast.success(`${child.name} marked as traveled in`);
      }
    }
    handleClose();
  };

  const handleClose = () => {
    setDestination("");
    setSource("");
    setReason("");
    setTransferDate(new Date().toISOString().split('T')[0]);
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            {mode === 'out' ? 'Child Traveled Out / Moved Out' : 'Child Traveled In / Moved In'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {child && (
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="font-medium">{child.name}</p>
              <p className="text-sm text-muted-foreground">{child.regNo}</p>
            </div>
          )}

          {mode === 'out' ? (
            <div className="space-y-2">
              <Label htmlFor="destination">
                <MapPin className="w-4 h-4 inline mr-1" />
                Destination Facility/Location
              </Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter destination facility or location"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="source">
                <MapPin className="w-4 h-4 inline mr-1" />
                Source Facility/Location
              </Label>
              <Input
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Enter source facility or location"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="transferDate">
              <Calendar className="w-4 h-4 inline mr-1" />
              Transfer Date
            </Label>
            <Input
              id="transferDate"
              type="date"
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {mode === 'out' ? 'Mark as Traveled Out' : 'Mark as Traveled In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
