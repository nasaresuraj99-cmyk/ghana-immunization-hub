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
import { useChildren } from "@/hooks/useChildren";
import { useToast } from "@/hooks/use-toast";
import { Child } from "@/types/child";

type Section = 'home' | 'registration' | 'register' | 'defaulters' | 'dashboard' | 'reporting' | 'settings';

interface User {
  name: string;
  email: string;
  facility: string;
}

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [currentSection, setCurrentSection] = useState<Section>('home');
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  
  const { children, stats, addChild, updateChild, deleteChild } = useChildren();
  const { toast } = useToast();

  const handleLogin = (email: string, password: string) => {
    // Demo login - in production, this would authenticate against a backend
    setUser({
      name: "Health Worker",
      email: email,
      facility: "Korle Bu Teaching Hospital",
    });
    setIsAuthenticated(true);
    toast({
      title: "Welcome!",
      description: "You have successfully logged in.",
    });
  };

  const handleSignup = (name: string, facility: string, email: string, password: string) => {
    setUser({
      name,
      email,
      facility,
    });
    setIsAuthenticated(true);
    toast({
      title: "Account Created",
      description: "Your facility account has been created successfully.",
    });
  };

  const handleForgotPassword = (email: string) => {
    toast({
      title: "Password Reset",
      description: `Password reset instructions sent to ${email}`,
    });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCurrentSection('home');
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully.",
    });
  };

  const handleSaveChild = (childData: Omit<Child, 'id' | 'registeredAt' | 'vaccines'>) => {
    if (editingChild) {
      updateChild(editingChild.id, childData);
      setEditingChild(null);
    } else {
      addChild(childData);
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
    toast({
      title: child.name,
      description: `${child.vaccines.filter(v => v.status === 'completed').length}/${child.vaccines.length} vaccines completed`,
    });
  };

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
        currentSection={currentSection}
        onSectionChange={(section) => {
          setCurrentSection(section as Section);
          setEditingChild(null);
        }}
        onLogout={handleLogout}
      />

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
          />
        )}

        {currentSection === 'reporting' && (
          <ReportingSection
            stats={stats}
            children={children}
          />
        )}

        {currentSection === 'settings' && (
          <SettingsSection
            userName={user?.name || ""}
            userEmail={user?.email || ""}
            facilityName={user?.facility || ""}
            onUpdateProfile={(name, facility) => {
              setUser(prev => prev ? { ...prev, name, facility } : null);
            }}
            onChangePassword={(current, newPass) => {
              console.log("Password change requested");
            }}
            onDeleteAccount={() => {
              if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                handleLogout();
              }
            }}
          />
        )}
      </main>

      <footer className="text-center py-6 text-sm text-muted-foreground border-t bg-card mt-12">
        © {new Date().getFullYear()} Ghana Health Service - Immunization Tracker
      </footer>
    </div>
  );
}
