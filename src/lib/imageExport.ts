import { toPng } from "html-to-image";
import { Child } from "@/types/child";
import { FACILITY_CONFIG } from "@/lib/facilityConfig";

export async function exportImmunizationCardAsImage(
  child: Child
): Promise<void> {
  // Always use FIAN URBAN CHPS for cards
  const facilityName = FACILITY_CONFIG.name;
  const districtInfo = FACILITY_CONFIG.district;
  
  // Create a temporary container for the certificate
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "595px";
  container.style.height = "842px";
  container.style.backgroundColor = "#ffffff";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.zIndex = "-9999";
  container.style.opacity = "1";
  
  // Calculate stats
  const completed = child.vaccines.filter(v => v.status === "completed").length;
  const total = child.vaccines.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Build simplified HTML content - clean and professional with GHS Logo
  container.innerHTML = `
    <div style="border: 3px solid #006400; margin: 8px; height: calc(100% - 16px); box-sizing: border-box; position: relative; background: #fff;">
      <!-- Header with GHS Logo -->
      <div style="background: linear-gradient(135deg, #006400, #228B22); padding: 12px; text-align: center; position: relative;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
          <img src="/src/assets/ghs-logo.png" alt="GHS Logo" style="width: 50px; height: 50px; border-radius: 50%; background: white; padding: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);" onerror="this.style.display='none'" />
          <div>
            <div style="color: white; font-size: 11px; font-weight: bold;">REPUBLIC OF GHANA</div>
            <div style="color: white; font-size: 16px; font-weight: bold; margin-top: 2px;">GHANA HEALTH SERVICE</div>
            <div style="color: white; font-size: 10px; margin-top: 2px;">Child Immunization Record Card</div>
          </div>
        </div>
      </div>
      
      <!-- Gold Line -->
      <div style="background: linear-gradient(90deg, #FFD700, #FFA500); height: 4px;"></div>
      
      <!-- Facility Name with District -->
      <div style="background: #006400; color: white; text-align: center; padding: 8px; margin: 8px 10px;">
        <div style="font-size: 16px; font-weight: bold;">${facilityName.toUpperCase()}</div>
        <div style="font-size: 10px; margin-top: 2px;">${districtInfo}</div>
      </div>
      
      <!-- Child Info Section -->
      <div style="padding: 10px 12px; display: flex;">
        <div style="flex: 1;">
          <div style="font-size: 10px; font-weight: bold; color: #006400; border-bottom: 1px solid #006400; padding-bottom: 3px; margin-bottom: 6px;">
            CHILD DETAILS
          </div>
          <div style="font-size: 9px; line-height: 1.5;">
            <div><strong>Reg No:</strong> ${child.regNo}</div>
            <div><strong>Name:</strong> ${child.name}</div>
            <div><strong>DOB:</strong> ${new Date(child.dateOfBirth).toLocaleDateString()}</div>
            <div><strong>Sex:</strong> ${child.sex}</div>
            <div><strong>Caregiver:</strong> ${child.motherName}</div>
            <div><strong>Contact:</strong> ${child.telephoneAddress || "N/A"}</div>
          </div>
        </div>
      </div>
      
      <!-- Immunization Record Header -->
      <div style="background: #006400; color: white; font-size: 10px; font-weight: bold; text-align: center; padding: 5px; margin: 0 10px;">
        IMMUNIZATION RECORD
      </div>
      
      <!-- Vaccine Table -->
      <div style="margin: 6px 10px; font-size: 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #006400; color: white;">
              <th style="padding: 3px; text-align: left; border: 1px solid #004d00;">Vaccine</th>
              <th style="padding: 3px; text-align: center; border: 1px solid #004d00;">Due</th>
              <th style="padding: 3px; text-align: center; border: 1px solid #004d00;">Given</th>
              <th style="padding: 3px; text-align: center; border: 1px solid #004d00; width: 25px;">✓</th>
            </tr>
          </thead>
          <tbody>
            ${child.vaccines.slice(0, 18).map((v, i) => `
              <tr style="background: ${i % 2 === 0 ? '#f5faf5' : '#ffffff'};">
                <td style="padding: 2px 3px; border: 1px solid #ddd; font-size: 7px;">${v.name.split(" at")[0].substring(0, 22)}</td>
                <td style="padding: 2px 3px; border: 1px solid #ddd; text-align: center; font-size: 7px;">${new Date(v.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                <td style="padding: 2px 3px; border: 1px solid #ddd; text-align: center; font-size: 7px;">${v.givenDate ? new Date(v.givenDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}</td>
                <td style="padding: 2px 3px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${v.status === 'completed' ? '#006400' : v.status === 'overdue' ? '#ce1126' : '#999'};">${v.status === 'completed' ? '✓' : v.status === 'overdue' ? '!' : '○'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Progress Section -->
      <div style="background: #f5faf5; margin: 6px 10px; padding: 6px; border-radius: 3px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <div style="font-size: 9px; font-weight: bold;">PROGRESS:</div>
          <div style="flex: 1; height: 6px; background: #e5e5e5; border-radius: 3px; overflow: hidden;">
            <div style="width: ${progress}%; height: 100%; background: #006400; border-radius: 3px;"></div>
          </div>
          <div style="font-size: 10px; font-weight: bold;">${progress}%</div>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="position: absolute; bottom: 30px; left: 10px; right: 10px;">
        <div style="background: #FFD700; height: 2px; margin-bottom: 6px;"></div>
        <div style="font-size: 7px; text-align: center; color: #666;">
          This card is an official health document. Please bring it to every clinic visit.
        </div>
      </div>
      
      <!-- Bottom Bar -->
      <div style="position: absolute; bottom: 0; left: 0; right: 0; background: #006400; height: 4px;"></div>
    </div>
  `;
  
  document.body.appendChild(container);
  
  // Wait for DOM to be ready
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    const dataUrl = await toPng(container, {
      quality: 1,
      pixelRatio: 2,
      cacheBust: true,
      skipAutoScale: true,
      width: 595,
      height: 842,
    });
    
    // Create download link - Use FIAN URBAN CHPS in filename
    const facilitySlug = facilityName.replace(/\s+/g, '_');
    const link = document.createElement("a");
    link.download = `${facilitySlug}_Immunization_Card_${child.regNo}_${child.name.replace(/\s+/g, "_")}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    document.body.removeChild(container);
  }
}
