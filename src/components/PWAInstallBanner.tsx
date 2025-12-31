import { Download, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { IOSInstallModal } from '@/components/IOSInstallModal';
import { toast } from 'sonner';

export const PWAInstallBanner = () => {
  const { showBanner, installApp, dismissBanner, isInstalled, isIOS, showIOSModal, closeIOSModal, isInstallable } = usePWAInstall();

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }
  
  // Show banner if explicitly shown OR if installable and not dismissed
  const shouldShowBanner = showBanner || isInstallable;

  const handleInstall = async () => {
    const result = await installApp();
    
    if (result === 'ios') {
      // iOS modal will be shown automatically
      return;
    }
    
    if (result === 'no-prompt') {
      // Show instructions for manual installation when native prompt isn't available
      toast.info(
        "To install: Click the browser menu (⋮) → 'Install app' or 'Add to Home screen'",
        { duration: 8000 }
      );
    } else if (result === true) {
      toast.success("App installed successfully!");
      dismissBanner();
    } else if (result === false) {
      // User dismissed the install prompt
      dismissBanner();
    }
  };

  return (
    <>
      {shouldShowBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-primary text-primary-foreground shadow-lg animate-slide-up">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="flex-shrink-0 p-2 bg-primary-foreground/20 rounded-full">
              <Smartphone className="h-6 w-6" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Install GHS Immunize</h3>
              <p className="text-xs opacity-90 truncate">
                {isIOS ? 'Add to home screen for quick access' : 'Add to home screen for quick access & offline use'}
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
                onClick={handleInstall}
              >
                <Download className="h-4 w-4" />
                {isIOS ? 'How to Install' : 'Install'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <IOSInstallModal open={showIOSModal} onClose={closeIOSModal} />
    </>
  );
};
