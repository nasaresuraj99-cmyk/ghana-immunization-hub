import { useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarIcon,
  Search,
  FileText,
  Download,
  TrendingUp,
  Users,
  MapPin,
  Syringe,
  Filter,
  Clock,
  BarChart3,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { Child, VaccineRecord } from "@/types/child";
import { cn, formatDate } from "@/lib/utils";
import { getAllVaccineNames } from "@/lib/ghanaEpiSchedule";
import { exportOutreachSessionReport, OutreachVaccinationRecord } from "@/lib/pdfExport";

interface OutreachHistorySectionProps {
  children: Child[];
  facilityName?: string;
  onBack?: () => void;
}

interface OutreachSession {
  sessionId: string;
  sessionDate: string;
  outreachSite: string;
  vaccineName: string;
  batchNumber: string;
  totalChildren: number;
  maleCount: number;
  femaleCount: number;
  vaccinations: Array<{
    childId: string;
    childName: string;
    regNo: string;
    motherName: string;
    community?: string;
    dateOfBirth: string;
  }>;
}

// Extract outreach sessions from vaccine records
function extractOutreachSessions(children: Child[]): OutreachSession[] {
  const sessionsMap = new Map<string, OutreachSession>();

  children.forEach(child => {
    child.vaccines.forEach(vaccine => {
      // Check if vaccine was given (has givenDate) and has an outreach session ID
      if (vaccine.givenDate && vaccine.outreachSessionId) {
        const sessionId = vaccine.outreachSessionId;
        
        if (!sessionsMap.has(sessionId)) {
          sessionsMap.set(sessionId, {
            sessionId,
            sessionDate: vaccine.givenDate || '',
            outreachSite: vaccine.outreachSite || 'Unknown Site',
            vaccineName: vaccine.name,
            batchNumber: vaccine.batchNumber || '',
            totalChildren: 0,
            maleCount: 0,
            femaleCount: 0,
            vaccinations: [],
          });
        }

        const session = sessionsMap.get(sessionId)!;
        session.totalChildren++;
        
        const sex = child.sex?.toLowerCase();
        if (sex === 'male' || sex === 'm') {
          session.maleCount++;
        } else if (sex === 'female' || sex === 'f') {
          session.femaleCount++;
        }

        session.vaccinations.push({
          childId: child.id,
          childName: child.name,
          regNo: child.regNo,
          motherName: child.motherName,
          community: child.community,
          dateOfBirth: child.dateOfBirth,
        });
      }
    });
  });

  return Array.from(sessionsMap.values()).sort((a, b) => 
    new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
  );
}

// Get unique communities from sessions
function getUniqueSites(sessions: OutreachSession[]): string[] {
  const sites = new Set<string>();
  sessions.forEach(session => {
    if (session.outreachSite && session.outreachSite !== 'Unknown Site') {
      sites.add(session.outreachSite);
    }
  });
  return Array.from(sites).sort();
}

export function OutreachHistorySection({ 
  children, 
  facilityName = "Health Facility",
  onBack 
}: OutreachHistorySectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVaccine, setSelectedVaccine] = useState<string>("all");
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"all" | "month" | "3months" | "6months" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const allVaccines = useMemo(() => getAllVaccineNames(), []);
  const allSessions = useMemo(() => extractOutreachSessions(children), [children]);
  const uniqueSites = useMemo(() => getUniqueSites(allSessions), [allSessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let sessions = [...allSessions];

    // Filter by vaccine
    if (selectedVaccine !== "all") {
      sessions = sessions.filter(s => s.vaccineName === selectedVaccine);
    }

    // Filter by site
    if (selectedSite !== "all") {
      sessions = sessions.filter(s => 
        s.outreachSite.toLowerCase() === selectedSite.toLowerCase()
      );
    }

    // Filter by date range
    const now = new Date();
    if (dateRange !== "all" && dateRange !== "custom") {
      let startDate: Date;
      if (dateRange === "month") {
        startDate = startOfMonth(now);
      } else if (dateRange === "3months") {
        startDate = startOfMonth(subMonths(now, 2));
      } else {
        startDate = startOfMonth(subMonths(now, 5));
      }
      const endDate = endOfMonth(now);
      
      sessions = sessions.filter(s => {
        const sessionDate = parseISO(s.sessionDate);
        return isWithinInterval(sessionDate, { start: startDate, end: endDate });
      });
    } else if (dateRange === "custom" && customStartDate && customEndDate) {
      sessions = sessions.filter(s => {
        const sessionDate = parseISO(s.sessionDate);
        return isWithinInterval(sessionDate, { start: customStartDate, end: customEndDate });
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      sessions = sessions.filter(s => 
        s.sessionId.toLowerCase().includes(term) ||
        s.outreachSite.toLowerCase().includes(term) ||
        s.vaccineName.toLowerCase().includes(term) ||
        s.batchNumber.toLowerCase().includes(term) ||
        s.vaccinations.some(v => 
          v.childName.toLowerCase().includes(term) ||
          v.regNo.toLowerCase().includes(term)
        )
      );
    }

    return sessions;
  }, [allSessions, selectedVaccine, selectedSite, dateRange, customStartDate, customEndDate, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const totalVaccinations = filteredSessions.reduce((acc, s) => acc + s.totalChildren, 0);
    const totalMales = filteredSessions.reduce((acc, s) => acc + s.maleCount, 0);
    const totalFemales = filteredSessions.reduce((acc, s) => acc + s.femaleCount, 0);
    
    // Vaccines breakdown
    const vaccineBreakdown: Record<string, number> = {};
    filteredSessions.forEach(s => {
      vaccineBreakdown[s.vaccineName] = (vaccineBreakdown[s.vaccineName] || 0) + s.totalChildren;
    });

    // Sites breakdown
    const siteBreakdown: Record<string, number> = {};
    filteredSessions.forEach(s => {
      siteBreakdown[s.outreachSite] = (siteBreakdown[s.outreachSite] || 0) + s.totalChildren;
    });

    // Monthly trend (last 6 months)
    const monthlyTrend: Record<string, number> = {};
    filteredSessions.forEach(s => {
      const month = format(parseISO(s.sessionDate), 'MMM yyyy');
      monthlyTrend[month] = (monthlyTrend[month] || 0) + s.totalChildren;
    });

    return { 
      totalSessions, 
      totalVaccinations, 
      totalMales, 
      totalFemales,
      vaccineBreakdown,
      siteBreakdown,
      monthlyTrend
    };
  }, [filteredSessions]);

  const handleExportSession = (session: OutreachSession) => {
    const records: OutreachVaccinationRecord[] = session.vaccinations.map(v => ({
      childId: v.childId,
      childName: v.childName,
      regNo: v.regNo,
      motherName: v.motherName,
      community: v.community,
      vaccine: session.vaccineName,
      dateGiven: session.sessionDate,
      batchNumber: session.batchNumber,
      dateOfBirth: v.dateOfBirth,
    }));

    exportOutreachSessionReport(records, {
      sessionId: session.sessionId,
      vaccineName: session.vaccineName,
      sessionDate: session.sessionDate,
      batchNumber: session.batchNumber,
      outreachSite: session.outreachSite,
      totalChildren: session.totalChildren,
      totalMales: session.maleCount,
      totalFemales: session.femaleCount,
    }, { facilityName });
  };

  const handleExportAll = () => {
    // Export all filtered sessions summary
    const summaryData = filteredSessions.map(s => ({
      sessionId: s.sessionId,
      date: formatDate(parseISO(s.sessionDate)),
      site: s.outreachSite,
      vaccine: s.vaccineName,
      batch: s.batchNumber,
      total: s.totalChildren,
      males: s.maleCount,
      females: s.femaleCount,
    }));

    // Create CSV
    const headers = ['Session ID', 'Date', 'Site', 'Vaccine', 'Batch', 'Total', 'Males', 'Females'];
    const rows = summaryData.map(s => [
      s.sessionId, s.date, s.site, s.vaccine, s.batch, s.total, s.males, s.females
    ].join(','));
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outreach-sessions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg gradient-ghs">
                <Clock className="w-5 h-5 text-primary-foreground" />
              </div>
              Outreach Session History
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              View, filter, and export past outreach vaccination sessions
            </p>
          </div>
        </div>
        
        <Button onClick={handleExportAll} disabled={filteredSessions.length === 0} className="gradient-ghs text-primary-foreground">
          <Download className="w-4 h-4 mr-2" />
          Export All ({filteredSessions.length})
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Vaccinations</p>
                <p className="text-2xl font-bold">{stats.totalVaccinations}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Males</p>
                <p className="text-2xl font-bold">{stats.totalMales}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-pink-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Females</p>
                <p className="text-2xl font-bold">{stats.totalFemales}</p>
              </div>
              <Users className="w-8 h-8 text-pink-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Overview */}
      {Object.keys(stats.vaccineBreakdown).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vaccine Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Syringe className="w-4 h-4" />
                Vaccines Administered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.vaccineBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([vaccine, count]) => (
                    <div key={vaccine} className="flex items-center justify-between">
                      <span className="text-sm">{vaccine}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ 
                              width: `${Math.min(100, (count / stats.totalVaccinations) * 100)}%` 
                            }}
                          />
                        </div>
                        <Badge variant="secondary" className="text-xs min-w-[40px] justify-center">
                          {count}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Site Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Top Outreach Sites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.siteBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([site, count]) => (
                    <div key={site} className="flex items-center justify-between">
                      <span className="text-sm truncate max-w-[150px]">{site}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ 
                              width: `${Math.min(100, (count / stats.totalVaccinations) * 100)}%` 
                            }}
                          />
                        </div>
                        <Badge variant="secondary" className="text-xs min-w-[40px] justify-center">
                          {count}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Session ID, site, child..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>

            {/* Vaccine Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Vaccine</Label>
              <Select value={selectedVaccine} onValueChange={setSelectedVaccine}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All vaccines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vaccines</SelectItem>
                  {allVaccines.map(vaccine => (
                    <SelectItem key={vaccine} value={vaccine}>{vaccine}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Site Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Outreach Site</Label>
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {uniqueSites.map(site => (
                    <SelectItem key={site} value={site}>{site}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-1.5">
              <Label className="text-xs">Date Range</Label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-start text-left h-9">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'dd MMM yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-start text-left h-9">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'dd MMM yyyy') : 'Pick date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      disabled={(date) => customStartDate ? date < customStartDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Session Records
            <Badge variant="secondary" className="ml-2">{filteredSessions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredSessions.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No outreach sessions found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Conduct an outreach session to see history here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">M/F</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map(session => (
                    <>
                      <TableRow 
                        key={session.sessionId}
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          expandedSession === session.sessionId && "bg-muted/50"
                        )}
                        onClick={() => setExpandedSession(
                          expandedSession === session.sessionId ? null : session.sessionId
                        )}
                      >
                        <TableCell className="font-medium">
                          {formatDate(parseISO(session.sessionDate))}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {session.outreachSite}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{session.vaccineName}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {session.batchNumber}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {session.totalChildren}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <span className="text-blue-600">{session.maleCount}</span>
                          /
                          <span className="text-pink-600">{session.femaleCount}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportSession(session);
                            }}
                            className="h-8"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Details */}
                      {expandedSession === session.sessionId && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  Session ID: {session.sessionId}
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {session.totalChildren} children vaccinated
                                </Badge>
                              </div>
                              <ScrollArea className="h-[200px]">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {session.vaccinations.map(v => (
                                    <div 
                                      key={v.childId}
                                      className="p-2 rounded-lg bg-background border text-xs"
                                    >
                                      <p className="font-medium truncate">{v.childName}</p>
                                      <p className="text-muted-foreground">{v.regNo}</p>
                                      <p className="text-muted-foreground truncate">{v.motherName}</p>
                                      {v.community && (
                                        <p className="text-muted-foreground flex items-center gap-1 mt-1">
                                          <MapPin className="w-3 h-3" />
                                          {v.community}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
