import { Child, DashboardStats, Defaulter } from "@/types/child";

// Helper to convert data to CSV format
function arrayToCSV(headers: string[], rows: string[][]): string {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma or newline
        const escaped = String(cell).replace(/"/g, '""');
        return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"') 
          ? `"${escaped}"` 
          : escaped;
      }).join(",")
    )
  ].join("\n");
  
  return csvContent;
}

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSummaryExcel(
  stats: DashboardStats,
  ageDistribution: Record<string, number>,
  period: string
) {
  const headers = ["Metric", "Value"];
  const rows = [
    ["Report Period", period.charAt(0).toUpperCase() + period.slice(1)],
    ["Total Children Registered", stats.totalChildren.toString()],
    ["Fully Immunized", stats.fullyImmunized.toString()],
    ["Vaccinated Today", stats.vaccinatedToday.toString()],
    ["Due This Week", stats.dueSoon.toString()],
    ["Defaulters", stats.defaulters.toString()],
    ["Coverage Rate", `${stats.coverageRate}%`],
    ["Dropout Rate", `${stats.dropoutRate}%`],
    [""],
    ["Age Distribution", ""],
    ...Object.entries(ageDistribution).map(([group, count]) => [group, count.toString()]),
  ];

  const csv = arrayToCSV(headers, rows);
  downloadCSV(`GHS_Summary_Report_${new Date().toISOString().split("T")[0]}.csv`, csv);
}

export function exportDetailedExcel(
  records: Array<{
    date: string;
    childName: string;
    regNo: string;
    vaccine: string;
    batchNumber: string;
    status: string;
  }>
) {
  const headers = ["Date", "Reg No.", "Child Name", "Vaccine", "Batch No.", "Status"];
  const rows = records.map(r => [
    new Date(r.date).toLocaleDateString(),
    r.regNo,
    r.childName,
    r.vaccine,
    r.batchNumber,
    r.status,
  ]);

  const csv = arrayToCSV(headers, rows);
  downloadCSV(`GHS_Detailed_Report_${new Date().toISOString().split("T")[0]}.csv`, csv);
}

export function exportVaccineCoverageExcel(
  vaccineCoverage: Record<string, { given: number; pending: number; overdue: number }>
) {
  const headers = ["Vaccine Type", "Given", "Pending", "Overdue", "Total", "Coverage %"];
  const rows = Object.entries(vaccineCoverage).map(([type, data]) => {
    const total = data.given + data.pending + data.overdue;
    const coverage = total > 0 ? Math.round((data.given / total) * 100) : 0;
    return [
      type,
      data.given.toString(),
      data.pending.toString(),
      data.overdue.toString(),
      total.toString(),
      `${coverage}%`,
    ];
  });

  const csv = arrayToCSV(headers, rows);
  downloadCSV(`GHS_Vaccine_Coverage_${new Date().toISOString().split("T")[0]}.csv`, csv);
}

export function exportDefaultersExcel(defaulters: Defaulter[]) {
  const headers = ["#", "Child Name", "Mother", "Contact", "Community", "Missed Vaccines", "Due Date", "Days Overdue"];
  const rows = defaulters.map((d, idx) => [
    (idx + 1).toString(),
    d.child.name,
    d.child.motherName,
    d.child.telephoneAddress || "N/A",
    d.child.community || "N/A",
    d.missedVaccines.join("; "),
    new Date(d.dueDate).toLocaleDateString(),
    d.daysOverdue.toString(),
  ]);

  const csv = arrayToCSV(headers, rows);
  downloadCSV(`GHS_Defaulters_Report_${new Date().toISOString().split("T")[0]}.csv`, csv);
}

export function exportChildrenRegisterExcel(children: Child[]) {
  const headers = ["Reg No.", "Name", "DOB", "Age (months)", "Sex", "Mother", "Contact", "Community", "Vaccines Completed", "Total Vaccines"];
  const rows = children.map(child => {
    const birthDate = new Date(child.dateOfBirth);
    const today = new Date();
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    const completed = child.vaccines.filter(v => v.status === "completed").length;
    const total = child.vaccines.length;
    
    return [
      child.regNo,
      child.name,
      new Date(child.dateOfBirth).toLocaleDateString(),
      months.toString(),
      child.sex,
      child.motherName,
      child.telephoneAddress || "N/A",
      child.community || "N/A",
      completed.toString(),
      total.toString(),
    ];
  });

  const csv = arrayToCSV(headers, rows);
  downloadCSV(`GHS_Children_Register_${new Date().toISOString().split("T")[0]}.csv`, csv);
}
