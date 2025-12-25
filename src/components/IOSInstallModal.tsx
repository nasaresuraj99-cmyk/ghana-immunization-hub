import { X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface IOSInstallModalProps {
  open: boolean;
  onClose: () => void;
}

export const IOSInstallModal = ({ open, onClose }: IOSInstallModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Install GHS Immunize
          </DialogTitle>
          <DialogDescription>
            Add this app to your home screen for quick access and offline use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
              1
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Tap the Share button</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Look for the
                <Share className="h-4 w-4 inline mx-1" />
                icon at the bottom of Safari
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
              2
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Scroll and tap "Add to Home Screen"</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                Look for the
                <PlusSquare className="h-4 w-4 inline mx-1" />
                icon in the menu
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm shrink-0">
              3
            </div>
            <div className="space-y-1">
              <p className="font-medium text-foreground">Tap "Add" to install</p>
              <p className="text-sm text-muted-foreground">
                The app will appear on your home screen
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
