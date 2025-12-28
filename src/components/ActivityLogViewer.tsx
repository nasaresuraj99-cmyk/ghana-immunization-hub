import { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Filter, User, Calendar, FileEdit, Trash2, RotateCcw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ActivityLog } from '@/types/facility';
import { cn } from '@/lib/utils';

interface ActivityLogViewerProps {
  logs: ActivityLog[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

export function ActivityLogViewer({ logs, isLoading, onRefresh, className }: ActivityLogViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterAction, setFilterAction] = useState<string>('all');

  const filteredLogs = filterAction === 'all' 
    ? logs 
    : logs.filter(log => log.action === filterAction);

  const getActionIcon = (action: ActivityLog['action']) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4 text-success" />;
      case 'update':
        return <FileEdit className="w-4 h-4 text-info" />;
      case 'soft_delete':
        return <Trash2 className="w-4 h-4 text-warning" />;
      case 'restore':
        return <RotateCcw className="w-4 h-4 text-success" />;
      case 'permanent_delete':
        return <Trash2 className="w-4 h-4 text-destructive" />;
    }
  };

  const getActionBadge = (action: ActivityLog['action']) => {
    const variants = {
      create: 'bg-success/10 text-success border-success/20',
      update: 'bg-info/10 text-info border-info/20',
      soft_delete: 'bg-warning/10 text-warning border-warning/20',
      restore: 'bg-success/10 text-success border-success/20',
      permanent_delete: 'bg-destructive/10 text-destructive border-destructive/20',
    };

    const labels = {
      create: 'Created',
      update: 'Updated',
      soft_delete: 'Archived',
      restore: 'Restored',
      permanent_delete: 'Deleted',
    };

    return (
      <Badge variant="outline" className={cn('text-xs', variants[action])}>
        {labels[action]}
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className={cn('border shadow-elevation-1', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle className="text-base font-medium">Activity Log</CardTitle>
                <Badge variant="outline" className="ml-2">
                  {logs.length} entries
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-[150px] h-8 text-xs">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="create">Created</SelectItem>
                  <SelectItem value="update">Updated</SelectItem>
                  <SelectItem value="soft_delete">Archived</SelectItem>
                  <SelectItem value="restore">Restored</SelectItem>
                  <SelectItem value="permanent_delete">Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity logs yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[350px]">
                <div className="space-y-3">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            {getActionBadge(log.action)}
                            <Badge variant="outline" className="text-xs">
                              {log.entityType}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatTime(log.createdAt)}
                          </span>
                        </div>
                        {log.description && (
                          <p className="text-sm mt-1">{log.description}</p>
                        )}
                        {log.entityName && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            Record: {log.entityName}
                          </p>
                        )}
                        {log.userName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            By: {log.userName}
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