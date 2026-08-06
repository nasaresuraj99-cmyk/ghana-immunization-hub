import { jsPDF } from "jspdf";
import fs from "fs";
// @ts-ignore
globalThis.Image = class { set src(_v:string){ setTimeout(()=> (this as any).onerror?.(new Error("no img")),0);} } as any;
(jsPDF as any).API.save = function(name:string){ fs.writeFileSync("/tmp/pdfqa/out.pdf", Buffer.from(this.output("arraybuffer"))); return this; };
const { exportImmunizationCard } = await import("/dev-server/src/lib/pdfExport.ts");
const { GHANA_EPI_VACCINES } = await import("/dev-server/src/lib/ghanaEpiSchedule.ts");
const dob = new Date("2025-02-13");
const vaccines = (GHANA_EPI_VACCINES as any[]).map((v:any, i:number) => {
  const due = new Date(dob); due.setDate(due.getDate() + (v.ageInDays ?? v.dueDays ?? i*30));
  const given = i < 20;
  return { name: v.name ?? v.label, dueDate: due.toISOString(), givenDate: given ? due.toISOString() : undefined, status: given ? "completed" : "pending" };
});
await exportImmunizationCard({ id:"1", userId:"u", regNo:"IMU-20260720-UAVA3-4925", name:"NASARE SURAJ RAYAN", dateOfBirth: dob.toISOString(), sex:"Male", motherName:"ANJINCHIE RASHIDA", telephoneAddress:"0248337838", community:"Fian", registeredAt:new Date().toISOString(), vaccines } as any);
console.log("ok");
