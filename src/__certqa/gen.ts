import { generateImmunizationCertificate } from "@/lib/certificateExport";
import { GHANA_EPI_VACCINES } from "@/lib/ghanaEpiSchedule";
import fs from "fs";

const dob = "2023-01-15";
const vaccines = GHANA_EPI_VACCINES.slice(0, 16).map((v, i) => ({
  name: v.name, dueDate: dob, givenDate: i % 3 === 0 ? "2023-03-20" : undefined,
  status: i % 3 === 0 ? "completed" : "pending",
}));
const child: any = {
  id: "abc123", userId: "u1", regNo: "IMU-20230115-U001-4821",
  name: "Abrafi Nyarko-Mensah Kwabena", dateOfBirth: dob, sex: "Female",
  motherName: "Comfort Adjeley Nyarko", telephoneAddress: "+233 24 123 4567",
  community: "Fian Zongo", registeredAt: dob, vaccines,
};

// capture pdf instead of browser save
const orig = (await import("jspdf")).default.prototype.save;
(await import("jspdf")).default.prototype.save = function (name: string) {
  fs.writeFileSync("/tmp/certqa/out.pdf", Buffer.from(this.output("arraybuffer")));
  return this;
};
await generateImmunizationCertificate(child);
console.log("done", fs.statSync("/tmp/certqa/out.pdf").size);
