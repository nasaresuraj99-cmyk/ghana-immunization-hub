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

interface CertificateOptions {
  facilityName?: string;
  districtRegion?: string;
  district?: string;
  region?: string;
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

/** Short, stable verification code derived from the child's identity */
function buildVerificationCode(child: Child): string {
  const seed = `${child.id || ""}|${child.regNo || ""}|${child.dateOfBirth || ""}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
}

export function buildCertificateId(child: Child): string {
  return `GHS-EPI-${FACILITY_CONFIG.code}-${child.regNo}`;
}

const CERTIFICATE_VERSION = "v2.0";

/** Strip the " at <age>" suffix into separate vaccine / due-age columns */
function splitVaccineLabel(name: string): { vaccine: string; dueAge: string } {
  const idx = name.indexOf(" at ");
  if (idx === -1) return { vaccine: name, dueAge: "-" };
  const vaccine = name.slice(0, idx).trim();
  const rawAge = name.slice(idx + 4).trim();
  const dueAge = rawAge.charAt(0).toUpperCase() + rawAge.slice(1);
  return { vaccine, dueAge };
}

/**
 * Generate a professional Ghana Health Service child immunization certificate (0-59 months).
 * Always lists the COMPLETE EPI schedule with GIVEN / PENDING status.
 */
export async function generateImmunizationCertificate(
  child: Child,
  options: CertificateOptions = {}
): Promise<void> {
  // Read dynamic getters when the certificate is generated, not when this module loads.
  const facilityName = options.facilityName || FACILITY_CONFIG.name;
  const district = FACILITY_CONFIG.district || "District not provided";
  const region = FACILITY_CONFIG.region || "Region not provided";

  const logoBase64 = await getLogoBase64();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Complete schedule (birth -> 59 months)
  const fullSchedule = buildCompleteScheduleRows(child);
  const completed = fullSchedule.filter(v => v.status === "completed").length;
  const total = fullSchedule.length;
  const pending = total - completed;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isFullyImmunized = progress >= 100;

  // Next vaccine due = earliest not-given dose by due date
  const upcoming = fullSchedule
    .filter(v => v.status !== "completed" && v.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0];

  const certificateId = buildCertificateId(child);
  const verificationCode = buildVerificationCode(child);
  const generatedAt = new Date();

  const verificationData = {
    certificateId,
    verificationCode,
    id: child.id,
    regNo: child.regNo,
    name: child.name,
    dob: child.dateOfBirth,
    sex: child.sex,
    caregiver: child.motherName,
    contact: child.telephoneAddress,
    community: child.community,
    facility: facilityName,
    district,
    region,
    vaccinesCompleted: completed,
    totalVaccines: total,
    generatedAt: generatedAt.toISOString(),
    version: CERTIFICATE_VERSION,
  };

  const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(verificationData), {
    width: 800,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#006400", light: "#ffffff" },
  });

  // Subtle GHS watermark + decorative frame drawn on every page
  const drawPageFrame = () => {
    doc.saveGraphicsState();
    // @ts-expect-error jsPDF GState typing
    doc.setGState(new doc.GState({ opacity: 0.05 }));
    doc.setTextColor(...GHS_GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(60);
    doc.text("GHS", pageWidth / 2, pageHeight / 2, { align: "center", angle: 35 });
    doc.setFontSize(16);
    doc.text("GHANA HEALTH SERVICE - EPI", pageWidth / 2, pageHeight / 2 + 22, {
      align: "center",
      angle: 35,
    });
    doc.restoreGraphicsState();

    doc.setDrawColor(...GHS_GREEN);
    doc.setLineWidth(1.6);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10, "S");
    doc.setDrawColor(...GHS_GOLD);
    doc.setLineWidth(0.6);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");
  };

  drawPageFrame();

  // ============== HEADER ==============
  doc.setFillColor(...GHS_GREEN);
  doc.rect(8, 8, pageWidth - 16, 40, "F");

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin + 2, 12, 20, 20);
    } catch {
      doc.setFillColor(255, 255, 255);
      doc.circle(margin + 12, 22, 9, "F");
    }
  } else {
    doc.setFillColor(255, 255, 255);
    doc.circle(margin + 12, 22, 9, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GHS_GREEN);
    doc.text("GHS", margin + 12, 24, { align: "center" });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("REPUBLIC OF GHANA", pageWidth / 2, 15, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("GHANA HEALTH SERVICE", pageWidth / 2, 21.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("EXPANDED PROGRAMME ON IMMUNIZATION (EPI)", pageWidth / 2, 27, { align: "center" });

  doc.setFillColor(...GHS_GOLD);
  doc.rect(margin, 30, contentWidth, 0.6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(255, 255, 255);
  doc.text("CHILD IMMUNIZATION CERTIFICATE", pageWidth / 2, 37.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Children 0 - 59 Months", pageWidth / 2, 42.5, { align: "center" });

  doc.setFillColor(...GHS_GOLD);
  doc.rect(8, 48, pageWidth - 16, 3.5, "F");

  // ============== FACILITY BAR ==============
  let yPos = 55;
  doc.setFillColor(248, 252, 248);
  doc.roundedRect(margin, yPos, contentWidth, 17, 2, 2, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, yPos, contentWidth, 17, 2, 2, "S");

  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GHS_GREEN);
  doc.text(facilityName.toUpperCase(), pageWidth / 2, yPos + 6, { align: "center" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GHS_DARK);
  doc.text(`District Name: ${district}`, pageWidth / 2, yPos + 10.2, {
    align: "center",
  });
  doc.text(`Region: ${region}`, pageWidth / 2, yPos + 13.2, {
    align: "center",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Certificate ID: ${certificateId}`, pageWidth / 2, yPos + 16.5, { align: "center" });

  // ============== CHILD PARTICULARS ==============
  yPos += 25;
  doc.setFillColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("CHILD PARTICULARS", margin + 3, yPos + 4.9);

  yPos += 7;
  const qrSize = 30;
  const detailsBoxHeight = 44;
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, yPos, contentWidth, detailsBoxHeight, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, contentWidth, detailsBoxHeight, "S");

  const qrX = pageWidth - margin - qrSize - 3;
  doc.addImage(qrCodeDataUrl, "PNG", qrX, yPos + 3, qrSize, qrSize);
  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 110);
  doc.text("Scan to verify", qrX + qrSize / 2, yPos + qrSize + 6, { align: "center" });

  const ageInMonths = calculateAgeInMonths(child.dateOfBirth);
  const extra = child as Child & {
    birthWeight?: string | number;
    nhisNumber?: string;
    relationship?: string;
    address?: string;
  };

  const childDetails: [string, string][] = [
    ["Registration No:", child.regNo],
    ["Child Full Name:", child.name],
    ["Date of Birth:", `${formatDateDDMMYYYY(child.dateOfBirth)}  (${ageInMonths} months)`],
    ["Sex:", child.sex],
    ["Birth Weight:", extra.birthWeight ? `${extra.birthWeight} kg` : "-"],
    ["NHIS Number:", extra.nhisNumber || "-"],
    ["Caregiver/Parent:", child.motherName || child.caregiverName || "-"],
    ["Relationship:", extra.relationship || "Caregiver/Parent"],
    ["Phone Number:", child.telephoneAddress || "-"],
    ["Community:", child.community || "-"],
    ["Residential Address:", extra.address || "-"],
  ];

  // Two balanced columns to the left of the QR code
  const colWidth = (contentWidth - qrSize - 10) / 2;
  const col1X = margin + 4;
  const col2X = margin + 4 + colWidth;
  const rowsPerCol = Math.ceil(childDetails.length / 2);

  const labelWidth = 27;
  doc.setFontSize(7);
  childDetails.forEach(([label, value], i) => {
    const col = i < rowsPerCol ? 0 : 1;
    const rowIdx = col === 0 ? i : i - rowsPerCol;
    const x = col === 0 ? col1X : col2X;
    const y = yPos + 7 + rowIdx * 6.4;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(110, 110, 110);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GHS_DARK);
    const lines = doc.splitTextToSize(String(value), colWidth - labelWidth - 3) as string[];
    doc.text(lines[0] || "-", x + labelWidth, y);
    if (lines[1]) doc.text(lines[1], x + labelWidth, y + 3);
  });

  // ============== IMMUNIZATION RECORD ==============
  yPos += detailsBoxHeight + 6;
  doc.setFillColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("COMPLETE IMMUNIZATION SCHEDULE (BIRTH - 59 MONTHS)", margin + 3, yPos + 4.9);
  yPos += 9;

  const labelCounts = new Map<string, number>();
  fullSchedule.forEach(v => {
    const { vaccine } = splitVaccineLabel(v.name);
    labelCounts.set(vaccine, (labelCounts.get(vaccine) || 0) + 1);
  });

  const vaccineTableData = fullSchedule.map(v => {
    const { vaccine, dueAge } = splitVaccineLabel(v.name);
    const label =
      (labelCounts.get(vaccine) || 0) > 1 && dueAge !== "-" ? `${vaccine} (${dueAge})` : vaccine;
    return [
      label,
      dueAge,
      v.dueDate ? formatDateDDMMYYYY(v.dueDate) : "-",
      v.givenDate ? formatDateDDMMYYYY(v.givenDate) : "-",
      v.status === "completed" ? "GIVEN" : "PENDING",
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Vaccine / Service", "Due Age", "Due Date", "Date Given", "Status"]],
    body: vaccineTableData,
    pageBreak: "auto",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    theme: "grid",
    styles: { lineColor: [214, 230, 214], lineWidth: 0.15, overflow: "linebreak" },
    headStyles: {
      fillColor: GHS_GREEN,
      textColor: [255, 255, 255],
      fontSize: 8,
      cellPadding: 1.8,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { fontSize: 7.5, cellPadding: 1.7, textColor: GHS_DARK },
    alternateRowStyles: { fillColor: [246, 251, 246] },
    columnStyles: {
      0: { cellWidth: 58, halign: "left", fontStyle: "bold" },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 30, halign: "center" },
      4: { cellWidth: contentWidth - 148, halign: "center", fontStyle: "bold" },
    },

    margin: { left: margin, right: margin, top: 18, bottom: 30 },
    tableWidth: contentWidth,
    didDrawPage: data => {
      if (data.pageNumber > 1) drawPageFrame();
    },
    didParseCell: data => {
      if (data.section === "body" && data.column.index === 4) {
        const value = String(data.cell.raw);
        data.cell.styles.textColor = value === "GIVEN" ? [0, 120, 0] : [140, 140, 140];
      }
    },
  });

  yPos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || yPos + 80;
  yPos += 6;

  // Keep progress + signature block together on one page
  const closingHeight = 62;
  if (yPos + closingHeight > pageHeight - 26) {
    doc.addPage();
    drawPageFrame();
    yPos = 18;
  }

  // ============== VACCINATION PROGRESS ==============
  doc.setFillColor(248, 252, 248);
  doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, "S");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GHS_DARK);
  doc.text("VACCINATION PROGRESS", margin + 5, yPos + 6);

  const barWidth = 80;
  const barX = margin + 5;
  const barY = yPos + 9.5;
  doc.setFillColor(228, 228, 228);
  doc.roundedRect(barX, barY, barWidth, 4.5, 2, 2, "F");
  if (progress > 0) {
    doc.setFillColor(...(isFullyImmunized ? GHS_GREEN : ([34, 139, 34] as [number, number, number])));
    doc.roundedRect(barX, barY, (progress / 100) * barWidth, 4.5, 2, 2, "F");
  }
  doc.setFontSize(11);
  doc.setTextColor(...(isFullyImmunized ? GHS_GREEN : ([34, 139, 34] as [number, number, number])));
  doc.text(`${progress}%`, barX + barWidth + 5, barY + 4.2);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 90, 90);
  doc.text(
    `Completed: ${completed}    Pending: ${pending}    Total: ${total}`,
    pageWidth - margin - 5,
    barY + 4.2,
    { align: "right" }
  );

  const nextName = upcoming ? splitVaccineLabel(upcoming.name).vaccine : "None - schedule complete";
  const nextDate = upcoming?.dueDate ? formatDateDDMMYYYY(upcoming.dueDate) : "-";
  doc.setFontSize(7.5);
  doc.setTextColor(...GHS_DARK);
  doc.text(`Next Vaccine Due: ${nextName}`, margin + 5, yPos + 21);
  doc.text(`Next Appointment Date: ${nextDate}`, margin + 5, yPos + 25.5);
  if (isFullyImmunized) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GHS_GREEN);
    doc.text("FULLY IMMUNIZED", pageWidth - margin - 5, yPos + 23, { align: "right" });
  }

  // ============== HEALTH WORKER / AUTHORISATION ==============
  yPos += 34;
  const workerName = options.vaccinatorName?.trim();
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GHS_DARK);

  doc.setDrawColor(120, 120, 120);
  doc.setLineWidth(0.3);
  doc.line(margin + 5, yPos + 10, margin + 75, yPos + 10);
  doc.line(pageWidth - margin - 75, yPos + 10, pageWidth - margin - 5, yPos + 10);

  if (workerName) {
    doc.setFont("helvetica", "bold");
    doc.text(workerName, margin + 5, yPos + 8);
    doc.setFont("helvetica", "normal");
  }
  doc.setFontSize(7);
  doc.setTextColor(110, 110, 110);
  doc.text("Health Worker (Name & Signature)", margin + 5, yPos + 14);
  doc.text("Officer In-Charge / Facility Stamp", pageWidth - margin - 75, yPos + 14);

  // ============== FOOTER (every page) ==============
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    doc.setFontSize(6.2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GHS_GREEN);
    doc.text(
      "This is an official Ghana Health Service document.",
      pageWidth / 2,
      pageHeight - 26,
      { align: "center" }
    );
    doc.setFont("helvetica", "italic");
    doc.setTextColor(105, 105, 105);
    doc.text(
      "Scan the QR code on this certificate to verify its authenticity. Please present it at every clinic visit.",
      pageWidth / 2,
      pageHeight - 22.5,
      { align: "center" }
    );

    const flagBarY = pageHeight - 19;
    doc.setFillColor(...GHS_RED);
    doc.rect(8, flagBarY, (pageWidth - 16) / 3, 3.5, "F");
    doc.setFillColor(...GHS_GOLD);
    doc.rect(8 + (pageWidth - 16) / 3, flagBarY, (pageWidth - 16) / 3, 3.5, "F");
    doc.setFillColor(...GHS_GREEN);
    doc.rect(8 + (2 * (pageWidth - 16)) / 3, flagBarY, (pageWidth - 16) / 3, 3.5, "F");

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Certificate ID: ${certificateId}  |  Verification Code: ${verificationCode}  |  Version ${CERTIFICATE_VERSION}`,
      pageWidth / 2,
      pageHeight - 13,
      { align: "center" }
    );
    doc.text(
      `Generated: ${formatDateDDMMYYYY(generatedAt)} ${generatedAt.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })}  |  Page ${p} of ${totalPages}  |  Ghana Health Service - EPI Programme`,
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
