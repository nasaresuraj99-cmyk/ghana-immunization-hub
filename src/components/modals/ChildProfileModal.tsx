import { useMemo, useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Eye,
  Image,
  ChevronDown,
  RotateCcw,
  ArrowRightLeft,
  MoreVertical,
  Plane,
  Home,
  History
} from "lucide-react";
import { Child } from "@/types/child";
import { exportImmunizationCard } from "@/lib/pdfExport";
import { exportImmunizationCardAsImage } from "@/lib/imageExport";
import { toast } from "sonner";
import { calculateExactAge } from "@/lib/ageCalculator";
import { TransferHistoryTimeline } from "@/components/TransferHistoryTimeline";

interface ChildProfileModalProps {
  child: Child | null;
  isOpen: boolean;
  onClose: () => void;
  onAdministerVaccine: (child: Child) => void;
  onViewImmunizationStatus?: (child: Child) => void;
  onResetRecords?: (child: Child) => void;
  onTransferOut?: (child: Child) => void;
  onTransferIn?: (child: Child) => void;
  facilityName?: string;
}

export function ChildProfileModal({ 
  child, 
  isOpen, 
  onClose, 
  onAdministerVaccine,
  onViewImmunizationStatus,
  onResetRecords,
  onTransferOut,
  onTransferIn,
  facilityName
}: ChildProfileModalProps) {
  // All hooks MUST be called before any conditional returns
  const vaccineStats = useMemo(() => {
    if (!child) return { completed: 0, pending: 0, overdue: 0, total: 0, progress: 0 };
    const completed = child.vaccines.filter(v => v.status === 'completed').length;
    const pending = child.vaccines.filter(v => v.status === 'pending').length;
    const overdue = child.vaccines.filter(v => v.status === 'overdue').length;
    const total = child.vaccines.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, pending, overdue, total, progress };
  }, [child]);

  const nextVaccines = useMemo(() => {
    if (!child) return [];
    return child.vaccines
      .filter(v => v.status === 'pending')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [child]);

  const overdueVaccines = useMemo(() => {
    if (!child) return [];
    return child.vaccines.filter(v => v.status === 'overdue');
  }, [child]);

  const recentVaccines = useMemo(() => {
    if (!child) return [];
    return child.vaccines
      .filter(v => v.status === 'completed' && v.givenDate)
      .sort((a, b) => new Date(b.givenDate!).getTime() - new Date(a.givenDate!).getTime())
      .slice(0, 5);
  }, [child]);

  // Early return AFTER all hooks
  if (!child) return null;

  const isTransferredOut = child.transferStatus === 'traveled_out' || child.transferStatus === 'moved_out';

  const handlePrintCardPDF = async () => {
    toast.loading("Generating PDF card...");
    await exportImmunizationCard(child, { facilityName: facilityName || child.healthFacilityName || "Health Facility" });
    toast.dismiss();
    toast.success("PDF immunization card downloaded!");
  };

  const handlePrintCardImage = async () => {
    toast.loading("Generating image card...");
    try {
      await exportImmunizationCardAsImage(child, { facilityName: facilityName || child.healthFacilityName || "Health Facility" });
      toast.dismiss();
      toast.success("Image immunization card downloaded!");
    } catch (error) {
      toast.dismiss();
      toast.error("Failed to generate image card");
    }
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

          {/* Tabs for Profile and Transfer History */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <Syringe className="w-4 h-4" />
                Vaccination
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Transfer History
                {(child.transferHistory?.length || 0) > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {child.transferHistory?.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-4">
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

              {/* Transfer Status Banner */}
              {isTransferredOut && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Plane className="w-4 h-4 text-amber-600" />
                    <span className="font-medium text-amber-600">
                      {child.transferStatus === 'moved_out' ? 'Moved Out' : 'Traveled Out'}
                    </span>
                  </div>
                  {child.currentLocation && (
                    <p className="text-sm text-muted-foreground">
                      Location: {child.currentLocation}
                    </p>
                  )}
                </div>
              )}

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
            </TabsContent>

            <TabsContent value="transfer" className="mt-4">
              <TransferHistoryTimeline 
                transferHistory={child.transferHistory}
                currentStatus={child.transferStatus}
                currentLocation={child.currentLocation}
              />
            </TabsContent>
          </Tabs>

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1">
                  <FileText className="w-4 h-4 mr-2" />
                  Print Card
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handlePrintCardPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintCardImage}>
                  <Image className="w-4 h-4 mr-2" />
                  Download as Image
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Transfer Actions */}
                {isTransferredOut ? (
                  onTransferIn && (
                    <DropdownMenuItem onClick={() => onTransferIn(child)}>
                      <Home className="w-4 h-4 mr-2" />
                      Mark as Returned
                    </DropdownMenuItem>
                  )
                ) : (
                  onTransferOut && (
                    <DropdownMenuItem onClick={() => onTransferOut(child)}>
                      <Plane className="w-4 h-4 mr-2" />
                      Traveled Out / Moved Out
                    </DropdownMenuItem>
                  )
                )}
                
                <DropdownMenuSeparator />
                
                {/* Reset Records */}
                {onResetRecords && (
                  <DropdownMenuItem 
                    onClick={() => onResetRecords(child)}
                    className="text-destructive focus:text-destructive"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Vaccination Records
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
