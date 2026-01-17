import { useState, useEffect } from 'react';
import { 
  Activity, 
  Users, 
  Shield, 
  LogIn, 
  UserPlus, 
  Clock, 
  TrendingUp,
  Calendar,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  UserX
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActivityLogViewer } from '@/components/ActivityLogViewer';
import { UserManagementPanel } from '@/components/UserManagementPanel';
import { AppRole, ActivityLog, FacilityUser } from '@/types/facility';
import { cn } from '@/lib/utils';

interface LoginRecord {
  id: string;
  userId: string;
  userName: string;
  email: string;
  timestamp: string;
  type: 'login' | 'logout' | 'failed_login';
  ipAddress?: string;
  userAgent?: string;
}

interface RoleChangeRecord {
  id: string;
  userId: string;
  userName: string;
  changedBy: string;
  changedByName: string;
  oldRole: AppRole;
  newRole: AppRole;
  timestamp: string;
}

interface AdminDashboardProps {
  facilityId: string;
  currentUserId: string;
  currentUserRole: AppRole;
  facilityUsers: FacilityUser[];
  facilityName: string;
}

export function AdminDashboard({
  facilityId,
  currentUserId,
  currentUserRole,
  facilityUsers,
  facilityName,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [roleChanges, setRoleChanges] = useState<RoleChangeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load login history from localStorage (in real app, would come from Firebase)
  useEffect(() => {
    const storedLogins = localStorage.getItem(`login_history_${facilityId}`);
    if (storedLogins) {
      setLoginHistory(JSON.parse(storedLogins));
    } else {
      // Generate sample data for demo
      const sampleLogins: LoginRecord[] = facilityUsers.slice(0, 5).map((user, idx) => ({
        id: `login-${idx}`,
        userId: user.id,
        userName: user.name,
        email: user.email,
        timestamp: new Date(Date.now() - idx * 3600000 * (idx + 1)).toISOString(),
        type: 'login' as const,
      }));
      setLoginHistory(sampleLogins);
    }

    const storedRoleChanges = localStorage.getItem(`role_changes_${facilityId}`);
    if (storedRoleChanges) {
      setRoleChanges(JSON.parse(storedRoleChanges));
    }
  }, [facilityId, facilityUsers]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

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

  const stats = {
    totalUsers: facilityUsers.length,
    admins: facilityUsers.filter(u => u.role === 'facility_admin').length,
    staff: facilityUsers.filter(u => u.role === 'staff').length,
    readOnly: facilityUsers.filter(u => u.role === 'read_only').length,
    recentLogins: loginHistory.filter(l => {
      const loginDate = new Date(l.timestamp);
      const yesterday = new Date(Date.now() - 86400000);
      return loginDate > yesterday;
    }).length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground font-display flex items-center gap-2">
            <div className="p-2 rounded-lg gradient-ghs text-primary-foreground">
              <Activity className="w-6 h-6" />
            </div>
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Monitor user activity, logins, and role changes for {facilityName}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => setIsLoading(true)}
          disabled={isLoading}
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-0 shadow-elevation-2 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Users</p>
                <p className="text-2xl font-bold text-primary mt-1">{stats.totalUsers}</p>
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elevation-2 bg-gradient-to-br from-success/5 to-success/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admins</p>
                <p className="text-2xl font-bold text-success mt-1">{stats.admins}</p>
              </div>
              <div className="p-2 rounded-full bg-success/10">
                <ShieldCheck className="w-5 h-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elevation-2 bg-gradient-to-br from-info/5 to-info/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Staff</p>
                <p className="text-2xl font-bold text-info mt-1">{stats.staff}</p>
              </div>
              <div className="p-2 rounded-full bg-info/10">
                <Shield className="w-5 h-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elevation-2 bg-gradient-to-br from-warning/5 to-warning/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Read Only</p>
                <p className="text-2xl font-bold text-warning mt-1">{stats.readOnly}</p>
              </div>
              <div className="p-2 rounded-full bg-warning/10">
                <Eye className="w-5 h-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-elevation-2 bg-gradient-to-br from-accent/5 to-accent/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Logins</p>
                <p className="text-2xl font-bold text-accent-foreground mt-1">{stats.recentLogins}</p>
              </div>
              <div className="p-2 rounded-full bg-accent/20">
                <LogIn className="w-5 h-5 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 gap-2 bg-muted/50 p-1">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:gradient-ghs data-[state=active]:text-primary-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:gradient-ghs data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="logins" className="gap-2 data-[state=active]:gradient-ghs data-[state=active]:text-primary-foreground">
            <LogIn className="w-4 h-4" />
            <span className="hidden sm:inline">Logins</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2 data-[state=active]:gradient-ghs data-[state=active]:text-primary-foreground">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Recent Logins */}
            <Card className="shadow-elevation-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LogIn className="w-5 h-5 text-primary" />
                    Recent Logins
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('logins')}>
                    View All
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {loginHistory.slice(0, 5).map((login) => (
                    <div key={login.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-1.5 rounded-full",
                          login.type === 'login' ? "bg-success/10" : 
                          login.type === 'logout' ? "bg-muted" : "bg-destructive/10"
                        )}>
                          {login.type === 'login' ? (
                            <UserCheck className="w-4 h-4 text-success" />
                          ) : login.type === 'logout' ? (
                            <UserX className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <UserX className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{login.userName}</p>
                          <p className="text-xs text-muted-foreground">{login.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          login.type === 'login' ? "bg-success/10 text-success border-success/20" :
                          login.type === 'logout' ? "bg-muted text-muted-foreground" :
                          "bg-destructive/10 text-destructive border-destructive/20"
                        )}>
                          {login.type === 'login' ? 'Signed In' : login.type === 'logout' ? 'Signed Out' : 'Failed'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(login.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {loginHistory.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <LogIn className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No login history yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Role Changes */}
            <Card className="shadow-elevation-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Role Changes
                  </div>
                  <Badge variant="outline">{roleChanges.length} total</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roleChanges.slice(0, 5).map((change) => (
                    <div key={change.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="p-1.5 rounded-full bg-info/10">
                        <Shield className="w-4 h-4 text-info" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{change.userName}</span>
                          <span className="text-muted-foreground"> role changed</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={cn("text-xs", getRoleBadgeClass(change.oldRole))}>
                            {getRoleIcon(change.oldRole)}
                            <span className="ml-1">{change.oldRole}</span>
                          </Badge>
                          <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                          <Badge variant="outline" className={cn("text-xs", getRoleBadgeClass(change.newRole))}>
                            {getRoleIcon(change.newRole)}
                            <span className="ml-1">{change.newRole}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          By {change.changedByName} · {formatTimeAgo(change.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  {roleChanges.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No role changes recorded</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <UserManagementPanel
            facilityId={facilityId}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />
        </TabsContent>

        {/* Logins Tab */}
        <TabsContent value="logins">
          <Card className="shadow-elevation-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <LogIn className="w-5 h-5 text-primary" />
                Login History
                <Badge variant="outline" className="ml-2">{loginHistory.length} records</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {loginHistory.map((login) => (
                    <div key={login.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          login.type === 'login' ? "bg-success/10" : 
                          login.type === 'logout' ? "bg-muted" : "bg-destructive/10"
                        )}>
                          {login.type === 'login' ? (
                            <UserCheck className="w-5 h-5 text-success" />
                          ) : login.type === 'logout' ? (
                            <UserX className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <UserX className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{login.userName}</p>
                          <p className="text-sm text-muted-foreground">{login.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={cn(
                          "text-xs",
                          login.type === 'login' ? "bg-success/10 text-success border-success/20" :
                          login.type === 'logout' ? "bg-muted text-muted-foreground" :
                          "bg-destructive/10 text-destructive border-destructive/20"
                        )}>
                          {login.type === 'login' ? 'Signed In' : login.type === 'logout' ? 'Signed Out' : 'Failed Attempt'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(login.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {loginHistory.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <LogIn className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No login history recorded</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ActivityLogViewer facilityId={facilityId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
