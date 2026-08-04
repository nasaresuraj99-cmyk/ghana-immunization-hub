import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Child, Defaulter } from "@/types/child";
import { FACILITY_CONFIG } from "@/lib/facilityConfig";
import { buildCompleteScheduleRows } from "@/lib/certificateExport";
import { formatDateDDMMYYYY } from "@/lib/pdfExport";

const GHS_GREEN: [number, number, number] = [0, 100, 0];
const GHS_GOLD: [number, number, number] = [255, 215, 0];
const GHS_DARK: [number, number, number] = [30, 41, 59];
const FILE_PREFIX = `${FACILITY_CONFIG.code}_`;

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_").substring(0, 50);
}

function drawHeader(doc: jsPDF, title: string, subtitle?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...GHS_GREEN);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setFillColor(...GHS_GOLD);
  doc.rect(0, 40, pageWidth, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Ghana Health Service", 14, 14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Expanded Programme on Immunization (EPI)", 14, 21);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(FACILITY_CONFIG.name, pageWidth - 14, 12, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(FACILITY_CONFIG.district, pageWidth - 14, 18, { align: "right" });
  doc.text(`Generated: ${formatDateDDMMYYYY(new Date())}`, pageWidth - 14, 24, { align: "right" });

  doc.setTextColor(...GHS_DARK);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 54);

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 14, 61);
    return 68;
  }
  return 62;
}

function drawFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GHS_GREEN);
    doc.setLineWidth(0.5);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setTextColor(...GHS_DARK);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Ghana Health Service - No Child Left Behind", 14, pageHeight - 8);
    doc.text(`Page ${i} of ${total}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  }
}

/* -------------------------------------------------------------------------- */
/* 1. Defaulter tracing worksheet                                             */
/* -------------------------------------------------------------------------- */

export function exportDefaulterTracingWorksheet(defaulters: Defaulter[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  const startY = drawHeader(
    doc,
    "Defaulter Tracing Worksheet",
    `${defaulters.length} child(ren) to be traced. Complete the visit outcome columns during home visits.`
  );

  autoTable(doc, {
    startY,
    head: [[
      "#",
      "Reg. No",
      "Child Name",
      "Age",
      "Caregiver / Parent",
      "Contact",
      "Community",
      "Missed Vaccine(s)",
      "Days Overdue",
      "Date Traced",
      "Outcome",
    ]],
    body: defaulters.map((d, i) => {
      const dob = new Date(d.child.dateOfBirth);
      const months = isNaN(dob.getTime())
        ? "-"
        : `${(new Date().getFullYear() - dob.getFullYear()) * 12 + (new Date().getMonth() - dob.getMonth())} m`;
      return [
        String(i + 1),
        d.child.regNo,
        d.child.name,
        months,
        d.child.motherName || "-",
        d.child.telephoneAddress || "-",
        d.child.community || "-",
        d.missedVaccines.join(", "),
        String(d.daysOverdue),
        "",
        "",
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.1 },
    headStyles: { fillColor: GHS_GREEN, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 250, 245] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 30 },
      2: { cellWidth: 38 },
      3: { cellWidth: 14 },
      4: { cellWidth: 34 },
      5: { cellWidth: 26 },
      6: { cellWidth: 26 },
      7: { cellWidth: 52 },
      8: { cellWidth: 16, halign: "center" },
      9: { cellWidth: 22 },
      10: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14, bottom: 20 },
  });

  const endY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (endY < pageHeight - 30) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GHS_DARK);
    doc.text("Traced by: ____________________________", 14, endY);
    doc.text("Signature: ____________________________", 110, endY);
    doc.text("Date: ______________", 210, endY);
  }

  drawFooter(doc);
  doc.save(`${FILE_PREFIX}Defaulter_Tracing_Worksheet_${new Date().toISOString().split("T")[0]}.pdf`);
}

/* -------------------------------------------------------------------------- */
/* 2. Next appointment slip                                                   */
/* -------------------------------------------------------------------------- */

export function getNextAppointments(child: Child, limit = 4) {
  const rows = buildCompleteScheduleRows(child);
  return rows
    .filter(r => r.status !== "completed")
    .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
    .slice(0, limit);
}

export function exportAppointmentSlip(child: Child) {
  // A6-sized slip, easy to cut and hand to a caregiver
  const doc = new jsPDF({ orientation: "landscape", format: "a6" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...GHS_GREEN);
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setFillColor(...GHS_GOLD);
  doc.rect(0, 18, pageWidth, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("IMMUNIZATION APPOINTMENT SLIP", pageWidth / 2, 8, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${FACILITY_CONFIG.name} - ${FACILITY_CONFIG.district}`, pageWidth / 2, 14, { align: "center" });

  doc.setTextColor(...GHS_DARK);
  let y = 27;
  doc.setFontSize(8);
  const line = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 10, y);
    doc.setFont("helvetica", "normal");
    doc.text(value || "-", 40, y);
    y += 5.2;
  };
  line("Child:", child.name);
  line("Reg. No:", child.regNo);
  line("Date of Birth:", formatDateDDMMYYYY(child.dateOfBirth));
  line("Caregiver:", child.motherName);
  line("Community:", child.community || "-");

  const upcoming = getNextAppointments(child, 4);

  autoTable(doc, {
    startY: y + 1,
    head: [["Next Vaccine / Service", "Due Date", "Status"]],
    body: upcoming.length
      ? upcoming.map(v => [
          v.name,
          v.dueDate ? formatDateDDMMYYYY(v.dueDate) : "-",
          v.status === "overdue" ? "OVERDUE" : "PENDING",
        ])
      : [["Schedule complete - no pending vaccines", "-", "-"]],
    styles: { fontSize: 7, cellPadding: 1.6 },
    headStyles: { fillColor: GHS_GREEN, textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 66 }, 1: { cellWidth: 24 }, 2: { cellWidth: 22, halign: "center" } },
    margin: { left: 10, right: 10 },
    didParseCell: hook => {
      if (hook.section === "body" && hook.column.index === 2 && hook.cell.raw === "OVERDUE") {
        hook.cell.styles.textColor = [200, 30, 30];
        hook.cell.styles.fontStyle = "bold";
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Please bring this slip and the child's health record book on the appointment date.",
    10,
    finalY
  );
  doc.setFont("helvetica", "normal");
  doc.text(`Issued: ${formatDateDDMMYYYY(new Date())}`, 10, finalY + 5);
  doc.text("Health Worker: ______________________", pageWidth - 10, finalY + 5, { align: "right" });

  doc.save(`${FILE_PREFIX}Appointment_Slip_${sanitize(child.regNo || child.name)}.pdf`);
}

/* -------------------------------------------------------------------------- */
/* 3. Monthly GHS EPI return                                                  */
/* -------------------------------------------------------------------------- */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Aggregate doses administered in a given month, grouped by vaccine/service. */
export function buildMonthlyEpiTally(children: Child[], year: number, month: number) {
  const tally = new Map<string, { total: number; male: number; female: number; under1: number; over1: number }>();
  let childrenReached = 0;

  children.forEach(child => {
    if (child.isDeleted) return;
    const dob = new Date(child.dateOfBirth);
    let reached = false;

    (child.vaccines || []).forEach(v => {
      if (!v.givenDate) return;
      const given = new Date(v.givenDate);
      if (isNaN(given.getTime())) return;
      if (given.getFullYear() !== year || given.getMonth() !== month) return;

      reached = true;
      const entry = tally.get(v.name) || { total: 0, male: 0, female: 0, under1: 0, over1: 0 };
      entry.total += 1;
      if (child.sex === "Male") entry.male += 1;
      else if (child.sex === "Female") entry.female += 1;

      const ageMonths = isNaN(dob.getTime())
        ? 0
        : (given.getFullYear() - dob.getFullYear()) * 12 + (given.getMonth() - dob.getMonth());
      if (ageMonths < 12) entry.under1 += 1;
      else entry.over1 += 1;

      tally.set(v.name, entry);
    });

    if (reached) childrenReached += 1;
  });

  const rows = Array.from(tally.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const newRegistrations = children.filter(c => {
    if (c.isDeleted) return false;
    const reg = new Date(c.registeredAt);
    return !isNaN(reg.getTime()) && reg.getFullYear() === year && reg.getMonth() === month;
  }).length;

  return {
    rows,
    childrenReached,
    newRegistrations,
    totalDoses: rows.reduce((s, r) => s + r.total, 0),
  };
}

export function exportMonthlyEpiReturn(children: Child[], year: number, month: number) {
  const doc = new jsPDF();
  const { rows, childrenReached, newRegistrations, totalDoses } = buildMonthlyEpiTally(children, year, month);

  const startY = drawHeader(
    doc,
    "Monthly EPI Return",
    `Reporting period: ${MONTHS[month]} ${year}`
  );

  // Summary strip
  const summary: [string, string][] = [
    ["New registrations", String(newRegistrations)],
    ["Children reached", String(childrenReached)],
    ["Total doses given", String(totalDoses)],
    ["Antigens reported", String(rows.length)],
  ];
  let x = 14;
  summary.forEach(([label, value]) => {
    doc.setFillColor(240, 248, 240);
    doc.rect(x, startY, 44, 16, "F");
    doc.setDrawColor(...GHS_GREEN);
    doc.setLineWidth(0.3);
    doc.rect(x, startY, 44, 16);
    doc.setTextColor(...GHS_DARK);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + 3, startY + 6);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GHS_GREEN);
    doc.text(value, x + 3, startY + 13);
    x += 46;
  });

  autoTable(doc, {
    startY: startY + 24,
    head: [["Vaccine / Service", "Male", "Female", "< 1 year", "1-5 years", "Total doses"]],
    body: rows.length
      ? rows.map(r => [r.name, String(r.male), String(r.female), String(r.under1), String(r.over1), String(r.total)])
      : [["No doses recorded for this period", "-", "-", "-", "-", "0"]],
    foot: rows.length
      ? [[
          "TOTAL",
          String(rows.reduce((s, r) => s + r.male, 0)),
          String(rows.reduce((s, r) => s + r.female, 0)),
          String(rows.reduce((s, r) => s + r.under1, 0)),
          String(rows.reduce((s, r) => s + r.over1, 0)),
          String(totalDoses),
        ]]
      : undefined,
    styles: { fontSize: 8.5, cellPadding: 2.2 },
    headStyles: { fillColor: GHS_GREEN, textColor: [255, 255, 255], fontStyle: "bold" },
    footStyles: { fillColor: [230, 240, 230], textColor: GHS_DARK, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 252, 248] },
    columnStyles: {
      0: { cellWidth: 76 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 24, halign: "center" },
      5: { cellWidth: 24, halign: "center" },
    },
    margin: { left: 14, right: 14, bottom: 24 },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 14;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (finalY < pageHeight - 30) {
    doc.setTextColor(...GHS_DARK);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Prepared by: ____________________________", 14, finalY);
    doc.text("Officer In-Charge: ____________________________", 110, finalY);
    doc.text("Date: ______________", 14, finalY + 10);
  }

  drawFooter(doc);
  doc.save(`${FILE_PREFIX}Monthly_EPI_Return_${MONTHS[month]}_${year}.pdf`);
}

export const EPI_RETURN_MONTHS = MONTHS;
