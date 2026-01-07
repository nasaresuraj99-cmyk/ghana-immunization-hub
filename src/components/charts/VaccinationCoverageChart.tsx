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

// Vaccine keys matching the actual names stored in the database (from useChildren.ts getVaccineSchedule)
const ALL_VACCINES = [
  { key: "BCG", label: "BCG", patterns: ["BCG at Birth", "BCG"] },
  { key: "OPV0", label: "OPV0", patterns: ["OPV0 at Birth", "OPV0"] },
  { key: "Hepatitis B", label: "HepB", patterns: ["Hepatitis B at Birth", "Hepatitis B"] },
  { key: "OPV1", label: "OPV1", patterns: ["OPV1 at 6 weeks", "OPV1"] },
  { key: "OPV2", label: "OPV2", patterns: ["OPV2 at 10 weeks", "OPV2"] },
  { key: "OPV3", label: "OPV3", patterns: ["OPV3 at 14 weeks", "OPV3"] },
  { key: "Penta1", label: "Penta1", patterns: ["Penta1 at 6 weeks", "Penta1"] },
  { key: "Penta2", label: "Penta2", patterns: ["Penta2 at 10 weeks", "Penta2"] },
  { key: "Penta3", label: "Penta3", patterns: ["Penta3 at 14 weeks", "Penta3"] },
  { key: "PCV1", label: "PCV1", patterns: ["PCV1 at 6 weeks", "PCV1"] },
  { key: "PCV2", label: "PCV2", patterns: ["PCV2 at 10 weeks", "PCV2"] },
  { key: "PCV3", label: "PCV3", patterns: ["PCV3 at 14 weeks", "PCV3"] },
  { key: "Rotavirus1", label: "Rota1", patterns: ["Rotavirus1 at 6 weeks", "Rotavirus1"] },
  { key: "Rotavirus2", label: "Rota2", patterns: ["Rotavirus2 at 10 weeks", "Rotavirus2"] },
  { key: "Rotavirus3", label: "Rota3", patterns: ["Rotavirus3 at 14 weeks", "Rotavirus3"] },
  { key: "IPV1", label: "IPV1", patterns: ["IPV1 at 14 weeks", "IPV1"] },
  { key: "IPV2", label: "IPV2", patterns: ["IPV2 at 7 months", "IPV2"] },
  { key: "Malaria1", label: "Mal1", patterns: ["Malaria1 at 6 months", "Malaria1"] },
  { key: "Malaria2", label: "Mal2", patterns: ["Malaria2 at 7 months", "Malaria2"] },
  { key: "Malaria3", label: "Mal3", patterns: ["Malaria3 at 9 months", "Malaria3"] },
  { key: "Malaria4", label: "Mal4", patterns: ["Malaria4 at 18 months", "Malaria4"] },
  { key: "Measles Rubella1", label: "MR1", patterns: ["Measles Rubella1 at 9 months", "Measles Rubella1"] },
  { key: "Measles Rubella2", label: "MR2", patterns: ["Measles Rubella2 at 18 months", "Measles Rubella2"] },
  { key: "Men A", label: "MenA", patterns: ["Men A at 18 months", "Men A"] },
];

// Helper to match vaccine name from database to our chart keys
const matchVaccineName = (vaccineName: string, patterns: string[]): boolean => {
  const normalizedName = vaccineName.toLowerCase().trim();
  return patterns.some(pattern => normalizedName === pattern.toLowerCase().trim());
};

export function VaccinationCoverageChart({ children }: VaccinationCoverageChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const chartRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filteredVaccines = useMemo(() => {
    if (selectedCategory === "all") {
      return ALL_VACCINES;
    }
    const category = VACCINE_CATEGORIES[selectedCategory as keyof typeof VACCINE_CATEGORIES];
    // Match category vaccines to our ALL_VACCINES by checking if key starts with any category vaccine
    return ALL_VACCINES.filter(v => 
      category.vaccines.some(cv => v.key.toLowerCase().startsWith(cv.toLowerCase().replace(/\s+/g, '')))
    );
  }, [selectedCategory]);

  const data = useMemo(() => {
    return filteredVaccines.map(group => {
      let totalEligible = 0;
      let completedDoses = 0;

      children.forEach(child => {
        // Find the vaccine in this child's record that matches the group patterns
        const matchedVaccine = child.vaccines.find(vaccine => 
          matchVaccineName(vaccine.name, group.patterns)
        );

        if (matchedVaccine) {
          totalEligible++;
          if (matchedVaccine.status === "completed") {
            completedDoses++;
          }
        }
      });

      const coverage = totalEligible > 0 ? Math.round((completedDoses / totalEligible) * 100) : 0;

      return {
        name: group.label,
        coverage,
        completed: completedDoses,
        total: totalEligible,
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
