import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { Child } from "@/types/child";
import { FACILITY_CONFIG } from "@/lib/facilityConfig";

// Ghana Health Service branding colors
const GHS_GREEN: [number, number, number] = [0, 100, 0];
const GHS_GOLD: [number, number, number] = [255, 215, 0];
const GHS_RED: [number, number, number] = [206, 17, 38];
const GHS_DARK: [number, number, number] = [30, 41, 59];

// Always use FIAN URBAN CHPS
const DEFAULT_FACILITY_NAME = FACILITY_CONFIG.name;
const DEFAULT_DISTRICT_REGION = "Ashanti Region, Ghana";

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
  const districtRegion = options.districtRegion || DEFAULT_DISTRICT_REGION;
  const vaccinatorName = options.vaccinatorName || "";

  // Get logo base64
  const logoBase64 = await getLogoBase64();

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

  // Generate QR code with complete verification data
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
    vaccinesCompleted: child.vaccines.filter(v => v.status === "completed").length,
    totalVaccines: child.vaccines.length,
    registeredAt: child.registeredAt,
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
  doc.rect(8, 8, pageWidth - 16, 38, "F");
  
  // Gold accent stripe
  doc.setFillColor(...GHS_GOLD);
  doc.rect(8, 46, pageWidth - 16, 4, "F");

  // Add GHS Logo if available
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", pageWidth / 2 - 12, 10, 24, 24);
    } catch {
      // Fallback to text if logo fails
      doc.setFillColor(255, 255, 255);
      doc.circle(pageWidth / 2, 22, 10, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...GHS_GREEN);
      doc.text("GHS", pageWidth / 2, 24, { align: "center" });
    }
  } else {
    // Fallback: Ghana coat of arms placeholder (circle with GHS)
    doc.setFillColor(255, 255, 255);
    doc.circle(pageWidth / 2, 22, 10, "F");
    doc.setDrawColor(...GHS_GOLD);
    doc.setLineWidth(1);
    doc.circle(pageWidth / 2, 22, 10, "S");
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GHS_GREEN);
    doc.text("GHS", pageWidth / 2, 24, { align: "center" });
  }

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("REPUBLIC OF GHANA", pageWidth / 2, 12, { align: "center" });
  
  doc.setFontSize(9);
  doc.text("MINISTRY OF HEALTH", pageWidth / 2, 38, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("GHANA HEALTH SERVICE", pageWidth / 2, 43, { align: "center" });

  // Certificate title bar
  let yPos = 54;
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
  yPos = 74;
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

  // ============== CHILD DETAILS SECTION - ALL REGISTRATION DETAILS ==============
  yPos = 96;
  
  // Section header
  doc.setFillColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("CHILD PARTICULARS", pageWidth / 2, yPos + 6, { align: "center" });
  
  yPos += 10;
  
  // Child details box - expanded to include all details
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, yPos, contentWidth, 52, 2, 2, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.roundedRect(margin, yPos, contentWidth, 52, 2, 2, "S");
  
  // QR Code
  const qrSize = 40;
  doc.addImage(qrCodeDataUrl, "PNG", pageWidth - margin - qrSize - 5, yPos + 5, qrSize, qrSize);
  
  // Child details grid - ALL REGISTRATION DETAILS
  const ageInMonths = calculateAgeInMonths(child.dateOfBirth);
  const detailsLeftCol = margin + 5;
  const detailsRightCol = margin + 48;
  let detailY = yPos + 7;
  
  const childDetails: [string, string][] = [
    ["Registration No:", child.regNo],
    ["Full Name:", child.name],
    ["Date of Birth:", formatDateDDMMYYYY(child.dateOfBirth)],
    ["Age:", `${ageInMonths} months`],
    ["Sex:", child.sex],
    ["Caregiver/Parent:", child.motherName || child.caregiverName || "N/A"],
    ["Contact Number:", child.telephoneAddress || "N/A"],
    ["Community:", child.community || "N/A"],
    ["Health Facility:", child.healthFacilityName || facilityName],
    ["Region/District:", child.regionDistrict || districtRegion],
    ["Date Registered:", child.registeredAt ? formatDateDDMMYYYY(child.registeredAt) : "N/A"],
  ];
  
  doc.setFontSize(8);
  childDetails.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(label, detailsLeftCol, detailY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...GHS_DARK);
    // Truncate long values to fit
    const maxWidth = pageWidth - margin - qrSize - detailsRightCol - 15;
    const truncatedValue = String(value).substring(0, 35);
    doc.text(truncatedValue, detailsRightCol, detailY);
    detailY += 4.5;
  });

  // ============== IMMUNIZATION RECORD TABLE ==============
  yPos = 162;
  
  // Section header
  doc.setFillColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("IMMUNIZATION RECORD", pageWidth / 2, yPos + 6, { align: "center" });
  
  yPos += 10;

  // Prepare vaccine data with status (Given / Pending / Overdue)
  const vaccineTableData = child.vaccines.map((v, idx) => [
    (idx + 1).toString(),
    v.name.split(" at")[0],
    v.name.includes("at") ? v.name.split(" at")[1] : "",
    formatDateDDMMYYYY(v.dueDate),
    v.givenDate ? formatDateDDMMYYYY(v.givenDate) : "—",
    v.status === "completed" ? "GIVEN" : v.status === "overdue" ? "OVERDUE" : "PENDING",
    v.batchNumber || "—",
    v.administeredBy ? v.administeredBy.substring(0, 8) : "—",
  ]);

  // Draws the decorative page frame (used for continuation pages too)
  const drawPageFrame = () => {
    doc.setDrawColor(...GHS_GREEN);
    doc.setLineWidth(2);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10, "S");
    doc.setLineWidth(0.5);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, "S");
  };

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Vaccine", "Dose", "Due Date", "Given On", "Status", "Batch", "By"]],
    body: vaccineTableData,
    // Ensure every vaccine row is rendered, flowing onto extra pages when needed
    pageBreak: "auto",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    headStyles: {
      fillColor: GHS_GREEN,
      textColor: [255, 255, 255],
      fontSize: 7,
      cellPadding: 1.5,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 6,
      cellPadding: 1.5,
    },
    alternateRowStyles: {
      fillColor: [248, 252, 248],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: "center" },
      1: { cellWidth: 30 },
      2: { cellWidth: 19, halign: "center" },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 18, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
      6: { cellWidth: 19, halign: "center" },
      7: { cellWidth: 16, halign: "center" },
    },

    margin: { left: margin, right: margin, top: 18, bottom: 22 },
    tableWidth: contentWidth,
    didDrawPage: (data) => {
      // Redraw the certificate frame on continuation pages
      if (data.pageNumber > 1) {
        drawPageFrame();
      }
    },
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

  // If the remaining sections do not fit on the current page, continue on a new one
  const REMAINING_SECTIONS_HEIGHT = 88;
  if (yPos + REMAINING_SECTIONS_HEIGHT > pageHeight - 22) {
    doc.addPage();
    drawPageFrame();
    yPos = 18;
  }


  // ============== COMPLETION STATUS ==============
  yPos += 3;
  
  const completed = child.vaccines.filter(v => v.status === "completed").length;
  const pending = child.vaccines.filter(v => v.status === "pending").length;
  const overdue = child.vaccines.filter(v => v.status === "overdue").length;
  const total = child.vaccines.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isFullyImmunized = progress >= 100;
  
  doc.setFillColor(isFullyImmunized ? 232 : 255, isFullyImmunized ? 245 : 255, isFullyImmunized ? 232 : 240);
  doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, "F");
  doc.setDrawColor(isFullyImmunized ? 0 : 200, isFullyImmunized ? 150 : 200, isFullyImmunized ? 0 : 200);
  doc.roundedRect(margin, yPos, contentWidth, 16, 2, 2, "S");
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...(isFullyImmunized ? GHS_GREEN : GHS_DARK));
  doc.text("STATUS:", margin + 5, yPos + 6);
  
  // Progress bar
  const barWidth = 60;
  const barX = margin + 25;
  const barY = yPos + 3;
  doc.setFillColor(230, 230, 230);
  doc.roundedRect(barX, barY, barWidth, 4, 2, 2, "F");
  
  if (progress > 0) {
    const progressColor: [number, number, number] = isFullyImmunized ? GHS_GREEN : [34, 139, 34];
    doc.setFillColor(...progressColor);
    doc.roundedRect(barX, barY, (progress / 100) * barWidth, 4, 2, 2, "F");
  }
  
  doc.setFontSize(10);
  const textColor: [number, number, number] = isFullyImmunized ? GHS_GREEN : [34, 139, 34];
  doc.setTextColor(...textColor);
  doc.text(`${progress}%`, barX + barWidth + 3, barY + 4);
  
  // Stats summary
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Completed: ${completed}  |  Pending: ${pending}  |  Overdue: ${overdue}  |  Total: ${total}`, margin + 5, yPos + 13);
  
  if (isFullyImmunized) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GHS_GREEN);
    doc.text("✓ FULLY IMMUNIZED", pageWidth - margin - 35, yPos + 10);
  }

  // ============== AUTHENTICATION SECTION ==============
  yPos += 20;
  
  // Section header
  doc.setFillColor(...GHS_GREEN);
  doc.rect(margin, yPos, contentWidth, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("AUTHENTICATION", pageWidth / 2, yPos + 5, { align: "center" });
  
  yPos += 9;
  
  // Authentication box
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, "F");
  doc.setDrawColor(...GHS_GREEN);
  doc.roundedRect(margin, yPos, contentWidth, 18, 2, 2, "S");
  
  // Vaccinator details
  const authLeftCol = margin + 5;
  const authMidCol = margin + 65;
  const authRightCol = margin + 125;
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  
  doc.text("Vaccinator Name:", authLeftCol, yPos + 6);
  doc.text("Signature:", authMidCol, yPos + 6);
  doc.text("Date Issued:", authRightCol, yPos + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GHS_DARK);
  
  // Underlines for writing
  doc.setDrawColor(200, 200, 200);
  doc.line(authLeftCol, yPos + 14, authLeftCol + 50, yPos + 14);
  doc.line(authMidCol, yPos + 14, authMidCol + 45, yPos + 14);
  doc.line(authRightCol, yPos + 14, authRightCol + 35, yPos + 14);
  
  if (vaccinatorName) {
    doc.text(vaccinatorName, authLeftCol, yPos + 12);
  }
  doc.text(formatDateDDMMYYYY(new Date()), authRightCol, yPos + 12);

  // ============== CAREGIVER GUIDANCE NOTES ==============
  yPos += 22;
  
  doc.setFillColor(255, 250, 240);
  doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, "F");
  doc.setDrawColor(...GHS_GOLD);
  doc.roundedRect(margin, yPos, contentWidth, 20, 2, 2, "S");
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GHS_DARK);
  doc.text("IMPORTANT INFORMATION FOR CAREGIVERS:", margin + 5, yPos + 5);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  const notes = [
    "• Keep this certificate safe and bring it to every clinic visit.",
    "• Ensure your child receives all vaccines according to the schedule.",
    "• Report any adverse reactions to the health facility immediately.",
    "• Contact your health facility if you miss any scheduled vaccination.",
  ];
  
  let noteY = yPos + 9;
  notes.forEach(note => {
    doc.text(note, margin + 5, noteY);
    noteY += 3;
  });

  // ============== FOOTER (on every page) ==============
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Ghana flag colors bar
    const flagBarY = pageHeight - 16;
    doc.setFillColor(...GHS_RED);
    doc.rect(8, flagBarY, (pageWidth - 16) / 3, 4, "F");
    doc.setFillColor(...GHS_GOLD);
    doc.rect(8 + (pageWidth - 16) / 3, flagBarY, (pageWidth - 16) / 3, 4, "F");
    doc.setFillColor(...GHS_GREEN);
    doc.rect(8 + 2 * (pageWidth - 16) / 3, flagBarY, (pageWidth - 16) / 3, 4, "F");

    // Footer text
    doc.setFontSize(5);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Certificate ID: ${child.regNo} | Generated: ${formatDateDDMMYYYY(new Date())} | Page ${p} of ${totalPages} | Ghana Health Service - Expanded Programme on Immunization`,
      pageWidth / 2,
      pageHeight - 9,
      { align: "center" }
    );

    doc.setFontSize(4.5);
    doc.text(
      "This is an official document. Tampering or falsification is punishable by law. Scan QR code for verification.",
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }


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
