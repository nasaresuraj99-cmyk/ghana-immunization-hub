import { useMemo } from "react";
import { Syringe, Check, Clock, AlertTriangle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ImmunizationScheduleSectionProps {
  onBack?: () => void;
}

// Ghana EPI Schedule
const IMMUNIZATION_SCHEDULE = [
  {
    age: "At Birth",
    vaccines: [
      { name: "BCG", description: "Protects against tuberculosis" },
      { name: "OPV0", description: "Oral Polio Vaccine - first dose" },
      { name: "Hepatitis B", description: "Birth dose for Hepatitis B" },
    ],
  },
  {
    age: "6 Weeks",
    vaccines: [
      { name: "OPV1", description: "Oral Polio Vaccine - second dose" },
      { name: "Penta1", description: "DTP-HepB-Hib combination vaccine" },
      { name: "PCV1", description: "Pneumococcal Conjugate Vaccine" },
      { name: "Rotavirus1", description: "Rotavirus vaccine first dose" },
    ],
  },
  {
    age: "10 Weeks",
    vaccines: [
      { name: "OPV2", description: "Oral Polio Vaccine - third dose" },
      { name: "Penta2", description: "DTP-HepB-Hib second dose" },
      { name: "PCV2", description: "Pneumococcal second dose" },
      { name: "Rotavirus2", description: "Rotavirus vaccine second dose" },
    ],
  },
  {
    age: "14 Weeks",
    vaccines: [
      { name: "OPV3", description: "Oral Polio Vaccine - fourth dose" },
      { name: "Penta3", description: "DTP-HepB-Hib third dose" },
      { name: "PCV3", description: "Pneumococcal third dose" },
      { name: "Rotavirus3", description: "Rotavirus vaccine third dose" },
      { name: "IPV1", description: "Inactivated Polio Vaccine" },
    ],
  },
  {
    age: "6 Months",
    vaccines: [
      { name: "Malaria1 (RTS,S)", description: "Malaria vaccine first dose" },
      { name: "Vitamin A", description: "Vitamin A supplementation" },
    ],
  },
  {
    age: "7 Months",
    vaccines: [
      { name: "Malaria2 (RTS,S)", description: "Malaria vaccine second dose" },
      { name: "IPV2", description: "Inactivated Polio Vaccine second dose" },
    ],
  },
  {
    age: "9 Months",
    vaccines: [
      { name: "Malaria3 (RTS,S)", description: "Malaria vaccine third dose" },
      { name: "Measles Rubella 1", description: "MR first dose" },
    ],
  },
  {
    age: "12 Months",
    vaccines: [
      { name: "Vitamin A", description: "Vitamin A supplementation" },
    ],
  },
  {
    age: "18 Months",
    vaccines: [
      { name: "Malaria4 (RTS,S)", description: "Malaria vaccine fourth dose" },
      { name: "Measles Rubella 2", description: "MR second dose" },
      { name: "Men A", description: "Meningococcal A conjugate vaccine" },
      { name: "LLIN", description: "Long-lasting insecticidal net" },
      { name: "Vitamin A", description: "Vitamin A supplementation" },
    ],
  },
  {
    age: "24-60 Months",
    vaccines: [
      { name: "Vitamin A", description: "Every 6 months until 5 years" },
    ],
  },
];

export function ImmunizationScheduleSection({ onBack }: ImmunizationScheduleSectionProps) {
  const totalVaccines = useMemo(() => {
    return IMMUNIZATION_SCHEDULE.reduce((sum, group) => sum + group.vaccines.length, 0);
  }, []);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-card rounded-xl p-6 shadow-elevation-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Ghana EPI Immunization Schedule
          </h2>
          <Badge variant="secondary" className="text-sm">
            {totalVaccines} vaccines
          </Badge>
        </div>

        <p className="text-muted-foreground mb-6">
          Complete immunization schedule for children from birth to 5 years as per Ghana Health Service guidelines.
        </p>

        <div className="space-y-4">
          {IMMUNIZATION_SCHEDULE.map((ageGroup, idx) => (
            <div 
              key={ageGroup.age}
              className="border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{idx + 1}</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{ageGroup.age}</h3>
                  <p className="text-xs text-muted-foreground">
                    {ageGroup.vaccines.length} vaccine{ageGroup.vaccines.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              <div className="divide-y divide-border">
                {ageGroup.vaccines.map((vaccine) => (
                  <div 
                    key={vaccine.name}
                    className="px-5 py-3 flex items-center gap-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                      <Syringe className="w-4 h-4 text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{vaccine.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{vaccine.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-3">Vaccine Status Legend</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-info" />
              <span className="text-sm">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-sm">Due Soon</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-sm">Overdue</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6 p-4 border border-warning/30 bg-warning/5 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Important Notes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Vitamin A supplementation continues every 6 months from 6 months to 59 months</li>
                <li>BCG can be given up to 12 months if missed at birth</li>
                <li>Catch-up immunization available for missed doses</li>
                <li>Always check contraindications before administration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
