import { useMemo, useState, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Download, Filter } from "lucide-react";
import { toPng } from "html-to-image";
import { Child } from "@/types/child";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface VaccinationCoverageChartProps {
  children: Child[];
}

const VACCINE_CATEGORIES = {
  all: { label: "All Vaccines", vaccines: [] as string[] },
  birth: { label: "Birth Vaccines", vaccines: ["BCG", "OPV 0"] },
  "6weeks": { label: "6 Week Vaccines", vaccines: ["OPV 1", "Penta 1", "PCV 1", "Rotavirus 1"] },
  "10weeks": { label: "10 Week Vaccines", vaccines: ["OPV 2", "Penta 2", "PCV 2", "Rotavirus 2"] },
  "14weeks": { label: "14 Week Vaccines", vaccines: ["OPV 3", "Penta 3", "PCV 3", "Rotavirus 3", "IPV 1"] },
  "6months": { label: "6 Month Vaccines", vaccines: ["Vitamin A"] },
  "9months": { label: "9 Month Vaccines", vaccines: ["Measles-Rubella 1", "Malaria 1", "Yellow Fever", "Meningitis"] },
  "12months": { label: "12 Month Vaccines", vaccines: ["Malaria 2"] },
  "15months": { label: "15 Month Vaccines", vaccines: ["Malaria 3", "IPV 2"] },
  "18months": { label: "18 Month Vaccines", vaccines: ["Measles-Rubella 2", "Malaria 4"] },
};

const ALL_VACCINES = [
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredVaccines = useMemo(() => {
    if (selectedCategory === "all") {
      return ALL_VACCINES;
    }
    const category = VACCINE_CATEGORIES[selectedCategory as keyof typeof VACCINE_CATEGORIES];
    return ALL_VACCINES.filter(v => category.vaccines.includes(v.key));
  }, [selectedCategory]);

  const data = useMemo(() => {
    return filteredVaccines.map(group => {
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
  }, [children, filteredVaccines]);

  const getBarColor = (coverage: number) => {
    if (coverage >= 90) return "hsl(152, 69%, 31%)";
    if (coverage >= 70) return "hsl(38, 92%, 50%)";
    return "hsl(0, 72%, 51%)";
  };

  const handleExportImage = async () => {
    if (!chartRef.current) return;

    try {
      const dataUrl = await toPng(chartRef.current, {
        backgroundColor: "#ffffff",
        quality: 1,
        pixelRatio: 2,
      });

      const link = document.createElement("a");
      link.download = `vaccination-coverage-${selectedCategory}-${new Date().toISOString().split('T')[0]}.png`;
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

  // Calculate chart width based on number of vaccines (50px per bar minimum)
  const chartWidth = Math.max(data.length * 50, 600);

  return (
    <div className="flex flex-col gap-3">
      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VACCINE_CATEGORIES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={handleExportImage}>
          <Download className="w-4 h-4 mr-2" />
          Export as Image
        </Button>
      </div>

      {/* Chart container for export */}
      <div ref={chartRef} className="bg-background p-4 rounded-lg">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs justify-center mb-3">
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

        {/* Category label */}
        <p className="text-sm font-medium text-center text-foreground mb-2">
          {VACCINE_CATEGORIES[selectedCategory as keyof typeof VACCINE_CATEGORIES].label}
        </p>

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
      </div>

      {/* Scroll hint for mobile */}
      <p className="text-xs text-muted-foreground text-center md:hidden">
        ← Scroll horizontally to see all vaccines →
      </p>
    </div>
  );
}
