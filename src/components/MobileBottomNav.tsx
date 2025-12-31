import { Home, ClipboardList, AlertTriangle, QrCode, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  onOpenQRScanner: () => void;
}

export function MobileBottomNav({ 
  currentSection, 
  onSectionChange, 
  onOpenQRScanner 
}: MobileBottomNavProps) {
  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'register', icon: ClipboardList, label: 'Register' },
    { id: 'qr', icon: QrCode, label: 'Scan QR', isQR: true },
    { id: 'defaulters', icon: AlertTriangle, label: 'Defaulters' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg md:hidden">
      <nav className="flex items-center justify-around px-2 py-1 safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          
          if (item.isQR) {
            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                className="flex flex-col items-center gap-0.5 h-auto py-2 px-3 relative -mt-6"
                onClick={onOpenQRScanner}
              >
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-background">
                  <Icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-medium mt-1">{item.label}</span>
              </Button>
            );
          }
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center gap-0.5 h-auto py-2 px-3 min-w-0",
                isActive && "text-primary"
              )}
              onClick={() => onSectionChange(item.id)}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className={cn(
                "text-[10px]",
                isActive ? "font-semibold" : "font-medium text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
