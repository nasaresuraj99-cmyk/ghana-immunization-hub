import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Child } from "@/types/child";

interface MonthlyTrendsChartProps {
  children: Child[];
}

export function MonthlyTrendsChart({ children }: MonthlyTrendsChartProps) {
  const data = useMemo(() => {
    const monthlyData: Record<string, { month: string; vaccinations: number; registrations: number }> = {};
    const today = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(date.getMonth() - i);
      const key = date.toISOString().slice(0, 7);
      const monthName = date.toLocaleDateString("en-US", { month: "short" });
      monthlyData[key] = { month: monthName, vaccinations: 0, registrations: 0 };
    }

    children.forEach(child => {
      // Count registrations
      const regMonth = child.registeredAt.slice(0, 7);
      if (monthlyData[regMonth]) {
        monthlyData[regMonth].registrations++;
      }

      // Count vaccinations
      child.vaccines.forEach(vaccine => {
        if (vaccine.givenDate) {
          const vaccMonth = vaccine.givenDate.slice(0, 7);
          if (monthlyData[vaccMonth]) {
            monthlyData[vaccMonth].vaccinations++;
          }
        }
      });
    });

    return Object.values(monthlyData);
  }, [children]);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--card))", 
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px"
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: "12px" }}
          />
          <Line 
            type="monotone" 
            dataKey="vaccinations" 
            name="Vaccinations"
            stroke="hsl(152, 69%, 31%)" 
            strokeWidth={2}
            dot={{ fill: "hsl(152, 69%, 31%)", r: 4 }}
          />
          <Line 
            type="monotone" 
            dataKey="registrations" 
            name="Registrations"
            stroke="hsl(199, 89%, 48%)" 
            strokeWidth={2}
            dot={{ fill: "hsl(199, 89%, 48%)", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
