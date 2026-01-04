import { useMemo, useState } from "react";
import { MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Child } from "@/types/child";
import { cn } from "@/lib/utils";

interface CoverageMapWidgetProps {
  children: Child[];
}

interface CommunityData {
  name: string;
  totalChildren: number;
  fullyImmunized: number;
  partiallyImmunized: number;
  notStarted: number;
  coverageRate: number;
}

export function CoverageMapWidget({ children }: CoverageMapWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate coverage by community
  const communityData = useMemo(() => {
    const communityMap = new Map<string, CommunityData>();

    children.forEach(child => {
      const community = child.community || "Unknown";
      
      if (!communityMap.has(community)) {
        communityMap.set(community, {
          name: community,
          totalChildren: 0,
          fullyImmunized: 0,
          partiallyImmunized: 0,
          notStarted: 0,
          coverageRate: 0,
        });
      }

      const data = communityMap.get(community)!;
      data.totalChildren++;

      // Calculate immunization status
      const totalVaccines = child.vaccines.length;
      const completedVaccines = child.vaccines.filter(v => v.status === 'completed').length;
      
      if (completedVaccines === totalVaccines && totalVaccines > 0) {
        data.fullyImmunized++;
      } else if (completedVaccines > 0) {
        data.partiallyImmunized++;
      } else {
        data.notStarted++;
      }
    });

    // Calculate coverage rates
    communityMap.forEach(data => {
      if (data.totalChildren > 0) {
        data.coverageRate = Math.round(
          ((data.fullyImmunized + data.partiallyImmunized * 0.5) / data.totalChildren) * 100
        );
      }
    });

    return Array.from(communityMap.values())
      .sort((a, b) => b.totalChildren - a.totalChildren);
  }, [children]);

  const displayedCommunities = isExpanded ? communityData : communityData.slice(0, 5);

  const getCoverageColor = (rate: number) => {
    if (rate >= 80) return "bg-success";
    if (rate >= 60) return "bg-warning";
    return "bg-destructive";
  };

  const getCoverageBg = (rate: number) => {
    if (rate >= 80) return "bg-success/10 border-success/30";
    if (rate >= 60) return "bg-warning/10 border-warning/30";
    return "bg-destructive/10 border-destructive/30";
  };

  // Overall statistics
  const overallStats = useMemo(() => {
    const total = communityData.reduce((acc, c) => acc + c.totalChildren, 0);
    const fullyImmunized = communityData.reduce((acc, c) => acc + c.fullyImmunized, 0);
    const avgCoverage = total > 0
      ? Math.round(communityData.reduce((acc, c) => acc + c.coverageRate * c.totalChildren, 0) / total)
      : 0;
    
    return { total, fullyImmunized, avgCoverage, communities: communityData.length };
  }, [communityData]);

  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-sm">Coverage by Community</h3>
      </div>

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-card rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-primary">{overallStats.communities}</div>
          <div className="text-xs text-muted-foreground">Communities</div>
        </div>
        <div className="bg-card rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-success">{overallStats.avgCoverage}%</div>
          <div className="text-xs text-muted-foreground">Avg Coverage</div>
        </div>
        <div className="bg-card rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-info">{overallStats.fullyImmunized}</div>
          <div className="text-xs text-muted-foreground">Fully Immunized</div>
        </div>
      </div>

      {/* Visual Coverage Map */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-4">
        {displayedCommunities.map((community) => (
          <div
            key={community.name}
            className={cn(
              "relative rounded-lg p-2 border transition-all hover:scale-105 cursor-pointer",
              getCoverageBg(community.coverageRate)
            )}
            title={`${community.name}: ${community.coverageRate}% coverage (${community.totalChildren} children)`}
          >
            {/* Coverage indicator */}
            <div 
              className={cn(
                "absolute top-1 right-1 w-2 h-2 rounded-full",
                getCoverageColor(community.coverageRate)
              )}
            />
            
            <div className="text-xs font-medium truncate pr-3" title={community.name}>
              {community.name}
            </div>
            <div className="text-lg font-bold">
              {community.coverageRate}%
            </div>
            <div className="text-xs text-muted-foreground">
              {community.totalChildren} children
            </div>
            
            {/* Mini progress bar */}
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full transition-all", getCoverageColor(community.coverageRate))}
                style={{ width: `${community.coverageRate}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {communityData.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show All ({communityData.length} communities)
            </>
          )}
        </button>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-muted-foreground">High (≥80%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-muted-foreground">Medium (60-79%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-muted-foreground">Low (&lt;60%)</span>
        </div>
      </div>
    </div>
  );
}
