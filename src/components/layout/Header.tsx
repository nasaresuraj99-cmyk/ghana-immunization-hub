import { useState } from "react";
import { Menu, LogOut, Home, UserPlus, List, AlertTriangle, LayoutDashboard, BarChart3, Settings, X, Wifi, WifiOff, Calendar } from "lucide-react";
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
  { id: 'registration', label: 'Register', icon: UserPlus },
  { id: 'register', label: 'Children', icon: List },
  { id: 'defaulters', label: 'Defaulters', icon: AlertTriangle },
  { id: 'schedule', label: 'Schedule', icon: Calendar },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reporting', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Header({ facilityName, userName, userEmail, currentSection, onSectionChange, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOnline = navigator.onLine;

  return (
    <>
      <header className="gradient-ghs text-primary-foreground sticky top-0 z-50 shadow-elevation-3">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl animate-float">🏥</div>
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight">Immunization Tracker</h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs md:text-sm opacity-90 bg-primary-foreground/10 px-2 py-0.5 rounded-full">
                    {facilityName}
                  </span>
                  <span className={cn(
                    "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                    isOnline ? "bg-success/20" : "bg-warning/20"
                  )}>
                    {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 bg-primary-foreground/5 rounded-full p-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    currentSection === item.id
                      ? "bg-primary-foreground text-primary shadow-sm"
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
                <span className="text-sm font-semibold">{userName}</span>
                <span className="text-xs opacity-70">{userEmail}</span>
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
                className="hidden sm:flex items-center gap-2 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground hover:text-primary rounded-full"
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
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-foreground/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-card shadow-2xl animate-slide-in-right">
            <div className="flex items-center justify-between p-4 border-b gradient-ghs text-primary-foreground">
              <h2 className="text-lg font-bold">Menu</h2>
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="w-5 h-5" />
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
                    "flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-left font-medium transition-all",
                    currentSection === item.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-muted"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-muted/50">
              <div className="mb-4 text-center">
                <p className="font-semibold text-foreground">{userName}</p>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>
              <Button
                variant="destructive"
                className="w-full rounded-xl"
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
