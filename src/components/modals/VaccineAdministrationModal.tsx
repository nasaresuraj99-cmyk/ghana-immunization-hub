import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Syringe, Check, ChevronDown, ChevronRight } from "lucide-react";
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

// Age category definitions
const AGE_CATEGORIES = [
  { key: 'birth', label: 'Birth', keywords: ['at Birth'] },
  { key: '6weeks', label: '6 Weeks', keywords: ['at 6 weeks'] },
  { key: '10weeks', label: '10 Weeks', keywords: ['at 10 weeks'] },
  { key: '14weeks', label: '14 Weeks', keywords: ['at 14 weeks'] },
  { key: '6months', label: '6 Months', keywords: ['at 6 months'] },
  { key: '7months', label: '7 Months', keywords: ['at 7 months'] },
  { key: '9months', label: '9 Months', keywords: ['at 9 months'] },
  { key: '12months', label: '12 Months', keywords: ['at 12 months'] },
  { key: '18months', label: '18 Months', keywords: ['at 18 months'] },
  { key: '24months', label: '24 Months', keywords: ['at 24 months'] },
  { key: '30months', label: '30 Months', keywords: ['at 30 months'] },
  { key: '36months', label: '36 Months', keywords: ['at 36 months'] },
  { key: '42months', label: '42 Months', keywords: ['at 42 months'] },
  { key: '48months', label: '48 Months', keywords: ['at 48 months'] },
  { key: '54months', label: '54 Months', keywords: ['at 54 months'] },
  { key: '60months', label: '60 Months', keywords: ['at 60 months'] },
];

function getAgeCategory(vaccineName: string): string {
  for (const cat of AGE_CATEGORIES) {
    if (cat.keywords.some(kw => vaccineName.includes(kw))) {
      return cat.key;
    }
  }
  return 'other';
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['birth', '6weeks']));
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const pendingVaccines = child?.vaccines.filter(v => v.status !== 'completed') || [];
  const completedVaccines = child?.vaccines.filter(v => v.status === 'completed') || [];

  // Group vaccines by age category
  const groupedPendingVaccines = useMemo(() => {
    const groups: Record<string, VaccineRecord[]> = {};
    
    pendingVaccines.forEach(vaccine => {
      const category = getAgeCategory(vaccine.name);
      if (!groups[category]) groups[category] = [];
      groups[category].push(vaccine);
    });

    return groups;
  }, [pendingVaccines]);

  const groupedCompletedVaccines = useMemo(() => {
    const groups: Record<string, VaccineRecord[]> = {};
    
    completedVaccines.forEach(vaccine => {
      const category = getAgeCategory(vaccine.name);
      if (!groups[category]) groups[category] = [];
      groups[category].push(vaccine);
    });

    return groups;
  }, [completedVaccines]);

  // Get categories that have pending vaccines
  const availableCategories = useMemo(() => {
    return AGE_CATEGORIES.filter(cat => groupedPendingVaccines[cat.key]?.length > 0);
  }, [groupedPendingVaccines]);

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
    setFilterCategory('all');
    onClose();
  };

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
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

  const filteredCategories = filterCategory === 'all' 
    ? availableCategories 
    : availableCategories.filter(c => c.key === filterCategory);

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

            {/* Age Category Filter */}
            {availableCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filterCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory('all')}
                >
                  All ({pendingVaccines.length})
                </Button>
                {availableCategories.map(cat => (
                  <Button
                    key={cat.key}
                    variant={filterCategory === cat.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterCategory(cat.key)}
                  >
                    {cat.label} ({groupedPendingVaccines[cat.key]?.length || 0})
                  </Button>
                ))}
              </div>
            )}

            {/* Vaccine Selection by Category */}
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
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {filteredCategories.map(category => {
                    const vaccines = groupedPendingVaccines[category.key] || [];
                    if (vaccines.length === 0) return null;
                    
                    const isExpanded = expandedCategories.has(category.key);
                    
                    return (
                      <div key={category.key} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCategory(category.key)}
                          className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-primary" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{category.label}</span>
                            <Badge variant="secondary" className="ml-2">
                              {vaccines.length} pending
                            </Badge>
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="p-2 space-y-2">
                            {vaccines.map((vaccine) => (
                              <button
                                key={vaccine.name}
                                onClick={() => setSelectedVaccine(vaccine)}
                                className={cn(
                                  "w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left",
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
                    );
                  })}
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

            {/* Completed Vaccines by Category */}
            {completedVaccines.length > 0 && (
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-3 block text-muted-foreground">
                  Completed Vaccines ({completedVaccines.length})
                </Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {AGE_CATEGORIES.map(category => {
                    const vaccines = groupedCompletedVaccines[category.key] || [];
                    if (vaccines.length === 0) return null;
                    
                    return (
                      <div key={category.key}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{category.label}</p>
                        <div className="grid gap-1">
                          {vaccines.map((vaccine) => (
                            <div
                              key={vaccine.name}
                              className="flex items-center justify-between p-2 rounded-lg bg-ghs-green/10 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-ghs-green" />
                                <span className="text-xs">{vaccine.name}</span>
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
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
