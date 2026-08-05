import { useState } from "react";
import { Home, Users, AlertTriangle, QrCode, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItems } from "@/components/layout/Header";
import { AppRole } from "@/types/facility";

interface MobileBottomNavProps {
  currentSection: string;
  onSectionChange: (section: string) => void;
  onOpenQRScanner: () => void;
  userRole?: AppRole;
}

export function MobileBottomNav({
  currentSection,
  onSectionChange,
  onOpenQRScanner,
  userRole,
}: MobileBottomNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const allItems = getNavItems(userRole);

  const primaryItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "register", icon: Users, label: "Children" },
  ];
  const secondaryItems = [
    { id: "defaulters", icon: AlertTriangle, label: "Defaulters" },
  ];

  const inMenu = !["home", "register", "defaulters"].includes(currentSection);

  const renderTab = (item: { id: string; icon: any; label: string }) => {
    const Icon = item.icon;
    const isActive = currentSection === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSectionChange(item.id)}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] rounded-xl transition-colors active:bg-muted",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 2} />
        <span className={cn("text-[10px] leading-none", isActive ? "font-semibold" : "font-medium")}>
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur border-t shadow-elevation-3 pb-safe md:hidden">
        <div className="flex items-end justify-around px-1 pt-1 pb-1">
          {primaryItems.map(renderTab)}

          <button
            type="button"
            onClick={onOpenQRScanner}
            aria-label="Scan QR code"
            className="flex flex-1 flex-col items-center justify-end gap-1 min-h-[56px]"
          >
            <span className="w-14 h-14 -mt-7 rounded-full gradient-ghs flex items-center justify-center shadow-glow border-4 border-background">
              <QrCode className="w-6 h-6 text-primary-foreground" />
            </span>
            <span className="text-[10px] leading-none font-medium text-muted-foreground">Scan</span>
          </button>

          {secondaryItems.map(renderTab)}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="More menu"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[56px] rounded-xl transition-colors active:bg-muted",
              inMenu ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Menu className="w-[22px] h-[22px]" />
            <span className={cn("text-[10px] leading-none", inMenu ? "font-semibold" : "font-medium")}>
              More
            </span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-foreground/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-card shadow-2xl animate-slide-up max-h-[80vh] overflow-y-auto pb-safe">
            <div className="sticky top-0 flex items-center justify-between px-5 py-3 bg-card border-b rounded-t-3xl">
              <h2 className="text-base font-semibold">All sections</h2>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="p-2 -mr-2 rounded-full active:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              {allItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSectionChange(item.id);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border text-center transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-md"
                        : "bg-muted/40 border-border/60 active:bg-muted"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
