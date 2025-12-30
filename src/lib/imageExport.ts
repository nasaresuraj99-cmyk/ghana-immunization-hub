import { toPng } from "html-to-image";
import { Child } from "@/types/child";

export async function exportImmunizationCardAsImage(
  child: Child,
  options: { facilityName?: string } = {}
): Promise<void> {
  const { facilityName = "Health Facility" } = options;
  
  // Create a temporary container for the certificate
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.width = "595px"; // A5 width in pixels at 96dpi
  container.style.height = "842px"; // A5 height in pixels at 96dpi
  container.style.backgroundColor = "#ffffff";
  container.style.fontFamily = "Arial, sans-serif";
  
  // Calculate stats
  const completed = child.vaccines.filter(v => v.status === "completed").length;
  const pending = child.vaccines.filter(v => v.status === "pending").length;
  const overdue = child.vaccines.filter(v => v.status === "overdue").length;
  const total = child.vaccines.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Build HTML content
  container.innerHTML = `
    <div style="border: 4px solid #006400; margin: 8px; height: calc(100% - 16px); box-sizing: border-box; position: relative;">
      <div style="border: 1px solid #006400; margin: 6px; height: calc(100% - 12px); box-sizing: border-box;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #006400, #228B22); padding: 16px; text-align: center;">
          <div style="color: white; font-size: 14px; font-weight: bold;">REPUBLIC OF GHANA</div>
          <div style="color: white; font-size: 18px; font-weight: bold; margin-top: 4px;">GHANA HEALTH SERVICE</div>
          <div style="color: white; font-size: 12px; margin-top: 4px;">Expanded Programme on Immunization (EPI)</div>
          <div style="color: white; font-size: 10px; margin-top: 2px;">Child Health Record Card</div>
        </div>
        
        <!-- Gold Line -->
        <div style="background: linear-gradient(90deg, #FFD700, #FFA500); height: 6px;"></div>
        
        <!-- Facility Name -->
        <div style="background: #006400; color: white; font-size: 18px; font-weight: bold; text-align: center; padding: 10px; margin: 10px 12px;">
          ${facilityName.toUpperCase()}
        </div>
        
        <!-- Region/District if available -->
        ${child.regionDistrict ? `
          <div style="text-align: center; font-size: 12px; color: #333; margin-bottom: 8px;">
            <strong>Region/District:</strong> ${child.regionDistrict}
          </div>
        ` : ''}
        
        <!-- Child Info Section -->
        <div style="padding: 12px; display: flex;">
          <div style="flex: 1;">
            <div style="font-size: 11px; font-weight: bold; color: #006400; border-bottom: 1px solid #006400; padding-bottom: 4px; margin-bottom: 8px;">
              CHILD INFORMATION
            </div>
            <div style="font-size: 10px; line-height: 1.6;">
              <div><strong>Reg No:</strong> ${child.regNo}</div>
              <div><strong>Name:</strong> ${child.name}</div>
              <div><strong>DOB:</strong> ${new Date(child.dateOfBirth).toLocaleDateString()}</div>
              <div><strong>Sex:</strong> ${child.sex}</div>
              <div><strong>Caregiver/Parent:</strong> ${child.motherName}</div>
              <div><strong>Contact:</strong> ${child.telephoneAddress || "N/A"}</div>
              <div><strong>Community:</strong> ${child.community || "N/A"}</div>
            </div>
          </div>
          
          <!-- QR Code Placeholder -->
          <div style="width: 80px; height: 80px; border: 2px solid #006400; display: flex; align-items: center; justify-content: center; margin-left: 12px;">
            <div style="text-align: center; font-size: 8px; color: #666;">
              📱<br>Scan QR<br>on PDF
            </div>
          </div>
        </div>
        
        <!-- Immunization Record Header -->
        <div style="background: #006400; color: white; font-size: 12px; font-weight: bold; text-align: center; padding: 6px; margin: 0 12px;">
          IMMUNIZATION RECORD
        </div>
        
        <!-- Vaccine Table -->
        <div style="margin: 8px 12px; font-size: 9px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #006400; color: white;">
                <th style="padding: 4px; text-align: left; border: 1px solid #004d00;">Vaccine</th>
                <th style="padding: 4px; text-align: center; border: 1px solid #004d00;">Due</th>
                <th style="padding: 4px; text-align: center; border: 1px solid #004d00;">Given</th>
                <th style="padding: 4px; text-align: center; border: 1px solid #004d00;">Batch</th>
                <th style="padding: 4px; text-align: center; border: 1px solid #004d00; width: 30px;">✓</th>
              </tr>
            </thead>
            <tbody>
              ${child.vaccines.slice(0, 16).map((v, i) => `
                <tr style="background: ${i % 2 === 0 ? '#f5faf5' : '#ffffff'};">
                  <td style="padding: 3px 4px; border: 1px solid #ddd; font-size: 8px;">${v.name.split(" at")[0].substring(0, 20)}</td>
                  <td style="padding: 3px 4px; border: 1px solid #ddd; text-align: center; font-size: 8px;">${new Date(v.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                  <td style="padding: 3px 4px; border: 1px solid #ddd; text-align: center; font-size: 8px;">${v.givenDate ? new Date(v.givenDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}</td>
                  <td style="padding: 3px 4px; border: 1px solid #ddd; text-align: center; font-size: 8px;">${v.batchNumber?.substring(0, 10) || '-'}</td>
                  <td style="padding: 3px 4px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${v.status === 'completed' ? '#006400' : v.status === 'overdue' ? '#ce1126' : '#999'};">${v.status === 'completed' ? '✓' : v.status === 'overdue' ? '!' : '○'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <!-- Progress Section -->
        <div style="background: #f5faf5; margin: 8px 12px; padding: 8px; border-radius: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="font-size: 10px; font-weight: bold;">PROGRESS</div>
            <div style="flex: 1; height: 8px; background: #e5e5e5; border-radius: 4px; overflow: hidden;">
              <div style="width: ${progress}%; height: 100%; background: #006400; border-radius: 4px;"></div>
            </div>
            <div style="font-size: 12px; font-weight: bold;">${progress}%</div>
          </div>
          <div style="display: flex; gap: 16px; margin-top: 6px; font-size: 9px;">
            <span><span style="display: inline-block; width: 8px; height: 8px; background: #006400; border-radius: 50%; margin-right: 4px;"></span>Completed: ${completed}</span>
            <span><span style="display: inline-block; width: 8px; height: 8px; background: #f59e0b; border-radius: 50%; margin-right: 4px;"></span>Pending: ${pending}</span>
            <span><span style="display: inline-block; width: 8px; height: 8px; background: #ce1126; border-radius: 50%; margin-right: 4px;"></span>Overdue: ${overdue}</span>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="position: absolute; bottom: 60px; left: 12px; right: 12px;">
          <div style="background: #FFD700; height: 2px; margin-bottom: 8px;"></div>
          <div style="font-size: 8px; text-align: center; color: #666; font-style: italic;">
            IMPORTANT: This card is an official health document. Please bring it to every clinic visit.
          </div>
        </div>
        
        <!-- Signature Section -->
        <div style="position: absolute; bottom: 20px; left: 12px; right: 12px; font-size: 9px;">
          <div style="display: flex; justify-content: space-between;">
            <div>
              <span>Health Worker: </span>
              <span style="display: inline-block; width: 100px; border-bottom: 1px solid #333;"></span>
            </div>
            <div>
              <span>Date: </span>
              <span style="display: inline-block; width: 60px; border-bottom: 1px solid #333;"></span>
            </div>
          </div>
        </div>
        
        <!-- Bottom Bar -->
        <div style="position: absolute; bottom: 0; left: 0; right: 0; background: #006400; height: 4px;"></div>
      </div>
    </div>
  `;
  
  document.body.appendChild(container);
  
  try {
    const dataUrl = await toPng(container, {
      quality: 1,
      pixelRatio: 2,
    });
    
    // Create download link
    const link = document.createElement("a");
    link.download = `GHS_Immunization_Card_${child.regNo}_${child.name.replace(/\s+/g, "_")}.png`;
    link.href = dataUrl;
    link.click();
  } finally {
    document.body.removeChild(container);
  }
}
