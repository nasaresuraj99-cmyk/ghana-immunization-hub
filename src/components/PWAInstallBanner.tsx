import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const PWAInstallBanner = () => {
  const { showBanner, installApp, dismissBanner, isInstalled } = usePWAInstall();

  if (!showBanner || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-primary text-primary-foreground shadow-lg animate-slide-up md:hidden">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 p-2 bg-primary-foreground/20 rounded-full">
          <Smartphone className="h-6 w-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Install GHS Immunize</h3>
          <p className="text-xs opacity-90 truncate">
            Add to home screen for quick access & offline use
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={dismissBanner}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            className="gap-1.5 font-medium"
            onClick={installApp}
          >
            <Download className="h-4 w-4" />
            Install
          </Button>
        </div>
      </div>
    </div>
  );
};
