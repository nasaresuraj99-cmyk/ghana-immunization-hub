import { useState } from 'react';
import { Archive, RotateCcw, Trash2, Search, Calendar, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Child } from '@/types/child';
import { ROLE_PERMISSIONS, AppRole } from '@/types/facility';
import { cn } from '@/lib/utils';

interface ArchiveSectionProps {
  archivedChildren: Child[];
  userRole: AppRole;
  onRestore: (childId: string) => void;
  onPermanentDelete: (childId: string) => void;
  className?: string;
}

export function ArchiveSection({
  archivedChildren,
  userRole,
  onRestore,
  onPermanentDelete,
  className,
}: ArchiveSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Child | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<Child | null>(null);

  const permissions = ROLE_PERMISSIONS[userRole];

  const filteredChildren = archivedChildren.filter(child =>
    child.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    child.regNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    child.motherName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRestore = () => {
    if (!confirmRestore) return;
    onRestore(confirmRestore.id);
    setConfirmRestore(null);
  };

  const handlePermanentDelete = () => {
    if (!confirmDelete) return;
    onPermanentDelete(confirmDelete.id);
    setConfirmDelete(null);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <Card className={cn('border shadow-elevation-1', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-warning" />
            <CardTitle className="text-base font-medium">Archived Records</CardTitle>
            <Badge variant="outline" className="ml-2">
              {archivedChildren.length}
            </Badge>
          </div>
        </div>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search archived records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent>
        {filteredChildren.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {archivedChildren.length === 0 
                ? 'No archived records'
                : 'No matching records found'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredChildren.map((child) => (
                <div
                  key={child.id}
                  className="p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{child.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {child.regNo}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {child.motherName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Deleted: {formatDate(child.deletedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {permissions.canRestoreArchived && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmRestore(child)}
                          className="h-8 gap-1.5 text-success border-success/30 hover:bg-success/10"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </Button>
                      )}
                      {permissions.canPermanentDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmDelete(child)}
                          className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Restore Confirmation Dialog */}
      <Dialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to restore {confirmRestore?.name}'s record? 
              It will be moved back to the active register.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRestore(null)}>
              Cancel
            </Button>
            <Button onClick={handleRestore} className="bg-success hover:bg-success/90">
              Restore Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Permanently Delete Record
            </DialogTitle>
            <DialogDescription>
              <span className="block mb-2">
                Are you sure you want to permanently delete {confirmDelete?.name}'s record?
              </span>
              <span className="block font-medium text-destructive">
                This action cannot be undone. All vaccination history will be lost forever.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handlePermanentDelete}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
