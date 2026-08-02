import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { Child } from "@/types/child";
import { FACILITY_CONFIG } from "@/lib/facilityConfig";
import { GHANA_EPI_VACCINES } from "@/lib/ghanaEpiSchedule";

interface ScheduleRow {
  name: string;
  dueDate?: string;
  givenDate?: string;
  status: string;
  batchNumber?: string;
  administeredBy?: string;
}

const normalizeVaccineName = (name: string) =>
  name.toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Returns the child's COMPLETE immunization schedule (birth → 59 months).
 * Every vaccine in the Ghana EPI schedule is included, whether given or not.
 */
export function buildCompleteScheduleRows(child: Child): ScheduleRow[] {
  const existing = new Map<string, ScheduleRow>();
  (child.vaccines || []).forEach(v => {
    existing.set(normalizeVaccineName(v.name), v as ScheduleRow);
  });

  const dob = child.dateOfBirth ? new Date(child.dateOfBirth) : null;
  const today = new Date();

  const deriveDueDate = (minAgeWeeks: number): string | undefined => {
    if (!dob || isNaN(dob.getTime())) return undefined;
    const d = new Date(dob);
    d.setDate(d.getDate() + minAgeWeeks * 7);
    return d.toISOString().split("T")[0];
  };

  const rows: ScheduleRow[] = GHANA_EPI_VACCINES.map(def => {
    const match = existing.get(normalizeVaccineName(def.name));
    const dueDate = match?.dueDate || deriveDueDate(def.minAgeWeeks);

    if (match) {
      existing.delete(normalizeVaccineName(def.name));
      // Any record carrying an administration date counts as GIVEN,
      // regardless of how the status string was stored historically.
      const given = !!match.givenDate || match.status === "completed";
      const overdue = !given && dueDate ? new Date(dueDate) < today : false;
      return {
        ...match,
        name: def.name,
        dueDate,
        status: given ? "completed" : overdue ? "overdue" : "pending",
      };
    }

    // Not in the child's record: derive due date from DOB and mark pending/overdue
    const overdue = dueDate ? new Date(dueDate) < today : false;
    return { name: def.name, dueDate, status: overdue ? "overdue" : "pending" };
  });


  // Keep any custom/legacy vaccines the child has that aren't in the schedule
  existing.forEach(v =>
    rows.push({
      ...v,
      status: v.givenDate || v.status === "completed" ? "completed" : v.status || "pending",
    })
  );


  return rows;
}


// Ghana Health Service branding colors
const GHS_GREEN: [number, number, number] = [0, 100, 0];
const GHS_GOLD: [number, number, number] = [255, 215, 0];
const GHS_RED: [number, number, number] = [206, 17, 38];
const GHS_DARK: [number, number, number] = [30, 41, 59];

// Always use FIAN URBAN CHPS
const DEFAULT_FACILITY_NAME = FACILITY_CONFIG.name;
const DEFAULT_DISTRICT_REGION = FACILITY_CONFIG.districtRegion;

interface CertificateOptions {
  facilityName?: string;
  districtRegion?: string;
  vaccinatorName?: string;
  logoBase64?: string;
}

// Format date as DD/MM/YYYY
function formatDateDDMMYYYY(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper to create safe filename
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
}

// Calculate age in months
function calculateAgeInMonths(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  return (today.getFullYear() - birthDate.getFullYear()) * 12 + 
         (today.getMonth() - birthDate.getMonth());
}

// Convert image URL to base64
async function getLogoBase64(): Promise<string | null> {
  try {
    // Import the logo dynamically
    const logoModule = await import('@/assets/ghs-logo.png');
    const logoUrl = logoModule.default;
    
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl;
    });
  } catch {
    return null;
  }
}

/**
 * Generate a professional immunization certificate for a child (0-59 months)
 * Includes all child registration details and Ghana Health Service logo
 */
export async function generateImmunizationCertificate(
  child: Child,
  options: CertificateOptions = {}
): Promise<void> {
  // Always use FIAN URBAN CHPS for certificates
  const facilityName = DEFAULT_FACILITY_NAME;
  const districtRegion = options.districtRegion || FACILITY_CONFIG.district;

  const logoBase64 = await getLogoBase64();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Complete schedule (birth -> 59 months)
  const fullSchedule = buildCompleteScheduleRows(child);
  const completed = fullSchedule.filter(v => v.status === "completed").length;
  const overdue = fullSchedule.filter(v => v.status === "overdue").length;
  const total = fullSchedule.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isFullyImmunized = progress >= 100;

  const verificationData = {
    id: child.id,
    regNo: child.regNo,
    name: child.name,
    dob: child.dateOfBirth,
    sex: child.sex,
    caregiver: child.motherName,
    contact: child.telephoneAddress,
    community: child.community,
    facility: facilityName,
    district: districtRegion,
    vaccinesCompleted: completed,
    totalVaccines: total,
    registeredAt: child.registeredAt,
    generatedAt: new Date().toISOString(),
  };

  const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(verificationData), {
    width: 400,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#006400", light: "#ffffff" },
  });

  // Decorative frame drawn on every page
  const drawPageFrame = () => {
    doc.setDrawColor(...GHS_GREEN);
    doc.setLineWidth(2);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10, "S");
    doc.setLineWidth(0.5);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");
  };

  drawPageFrame();

  // ============== HEADER ==============
  doc.setFillColor(...GHS_GREEN);
  doc.rect(8, 8, pageWidth - 16, 36, "F");
  doc.setFillColor(...GHS_GOLD);
  doc.rect(8, 44, pageWidth - 16, 4, "F");

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", pageWidth / 2 - 10, 10, 20, 20);
    } catch {
      doc.setFillColor(255, 255, 255);
      doc.circle(pageWidth / 2, 20, 9, "F");
    }
  } else {
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth / 2, 20, 9, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GHS_GREEN);
    doc.text("GHS", pageWidth / 2, 22, { align: "center" });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("REPUBLIC OF GHANA", pageWidth / 2, 34, { align: "center" });
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("CHILD IMMUNIZATION CERTIFICATE", pageWidth / 2, 41, { align: "center" });

  // ============== FACILITY ==============
  let yPos = 52;
  doc.setFillColor(250, 253, 250);
  doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, yPos, contentWidth, 15, 2, 2, "S");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GHS_GREEN);
  doc.text(facilityName.toUpperCase(), pageWidth / 2, yPos + 7, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GHS_DARK);
  doc.text(districtRegion, pageWidth / 2, yPos + 12, { align: "center" });

  // ============== CHILD PARTICULARS ==============
  yPos += 21;
  doc.setFillColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("CHILD PARTICULARS", pageWidth / 2, yPos + 5, { align: "center" });

  yPos += 7;
  const detailsBoxHeight = 40;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, yPos, contentWidth, detailsBoxHeight, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, detailsBoxHeight, "S");

  const qrSize = 32;
  doc.addImage(qrCodeDataUrl, "PNG", pageWidth - margin - qrSize - 4, yPos + 4, qrSize, qrSize);

  const ageInMonths = calculateAgeInMonths(child.dateOfBirth);
  const labelX = margin + 5;
  const valueX = margin + 42;
  let detailY = yPos + 6;

  const childDetails: [string, string][] = [
    ["Registration No:", child.regNo],
    ["Full Name:", child.name],
    ["Date of Birth:", formatDateDDMMYYYY(child.dateOfBirth)],
    ["Age:", `${ageInMonths} months`],
    ["Sex:", child.sex],
    ["Caregiver/Parent:", child.motherName || child.caregiverName || "N/A"],
    ["Contact:", child.telephoneAddress || "N/A"],
    ["Community:", child.community || "N/A"],
  ];

  doc.setFontSize(8);
  childDetails.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label, labelX, detailY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GHS_DARK);
    doc.text(String(value).substring(0, 32), valueX, detailY);
    detailY += 4.5;
  });

  // ============== IMMUNIZATION RECORD ==============
  yPos += detailsBoxHeight + 6;
  doc.setFillColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("IMMUNIZATION RECORD", pageWidth / 2, yPos + 5, { align: "center" });
  yPos += 9;

  const vaccineTableData = fullSchedule.map(v => [
    v.name.split(" at")[0],
    v.name.includes(" at") ? v.name.split(" at")[1].trim() : "-",
    v.dueDate ? formatDateDDMMYYYY(v.dueDate) : "-",
    v.givenDate ? formatDateDDMMYYYY(v.givenDate) : "-",
    v.status === "completed" ? "GIVEN" : v.status === "overdue" ? "OVERDUE" : "PENDING",
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Vaccine", "Recommended Age", "Due Date", "Date Given", "Status"]],
    body: vaccineTableData,
    pageBreak: "auto",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    headStyles: {
      fillColor: GHS_GREEN,
      textColor: [255, 255, 255],
      fontSize: 8,
      cellPadding: 1.8,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { fontSize: 7.5, cellPadding: 1.6, textColor: GHS_DARK },
    alternateRowStyles: { fillColor: [246, 251, 246] },
    columnStyles: {
      0: { cellWidth: 48, halign: "left" },
      1: { cellWidth: 34, halign: "center" },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 32, halign: "center" },
      4: { cellWidth: contentWidth - 146, halign: "center", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin, top: 16, bottom: 24 },
    tableWidth: contentWidth,
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawPageFrame();
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const value = String(data.cell.raw);
        if (value === "GIVEN") data.cell.styles.textColor = [0, 128, 0];
        else if (value === "OVERDUE") data.cell.styles.textColor = [206, 17, 38];
        else data.cell.styles.textColor = [130, 130, 130];
      }
    },
  });

  yPos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || yPos + 80;
  yPos += 5;

  // Keep the closing sections together
  if (yPos + 40 > pageHeight - 24) {
    doc.addPage();
    drawPageFrame();
    yPos = 18;
  }

  // ============== VACCINATION PROGRESS ==============
  doc.setFillColor(248, 252, 248);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, "S");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GHS_DARK);
  doc.text("VACCINATION PROGRESS", margin + 5, yPos + 6);

  const barWidth = 70;
  const barX = margin + 5;
  const barY = yPos + 9;
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(barX, barY, barWidth, 4, 2, 2, "F");
  if (progress > 0) {
    const progressColor: [number, number, number] = isFullyImmunized ? GHS_GREEN : [34, 139, 34];
    doc.setFillColor(...progressColor);
    doc.roundedRect(barX, barY, (progress / 100) * barWidth, 4, 2, 2, "F");
  }

  doc.setFontSize(11);
  const textColor: [number, number, number] = isFullyImmunized ? GHS_GREEN : [34, 139, 34];
  doc.setTextColor(...textColor);
  doc.text(`${progress}%`, barX + barWidth + 5, barY + 4);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(
    isFullyImmunized
      ? `FULLY IMMUNIZED - ${completed} of ${total} vaccines completed`
      : `${completed} of ${total} vaccines completed  |  Overdue: ${overdue}`,
    pageWidth - margin - 5,
    barY + 4,
    { align: "right" }
  );

  // ============== FOOTER (every page) ==============
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(
      "This is an official health document. Please present it at every clinic visit.",
      pageWidth / 2,
      pageHeight - 21,
      { align: "center" }
    );
    doc.text(
      "Keep this certificate safe. Report loss immediately to your health facility.",
      pageWidth / 2,
      pageHeight - 18,
      { align: "center" }
    );

    const flagBarY = pageHeight - 15;
    doc.setFillColor(...GHS_RED);
    doc.rect(8, flagBarY, (pageWidth - 16) / 3, 4, "F");
    doc.setFillColor(...GHS_GOLD);
    doc.rect(8 + (pageWidth - 16) / 3, flagBarY, (pageWidth - 16) / 3, 4, "F");
    doc.setFillColor(...GHS_GREEN);
    doc.rect(8 + (2 * (pageWidth - 16)) / 3, flagBarY, (pageWidth - 16) / 3, 4, "F");

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Certificate ID: ${child.regNo} | Issued: ${formatDateDDMMYYYY(new Date())} | Page ${p} of ${totalPages} | Ghana Health Service - EPI Programme`,
      pageWidth / 2,
      pageHeight - 9.5,
      { align: "center" }
    );
  }

  const facilitySlug = sanitizeFilename(facilityName);
  const childNameSlug = sanitizeFilename(child.name);
  doc.save(`${facilitySlug}_Immunization_Certificate_${child.regNo}_${childNameSlug}.pdf`);
}

/**
 * Generate batch certificates for multiple children
 */
export async function generateBatchCertificates(
  children: Child[],
  options: CertificateOptions = {}
): Promise<void> {
  for (const child of children) {
    await generateImmunizationCertificate(child, options);
    // Small delay to prevent browser hanging
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
