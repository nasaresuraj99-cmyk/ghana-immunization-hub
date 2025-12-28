import { useState } from "react";
import { 
  AlertTriangle, 
  Laptop, 
  Cloud, 
  GitMerge, 
  Check, 
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  Phone,
  MapPin,
  Syringe,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ConflictRecord, ConflictDiff, ConflictResolution } from "@/types/conflict";
import { Child } from "@/types/child";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: ConflictRecord[];
  onResolve: (conflictId: string, resolution: ConflictResolution, resolvedChild: Child) => void;
  getConflictDiffs: (conflict: ConflictRecord) => ConflictDiff[];
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  conflicts,
  onResolve,
  getConflictDiffs,
}: ConflictResolutionModalProps) {
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0);
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);

  const currentConflict = conflicts[currentConflictIndex];

  if (!currentConflict) {
    return null;
  }

  const diffs = getConflictDiffs(currentConflict);
  const localChild = currentConflict.localVersion;
  const remoteChild = currentConflict.remoteVersion;

  const handleResolve = (resolution: ConflictResolution) => {
    let resolvedChild: Child;
    
    switch (resolution) {
      case 'local':
        resolvedChild = { ...localChild, registeredAt: new Date().toISOString() };
        break;
      case 'remote':
        resolvedChild = { ...remoteChild, registeredAt: new Date().toISOString() };
        break;
      case 'merge':
        // Merge: prefer remote for basic info, but keep local vaccines that are more complete
        const mergedVaccines = localChild.vaccines.map((localVac, index) => {
          const remoteVac = remoteChild.vaccines[index];
          if (!remoteVac) return localVac;
          
          // Prefer the completed vaccine
          if (localVac.status === 'completed' && remoteVac.status !== 'completed') {
            return localVac;
          }
          if (remoteVac.status === 'completed' && localVac.status !== 'completed') {
            return remoteVac;
          }
          // If both completed, prefer newer
          if (localVac.givenDate && remoteVac.givenDate) {
            return new Date(localVac.givenDate) > new Date(remoteVac.givenDate) 
              ? localVac 
              : remoteVac;
          }
          return remoteVac;
        });
        
        resolvedChild = {
          ...remoteChild,
          vaccines: mergedVaccines,
          registeredAt: new Date().toISOString(),
        };
        break;
      default:
        resolvedChild = remoteChild;
    }
    
    onResolve(currentConflict.id, resolution, resolvedChild);
    
    if (currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const getFieldIcon = (field: string) => {
    switch (field.toLowerCase()) {
      case 'name': return User;
      case 'date of birth': return Calendar;
      case 'contact': return Phone;
      case 'community': return MapPin;
      case 'vaccines given': return Syringe;
      default: return User;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden bg-card border-0 shadow-elevation-3">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  Sync Conflict Detected
                </DialogTitle>
                <DialogDescription className="text-white/90 mt-1">
                  The same record was modified on multiple devices
                </DialogDescription>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {currentConflictIndex + 1} of {conflicts.length}
              </Badge>
              <span className="text-sm text-white/80">
                conflicts to resolve
              </span>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-5">
            {/* Child Info */}
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
              <div className="w-12 h-12 rounded-full gradient-ghs flex items-center justify-center text-white font-bold text-lg">
                {localChild.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{localChild.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Reg. No: {localChild.regNo}
                </p>
              </div>
            </div>

            {/* Differences */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Changes Detected
              </h4>
              
              <div className="space-y-2">
                {diffs.map((diff, index) => {
                  const Icon = getFieldIcon(diff.field);
                  const isExpanded = expandedDiff === diff.field;
                  
                  return (
                    <Card 
                      key={index}
                      className={cn(
                        "cursor-pointer transition-all duration-200 border-2",
                        isExpanded ? "border-primary/30 shadow-md" : "border-transparent hover:border-border"
                      )}
                      onClick={() => setExpandedDiff(isExpanded ? null : diff.field)}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <CardTitle className="text-sm font-medium">
                              {diff.field}
                            </CardTitle>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </CardHeader>
                      
                      {isExpanded && (
                        <CardContent className="p-4 pt-0">
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                <Laptop className="w-3.5 h-3.5" />
                                This Device
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                {diff.localValue || <span className="text-muted-foreground italic">Empty</span>}
                              </p>
                            </div>
                            
                            <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                                <Cloud className="w-3.5 h-3.5" />
                                Cloud Version
                              </div>
                              <p className="text-sm font-medium text-foreground">
                                {diff.remoteValue || <span className="text-muted-foreground italic">Empty</span>}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
                <div className="flex items-center justify-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 mb-1">
                  <Laptop className="w-3.5 h-3.5" />
                  Local Modified
                </div>
                <p className="text-sm font-medium text-foreground">
                  {formatDistanceToNow(currentConflict.localTimestamp, { addSuffix: true })}
                </p>
              </div>
              
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-950/30">
                <div className="flex items-center justify-center gap-1.5 text-xs text-green-600 dark:text-green-400 mb-1">
                  <Cloud className="w-3.5 h-3.5" />
                  Cloud Modified
                </div>
                <p className="text-sm font-medium text-foreground">
                  {formatDistanceToNow(currentConflict.remoteTimestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="border-t bg-muted/30 p-4">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
              onClick={() => handleResolve('local')}
            >
              <Laptop className="w-5 h-5" />
              <span className="text-xs font-medium">Keep Local</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
              onClick={() => handleResolve('merge')}
            >
              <GitMerge className="w-5 h-5" />
              <span className="text-xs font-medium">Smart Merge</span>
            </Button>
            
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-950/50 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
              onClick={() => handleResolve('remote')}
            >
              <Cloud className="w-5 h-5" />
              <span className="text-xs font-medium">Use Cloud</span>
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-3">
            <strong>Smart Merge</strong> combines vaccine records from both versions
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
