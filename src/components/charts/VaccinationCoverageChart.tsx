import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Child } from "@/types/child";

interface VaccinationCoverageChartProps {
  children: Child[];
}

const VACCINE_GROUPS = [
  { key: "BCG", label: "BCG" },
  { key: "OPV", label: "OPV" },
  { key: "Penta", label: "Penta" },
  { key: "PCV", label: "PCV" },
  { key: "Rotavirus", label: "Rota" },
  { key: "IPV", label: "IPV" },
  { key: "Measles", label: "MR" },
  { key: "Malaria", label: "Malaria" },
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

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
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
  );
}
