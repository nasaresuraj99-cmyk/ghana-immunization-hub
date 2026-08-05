import { useState } from "react";
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
import { UserManualSection } from "@/components/sections/UserManualSection";
import { OutreachHistorySection } from "@/components/sections/OutreachHistorySection";
import { InventorySection } from "@/components/sections/InventorySection";
import { VaccineAdministrationModal } from "@/components/modals/VaccineAdministrationModal";
import { ChildProfileModal } from "@/components/modals/ChildProfileModal";
import { ImmunizationStatusView } from "@/components/modals/ImmunizationStatusView";
import { BulkVaccinationModal } from "@/components/modals/BulkVaccinationModal";
import { CertificateModal } from "@/components/modals/CertificateModal";
import { ChildTransferModal } from "@/components/modals/ChildTransferModal";
import { GlobalSearchBar } from "@/components/GlobalSearchBar";
import { DeveloperCredits } from "@/components/DeveloperCredits";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { OfflineSyncIndicator } from "@/components/OfflineSyncIndicator";
import { SyncProgressBar } from "@/components/SyncProgressBar";
import { PendingChangesQueue } from "@/components/PendingChangesQueue";
import { ConflictResolutionModal } from "@/components/ConflictResolutionModal";
// FacilityOnboarding removed - users auto-assigned to FIAN URBAN CHPS
import { UserManagementPanel } from "@/components/UserManagementPanel";
import { ArchiveSection } from "@/components/ArchiveSection";
import { ActivityLogViewer } from "@/components/ActivityLogViewer";
import { AdminDashboard } from "@/components/AdminDashboard";
import { QRScannerVerification } from "@/components/QRScannerVerification";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useChildren } from "@/hooks/useChildren";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useInventory } from "@/hooks/useInventory";
import { Child, VaccineRecord } from "@/types/child";
import { ROLE_PERMISSIONS } from "@/types/facility";
import { getInventoryVaccineName } from "@/types/inventory";
import { Loader2 } from "lucide-react";

type Section = 'home' | 'registration' | 'register' | 'defaulters' | 'dashboard' | 'reporting' | 'settings' | 'schedule' | 'archive' | 'users' | 'activity' | 'admin' | 'help' | 'outreach-history' | 'inventory';

export default function Index() {
  const { user, loading: authLoading, login, signup, logout, forgotPassword, updateFacility, isAuthenticated, refreshUser, completeOnboarding, makeCurrentUserAdmin } = useAuth();
  const emailVerified = user?.emailVerified ?? true;
  const refreshAuth = refreshUser;
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [vaccineModalChild, setVaccineModalChild] = useState<Child | null>(null);
  const [profileModalChild, setProfileModalChild] = useState<Child | null>(null);
  const [immunizationStatusChild, setImmunizationStatusChild] = useState<Child | null>(null);
  const [showPendingQueue, setShowPendingQueue] = useState(false);
  const [showBulkVaccination, setShowBulkVaccination] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [certificateModalChild, setCertificateModalChild] = useState<Child | null>(null);
  const [highlightedChildRegNo, setHighlightedChildRegNo] = useState<string | undefined>(undefined);
  const [transferModalChild, setTransferModalChild] = useState<Child | null>(null);
  const [transferMode, setTransferMode] = useState<'in' | 'out'>('out');
  // Pass both userId and facilityId to useChildren
  const { 
    children, 
    archivedChildren,
    stats, 
    addChild, 
    updateChild, 
    softDeleteChild,
    restoreChild,
    permanentDeleteChild,
    updateVaccine,
    updateVaccineRecord,
    bulkAdministerVaccine, 
    importChildren,
    transferChildOut,
    transferChildIn,
    isSyncing, 
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
  
  // Inventory management hook for automatic deduction on vaccine administration
  const { recordAdministration, inventory } = useInventory();
  
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

  const handleAdministerVaccine = async (childId: string, vaccineName: string, givenDate: string, batchNumber: string) => {
    if (!permissions.canAdministerVaccines) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to administer vaccines.",
        variant: "destructive",
      });
      throw new Error("Permission denied");
    }

    try {
      // Map vaccine name to inventory base name (e.g., "BCG at Birth" -> "BCG")
      const baseVaccineName = getInventoryVaccineName(vaccineName);

      // Attempt to deduct from inventory automatically using atomic FEFO
      let inventoryDeducted = false;
      let deductionBatch: string | undefined;

      if (baseVaccineName) {
        const result = await recordAdministration(baseVaccineName, 1, childId);
        inventoryDeducted = result.success;
        deductionBatch = result.batchNumber;

        if (!result.success && inventory.length > 0) {
          console.warn(`Could not deduct ${baseVaccineName} from inventory: ${result.reason}`);
        }
      }

      const vaccineUpdated = await updateVaccine(childId, vaccineName, givenDate, batchNumber, user?.name);

      if (!vaccineUpdated) {
        throw new Error("Vaccine could not be recorded. Please retry.");
      }

      toast({
        title: "Vaccine Administered",
        description: `${vaccineName} has been recorded successfully.${inventoryDeducted ? ` Inventory updated (Batch: ${deductionBatch}).` : ''}`,
      });
    } catch (error) {
      toast({
        title: "Administration Failed",
        description: "Could not save this vaccine record. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUpdateVaccineRecord = (childId: string, updatedVaccine: VaccineRecord) => {
    if (!permissions.canEdit) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to edit vaccine records.",
        variant: "destructive",
      });
      return;
    }
    
    updateVaccineRecord(childId, updatedVaccine, user?.name);
    toast({
      title: "Vaccine Record Updated",
      description: `${updatedVaccine.name} has been updated.`,
    });
    
    // Refresh the child in the immunization status view
    const updatedChild = children.find(c => c.id === childId);
    if (updatedChild) {
      // Need to manually update since state update is async
      const newVaccines = updatedChild.vaccines.map(v => 
        v.name === updatedVaccine.name ? updatedVaccine : v
      );
      setImmunizationStatusChild({ ...updatedChild, vaccines: newVaccines });
    }
  };

  const handleViewImmunizationStatus = (child: Child) => {
    setProfileModalChild(null); // Close profile modal
    setImmunizationStatusChild(child);
  };

  const handleBulkVaccination = async (
    childIds: string[],
    vaccineName: string,
    date: string,
    batchNumber: string,
    outreachDetails?: {
      sessionId: string;
      outreachSite: string;
      sessionDate: string;
      vaccineName: string;
      batchNumber: string;
      status: 'in_progress' | 'completed';
      childCount: number;
      maleCount: number;
      femaleCount: number;
    }
  ) => {
    if (!permissions.canAdministerVaccines) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to administer vaccines.",
        variant: "destructive",
      });
      return;
    }
    
    // Map vaccine name to inventory base name (e.g., "BCG at Birth" -> "BCG")
    const baseVaccineName = getInventoryVaccineName(vaccineName);
    
    // Deduct from inventory for each child vaccinated using atomic FEFO
    let inventoryDeductedCount = 0;
    const failedReasons: string[] = [];
    
    if (baseVaccineName) {
      for (let i = 0; i < childIds.length; i++) {
        const result = await recordAdministration(
          baseVaccineName, 
          1, 
          childIds[i],
          outreachDetails?.sessionId
        );
        if (result.success) {
          inventoryDeductedCount++;
        } else if (result.reason && !failedReasons.includes(result.reason)) {
          failedReasons.push(result.reason);
        }
      }
    }
    
    if (inventoryDeductedCount < childIds.length && inventory.length > 0) {
      console.warn(`Only ${inventoryDeductedCount}/${childIds.length} vaccines deducted from inventory for ${baseVaccineName}. Reasons: ${failedReasons.join(', ')}`);
    }
    
    await bulkAdministerVaccine(childIds, vaccineName, date, batchNumber, user?.name, outreachDetails);
    toast({
      title: "Outreach Session Complete",
      description: `${vaccineName} administered to ${childIds.length} children (${outreachDetails?.maleCount || 0}M/${outreachDetails?.femaleCount || 0}F)${outreachDetails?.outreachSite ? ` at ${outreachDetails.outreachSite}` : ''}.${inventoryDeductedCount > 0 ? ` ${inventoryDeductedCount} doses deducted from inventory.` : ''}`,
    });
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
        onForgotPassword={handleForgotPassword}
      />
    );
  }

  // No onboarding needed - all users auto-assigned to FIAN URBAN CHPS

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
        onOpenQRScanner={() => setShowQRScanner(true)}
        pendingCount={syncProgress.pendingCount}
        isSyncing={isSyncing}
      />

      <div className="bg-card border-b px-3 sm:px-4 py-2.5 sm:py-3 shadow-elevation-1">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3">
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

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

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
            facilityName={user?.facility || "Health Facility"}
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
            onViewImmunizationStatus={handleViewImmunizationStatus}
            onBulkVaccination={() => setShowBulkVaccination(true)}
            onViewOutreachHistory={() => setCurrentSection('outreach-history')}
            onTransferOut={(child) => {
              setTransferModalChild(child);
              setTransferMode('out');
            }}
            onTransferIn={(child) => {
              setTransferModalChild(child);
              setTransferMode('in');
            }}
            canEdit={permissions.canEdit}
            canDelete={permissions.canSoftDelete}
            canAdministerVaccines={permissions.canAdministerVaccines}
            highlightedRegNo={highlightedChildRegNo}
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
            syncProgress={syncProgress}
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

        {currentSection === 'outreach-history' && (
          <OutreachHistorySection
            children={children}
            onBack={() => setCurrentSection('home')}
          />
        )}

        {currentSection === 'help' && (
          <UserManualSection />
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

        {currentSection === 'inventory' && (
          <InventorySection />
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
            onMakeAdmin={makeCurrentUserAdmin}
          />
        )}
      </main>

      <DeveloperCredits />
      
      <footer className="text-center py-4 text-xs text-muted-foreground border-t bg-card pb-24 md:pb-4">
        © {new Date().getFullYear()} Ghana Health Service - Immunization Tracker
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentSection={currentSection}
        onSectionChange={(section) => setCurrentSection(section as Section)}
        onOpenQRScanner={() => setShowQRScanner(true)}
        userRole={userRole}
      />


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
        onViewImmunizationStatus={handleViewImmunizationStatus}
        onTransferOut={(child) => {
          setProfileModalChild(null);
          setTransferModalChild(child);
          setTransferMode('out');
        }}
        onTransferIn={(child) => {
          setProfileModalChild(null);
          setTransferModalChild(child);
          setTransferMode('in');
        }}
        onViewCertificate={(child) => {
          setProfileModalChild(null);
          setCertificateModalChild(child);
        }}
        facilityName={user?.facility || "Health Facility"}
      />

      <ChildTransferModal
        child={transferModalChild}
        isOpen={!!transferModalChild}
        onClose={() => setTransferModalChild(null)}
        onTransferOut={(childId, destination, reason, date) => {
          transferChildOut(childId, destination, reason, date, user?.uid);
          setTransferModalChild(null);
        }}
        onTransferIn={(childData, source, reason, date) => {
          if (transferModalChild) {
            transferChildIn(transferModalChild.id, source, reason, date, user?.uid);
            setTransferModalChild(null);
          }
        }}
        mode={transferMode}
      />

      <ImmunizationStatusView
        child={immunizationStatusChild}
        isOpen={!!immunizationStatusChild}
        onClose={() => setImmunizationStatusChild(null)}
        onAdministerVaccine={(child) => {
          setImmunizationStatusChild(null);
          setVaccineModalChild(child);
        }}
        onUpdateVaccine={handleUpdateVaccineRecord}
        canEdit={permissions.canEdit}
      />

      <BulkVaccinationModal
        children={children}
        isOpen={showBulkVaccination}
        onClose={() => setShowBulkVaccination(false)}
        onAdminister={handleBulkVaccination}
        facilityName={user?.facility || "Health Facility"}
      />

      <CertificateModal
        child={certificateModalChild}
        isOpen={!!certificateModalChild}
        onClose={() => setCertificateModalChild(null)}
      />

      <ConflictResolutionModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        conflicts={conflicts}
        onResolve={handleConflictResolution}
        getConflictDiffs={getConflictDiffs}
      />

      <QRScannerVerification
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onFindChild={(regNo) => {
          setHighlightedChildRegNo(regNo);
          setCurrentSection('register');
          toast({
            title: "Child Found",
            description: `Showing record for ${regNo}`,
          });
        }}
      />

      <PWAInstallBanner />
      <OfflineSyncIndicator 
        pendingCount={syncProgress.pendingCount} 
        isSyncing={isSyncing}
      />
    </div>
  );
}
