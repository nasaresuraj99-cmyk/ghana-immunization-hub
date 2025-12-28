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
import { ConflictResolutionModal } from "@/components/ConflictResolutionModal";
import { useChildren } from "@/hooks/useChildren";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Child } from "@/types/child";
import { Loader2 } from "lucide-react";

type Section = 'home' | 'registration' | 'register' | 'defaulters' | 'dashboard' | 'reporting' | 'settings' | 'schedule';

export default function Index() {
  const { user, loading: authLoading, login, signup, logout, forgotPassword, updateFacility, isAuthenticated, refreshUser } = useAuth();
  const emailVerified = user?.emailVerified ?? true;
  const refreshAuth = refreshUser;
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [vaccineModalChild, setVaccineModalChild] = useState<Child | null>(null);
  const [profileModalChild, setProfileModalChild] = useState<Child | null>(null);
  
  const { children, stats, addChild, updateChild, deleteChild, updateVaccine, importChildren, isSyncing, isLoading, syncProgress, conflicts, isConflictModalOpen, setIsConflictModalOpen, handleConflictResolution, getConflictDiffs } = useChildren(user?.uid);
  const { toast } = useToast();

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
    if (editingChild) {
      updateChild(editingChild.id, childData);
      setEditingChild(null);
      toast({
        title: "Updated",
        description: "Child record has been updated.",
      });
    } else {
      addChild(childData);
      toast({
        title: "Registered",
        description: "Child has been registered successfully.",
      });
    }
    setCurrentSection('register');
  };

  const handleEditChild = (child: Child) => {
    setEditingChild(child);
    setCurrentSection('registration');
  };

  const handleDeleteChild = (childId: string) => {
    if (confirm('Are you sure you want to delete this child record?')) {
      deleteChild(childId);
      toast({
        title: "Deleted",
        description: "Child record has been deleted.",
      });
    }
  };

  const handleViewVaccines = (child: Child) => {
    setVaccineModalChild(child);
  };

  const handleViewProfile = (child: Child) => {
    setProfileModalChild(child);
  };

  const handleAdministerVaccine = (childId: string, vaccineName: string, givenDate: string, batchNumber: string) => {
    updateVaccine(childId, vaccineName, givenDate, batchNumber);
    toast({
      title: "Vaccine Administered",
      description: `${vaccineName} has been recorded successfully.`,
    });
    const updatedChild = children.find(c => c.id === childId);
    if (updatedChild) {
      setVaccineModalChild({ ...updatedChild });
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Header
        facilityName={user?.facility || ""}
        userName={user?.name || ""}
        userEmail={user?.email || ""}
        emailVerified={emailVerified}
        currentSection={currentSection}
        onSectionChange={(section) => {
          setCurrentSection(section as Section);
          setEditingChild(null);
        }}
        onLogout={handleLogout}
        onRefreshAuth={refreshAuth}
      />

      <div className="bg-card border-b px-4 py-3 shadow-elevation-1">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <SyncProgressBar 
            syncProgress={syncProgress} 
            conflictCount={conflicts.length}
            onOpenConflicts={() => setIsConflictModalOpen(true)}
          />
          <GlobalSearchBar 
            children={children} 
            onSelectChild={handleViewProfile}
            onViewVaccines={handleViewVaccines}
          />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentSection === 'home' && (
          <HomeSection
            stats={stats}
            onNavigate={(section) => setCurrentSection(section as Section)}
          />
        )}

        {currentSection === 'registration' && (
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

        {currentSection === 'settings' && (
          <SettingsSection
            userName={user?.name || ""}
            userEmail={user?.email || ""}
            userId={user?.uid || ""}
            facilityName={user?.facility || ""}
            children={children}
            stats={stats}
            onUpdateProfile={(name, facility) => {
              updateFacility(facility);
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
