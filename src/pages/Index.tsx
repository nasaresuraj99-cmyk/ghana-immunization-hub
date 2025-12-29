import { useState, useEffect } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Header } from "@/components/layout/Header";
import { HomeSection } from "@/components/sections/HomeSection";
import { RegistrationSection } from "@/components/sections/RegistrationSection";
import { ChildRegisterSection } from "@/components/sections/ChildRegisterSection";
import { DefaultersSection } from "@/components/sections/DefaultersSection";
import { DashboardSection } from "@/components/sections/DashboardSection";
import { ReportingSection } from "@/components/sections/ReportingSection";
import { SettingsSection } from "@/components/sections/SettingsSection";
import { ImmunizationScheduleSection } from "@/components/sections/ImmunizationScheduleSection";
import { VaccineAdministrationModal } from "@/components/modals/VaccineAdministrationModal";
import { ChildProfileModal } from "@/components/modals/ChildProfileModal";
import { GlobalSearchBar } from "@/components/GlobalSearchBar";
import { DeveloperCredits } from "@/components/DeveloperCredits";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SyncProgressBar } from "@/components/SyncProgressBar";
import { PendingChangesQueue } from "@/components/PendingChangesQueue";
import { ConflictResolutionModal } from "@/components/ConflictResolutionModal";
import { FacilityOnboarding } from "@/components/FacilityOnboarding";
import { UserManagementPanel } from "@/components/UserManagementPanel";
import { ArchiveSection } from "@/components/ArchiveSection";
import { ActivityLogViewer } from "@/components/ActivityLogViewer";
import { AdminDashboard } from "@/components/AdminDashboard";
import { useChildren } from "@/hooks/useChildren";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Child } from "@/types/child";
import { ROLE_PERMISSIONS } from "@/types/facility";
import { Loader2 } from "lucide-react";

type Section = 'home' | 'registration' | 'register' | 'defaulters' | 'dashboard' | 'reporting' | 'settings' | 'schedule' | 'archive' | 'users' | 'activity' | 'admin';

export default function Index() {
  const { user, loading: authLoading, login, signup, logout, forgotPassword, updateFacility, isAuthenticated, refreshUser, needsOnboarding, completeOnboarding } = useAuth();
  const emailVerified = user?.emailVerified ?? true;
  const refreshAuth = refreshUser;
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [vaccineModalChild, setVaccineModalChild] = useState<Child | null>(null);
  const [profileModalChild, setProfileModalChild] = useState<Child | null>(null);
  const [showPendingQueue, setShowPendingQueue] = useState(false);
  
  // Pass both userId and facilityId to useChildren
  const { 
    children, 
    archivedChildren,
    stats, 
    addChild, 
    updateChild, 
    deleteChild,
    softDeleteChild,
    restoreChild,
    permanentDeleteChild,
    updateVaccine, 
    importChildren, 
    isSyncing, 
    isLoading, 
    syncProgress, 
    conflicts, 
    isConflictModalOpen, 
    setIsConflictModalOpen, 
    handleConflictResolution, 
    getConflictDiffs 
  } = useChildren({ 
    userId: user?.uid, 
    facilityId: user?.facilityId 
  });
  
  const { toast } = useToast();
  
  // Get user permissions based on role
  const userRole = user?.role || 'read_only';
  const permissions = ROLE_PERMISSIONS[userRole];

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignup = async (name: string, facility: string, email: string, password: string) => {
    try {
      await signup(name, facility, email, password);
      toast({
        title: "Account Created",
        description: "Your facility account has been created successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (email: string) => {
    try {
      await forgotPassword(email);
      toast({
        title: "Password Reset Email Sent",
        description: `Check ${email} for reset instructions.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setCurrentSection('home');
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSaveChild = (childData: Omit<Child, 'id' | 'userId' | 'registeredAt' | 'vaccines'>) => {
    if (!permissions.canAdd && !editingChild) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to add children.",
        variant: "destructive",
      });
      return;
    }
    
    if (!permissions.canEdit && editingChild) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit children.",
        variant: "destructive",
      });
      return;
    }
    
    if (editingChild) {
      updateChild(editingChild.id, childData, user?.name);
      setEditingChild(null);
      toast({
        title: "Updated",
        description: "Child record has been updated.",
      });
    } else {
      addChild(childData, user?.name);
      toast({
        title: "Registered",
        description: "Child has been registered successfully.",
      });
    }
    setCurrentSection('register');
  };

  const handleEditChild = (child: Child) => {
    if (!permissions.canEdit) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit children.",
        variant: "destructive",
      });
      return;
    }
    setEditingChild(child);
    setCurrentSection('registration');
  };

  const handleDeleteChild = (childId: string) => {
    if (!permissions.canSoftDelete) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete children.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm('Are you sure you want to archive this child record? It can be restored later.')) {
      softDeleteChild(childId, user?.uid || '', user?.name);
      toast({
        title: "Archived",
        description: "Child record has been archived.",
      });
    }
  };

  const handleRestoreChild = (childId: string) => {
    if (!permissions.canRestoreArchived) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to restore archived records.",
        variant: "destructive",
      });
      return;
    }
    
    restoreChild(childId, user?.uid || '', user?.name);
    toast({
      title: "Restored",
      description: "Child record has been restored.",
    });
  };

  const handlePermanentDelete = (childId: string) => {
    if (!permissions.canPermanentDelete) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to permanently delete records.",
        variant: "destructive",
      });
      return;
    }
    
    permanentDeleteChild(childId, user?.uid || '', user?.name);
    toast({
      title: "Permanently Deleted",
      description: "Child record has been permanently deleted.",
    });
  };

  const handleViewVaccines = (child: Child) => {
    setVaccineModalChild(child);
  };

  const handleViewProfile = (child: Child) => {
    setProfileModalChild(child);
  };

  const handleAdministerVaccine = (childId: string, vaccineName: string, givenDate: string, batchNumber: string) => {
    if (!permissions.canAdministerVaccines) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to administer vaccines.",
        variant: "destructive",
      });
      return;
    }
    
    updateVaccine(childId, vaccineName, givenDate, batchNumber, user?.name);
    toast({
      title: "Vaccine Administered",
      description: `${vaccineName} has been recorded successfully.`,
    });
    const updatedChild = children.find(c => c.id === childId);
    if (updatedChild) {
      setVaccineModalChild({ ...updatedChild });
    }
  };

  const handleOnboardingComplete = async (facilityId: string, facilityName: string, role: 'facility_admin' | 'staff') => {
    await updateFacility(facilityId, facilityName, role);
    completeOnboarding();
    toast({
      title: "Setup Complete",
      description: `Welcome to ${facilityName}!`,
    });
  };

  // Show loading screen while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onSignup={handleSignup}
        onForgotPassword={handleForgotPassword}
      />
    );
  }

  // Show facility onboarding if user needs it
  if (needsOnboarding) {
    return (
      <FacilityOnboarding
        userId={user?.uid || ''}
        userName={user?.name || ''}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        facilityName={user?.facility || ""}
        userName={user?.name || ""}
        userEmail={user?.email || ""}
        emailVerified={emailVerified}
        currentSection={currentSection}
        onSectionChange={(section) => {
          // Check permissions for protected sections
          if (section === 'users' && !permissions.canManageUsers) {
            toast({
              title: "Access Denied",
              description: "You don't have permission to manage users.",
              variant: "destructive",
            });
            return;
          }
          if (section === 'archive' && !permissions.canViewArchive) {
            toast({
              title: "Access Denied",
              description: "You don't have permission to view archived records.",
              variant: "destructive",
            });
            return;
          }
          if (section === 'activity' && !permissions.canViewActivityLog) {
            toast({
              title: "Access Denied",
              description: "You don't have permission to view activity logs.",
              variant: "destructive",
            });
            return;
          }
          setCurrentSection(section as Section);
          setEditingChild(null);
        }}
        onLogout={handleLogout}
        onRefreshAuth={refreshAuth}
        userRole={userRole}
      />

      <div className="bg-card border-b px-4 py-3 shadow-elevation-1">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <SyncProgressBar 
            syncProgress={syncProgress} 
            conflictCount={conflicts.length}
            onOpenConflicts={() => setIsConflictModalOpen(true)}
            onShowPendingQueue={() => setShowPendingQueue(!showPendingQueue)}
          />
          <GlobalSearchBar 
            children={children} 
            onSelectChild={handleViewProfile}
            onViewVaccines={handleViewVaccines}
          />
        </div>
      </div>

      {/* Pending Changes Queue */}
      {showPendingQueue && syncProgress.pendingCount > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-3">
          <PendingChangesQueue 
            isOnline={syncProgress.isOnline}
            pendingCount={syncProgress.pendingCount}
          />
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentSection === 'home' && (
          <HomeSection
            stats={stats}
            onNavigate={(section) => setCurrentSection(section as Section)}
          />
        )}

        {currentSection === 'registration' && permissions.canAdd && (
          <RegistrationSection
            editingChild={editingChild}
            existingChildren={children}
            onSave={handleSaveChild}
            onCancel={() => {
              setEditingChild(null);
              setCurrentSection('register');
            }}
            onBack={() => setCurrentSection('home')}
          />
        )}

        {currentSection === 'register' && (
          <ChildRegisterSection
            children={children}
            onEdit={handleEditChild}
            onDelete={handleDeleteChild}
            onViewVaccines={handleViewVaccines}
            canEdit={permissions.canEdit}
            canDelete={permissions.canSoftDelete}
          />
        )}

        {currentSection === 'defaulters' && (
          <DefaultersSection
            children={children}
            onRefresh={() => {
              toast({
                title: "Refreshed",
                description: "Defaulters list has been updated.",
              });
            }}
            canExport={permissions.canExportData}
            onViewVaccines={handleViewVaccines}
          />
        )}

        {currentSection === 'dashboard' && (
          <DashboardSection
            stats={stats}
            children={children}
            onViewChild={handleViewProfile}
          />
        )}

        {currentSection === 'reporting' && (
          <ReportingSection
            stats={stats}
            children={children}
          />
        )}

        {currentSection === 'schedule' && (
          <ImmunizationScheduleSection />
        )}

        {currentSection === 'archive' && permissions.canViewArchive && (
          <ArchiveSection
            archivedChildren={archivedChildren}
            userRole={userRole}
            onRestore={handleRestoreChild}
            onPermanentDelete={handlePermanentDelete}
          />
        )}

        {currentSection === 'users' && permissions.canManageUsers && user?.facilityId && (
          <UserManagementPanel
            facilityId={user.facilityId}
            currentUserId={user.uid}
            currentUserRole={userRole}
          />
        )}

        {currentSection === 'activity' && permissions.canViewActivityLog && user?.facilityId && (
          <ActivityLogViewer
            facilityId={user.facilityId}
          />
        )}

        {currentSection === 'admin' && permissions.canManageUsers && user?.facilityId && (
          <AdminDashboard
            facilityId={user.facilityId}
            currentUserId={user.uid}
            currentUserRole={userRole}
            facilityUsers={[]}
            facilityName={user.facility || 'Facility'}
          />
        )}

        {currentSection === 'settings' && (
          <SettingsSection
            userName={user?.name || ""}
            userEmail={user?.email || ""}
            userId={user?.uid || ""}
            facilityName={user?.facility || ""}
            children={children}
            stats={stats}
            userRole={userRole}
            onUpdateProfile={(name, facility) => {
              toast({
                title: "Profile Updated",
                description: "Your profile has been updated successfully.",
              });
            }}
            onChangePassword={(current, newPass) => {
              toast({
                title: "Password Change",
                description: "Please use the forgot password feature to change your password.",
              });
            }}
            onDeleteAccount={() => {
              if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                handleLogout();
              }
            }}
            onImportChildren={importChildren}
            onNavigateToArchive={() => setCurrentSection('archive')}
            onNavigateToUsers={() => setCurrentSection('users')}
            onNavigateToActivity={() => setCurrentSection('activity')}
            onNavigateToAdmin={() => setCurrentSection('admin')}
          />
        )}
      </main>

      <DeveloperCredits />
      
      <footer className="text-center py-4 text-xs text-muted-foreground border-t bg-card">
        © {new Date().getFullYear()} Ghana Health Service - Immunization Tracker
      </footer>

      <VaccineAdministrationModal
        child={vaccineModalChild}
        isOpen={!!vaccineModalChild}
        onClose={() => setVaccineModalChild(null)}
        onAdminister={handleAdministerVaccine}
        canAdminister={permissions.canAdministerVaccines}
      />

      <ChildProfileModal
        child={profileModalChild}
        isOpen={!!profileModalChild}
        onClose={() => setProfileModalChild(null)}
        onAdministerVaccine={(child) => {
          setProfileModalChild(null);
          setVaccineModalChild(child);
        }}
      />

      <ConflictResolutionModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        conflicts={conflicts}
        onResolve={handleConflictResolution}
        getConflictDiffs={getConflictDiffs}
      />

      <PWAInstallBanner />
      <OfflineIndicator isSyncing={isSyncing} />
    </div>
  );
}
