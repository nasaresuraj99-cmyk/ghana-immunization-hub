import { useState } from "react";
import { 
  Download, 
  X, 
  Award,
  QrCode,
  Calendar,
  User,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Child } from "@/types/child";
import { generateImmunizationCertificate, buildCompleteScheduleRows } from "@/lib/certificateExport";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { FACILITY_CONFIG } from "@/lib/facilityConfig";
import { useDocumentActivityLog } from "@/hooks/useDocumentActivityLog";
import { useAuth } from "@/hooks/useAuth";

interface CertificateModalProps {
  child: Child | null;
  isOpen: boolean;
  onClose: () => void;
  facilityName?: string;
  districtRegion?: string;
}

// Facility info is derived from the active signed-in user's facility
// (FACILITY_CONFIG reflects the authenticated user's facility)
const facilityName = FACILITY_CONFIG.name;
const districtRegion = FACILITY_CONFIG.districtRegion;

export function CertificateModal({
  child,
  isOpen,
  onClose,
}: CertificateModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { logDocumentGeneration } = useDocumentActivityLog();
  const { user } = useAuth();

  if (!child) return null;

  const allVaccines = buildCompleteScheduleRows(child);
  const completedVaccines = allVaccines.filter(v => v.status === "completed").length;
  const totalVaccines = allVaccines.length;
  const progress = totalVaccines > 0 ? Math.round((completedVaccines / totalVaccines) * 100) : 0;

  const isFullyImmunized = progress >= 100;

  // Calculate age in months
  const birthDate = new Date(child.dateOfBirth);
  const today = new Date();
  const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                      (today.getMonth() - birthDate.getMonth());

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateImmunizationCertificate(child, {
        facilityName,
        districtRegion,
      });
      
      // Log the document generation for audit trail
      if (user) {
        await logDocumentGeneration({
          userId: user.uid,
          userName: user.name || user.email || 'Unknown',
          documentType: 'certificate',
          documentName: `Immunization Certificate - ${child.name}`,
          childId: child.id,
          childRegNo: child.regNo,
          childName: child.name,
          format: 'pdf',
        });
      }
      
      toast.success("Certificate downloaded successfully!");
    } catch (error) {
      console.error("Certificate generation error:", error);
      toast.error("Failed to generate certificate");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Immunization Certificate
          </DialogTitle>
        </DialogHeader>

        {/* Certificate Preview */}
        <div className="border-2 border-primary/20 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-ghs-green to-ghs-green/90 text-white p-4">
            <div className="text-center">
              <p className="text-xs opacity-90">REPUBLIC OF GHANA</p>
              <p className="text-xs opacity-90">MINISTRY OF HEALTH</p>
              <div className="my-2 mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <span className="text-ghs-green font-bold text-sm">GHS</span>
              </div>
              <p className="text-xs opacity-90">GHANA HEALTH SERVICE</p>
            </div>
          </div>
          
          <div className="bg-ghs-gold h-1"></div>

          {/* Title */}
          <div className="bg-muted/30 p-3 text-center border-b">
            <h3 className="font-bold text-lg text-primary">
              CHILD IMMUNIZATION CERTIFICATE
            </h3>
            <p className="text-xs text-muted-foreground">(Children 0-59 Months)</p>
          </div>

          {/* Facility Info */}
          <div className="bg-muted/20 p-3 text-center border-b">
            <p className="font-semibold text-primary">{facilityName.toUpperCase()}</p>
            <p className="text-sm text-muted-foreground">{districtRegion}</p>
          </div>

          {/* Child Details */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-primary/10 rounded">
                <User className="w-4 h-4 text-primary" />
              </div>
              <h4 className="font-semibold text-sm">Child Particulars</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Reg No:</span>
                <span className="font-medium">{child.regNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{child.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">DOB:</span>
                <span className="font-medium">{formatDate(child.dateOfBirth)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Age:</span>
                <Badge variant="outline">{ageInMonths} months</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Sex:</span>
                <span className="font-medium">{child.sex}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Caregiver:</span>
                <span className="font-medium">{child.motherName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Contact:</span>
                <span className="font-medium">{child.telephoneAddress || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Community:</span>
                <span className="font-medium">{child.community || "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Vaccination Progress */}
          <div className="p-4 border-t bg-muted/10">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">Vaccination Progress</span>
              <Badge 
                variant={isFullyImmunized ? "default" : "secondary"}
                className={isFullyImmunized ? "bg-ghs-green" : ""}
              >
                {isFullyImmunized ? (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Fully Immunized</>
                ) : (
                  <><AlertCircle className="w-3 h-3 mr-1" /> In Progress</>
                )}
              </Badge>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>{completedVaccines} of {totalVaccines} vaccines completed</span>
              <span className="font-semibold text-primary">{progress}%</span>
            </div>
          </div>

          {/* All Vaccines with status */}
          <div className="p-4 border-t">
            <h4 className="font-semibold text-sm mb-3">
              Immunization Record ({totalVaccines} vaccines)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
              {allVaccines.map((vaccine, idx) => {
                const given = vaccine.status === 'completed';
                const overdue = vaccine.status === 'overdue';
                return (
                  <div
                    key={idx}
                    className={
                      given
                        ? "p-2 rounded border bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                        : overdue
                        ? "p-2 rounded border bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                        : "p-2 rounded border bg-muted/40"
                    }
                  >
                    <p className="font-medium truncate">{vaccine.name.split(" at")[0]}</p>
                    <p className="text-muted-foreground">
                      {given
                        ? `Given${vaccine.givenDate ? ` · ${formatDate(vaccine.givenDate)}` : ""}`
                        : overdue
                        ? "Overdue"
                        : "Pending"}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              The downloaded certificate lists every vaccine with its Given/Pending status.
            </p>
          </div>



          {/* QR Code Note */}
          <div className="p-3 border-t bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground">
            <QrCode className="w-4 h-4" />
            <span>Certificate includes QR code for verification</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <Button 
            onClick={handleDownload} 
            disabled={isGenerating}
            className="bg-ghs-green hover:bg-ghs-green/90"
          >
            {isGenerating ? (
              <>Generating...</>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
