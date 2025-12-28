import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Child } from "@/types/child";

interface AgeDistributionChartProps {
  children: Child[];
}

const COLORS = [
  "hsl(152, 69%, 31%)",
  "hsl(199, 89%, 48%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 70%, 50%)",
  "hsl(0, 72%, 51%)",
];

const AGE_GROUPS = [
  { label: "0-6 months", min: 0, max: 6 },
  { label: "7-12 months", min: 7, max: 12 },
  { label: "13-24 months", min: 13, max: 24 },
  { label: "25-36 months", min: 25, max: 36 },
  { label: "37-59 months", min: 37, max: 59 },
];

export function AgeDistributionChart({ children }: AgeDistributionChartProps) {
  const data = useMemo(() => {
    const today = new Date();
    
    return AGE_GROUPS.map((group, index) => {
      const count = children.filter(child => {
        const birthDate = new Date(child.dateOfBirth);
        const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                       (today.getMonth() - birthDate.getMonth());
        return months >= group.min && months <= group.max;
      }).length;

      return {
        name: group.label,
        value: count,
        color: COLORS[index],
      };
    }).filter(item => item.value > 0);
  }, [children]);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))", 
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px"
            }}
            formatter={(value: number) => [`${value} children`, "Count"]}
          />
          <Legend 
            wrapperStyle={{ fontSize: "11px" }}
            layout="vertical"
            align="right"
            verticalAlign="middle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
