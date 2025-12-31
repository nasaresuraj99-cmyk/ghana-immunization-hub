import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Edit,
  ChevronDown,
  ChevronRight,
  Eye,
  Download,
} from "lucide-react";
import { Child, VaccineRecord } from "@/types/child";
import { VaccineEditModal } from "./VaccineEditModal";
import { exportImmunizationCard, exportVaccineHistory } from "@/lib/pdfExport";
import { toast } from "sonner";
import { calculateExactAge } from "@/lib/ageCalculator";
import { cn } from "@/lib/utils";

interface ImmunizationStatusViewProps {
  child: Child | null;
  isOpen: boolean;
  onClose: () => void;
  onAdministerVaccine: (child: Child) => void;
  onUpdateVaccine: (childId: string, updatedVaccine: VaccineRecord) => void;
  canEdit?: boolean;
}

// Age category definitions
const AGE_CATEGORIES = [
  { key: "birth", label: "Birth", keywords: ["at Birth"] },
  { key: "6weeks", label: "6 Weeks", keywords: ["at 6 weeks"] },
  { key: "10weeks", label: "10 Weeks", keywords: ["at 10 weeks"] },
  { key: "14weeks", label: "14 Weeks", keywords: ["at 14 weeks"] },
  { key: "6months", label: "6 Months", keywords: ["at 6 months"] },
  { key: "7months", label: "7 Months", keywords: ["at 7 months"] },
  { key: "9months", label: "9 Months", keywords: ["at 9 months"] },
  { key: "12months", label: "12 Months", keywords: ["at 12 months"] },
  { key: "18months", label: "18 Months", keywords: ["at 18 months"] },
  { key: "24months", label: "24 Months", keywords: ["at 24 months"] },
  { key: "30months", label: "30 Months", keywords: ["at 30 months"] },
  { key: "36months", label: "36 Months", keywords: ["at 36 months"] },
  { key: "42months", label: "42 Months", keywords: ["at 42 months"] },
  { key: "48months", label: "48 Months", keywords: ["at 48 months"] },
  { key: "54months", label: "54 Months", keywords: ["at 54 months"] },
  { key: "60months", label: "60 Months", keywords: ["at 60 months"] },
];

function getAgeCategory(vaccineName: string): string {
  for (const cat of AGE_CATEGORIES) {
    if (cat.keywords.some((kw) => vaccineName.includes(kw))) {
      return cat.key;
    }
  }
  return "other";
}

export function ImmunizationStatusView({
  child,
  isOpen,
  onClose,
  onAdministerVaccine,
  onUpdateVaccine,
  canEdit = true,
}: ImmunizationStatusViewProps) {
  const [editingVaccine, setEditingVaccine] = useState<VaccineRecord | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["birth", "6weeks", "10weeks", "14weeks"])
  );
  const [activeTab, setActiveTab] = useState("all");

  // All hooks MUST be called before any conditional returns
  const vaccineStats = useMemo(() => {
    if (!child) return { completed: 0, pending: 0, overdue: 0, total: 0, progress: 0 };
    const completed = child.vaccines.filter((v) => v.status === "completed").length;
    const pending = child.vaccines.filter((v) => v.status === "pending").length;
    const overdue = child.vaccines.filter((v) => v.status === "overdue").length;
    const total = child.vaccines.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, pending, overdue, total, progress };
  }, [child]);

  // Group vaccines by age category
  const groupedVaccines = useMemo(() => {
    if (!child) return {};
    const groups: Record<string, VaccineRecord[]> = {};
    child.vaccines.forEach((vaccine) => {
      const category = getAgeCategory(vaccine.name);
      if (!groups[category]) groups[category] = [];
      groups[category].push(vaccine);
    });
    return groups;
  }, [child]);

  // Filter vaccines based on active tab
  const filteredVaccines = useMemo(() => {
    if (!child) return [];
    if (activeTab === "all") return child.vaccines;
    return child.vaccines.filter((v) => v.status === activeTab);
  }, [child, activeTab]);

  // Group filtered vaccines by category
  const filteredGroupedVaccines = useMemo(() => {
    const groups: Record<string, VaccineRecord[]> = {};
    filteredVaccines.forEach((vaccine) => {
      const category = getAgeCategory(vaccine.name);
      if (!groups[category]) groups[category] = [];
      groups[category].push(vaccine);
    });
    return groups;
  }, [filteredVaccines]);

  // Early return AFTER all hooks
  if (!child) return null;

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  const handlePrintCard = async () => {
    toast.loading("Generating immunization card...");
    await exportImmunizationCard(child);
    toast.dismiss();
    toast.success("Immunization card downloaded!");
  };

  const handleExportHistory = () => {
    toast.loading("Generating vaccine history...");
    exportVaccineHistory(child);
    toast.dismiss();
    toast.success("Vaccine history PDF downloaded!");
  };

  const handleSaveVaccine = (updatedVaccine: VaccineRecord) => {
    onUpdateVaccine(child.id, updatedVaccine);
    setEditingVaccine(null);
  };

  const getStatusBadge = (status: VaccineRecord["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-ghs-green text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "overdue":
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getCategoryStats = (categoryKey: string) => {
    const vaccines = groupedVaccines[categoryKey] || [];
    const completed = vaccines.filter((v) => v.status === "completed").length;
    const total = vaccines.length;
    return { completed, total };
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Immunization Status
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Child Info Header */}
            <div className="bg-gradient-ghs rounded-lg p-4 text-white">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{child.name}</h3>
                  <p className="text-sm text-white/80">{child.regNo}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/90">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {calculateExactAge(child.dateOfBirth)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {child.motherName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {child.telephoneAddress}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {child.community}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vaccination Progress */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">Vaccination Progress</span>
                <span className="text-2xl font-bold text-primary">
                  {vaccineStats.progress}%
                </span>
              </div>
              <Progress value={vaccineStats.progress} className="h-4 mb-3" />
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1 text-ghs-green font-medium">
                  <CheckCircle className="w-4 h-4" />
                  {vaccineStats.completed} completed
                </span>
                <span className="flex items-center gap-1 text-amber-500 font-medium">
                  <Clock className="w-4 h-4" />
                  {vaccineStats.pending} pending
                </span>
                <span className="flex items-center gap-1 text-destructive font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  {vaccineStats.overdue} overdue
                </span>
              </div>
            </div>

            {/* Tabs for filtering */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="all">
                  All ({child.vaccines.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-ghs-green">
                  Completed ({vaccineStats.completed})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({vaccineStats.pending})
                </TabsTrigger>
                <TabsTrigger value="overdue" className="text-destructive">
                  Overdue ({vaccineStats.overdue})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                  {AGE_CATEGORIES.map((category) => {
                    const vaccines = filteredGroupedVaccines[category.key] || [];
                    if (vaccines.length === 0) return null;

                    const isExpanded = expandedCategories.has(category.key);
                    const stats = getCategoryStats(category.key);

                    return (
                      <div
                        key={category.key}
                        className="border rounded-lg overflow-hidden"
                      >
                        <button
                          onClick={() => toggleCategory(category.key)}
                          className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/70 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-primary" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{category.label}</span>
                            <Badge variant="outline" className="ml-2">
                              {stats.completed}/{stats.total}
                            </Badge>
                          </div>
                          <Progress
                            value={(stats.completed / stats.total) * 100}
                            className="w-20 h-2"
                          />
                        </button>

                        {isExpanded && (
                          <div className="p-2 space-y-2">
                            {vaccines.map((vaccine) => (
                              <div
                                key={vaccine.name}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                                  vaccine.status === "completed" &&
                                    "bg-ghs-green/5 border-ghs-green/20",
                                  vaccine.status === "pending" &&
                                    "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50",
                                  vaccine.status === "overdue" &&
                                    "bg-destructive/5 border-destructive/20"
                                )}
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {vaccine.name}
                                  </p>
                                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>Due: {new Date(vaccine.dueDate).toLocaleDateString()}</span>
                                    {vaccine.givenDate && (
                                      <span className="text-ghs-green">
                                        Given: {new Date(vaccine.givenDate).toLocaleDateString()}
                                      </span>
                                    )}
                                    {vaccine.batchNumber && (
                                      <span>Batch: {vaccine.batchNumber}</span>
                                    )}
                                    {vaccine.administeredBy && (
                                      <span>By: {vaccine.administeredBy}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(vaccine.status)}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditingVaccine(vaccine)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button
                onClick={() => onAdministerVaccine(child)}
                className="flex-1 bg-ghs-green hover:bg-ghs-green/90"
              >
                <Syringe className="w-4 h-4 mr-2" />
                Administer Vaccine
              </Button>
              <Button variant="outline" onClick={handleExportHistory} className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export History
              </Button>
              <Button variant="secondary" onClick={handlePrintCard}>
                <FileText className="w-4 h-4 mr-2" />
                Print Card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Vaccine Modal */}
      <VaccineEditModal
        vaccine={editingVaccine}
        isOpen={!!editingVaccine}
        onClose={() => setEditingVaccine(null)}
        onSave={handleSaveVaccine}
        canEdit={canEdit}
      />
    </>
  );
}
