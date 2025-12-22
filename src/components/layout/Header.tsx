import { useState } from "react";
import { Menu, LogOut, Home, UserPlus, List, AlertTriangle, LayoutDashboard, BarChart3, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeaderProps {
  facilityName: string;
  userName: string;
  userEmail: string;
  currentSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
}

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'registration', label: 'Register Child', icon: UserPlus },
  { id: 'register', label: 'Child Register', icon: List },
  { id: 'defaulters', label: 'Defaulters', icon: AlertTriangle },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reporting', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Header({ facilityName, userName, userEmail, currentSection, onSectionChange, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="gradient-ghs text-primary-foreground sticky top-0 z-50 shadow-elevation-2">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏥</span>
              <div>
                <h1 className="text-lg md:text-xl font-bold">Immunization Tracker</h1>
                <div className="text-xs md:text-sm opacity-90 bg-primary-foreground/10 px-2 py-0.5 rounded inline-block">
                  {facilityName}
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all",
                    currentSection === item.id
                      ? "bg-primary-foreground/20"
                      : "hover:bg-primary-foreground/10"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden xl:inline">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs opacity-80">{userEmail}</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex items-center gap-2 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/80 backdrop-blur-sm animate-fade-in lg:hidden">
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-card animate-slide-in-right">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                ×
              </Button>
            </div>
            
            <nav className="p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left font-medium transition-all",
                    currentSection === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
              <div className="mb-4 text-center">
                <p className="font-medium">{userName}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
