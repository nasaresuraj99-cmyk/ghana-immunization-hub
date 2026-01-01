import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Child } from "@/types/child";
import { RotateCcw, AlertTriangle } from "lucide-react";

interface ResetRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  mode: 'single' | 'all';
  child?: Child | null;
  totalChildren?: number;
}

export function ResetRecordsModal({
  isOpen,
  onClose,
  onConfirm,
  mode,
  child,
  totalChildren = 0,
}: ResetRecordsModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {mode === 'single' ? 'Reset Vaccination Records' : 'Reset All Vaccination Records'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {mode === 'single' && child ? (
              <>
                <p>
                  You are about to reset all vaccination records for <strong>{child.name}</strong> ({child.regNo}).
                </p>
                <p>
                  This will clear all given dates, batch numbers, and mark all vaccines as pending or overdue based on due dates.
                </p>
              </>
            ) : (
              <>
                <p>
                  You are about to reset vaccination records for <strong>ALL {totalChildren} children</strong>.
                </p>
                <p>
                  This will clear all given dates, batch numbers, and mark all vaccines as pending or overdue.
                </p>
              </>
            )}
            <p className="text-destructive font-medium">
              This action cannot be undone!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {mode === 'single' ? 'Reset Records' : 'Reset All Records'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
