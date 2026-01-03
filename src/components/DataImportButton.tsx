import { useRef, useState } from "react";
import { Upload, FileJson, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { parseImportFile, FullExportData, convertImportedChild } from "@/lib/dataExport";
import { Child } from "@/types/child";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface DataImportButtonProps {
  userId: string;
  existingChildren: Child[];
  onImport: (children: Child[]) => void;
}

export function DataImportButton({ userId, existingChildren, onImport }: DataImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [parsedData, setParsedData] = useState<FullExportData | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("Please select a JSON backup file");
      return;
    }

    try {
      const content = await file.text();
      const { data, error } = parseImportFile(content);

      if (error || !data) {
        toast.error(error || "Failed to parse file");
        return;
      }

      setParsedData(data);
      setShowDialog(true);
    } catch (error) {
      toast.error("Failed to read file");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setIsImporting(true);

    try {
      const existingRegNos = new Set(existingChildren.map(c => c.regNo));
      const childrenToImport: Child[] = [];
      let skipped = 0;

      for (const importedChild of parsedData.children) {
        if (existingRegNos.has(importedChild.regNo)) {
          skipped++;
          continue;
        }

        const newChild = convertImportedChild(importedChild, userId);
        childrenToImport.push(newChild);
        existingRegNos.add(importedChild.regNo); // Prevent duplicates within import
      }

      if (childrenToImport.length > 0) {
        onImport(childrenToImport);
      }

      toast.success(
        `Imported ${childrenToImport.length} children${skipped > 0 ? `, skipped ${skipped} duplicates` : ""}`
      );

      setShowDialog(false);
      setParsedData(null);
    } catch (error) {
      toast.error("Failed to import data");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button variant="outline" size="sm" onClick={handleFileSelect}>
        <Upload className="w-4 h-4 mr-2" />
        Import Data
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-primary" />
              Import Backup Data
            </DialogTitle>
            <DialogDescription>
              Review the backup file before importing
            </DialogDescription>
          </DialogHeader>

          {parsedData && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Export Date:</span>
                  <span className="font-medium">
                    {formatDate(parsedData.exportDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Facility:</span>
                  <span className="font-medium">{parsedData.facilityName}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Children to Import:</span>
                  <span className="font-medium">{parsedData.totalChildren}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Children with duplicate registration numbers will be skipped. 
                  Existing data will not be overwritten.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
