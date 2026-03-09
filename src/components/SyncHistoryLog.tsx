import { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useSyncHistory } from '@/hooks/useSyncHistory';
import { SyncHistoryRecord } from '@/types/facility';
import { cn, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface SyncHistoryLogProps {
  history?: SyncHistoryRecord[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
  userId?: string;
  facilityId?: string;
}

export function SyncHistoryLog({ history: externalHistory, isLoading: externalLoading, onRefresh, className, userId, facilityId }: SyncHistoryLogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { history: internalHistory, isLoading: internalLoading, refreshHistory, deleteRecord, clearAllHistory } = useSyncHistory(userId, facilityId);
  
  const history = externalHistory ?? internalHistory;
  const isLoading = externalLoading ?? internalLoading;
  const handleRefresh = onRefresh ?? refreshHistory;

  const handleDeleteRecord = async (recordId: string) => {
    await deleteRecord(recordId);
    toast.success('Sync record deleted');
  };

  const handleClearAll = async () => {
    await clearAllHistory();
    toast.success('All sync history cleared');
  };

  const getStatusIcon = (status: SyncHistoryRecord['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: SyncHistoryRecord['status']) => {
    const variants = {
      success: 'bg-success/10 text-success border-success/20',
      failed: 'bg-destructive/10 text-destructive border-destructive/20',
      partial: 'bg-warning/10 text-warning border-warning/20',
    };

    return (
      <Badge variant="outline" className={cn('text-xs', variants[status])}>
        {status}
      </Badge>
    );
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return formatDate(date);
  };

  const recentStats = {
    success: history.filter(h => h.status === 'success').length,
    failed: history.filter(h => h.status === 'failed').length,
    partial: history.filter(h => h.status === 'partial').length,
  };

  return (
    <Card className={cn('border shadow-elevation-1', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <CardTitle className="text-base font-medium">Sync History</CardTitle>
                <div className="flex items-center gap-2">
                  {recentStats.success > 0 && (
                    <Badge variant="outline" className="bg-success/10 text-success text-xs">
                      {recentStats.success} ✓
                    </Badge>
                  )}
                  {recentStats.failed > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive text-xs">
                      {recentStats.failed} ✗
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefresh();
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                </Button>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {history.length > 0 && (
              <div className="flex justify-end mb-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Sync History?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {history.length} sync history records. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {history.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sync history yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {history.map((record) => (
                    <div
                      key={record.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border transition-colors group',
                        record.status === 'success' && 'bg-success/5 border-success/20',
                        record.status === 'failed' && 'bg-destructive/5 border-destructive/20',
                        record.status === 'partial' && 'bg-warning/5 border-warning/20'
                      )}
                    >
                      <div className="mt-0.5">
                        {getStatusIcon(record.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          {getStatusBadge(record.status)}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(record.startedAt)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRecord(record.id);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm">
                          {record.syncedCount > 0 && (
                            <span className="text-success">
                              {record.syncedCount} synced
                            </span>
                          )}
                          {record.syncedCount > 0 && record.failedCount > 0 && (
                            <span className="text-muted-foreground"> · </span>
                          )}
                          {record.failedCount > 0 && (
                            <span className="text-destructive">
                              {record.failedCount} failed
                            </span>
                          )}
                        </div>
                        {record.errorMessage && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {record.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}