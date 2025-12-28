import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Child } from "@/types/child";

interface VaccinationCoverageChartProps {
  children: Child[];
}

const VACCINE_GROUPS = [
  { key: "BCG", label: "BCG" },
  { key: "OPV 0", label: "OPV0" },
  { key: "OPV 1", label: "OPV1" },
  { key: "OPV 2", label: "OPV2" },
  { key: "OPV 3", label: "OPV3" },
  { key: "Penta 1", label: "Penta1" },
  { key: "Penta 2", label: "Penta2" },
  { key: "Penta 3", label: "Penta3" },
  { key: "PCV 1", label: "PCV1" },
  { key: "PCV 2", label: "PCV2" },
  { key: "PCV 3", label: "PCV3" },
  { key: "Rotavirus 1", label: "Rota1" },
  { key: "Rotavirus 2", label: "Rota2" },
  { key: "Rotavirus 3", label: "Rota3" },
  { key: "IPV 1", label: "IPV1" },
  { key: "IPV 2", label: "IPV2" },
  { key: "Measles-Rubella 1", label: "MR1" },
  { key: "Measles-Rubella 2", label: "MR2" },
  { key: "Malaria 1", label: "Mal1" },
  { key: "Malaria 2", label: "Mal2" },
  { key: "Malaria 3", label: "Mal3" },
  { key: "Malaria 4", label: "Mal4" },
  { key: "Vitamin A", label: "VitA" },
  { key: "Yellow Fever", label: "YF" },
  { key: "Meningitis", label: "Men" },
];

export function VaccinationCoverageChart({ children }: VaccinationCoverageChartProps) {
  const data = useMemo(() => {
    return VACCINE_GROUPS.map(group => {
      let totalDoses = 0;
      let completedDoses = 0;

      children.forEach(child => {
        child.vaccines.forEach(vaccine => {
          if (vaccine.name.includes(group.key)) {
            totalDoses++;
            if (vaccine.status === "completed") {
              completedDoses++;
            }
          }
        });
      });

      const coverage = totalDoses > 0 ? Math.round((completedDoses / totalDoses) * 100) : 0;

      return {
        name: group.label,
        coverage,
        completed: completedDoses,
        total: totalDoses,
      };
    });
  }, [children]);

  const getBarColor = (coverage: number) => {
    if (coverage >= 90) return "hsl(152, 69%, 31%)";
    if (coverage >= 70) return "hsl(38, 92%, 50%)";
    return "hsl(0, 72%, 51%)";
  };

  // Calculate chart width based on number of vaccines (50px per bar minimum)
  const chartWidth = Math.max(data.length * 50, 600);

  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(152, 69%, 31%)" }} />
          <span className="text-muted-foreground">≥90% (High)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(38, 92%, 50%)" }} />
          <span className="text-muted-foreground">70-89% (Medium)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(0, 72%, 51%)" }} />
          <span className="text-muted-foreground">&lt;70% (Low)</span>
        </div>
      </div>

      {/* Scrollable chart container */}
      <div className="h-64 overflow-x-auto scrollbar-thin">
        <div style={{ width: chartWidth, height: "100%", minWidth: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px"
                }}
                formatter={(value: number, name: string, props: any) => [
                  `${value}% (${props.payload.completed}/${props.payload.total})`,
                  "Coverage"
                ]}
              />
              <Bar dataKey="coverage" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.coverage)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scroll hint for mobile */}
      <p className="text-xs text-muted-foreground text-center md:hidden">
        ← Scroll horizontally to see all vaccines →
      </p>
    </div>
  );
}
