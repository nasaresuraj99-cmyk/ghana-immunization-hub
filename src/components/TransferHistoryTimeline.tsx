import { useMemo } from "react";
import { 
  Plane, 
  Home, 
  MapPin, 
  Calendar, 
  ArrowRight,
  ArrowLeft,
  Clock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TransferRecord } from "@/types/child";
import { cn } from "@/lib/utils";

interface TransferHistoryTimelineProps {
  transferHistory?: TransferRecord[];
  currentStatus?: string;
  currentLocation?: string;
}

export function TransferHistoryTimeline({ 
  transferHistory = [], 
  currentStatus,
  currentLocation 
}: TransferHistoryTimelineProps) {
  const sortedHistory = useMemo(() => {
    return [...transferHistory].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
  }, [transferHistory]);

  if (sortedHistory.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
        <p>No transfer history recorded</p>
        <p className="text-sm mt-1">Child has remained at this facility</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status Banner */}
      {currentStatus && (currentStatus === 'traveled_out' || currentStatus === 'moved_out') && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-600">
              Currently {currentStatus === 'moved_out' ? 'Moved Out' : 'Traveled Out'}
            </span>
          </div>
          {currentLocation && (
            <p className="text-sm text-muted-foreground mt-1">
              Location: {currentLocation}
            </p>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-4">
          {sortedHistory.map((record, index) => {
            const isOut = record.type === 'out';
            const recordDate = new Date(record.recordedAt);
            
            return (
              <div key={index} className="relative pl-10">
                {/* Timeline dot */}
                <div 
                  className={cn(
                    "absolute left-2 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    isOut 
                      ? "bg-amber-100 border-amber-500" 
                      : "bg-green-100 border-green-500"
                  )}
                >
                  {isOut ? (
                    <ArrowRight className="w-3 h-3 text-amber-600" />
                  ) : (
                    <ArrowLeft className="w-3 h-3 text-green-600" />
                  )}
                </div>

                {/* Content card */}
                <div 
                  className={cn(
                    "rounded-lg p-4 border",
                    isOut 
                      ? "bg-amber-500/5 border-amber-500/20" 
                      : "bg-green-500/5 border-green-500/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {isOut ? (
                        <Plane className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Home className="w-4 h-4 text-green-600" />
                      )}
                      <span className={cn(
                        "font-medium",
                        isOut ? "text-amber-700" : "text-green-700"
                      )}>
                        {isOut ? 'Traveled/Moved Out' : 'Returned/Moved In'}
                      </span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        isOut 
                          ? "border-amber-500 text-amber-600" 
                          : "border-green-500 text-green-600"
                      )}
                    >
                      {isOut ? 'OUT' : 'IN'}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>
                        {isOut ? 'Destination: ' : 'From: '}
                        <span className="text-foreground font-medium">{record.location}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Date: <span className="text-foreground">{new Date(record.date).toLocaleDateString()}</span>
                      </span>
                    </div>

                    {record.reason && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-xs mt-0.5">📝</span>
                        <span>
                          Reason: <span className="text-foreground">{record.reason}</span>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <Clock className="w-3 h-3" />
                      <span>Recorded: {recordDate.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total movements:</span>
          <span className="font-medium">{sortedHistory.length}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-muted-foreground">Times traveled out:</span>
          <span className="font-medium text-amber-600">
            {sortedHistory.filter(r => r.type === 'out').length}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-muted-foreground">Times returned:</span>
          <span className="font-medium text-green-600">
            {sortedHistory.filter(r => r.type === 'in').length}
          </span>
        </div>
      </div>
    </div>
  );
}
