import { Child, DashboardStats } from "@/types/child";

interface FullExportData {
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
      new Date(child.dateOfBirth).toLocaleDateString(),
      ageMonths.toString(),
      child.sex,
      child.motherName,
      child.telephoneAddress || "N/A",
      child.community || "N/A",
      new Date(child.registeredAt).toLocaleDateString(),
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
        new Date(vaccine.dueDate).toLocaleDateString(),
        vaccine.status.charAt(0).toUpperCase() + vaccine.status.slice(1),
        vaccine.givenDate ? new Date(vaccine.givenDate).toLocaleDateString() : "N/A",
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
