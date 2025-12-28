import { useState } from "react";
import { Save, User, Building, Lock, AlertTriangle, Bell, Database, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { NotificationSettings } from "@/components/NotificationSettings";
import { DataExportButton } from "@/components/DataExportButton";
import { DataImportButton } from "@/components/DataImportButton";
import { SyncHistoryLog } from "@/components/SyncHistoryLog";
import { Child, DashboardStats } from "@/types/child";

interface SettingsSectionProps {
  userName: string;
  userEmail: string;
  userId: string;
  facilityName: string;
  children: Child[];
  stats: DashboardStats;
  onUpdateProfile: (name: string, facility: string) => void;
  onChangePassword: (currentPassword: string, newPassword: string) => void;
  onDeleteAccount: () => void;
  onImportChildren: (children: Child[]) => void;
}

export function SettingsSection({
  userName,
  userEmail,
  userId,
  facilityName,
  children,
  stats,
  onUpdateProfile,
  onChangePassword,
  onDeleteAccount,
  onImportChildren,
}: SettingsSectionProps) {
  const { toast } = useToast();
  const [name, setName] = useState(userName);
  const [facility, setFacility] = useState(facilityName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdateProfile = () => {
    if (!name || !facility) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    onUpdateProfile(name, facility);
    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    onChangePassword(currentPassword, newPassword);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast({
      title: "Success",
      description: "Password changed successfully",
    });
  };

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="bg-card rounded-lg p-6 shadow-elevation-1 space-y-8">
        <h2 className="text-xl font-bold text-foreground">⚙️ Account Settings</h2>

        {/* Profile Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2 pb-2 border-b border-primary/20">
            <User className="w-5 h-5" />
            Profile Information
          </h3>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Full Name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                value={userEmail}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="settings-facility">Facility Name</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="settings-facility"
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  placeholder="Enter facility name"
                  className="pl-10"
                />
              </div>
            </div>
            
            <Button onClick={handleUpdateProfile} className="w-fit">
              <Save className="w-4 h-4 mr-2" />
              Update Profile
            </Button>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2 pb-2 border-b border-primary/20">
            <Bell className="w-5 h-5" />
            Vaccine Reminders
          </h3>
          <NotificationSettings children={children} userId={userId} />
        </div>

        {/* Data & Backup Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2 pb-2 border-b border-primary/20">
            <Database className="w-5 h-5" />
            Data & Backup
          </h3>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Export your vaccination records for backup or analysis. Your data includes {children.length} registered children.
            </p>
            <div className="flex flex-wrap gap-2">
              <DataExportButton 
                children={children} 
                stats={stats} 
                facilityName={facilityName} 
              />
              <DataImportButton
                userId={userId}
                existingChildren={children}
                onImport={onImportChildren}
              />
            </div>
          </div>
        </div>

        {/* Sync History Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2 pb-2 border-b border-primary/20">
            <History className="w-5 h-5" />
            Sync History
          </h3>
          <p className="text-sm text-muted-foreground">
            View your recent data synchronization history including successful and failed sync attempts.
          </p>
          <SyncHistoryLog />
        </div>

        {/* Password Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2 pb-2 border-b border-primary/20">
            <Lock className="w-5 h-5" />
            Change Password
          </h3>
          
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            
            <Button onClick={handleChangePassword} variant="secondary" className="w-fit">
              <Lock className="w-4 h-4 mr-2" />
              Change Password
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-2 border-destructive/20 bg-destructive/5 rounded-lg p-6 space-y-4">
          <h4 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h4>
          <p className="text-sm text-muted-foreground">
            Deleting your account will permanently remove all your data including registered children and immunization records. This action cannot be undone.
          </p>
          <Button variant="destructive" onClick={onDeleteAccount}>
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}
