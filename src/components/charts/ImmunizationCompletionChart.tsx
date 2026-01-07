import { useMemo, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Download } from "lucide-react";
import { toPng } from "html-to-image";
import { Child } from "@/types/child";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ImmunizationCompletionChartProps {
  children: Child[];
}

const COLORS = {
  fullyImmunized: "hsl(152, 69%, 31%)",   // Green
  partiallyImmunized: "hsl(38, 92%, 50%)", // Orange/Warning
  notStarted: "hsl(0, 72%, 51%)",          // Red
};

export function ImmunizationCompletionChart({ children }: ImmunizationCompletionChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const completionData = useMemo(() => {
    let fullyImmunized = 0;
    let partiallyImmunized = 0;
    let notStarted = 0;

    children.forEach(child => {
      const totalVaccines = child.vaccines.length;
      const completedVaccines = child.vaccines.filter(v => v.status === "completed").length;
      
      if (totalVaccines === 0) {
        notStarted++;
      } else if (completedVaccines === totalVaccines) {
        fullyImmunized++;
      } else if (completedVaccines > 0) {
        partiallyImmunized++;
      } else {
        notStarted++;
      }
    });

    return [
      { name: "Fully Immunized", value: fullyImmunized, color: COLORS.fullyImmunized },
      { name: "Partially Immunized", value: partiallyImmunized, color: COLORS.partiallyImmunized },
      { name: "Not Started", value: notStarted, color: COLORS.notStarted },
    ].filter(item => item.value > 0);
  }, [children]);

  const totalChildren = children.length;
  const fullyImmunizedCount = completionData.find(d => d.name === "Fully Immunized")?.value || 0;
  const completionRate = totalChildren > 0 ? Math.round((fullyImmunizedCount / totalChildren) * 100) : 0;

  const handleExportImage = async () => {
    if (!chartRef.current) return;

    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: "#ffffff",
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `immunization-completion-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Chart exported",
        description: "The chart has been saved as an image.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not export the chart. Please try again.",
        variant: "destructive",
      });
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalChildren > 0 ? Math.round((data.value / totalChildren) * 100) : 0;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} children ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label for very small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>No children data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Overall Completion Rate</h3>
          <p className="text-sm text-muted-foreground">
            {completionRate}% fully immunized ({fullyImmunizedCount}/{totalChildren} children)
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportImage}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Chart container */}
      <div ref={chartRef} className="bg-background p-4 rounded-lg">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={completionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={100}
                innerRadius={40}
                paddingAngle={2}
                dataKey="value"
              >
                {completionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {completionData.map((item) => (
            <div
              key={item.name}
              className="text-center p-2 rounded-lg"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <p className="text-2xl font-bold" style={{ color: item.color }}>
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground">{item.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
