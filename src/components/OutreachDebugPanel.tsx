import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bug,
  CheckCircle,
  XCircle,
  Package,
  User,
  Syringe,
  Info,
} from "lucide-react";
import { Child } from "@/types/child";
import { getInventoryVaccineName } from "@/types/inventory";
import { checkVaccineEligibility, getAllVaccineNames } from "@/lib/ghanaEpiSchedule";

interface InventoryBatch {
  id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  days_until_expiry: number;
}

interface VaccineInventoryStatus {
  vaccine_name: string;
  total_stock: number;
  available_stock: number;
  expired_stock: number;
  near_expiry_stock: number;
  batch_count: number;
  available_batches: InventoryBatch[] | null;
}

interface OutreachDebugPanelProps {
  children: Child[];
  inventoryStatus: Record<string, VaccineInventoryStatus>;
  selectedVaccine?: string;
  onRefreshInventoryStatus?: (vaccineName: string) => Promise<void>;
}

export function OutreachDebugPanel({
  children,
  inventoryStatus,
  selectedVaccine,
  onRefreshInventoryStatus,
}: OutreachDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debugVaccine, setDebugVaccine] = useState(selectedVaccine || "");
  const allVaccines = useMemo(() => getAllVaccineNames(), []);

  // Get inventory vaccine name for the selected schedule vaccine
  const inventoryVaccineName = useMemo(() => {
    if (!debugVaccine) return null;
    return getInventoryVaccineName(debugVaccine);
  }, [debugVaccine]);

  // Get inventory status for selected vaccine
  const currentInventoryStatus = useMemo(() => {
    if (!inventoryVaccineName) return null;
    return inventoryStatus[inventoryVaccineName] || null;
  }, [inventoryVaccineName, inventoryStatus]);

  // Analyze eligibility for all children
  const eligibilityAnalysis = useMemo(() => {
    if (!debugVaccine) return { eligible: [], notEligible: [] };

    const today = new Date();
    const eligible: Array<{ child: Child; reason: string }> = [];
    const notEligible: Array<{ child: Child; reason: string; status: string }> = [];

    children.forEach((child) => {
      if (child.isDeleted) {
        notEligible.push({ child, reason: "Child is archived/deleted", status: "deleted" });
        return;
      }

      if (child.transferStatus === "traveled_out" || child.transferStatus === "moved_out") {
        notEligible.push({ child, reason: "Child has transferred out", status: "transferred" });
        return;
      }

      const eligibility = checkVaccineEligibility(
        child.dateOfBirth,
        debugVaccine,
        child.vaccines,
        today
      );

      if (eligibility.status === "due" || eligibility.status === "overdue") {
        eligible.push({
          child,
          reason: eligibility.status === "overdue" 
            ? `Overdue by ${eligibility.daysOverdue} days` 
            : "Due now",
        });
      } else {
        notEligible.push({
          child,
          reason: eligibility.reason || `Status: ${eligibility.status}`,
          status: eligibility.status,
        });
      }
    });

    return { eligible, notEligible };
  }, [children, debugVaccine]);

  // Inventory deduction feasibility
  const deductionFeasibility = useMemo(() => {
    if (!currentInventoryStatus) {
      return {
        canDeduct: false,
        reason: "No inventory data available",
        details: "Inventory status not loaded for this vaccine",
      };
    }

    const neededDoses = eligibilityAnalysis.eligible.length;

    if (currentInventoryStatus.total_stock === 0) {
      return {
        canDeduct: false,
        reason: "No stock available",
        details: "There is no stock of this vaccine in inventory",
      };
    }

    if (currentInventoryStatus.available_stock === 0 && currentInventoryStatus.expired_stock > 0) {
      return {
        canDeduct: false,
        reason: "All stock expired",
        details: `${currentInventoryStatus.expired_stock} doses are expired and cannot be used`,
      };
    }

    if (currentInventoryStatus.available_stock < neededDoses) {
      return {
        canDeduct: false,
        reason: "Insufficient stock",
        details: `Need ${neededDoses} doses but only ${currentInventoryStatus.available_stock} available`,
      };
    }

    // Check FEFO batch availability
    const availableBatches = currentInventoryStatus.available_batches || [];
    if (availableBatches.length === 0) {
      return {
        canDeduct: false,
        reason: "No valid batches",
        details: "No non-expired batches with stock available",
      };
    }

    const firstBatch = availableBatches[0];
    if (firstBatch.quantity < neededDoses) {
      // Check if total across batches is enough
      const totalAcrossBatches = availableBatches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalAcrossBatches >= neededDoses) {
        return {
          canDeduct: true,
          reason: "Multiple batches needed",
          details: `First batch has ${firstBatch.quantity} doses. Will need to use multiple batches for ${neededDoses} doses.`,
        };
      }
    }

    return {
      canDeduct: true,
      reason: "Ready for deduction",
      details: `FEFO batch: ${firstBatch.batch_number} with ${firstBatch.quantity} doses (expires in ${firstBatch.days_until_expiry} days)`,
    };
  }, [currentInventoryStatus, eligibilityAnalysis.eligible.length]);

  const handleRefresh = async () => {
    if (inventoryVaccineName && onRefreshInventoryStatus) {
      await onRefreshInventoryStatus(inventoryVaccineName);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Bug className="w-4 h-4" />
          Debug Panel
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-primary" />
            Outreach Debug Panel
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 mt-4">
          {/* Vaccine Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Vaccine to Debug</label>
            <Select value={debugVaccine} onValueChange={setDebugVaccine}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vaccine" />
              </SelectTrigger>
              <SelectContent>
                {allVaccines.map((vaccine) => (
                  <SelectItem key={vaccine} value={vaccine}>
                    {vaccine}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {debugVaccine && (
            <ScrollArea className="flex-1">
              <div className="space-y-4 pr-4">
                {/* Inventory Status Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Inventory Status: {inventoryVaccineName || "N/A"}
                      </span>
                      <Button variant="ghost" size="sm" onClick={handleRefresh}>
                        Refresh
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {currentInventoryStatus ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Stock:</span>
                            <span className="font-medium">{currentInventoryStatus.total_stock}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Available:</span>
                            <span className="font-medium text-green-600">
                              {currentInventoryStatus.available_stock}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Expired:</span>
                            <span className="font-medium text-red-600">
                              {currentInventoryStatus.expired_stock}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Near Expiry:</span>
                            <span className="font-medium text-amber-600">
                              {currentInventoryStatus.near_expiry_stock}
                            </span>
                          </div>
                        </div>

                        {/* Available Batches */}
                        {currentInventoryStatus.available_batches &&
                          currentInventoryStatus.available_batches.length > 0 && (
                            <div className="border-t pt-2">
                              <p className="text-xs font-medium mb-2">FEFO Batch Order:</p>
                              <div className="space-y-1">
                                {currentInventoryStatus.available_batches.slice(0, 5).map((batch, idx) => (
                                  <div
                                    key={batch.id}
                                    className={`text-xs p-2 rounded border ${
                                      idx === 0 ? "bg-primary/10 border-primary" : "bg-muted"
                                    }`}
                                  >
                                    <div className="flex justify-between">
                                      <span className="font-mono">{batch.batch_number}</span>
                                      <Badge variant={idx === 0 ? "default" : "secondary"} className="text-xs">
                                        {batch.quantity} doses
                                      </Badge>
                                    </div>
                                    <div className="text-muted-foreground mt-1">
                                      Expires: {batch.expiry_date} ({batch.days_until_expiry} days)
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No inventory data for {inventoryVaccineName}</p>
                        <p className="text-xs">Add stock in Inventory section</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Deduction Feasibility */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Syringe className="w-4 h-4" />
                      Deduction Feasibility
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`p-3 rounded-lg border ${
                        deductionFeasibility.canDeduct
                          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                          : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {deductionFeasibility.canDeduct ? (
                          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{deductionFeasibility.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {deductionFeasibility.details}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Eligibility Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Child Eligibility ({eligibilityAnalysis.eligible.length} eligible)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Eligible Summary */}
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">
                        <strong>{eligibilityAnalysis.eligible.length}</strong> children can receive this vaccine
                      </span>
                    </div>

                    {/* Not Eligible Breakdown */}
                    {eligibilityAnalysis.notEligible.length > 0 && (
                      <div className="border-t pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium">
                            {eligibilityAnalysis.notEligible.length} children NOT eligible
                          </span>
                        </div>

                        {/* Group by reason */}
                        <div className="space-y-2">
                          {Object.entries(
                            eligibilityAnalysis.notEligible.reduce((acc, item) => {
                              const key = item.status;
                              if (!acc[key]) acc[key] = [];
                              acc[key].push(item);
                              return acc;
                            }, {} as Record<string, typeof eligibilityAnalysis.notEligible>)
                          )
                            .slice(0, 6)
                            .map(([status, items]) => (
                              <div key={status} className="text-xs p-2 bg-muted rounded">
                                <div className="flex justify-between items-center">
                                  <Badge variant="outline" className="text-xs">
                                    {status}
                                  </Badge>
                                  <span className="text-muted-foreground">{items.length} children</span>
                                </div>
                                <p className="text-muted-foreground mt-1">{items[0].reason}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Eligible Children List (collapsed by default) */}
                {eligibilityAnalysis.eligible.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Eligible Children (first 10)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {eligibilityAnalysis.eligible.slice(0, 10).map(({ child, reason }) => (
                          <div
                            key={child.id}
                            className="flex justify-between items-center text-xs p-2 bg-green-50 dark:bg-green-900/20 rounded"
                          >
                            <span className="font-medium">{child.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {reason}
                            </Badge>
                          </div>
                        ))}
                        {eligibilityAnalysis.eligible.length > 10 && (
                          <p className="text-xs text-muted-foreground text-center pt-2">
                            +{eligibilityAnalysis.eligible.length - 10} more children
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}

          {!debugVaccine && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Bug className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a vaccine to see debug information</p>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
