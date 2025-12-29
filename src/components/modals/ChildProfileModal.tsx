import { useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Calendar, 
  Phone, 
  MapPin, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Syringe,
  FileText,
  Eye
} from "lucide-react";
import { Child } from "@/types/child";
import { exportImmunizationCard } from "@/lib/pdfExport";
import { toast } from "sonner";
import { calculateExactAge } from "@/lib/ageCalculator";

interface ChildProfileModalProps {
  child: Child | null;
  isOpen: boolean;
  onClose: () => void;
  onAdministerVaccine: (child: Child) => void;
  onViewImmunizationStatus?: (child: Child) => void;
}

export function ChildProfileModal({ 
  child, 
  isOpen, 
  onClose, 
  onAdministerVaccine,
  onViewImmunizationStatus
}: ChildProfileModalProps) {
  if (!child) return null;

  const vaccineStats = useMemo(() => {
    const completed = child.vaccines.filter(v => v.status === 'completed').length;
    const pending = child.vaccines.filter(v => v.status === 'pending').length;
    const overdue = child.vaccines.filter(v => v.status === 'overdue').length;
    const total = child.vaccines.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, pending, overdue, total, progress };
  }, [child]);

  const nextVaccines = useMemo(() => {
    const today = new Date();
    return child.vaccines
      .filter(v => v.status === 'pending')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [child]);

  const overdueVaccines = useMemo(() => {
    return child.vaccines.filter(v => v.status === 'overdue');
  }, [child]);

  const recentVaccines = useMemo(() => {
    return child.vaccines
      .filter(v => v.status === 'completed' && v.givenDate)
      .sort((a, b) => new Date(b.givenDate!).getTime() - new Date(a.givenDate!).getTime())
      .slice(0, 5);
  }, [child]);

  const handlePrintCard = async () => {
    toast.loading("Generating immunization card...");
    await exportImmunizationCard(child);
    toast.dismiss();
    toast.success("Immunization card downloaded!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Child Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Child Info Header */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">{child.name}</h3>
                <p className="text-sm text-muted-foreground">{child.regNo}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {calculateExactAge(child.dateOfBirth)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {child.motherName}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {child.telephoneAddress}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {child.community}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Vaccination Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Vaccination Progress</span>
              <span className="text-sm font-bold text-primary">{vaccineStats.progress}%</span>
            </div>
            <Progress value={vaccineStats.progress} className="h-3" />
            <div className="flex justify-between mt-2 text-xs">
              <span className="flex items-center gap-1 text-success">
                <CheckCircle className="w-3 h-3" />
                {vaccineStats.completed} completed
              </span>
              <span className="flex items-center gap-1 text-info">
                <Clock className="w-3 h-3" />
                {vaccineStats.pending} pending
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <AlertTriangle className="w-3 h-3" />
                {vaccineStats.overdue} overdue
              </span>
            </div>
          </div>

          {/* Overdue Vaccines Warning */}
          {overdueVaccines.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="font-medium text-destructive">Overdue Vaccines ({overdueVaccines.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {overdueVaccines.map(v => (
                  <Badge key={v.name} variant="destructive" className="text-xs">
                    {v.name.split(' at ')[0]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Next Due Vaccines */}
          {nextVaccines.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-info" />
                Next Due Vaccines
              </h4>
              <div className="space-y-2">
                {nextVaccines.map(v => (
                  <div key={v.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-sm">{v.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(v.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Vaccinations */}
          {recentVaccines.length > 0 && (
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Recent Vaccinations
              </h4>
              <div className="space-y-2">
                {recentVaccines.map(v => (
                  <div key={v.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <span className="text-sm">{v.name}</span>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">
                        {new Date(v.givenDate!).toLocaleDateString()}
                      </span>
                      {v.batchNumber && (
                        <span className="text-xs text-muted-foreground">
                          Batch: {v.batchNumber}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            {onViewImmunizationStatus && (
              <Button 
                onClick={() => onViewImmunizationStatus(child)} 
                variant="outline"
                className="flex-1 border-ghs-green text-ghs-green hover:bg-ghs-green hover:text-white"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Status & Edit
              </Button>
            )}
            <Button onClick={() => onAdministerVaccine(child)} className="flex-1">
              <Syringe className="w-4 h-4 mr-2" />
              Administer Vaccine
            </Button>
            <Button variant="outline" onClick={handlePrintCard} className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Print Card
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
