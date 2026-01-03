import { Child, DashboardStats, VaccineRecord } from "@/types/child";
import { formatDate } from "@/lib/utils";

export interface FullExportData {
  exportDate: string;
  facilityName: string;
  totalChildren: number;
  summary: DashboardStats;
  children: Array<{
    regNo: string;
    name: string;
    dateOfBirth: string;
    sex: string;
    motherName: string;
    contact: string;
    community: string;
    registeredAt: string;
    vaccinesCompleted: number;
    totalVaccines: number;
    vaccines: Array<{
      name: string;
      dueDate: string;
      status: string;
      givenDate?: string;
      batchNumber?: string;
    }>;
  }>;
}

export function exportFullDataJSON(
  children: Child[],
  stats: DashboardStats,
  facilityName: string
): void {
  const exportData: FullExportData = {
    exportDate: new Date().toISOString(),
    facilityName,
    totalChildren: children.length,
    summary: stats,
    children: children.map(child => ({
      regNo: child.regNo,
      name: child.name,
      dateOfBirth: child.dateOfBirth,
      sex: child.sex,
      motherName: child.motherName,
      contact: child.telephoneAddress || "",
      community: child.community || "",
      registeredAt: child.registeredAt,
      vaccinesCompleted: child.vaccines.filter(v => v.status === "completed").length,
      totalVaccines: child.vaccines.length,
      vaccines: child.vaccines.map(v => ({
        name: v.name,
        dueDate: v.dueDate,
        status: v.status,
        givenDate: v.givenDate,
        batchNumber: v.batchNumber,
      })),
    })),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `GHS_Full_Data_Export_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportFullDataCSV(children: Child[]): void {
  const headers = [
    "Reg No",
    "Child Name",
    "Date of Birth",
    "Age (months)",
    "Sex",
    "Mother's Name",
    "Contact",
    "Community",
    "Registered At",
    "Vaccines Completed",
    "Total Vaccines",
    "Completion %",
    "Pending Vaccines",
    "Overdue Vaccines",
  ];

  const rows = children.map(child => {
    const birthDate = new Date(child.dateOfBirth);
    const today = new Date();
    const ageMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                      (today.getMonth() - birthDate.getMonth());
    
    const completed = child.vaccines.filter(v => v.status === "completed").length;
    const pending = child.vaccines.filter(v => v.status === "pending").length;
    const overdue = child.vaccines.filter(v => v.status === "overdue").length;
    const total = child.vaccines.length;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return [
      child.regNo,
      child.name,
      formatDate(child.dateOfBirth),
      ageMonths.toString(),
      child.sex,
      child.motherName,
      child.telephoneAddress || "N/A",
      child.community || "N/A",
      formatDate(child.registeredAt),
      completed.toString(),
      total.toString(),
      `${completionPct}%`,
      pending.toString(),
      overdue.toString(),
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => 
      row.map(cell => {
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"') 
          ? `"${escaped}"` 
          : escaped;
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `GHS_Full_Children_Data_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportVaccinationHistoryCSV(children: Child[]): void {
  const headers = [
    "Reg No",
    "Child Name",
    "Vaccine Name",
    "Due Date",
    "Status",
    "Given Date",
    "Batch Number",
    "Days Overdue",
  ];

  const rows: string[][] = [];
  
  children.forEach(child => {
    child.vaccines.forEach(vaccine => {
      const today = new Date();
      const dueDate = new Date(vaccine.dueDate);
      let daysOverdue = 0;
      
      if (vaccine.status === "overdue") {
        daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      rows.push([
        child.regNo,
        child.name,
        vaccine.name,
        formatDate(vaccine.dueDate),
        vaccine.status.charAt(0).toUpperCase() + vaccine.status.slice(1),
        vaccine.givenDate ? formatDate(vaccine.givenDate) : "N/A",
        vaccine.batchNumber || "N/A",
        vaccine.status === "overdue" ? daysOverdue.toString() : "0",
      ]);
    });
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => 
      row.map(cell => {
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"') 
          ? `"${escaped}"` 
          : escaped;
      }).join(",")
    )
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `GHS_Vaccination_History_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Import data from JSON backup
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export function parseImportFile(fileContent: string): { data: FullExportData | null; error: string | null } {
  try {
    const parsed = JSON.parse(fileContent);
    
    // Validate required fields
    if (!parsed.children || !Array.isArray(parsed.children)) {
      return { data: null, error: "Invalid backup file: missing children array" };
    }
    
    if (!parsed.exportDate) {
      return { data: null, error: "Invalid backup file: missing export date" };
    }
    
    return { data: parsed as FullExportData, error: null };
  } catch (e) {
    return { data: null, error: "Failed to parse JSON file. Please ensure it's a valid backup file." };
  }
}

export function convertImportedChild(
  importedChild: FullExportData["children"][0],
  userId: string
): Child {
  return {
    id: `child-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    regNo: importedChild.regNo,
    name: importedChild.name,
    dateOfBirth: importedChild.dateOfBirth,
    sex: importedChild.sex as "Male" | "Female",
    motherName: importedChild.motherName,
    telephoneAddress: importedChild.contact || "",
    community: importedChild.community || "",
    registeredAt: importedChild.registeredAt || new Date().toISOString(),
    vaccines: importedChild.vaccines.map((v): VaccineRecord => ({
      name: v.name,
      dueDate: v.dueDate,
      status: v.status as VaccineRecord["status"],
      givenDate: v.givenDate,
      batchNumber: v.batchNumber,
    })),
  };
}
