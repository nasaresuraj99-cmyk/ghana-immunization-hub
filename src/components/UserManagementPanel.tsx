import { useState, useEffect } from 'react';
import { Users, Shield, ShieldCheck, Eye, MoreVertical, UserPlus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FacilityUser, AppRole, ROLE_PERMISSIONS } from '@/types/facility';
import { useFacility } from '@/hooks/useFacility';
import { cn } from '@/lib/utils';

interface UserManagementPanelProps {
  facilityId: string;
  currentUserId: string;
  currentUserRole: AppRole;
}

export function UserManagementPanel({
  facilityId,
  currentUserId,
  currentUserRole,
}: UserManagementPanelProps) {
  const { facility, facilityUsers, isLoading, updateUserRole, removeUserFromFacility } = useFacility(facilityId);
  const refreshUsers = () => {}; // Refresh handled by hook internally
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<FacilityUser | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const canManageUsers = ROLE_PERMISSIONS[currentUserRole].canManageUsers;

  const getRoleIcon = (role: AppRole) => {
    switch (role) {
      case 'facility_admin':
        return <ShieldCheck className="w-4 h-4" />;
      case 'staff':
        return <Shield className="w-4 h-4" />;
      case 'read_only':
        return <Eye className="w-4 h-4" />;
    }
  };

  const getRoleBadgeClass = (role: AppRole) => {
    switch (role) {
      case 'facility_admin':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'staff':
        return 'bg-info/10 text-info border-info/20';
      case 'read_only':
        return 'bg-muted text-muted-foreground border-muted-foreground/20';
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingUser(userId);
    try {
      await updateUserRole(userId, newRole);
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleRemoveUser = async () => {
    if (!confirmRemove) return;
    try {
      await removeUserFromFacility(confirmRemove.id);
    } finally {
      setConfirmRemove(null);
    }
  };

  return (
    <Card className="border shadow-elevation-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-medium">Facility Users</CardTitle>
            <Badge variant="outline" className="ml-2">
              {facilityUsers.length} member{facilityUsers.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={refreshUsers}
              disabled={isLoading}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
            {canManageUsers && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInviteOpen(true)}
                className="h-8 gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Invite</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {facilityUsers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No users in this facility</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {facilityUsers.map((user) => (
                <div
                  key={user.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border bg-card transition-colors',
                    user.id === currentUserId && 'border-primary/30 bg-primary/5'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {user.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {user.name}
                        </span>
                        {user.id === currentUserId && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManageUsers && user.id !== currentUserId ? (
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value as AppRole)}
                        disabled={updatingUser === user.id}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="facility_admin">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-3 h-3" />
                              Admin
                            </div>
                          </SelectItem>
                          <SelectItem value="staff">
                            <div className="flex items-center gap-2">
                              <Shield className="w-3 h-3" />
                              Staff
                            </div>
                          </SelectItem>
                          <SelectItem value="read_only">
                            <div className="flex items-center gap-2">
                              <Eye className="w-3 h-3" />
                              Read Only
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={cn('text-xs gap-1', getRoleBadgeClass(user.role))}>
                        {getRoleIcon(user.role)}
                        {user.role === 'facility_admin' ? 'Admin' : user.role === 'read_only' ? 'Read Only' : 'Staff'}
                      </Badge>
                    )}

                    {canManageUsers && user.id !== currentUserId && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setConfirmRemove(user)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove from facility
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Share your facility code with team members to invite them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm text-muted-foreground">Facility Code</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  value={facility?.code || ''}
                  readOnly
                  className="font-mono text-lg tracking-wider"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(facility?.code || '');
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                New users can enter this code when signing up to join your facility.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {confirmRemove?.name} from this facility?
              They will lose access to all facility data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveUser}>
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
