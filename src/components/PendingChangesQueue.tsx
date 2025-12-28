import { useState } from "react";
import { Clock, Upload, Trash2, Edit3, Plus, ChevronDown, ChevronUp, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PendingSync {
  action: 'add' | 'update' | 'delete';
  childId: string;
  data?: {
    childName?: string;
    guardianName?: string;
  };
  timestamp: number;
}

interface PendingChangesQueueProps {
  isOnline: boolean;
  pendingCount: number;
}

const PENDING_SYNC_KEY = 'immunization_pending_sync';

const loadPendingSyncs = (): PendingSync[] => {
  try {
    const stored = localStorage.getItem(PENDING_SYNC_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading pending syncs:', e);
  }
  return [];
};

export function PendingChangesQueue({ isOnline, pendingCount }: PendingChangesQueueProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pendingSyncs = loadPendingSyncs();

  if (pendingCount === 0) {
    return null;
  }

  const getActionIcon = (action: 'add' | 'update' | 'delete') => {
    switch (action) {
      case 'add':
        return <Plus className="w-3.5 h-3.5" />;
      case 'update':
        return <Edit3 className="w-3.5 h-3.5" />;
      case 'delete':
        return <Trash2 className="w-3.5 h-3.5" />;
    }
  };

  const getActionColor = (action: 'add' | 'update' | 'delete') => {
    switch (action) {
      case 'add':
        return "bg-success/10 text-success border-success/20";
      case 'update':
        return "bg-info/10 text-info border-info/20";
      case 'delete':
        return "bg-destructive/10 text-destructive border-destructive/20";
    }
  };

  const getActionLabel = (action: 'add' | 'update' | 'delete') => {
    switch (action) {
      case 'add':
        return "New";
      case 'update':
        return "Modified";
      case 'delete':
        return "Deleted";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      isOnline 
        ? "border-warning/30 bg-warning/5" 
        : "border-muted bg-muted/30"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isOnline ? "bg-warning/20" : "bg-muted"
            )}>
              <Package className={cn(
                "w-5 h-5",
                isOnline ? "text-warning" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Pending Changes
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isOnline 
                  ? "Waiting to sync..." 
                  : "Will sync when online"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={cn(
                "text-sm font-semibold",
                isOnline ? "bg-warning/20 text-warning" : ""
              )}
            >
              {pendingCount} item{pendingCount !== 1 ? 's' : ''}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {pendingSyncs.map((sync, index) => (
                <div 
                  key={`${sync.childId}-${sync.timestamp}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all",
                    "bg-background/50 hover:bg-background"
                  )}
                >
                  {/* Action Badge */}
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium",
                    getActionColor(sync.action)
                  )}>
                    {getActionIcon(sync.action)}
                    <span>{getActionLabel(sync.action)}</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {sync.data?.childName || `Child Record`}
                    </p>
                    {sync.data?.guardianName && (
                      <p className="text-xs text-muted-foreground truncate">
                        Guardian: {sync.data.guardianName}
                      </p>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTimestamp(sync.timestamp)}</span>
                  </div>
                </div>
              ))}

              {pendingSyncs.length === 0 && pendingCount > 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {pendingCount} pending change{pendingCount !== 1 ? 's' : ''} queued
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Queue Footer */}
          <div className="mt-3 pt-3 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Upload className="w-3.5 h-3.5" />
              <span>
                {isOnline 
                  ? "Changes will sync automatically" 
                  : "Connect to internet to sync"
                }
              </span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
