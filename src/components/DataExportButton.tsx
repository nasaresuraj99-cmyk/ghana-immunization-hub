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

interface DataExportButtonProps {
  children: Child[];
  stats: DashboardStats;
  facilityName: string;
}

export function DataExportButton({ children, stats, facilityName }: DataExportButtonProps) {
  const handleExportJSON = () => {
    if (children.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportFullDataJSON(children, stats, facilityName);
    toast.success("Data exported as JSON");
  };

  const handleExportChildrenCSV = () => {
    if (children.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportFullDataCSV(children);
    toast.success("Children data exported as CSV");
  };

  const handleExportVaccinationHistory = () => {
    if (children.length === 0) {
      toast.error("No data to export");
      return;
    }
    exportVaccinationHistoryCSV(children);
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
