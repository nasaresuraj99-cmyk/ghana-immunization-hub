import { Download, FileJson, FileSpreadsheet, History, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Child, DashboardStats } from "@/types/child";
import { 
  exportFullDataJSON, 
  exportFullDataCSV, 
  exportVaccinationHistoryCSV 
} from "@/lib/dataExport";
import { toast } from "sonner";
import { useDocumentActivityLog } from "@/hooks/useDocumentActivityLog";
import { useAuth } from "@/hooks/useAuth";

interface DataExportButtonProps {
  children: Child[];
  stats: DashboardStats;
}

export function DataExportButton({ children, stats }: DataExportButtonProps) {
  const { logDocumentGeneration } = useDocumentActivityLog();
  const { user } = useAuth();

  const handleExportJSON = async () => {
    if (children.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportFullDataJSON(children, stats);
    
    // Log the document generation for audit trail
    if (user) {
      await logDocumentGeneration({
        userId: user.uid,
        userName: user.name || user.email || 'Unknown',
        documentType: 'data_export',
        documentName: 'Full Backup',
        reportType: 'full_backup',
        format: 'json',
      });
    }
    
    toast.success("Data exported as JSON");
  };

  const handleExportChildrenCSV = async () => {
    if (children.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportFullDataCSV(children);
    
    // Log the document generation for audit trail
    if (user) {
      await logDocumentGeneration({
        userId: user.uid,
        userName: user.name || user.email || 'Unknown',
        documentType: 'data_export',
        documentName: 'Children List',
        reportType: 'children_list',
        format: 'csv',
      });
    }
    
    toast.success("Children data exported as CSV");
  };

  const handleExportVaccinationHistory = async () => {
    if (children.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportVaccinationHistoryCSV(children);
    
    // Log the document generation for audit trail
    if (user) {
      await logDocumentGeneration({
        userId: user.uid,
        userName: user.name || user.email || 'Unknown',
        documentType: 'data_export',
        documentName: 'Vaccination History',
        reportType: 'vaccination_history',
        format: 'csv',
      });
    }
    
    toast.success("Vaccination history exported as CSV");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportJSON}>
          <FileJson className="w-4 h-4 mr-2" />
          Full Backup (JSON)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportChildrenCSV}>
          <Users className="w-4 h-4 mr-2" />
          Children List (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportVaccinationHistory}>
          <History className="w-4 h-4 mr-2" />
          Vaccination History (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
