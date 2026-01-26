import { useState } from 'react';
import { 
  Activity, 
  Filter, 
  Calendar, 
  FileEdit, 
  Trash2, 
  RotateCcw, 
  Plus, 
  RefreshCw, 
  FileText, 
  Download, 
  Syringe, 
  User, 
  Award, 
  FileSpreadsheet,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ActivityLog } from '@/types/facility';
import { useActivityLog } from '@/hooks/useActivityLog';
import { cn, formatDate } from '@/lib/utils';

interface ActivityLogViewerProps {
  facilityId: string;
  className?: string;
}

export function ActivityLogViewer({ facilityId, className }: ActivityLogViewerProps) {
  const { logs, isLoading, refreshLogs } = useActivityLog(facilityId);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');

  const filteredLogs = logs.filter(log => {
    const actionMatch = filterAction === 'all' || log.action === filterAction;
    const entityMatch = filterEntity === 'all' || log.entityType === filterEntity;
    return actionMatch && entityMatch;
  });

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
      case 'generate_document':
        return <FileText className="w-4 h-4 text-primary" />;
      case 'export_data':
        return <Download className="w-4 h-4 text-secondary" />;
      case 'bulk_administer':
        return <Syringe className="w-4 h-4 text-success" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEntityIcon = (entityType: ActivityLog['entityType']) => {
    switch (entityType) {
      case 'child':
        return <User className="w-3 h-3" />;
      case 'vaccine':
        return <Syringe className="w-3 h-3" />;
      case 'certificate':
        return <Award className="w-3 h-3" />;
      case 'immunization_card':
        return <ClipboardList className="w-3 h-3" />;
      case 'report':
        return <FileSpreadsheet className="w-3 h-3" />;
      case 'data_export':
        return <Download className="w-3 h-3" />;
      case 'user':
        return <User className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const getActionBadge = (action: ActivityLog['action']) => {
    const variants: Record<string, string> = {
      create: 'bg-success/10 text-success border-success/20',
      update: 'bg-info/10 text-info border-info/20',
      soft_delete: 'bg-warning/10 text-warning border-warning/20',
      restore: 'bg-success/10 text-success border-success/20',
      permanent_delete: 'bg-destructive/10 text-destructive border-destructive/20',
      generate_document: 'bg-primary/10 text-primary border-primary/20',
      export_data: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
      bulk_administer: 'bg-success/10 text-success border-success/20',
    };

    const labels: Record<string, string> = {
      create: 'Created',
      update: 'Updated',
      soft_delete: 'Archived',
      restore: 'Restored',
      permanent_delete: 'Deleted',
      generate_document: 'Generated',
      export_data: 'Exported',
      bulk_administer: 'Bulk Vaccination',
    };

    return (
      <Badge variant="outline" className={cn('text-xs', variants[action] || 'bg-muted')}>
        {labels[action] || action}
      </Badge>
    );
  };

  const getEntityBadge = (entityType: ActivityLog['entityType']) => {
    const labels: Record<string, string> = {
      child: 'Child',
      vaccine: 'Vaccine',
      certificate: 'Certificate',
      immunization_card: 'Imm. Card',
      report: 'Report',
      data_export: 'Data Export',
      user: 'User',
    };

    return (
      <Badge variant="outline" className="text-xs flex items-center gap-1">
        {getEntityIcon(entityType)}
        {labels[entityType] || entityType}
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
    return formatDate(date) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className={cn('border shadow-elevation-1', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-medium">Activity Log</CardTitle>
            <Badge variant="outline" className="ml-2">
              {filteredLogs.length} of {logs.length} entries
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={refreshLogs}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filter action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Created</SelectItem>
              <SelectItem value="update">Updated</SelectItem>
              <SelectItem value="soft_delete">Archived</SelectItem>
              <SelectItem value="restore">Restored</SelectItem>
              <SelectItem value="permanent_delete">Deleted</SelectItem>
              <SelectItem value="generate_document">Generated Doc</SelectItem>
              <SelectItem value="export_data">Exported Data</SelectItem>
              <SelectItem value="bulk_administer">Bulk Vaccination</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filter entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="child">Child</SelectItem>
              <SelectItem value="vaccine">Vaccine</SelectItem>
              <SelectItem value="certificate">Certificate</SelectItem>
              <SelectItem value="immunization_card">Imm. Card</SelectItem>
              <SelectItem value="report">Report</SelectItem>
              <SelectItem value="data_export">Data Export</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity logs found</p>
            {(filterAction !== 'all' || filterEntity !== 'all') && (
              <p className="text-xs mt-1">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
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
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getActionBadge(log.action)}
                        {getEntityBadge(log.entityType)}
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
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="w-3 h-3" />
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
    </Card>
  );
}
