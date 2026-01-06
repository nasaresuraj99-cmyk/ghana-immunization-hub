import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { Child } from "@/types/child";

// Ghana Health Service branding colors
const GHS_GREEN: [number, number, number] = [0, 100, 0];
const GHS_GOLD: [number, number, number] = [255, 215, 0];
const GHS_RED: [number, number, number] = [206, 17, 38];
const GHS_DARK: [number, number, number] = [30, 41, 59];

interface CertificateOptions {
  facilityName?: string;
  districtRegion?: string;
  vaccinatorName?: string;
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

/**
 * Generate a professional immunization certificate for a child (0-59 months)
 * Suitable for official health facility use
 */
export async function generateImmunizationCertificate(
  child: Child,
  options: CertificateOptions = {}
): Promise<void> {
  const {
    facilityName = "Health Facility",
    districtRegion = "District/Region",
    vaccinatorName = "",
  } = options;

  // Create A4 portrait document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Generate QR code with verification data
  const verificationData = {
    id: child.id,
    regNo: child.regNo,
    name: child.name,
    dob: child.dateOfBirth,
    sex: child.sex,
    facility: facilityName,
    vaccinesCompleted: child.vaccines.filter(v => v.status === "completed").length,
    totalVaccines: child.vaccines.length,
    generatedAt: new Date().toISOString(),
  };

  const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(verificationData), {
    width: 400,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: {
      dark: "#006400",
      light: "#ffffff",
    },
  });

  // ============== HEADER SECTION ==============
  
  // Outer decorative border
  doc.setDrawColor(...GHS_GREEN);
  doc.setLineWidth(2);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10, "S");
  
  // Inner border
  doc.setLineWidth(0.5);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");

  // Header background
  doc.setFillColor(...GHS_GREEN);
  doc.rect(8, 8, pageWidth - 16, 35, "F");
  
  // Gold accent stripe
  doc.setFillColor(...GHS_GOLD);
  doc.rect(8, 43, pageWidth - 16, 4, "F");

  // Ghana coat of arms placeholder (circle)
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth / 2, 22, 10, "F");
  doc.setDrawColor(...GHS_GOLD);
  doc.setLineWidth(1);
  doc.circle(pageWidth / 2, 22, 10, "S");
  
  // GHS text in circle
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GHS_GREEN);
  doc.text("GHS", pageWidth / 2, 24, { align: "center" });

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("REPUBLIC OF GHANA", pageWidth / 2, 12, { align: "center" });
  doc.text("MINISTRY OF HEALTH", pageWidth / 2, 17, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("GHANA HEALTH SERVICE", pageWidth / 2, 34, { align: "center" });

  // Certificate title bar
  let yPos = 52;
  doc.setFillColor(250, 252, 250);
  doc.roundedRect(margin, yPos, contentWidth, 14, 2, 2, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, contentWidth, 14, 2, 2, "S");
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GHS_GREEN);
  doc.text("CHILD IMMUNIZATION CERTIFICATE", pageWidth / 2, yPos + 9, { align: "center" });
  
  doc.setFontSize(9);
  doc.setTextColor(...GHS_DARK);
  doc.text("(Children 0-59 Months)", pageWidth / 2, yPos + 13, { align: "center" });

  // ============== FACILITY INFO SECTION ==============
  yPos = 72;
  doc.setFillColor(248, 252, 248);
  doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, "S");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GHS_GREEN);
  doc.text(facilityName.toUpperCase(), pageWidth / 2, yPos + 7, { align: "center" });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GHS_DARK);
  doc.text(districtRegion, pageWidth / 2, yPos + 13, { align: "center" });

  // ============== CHILD DETAILS SECTION ==============
  yPos = 94;
  
  // Section header
  doc.setFillColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CHILD PARTICULARS", pageWidth / 2, yPos + 6, { align: "center" });
  
  yPos += 10;
  
  // Child details box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, yPos, contentWidth, 42, 2, 2, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.roundedRect(margin, yPos, contentWidth, 42, 2, 2, "S");
  
  // QR Code
  const qrSize = 35;
  doc.addImage(qrCodeDataUrl, "PNG", pageWidth - margin - qrSize - 5, yPos + 3, qrSize, qrSize);
  
  // Child details grid
  const ageInMonths = calculateAgeInMonths(child.dateOfBirth);
  const detailsLeftCol = margin + 5;
  const detailsRightCol = margin + 50;
  let detailY = yPos + 8;
  
  const childDetails: [string, string][] = [
    ["Registration No:", child.regNo],
    ["Full Name:", child.name],
    ["Date of Birth:", formatDateDDMMYYYY(child.dateOfBirth)],
    ["Age:", `${ageInMonths} months`],
    ["Sex:", child.sex],
    ["Caregiver Name:", child.motherName],
    ["Contact:", child.telephoneAddress || "N/A"],
    ["Community:", child.community || "N/A"],
  ];
  
  doc.setFontSize(9);
  childDetails.forEach(([label, value], index) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label, detailsLeftCol, detailY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GHS_DARK);
    doc.text(String(value).substring(0, 40), detailsRightCol, detailY);
    detailY += 5;
  });

  // ============== IMMUNIZATION RECORD TABLE ==============
  yPos = 150;
  
  // Section header
  doc.setFillColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("IMMUNIZATION RECORD", pageWidth / 2, yPos + 6, { align: "center" });
  
  yPos += 10;

  // Prepare vaccine data
  const vaccineTableData = child.vaccines.map((v, idx) => [
    (idx + 1).toString(),
    v.name.split(" at")[0], // Remove " at Birth", " at 6 weeks" etc.
    v.name.includes("at") ? v.name.split(" at")[1] : "",
    formatDateDDMMYYYY(v.dueDate),
    v.givenDate ? formatDateDDMMYYYY(v.givenDate) : "—",
    v.batchNumber || "—",
    "", // Signature/stamp space
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Vaccine", "Dose", "Due Date", "Date Given", "Batch No.", "Sign/Stamp"]],
    body: vaccineTableData,
    headStyles: {
      fillColor: GHS_GREEN,
      textColor: [255, 255, 255],
      fontSize: 8,
      cellPadding: 2,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 252, 248],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 35 },
      2: { cellWidth: 25, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 25, halign: "center" },
      6: { cellWidth: 30, halign: "center" },
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const givenDate = data.cell.raw as string;
        if (givenDate && givenDate !== "—") {
          data.cell.styles.textColor = [0, 128, 0];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  yPos = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || yPos + 80;

  // ============== COMPLETION STATUS ==============
  yPos += 5;
  
  const completed = child.vaccines.filter(v => v.status === "completed").length;
  const total = child.vaccines.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isFullyImmunized = progress >= 100;
  
  doc.setFillColor(isFullyImmunized ? 232 : 255, isFullyImmunized ? 245 : 255, isFullyImmunized ? 232 : 240);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, "F");
  doc.setDrawColor(isFullyImmunized ? 0 : 200, isFullyImmunized ? 150 : 200, isFullyImmunized ? 0 : 200);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, "S");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...(isFullyImmunized ? GHS_GREEN : GHS_DARK));
  doc.text("VACCINATION STATUS:", margin + 5, yPos + 7);
  
  // Progress bar
  const barWidth = 80;
  const barX = margin + 60;
  const barY = yPos + 4;
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(barX, barY, barWidth, 5, 2, 2, "F");
  
  if (progress > 0) {
    const progressColor: [number, number, number] = isFullyImmunized ? GHS_GREEN : [34, 139, 34];
    doc.setFillColor(...progressColor);
    doc.roundedRect(barX, barY, (progress / 100) * barWidth, 5, 2, 2, "F");
  }
  
  doc.setFontSize(11);
  const textColor: [number, number, number] = isFullyImmunized ? GHS_GREEN : [34, 139, 34];
  doc.setTextColor(...textColor);
  doc.text(`${progress}%`, barX + barWidth + 5, barY + 4);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${completed} of ${total} vaccines completed`, margin + 5, yPos + 14);
  
  if (isFullyImmunized) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GHS_GREEN);
    doc.text("✓ FULLY IMMUNIZED", pageWidth - margin - 40, yPos + 11);
  }

  // ============== AUTHENTICATION SECTION ==============
  yPos += 24;
  
  // Section header
  doc.setFillColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("AUTHENTICATION", pageWidth / 2, yPos + 6, { align: "center" });
  
  yPos += 10;
  
  // Authentication box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, yPos, contentWidth, 22, 2, 2, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.roundedRect(margin, yPos, contentWidth, 22, 2, 2, "S");
  
  // Vaccinator details
  const authLeftCol = margin + 5;
  const authMidCol = margin + 70;
  const authRightCol = margin + 130;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  
  doc.text("Vaccinator Name:", authLeftCol, yPos + 7);
  doc.text("Signature:", authMidCol, yPos + 7);
  doc.text("Date Issued:", authRightCol, yPos + 7);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GHS_DARK);
  
  // Underlines for writing
  doc.setDrawColor(200, 200, 200);
  doc.line(authLeftCol, yPos + 16, authLeftCol + 55, yPos + 16);
  doc.line(authMidCol, yPos + 16, authMidCol + 50, yPos + 16);
  doc.line(authRightCol, yPos + 16, authRightCol + 40, yPos + 16);
  
  // Pre-fill vaccinator name if provided
  if (vaccinatorName) {
    doc.text(vaccinatorName, authLeftCol, yPos + 14);
  }
  doc.text(formatDateDDMMYYYY(new Date()), authRightCol, yPos + 14);
  
  // Stamp area
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("[OFFICIAL STAMP]", pageWidth - margin - 25, yPos + 18, { align: "center" });

  // ============== CAREGIVER GUIDANCE NOTES ==============
  yPos += 28;
  
  doc.setFillColor(255, 250, 240);
  doc.roundedRect(margin, yPos, contentWidth, 24, 2, 2, "F");
  doc.setDrawColor(...GHS_GOLD);
  doc.roundedRect(margin, yPos, contentWidth, 24, 2, 2, "S");
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GHS_DARK);
  doc.text("IMPORTANT INFORMATION FOR CAREGIVERS:", margin + 5, yPos + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const notes = [
    "• Keep this certificate safe and bring it to every clinic visit.",
    "• Ensure your child receives all vaccines according to the schedule.",
    "• Report any adverse reactions to the health facility immediately.",
    "• Contact your health facility if you miss any scheduled vaccination.",
  ];
  
  let noteY = yPos + 11;
  notes.forEach(note => {
    doc.text(note, margin + 5, noteY);
    noteY += 3.5;
  });

  // ============== FOOTER ==============
  
  // Ghana flag colors bar
  const flagBarY = pageHeight - 18;
  doc.setFillColor(...GHS_RED);
  doc.rect(8, flagBarY, (pageWidth - 16) / 3, 4, "F");
  doc.setFillColor(...GHS_GOLD);
  doc.rect(8 + (pageWidth - 16) / 3, flagBarY, (pageWidth - 16) / 3, 4, "F");
  doc.setFillColor(...GHS_GREEN);
  doc.rect(8 + 2 * (pageWidth - 16) / 3, flagBarY, (pageWidth - 16) / 3, 4, "F");
  
  // Footer text
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Certificate ID: ${child.regNo} | Generated: ${formatDateDDMMYYYY(new Date())} | Ghana Health Service - Expanded Programme on Immunization`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );
  
  doc.setFontSize(5);
  doc.text(
    "This is an official document. Tampering or falsification is punishable by law.",
    pageWidth / 2,
    pageHeight - 7,
    { align: "center" }
  );

  // Save the PDF
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
