import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Download,
  FileText,
  BarChart3,
  Clock,
  Trash2,
  Package,
  TrendingDown,
  TrendingUp,
  Calendar
} from 'lucide-react';
import type { 
  VaccineInventory, 
  InventoryTransaction, 
  VaccineWastage 
} from '@/types/inventory';
import { format, parseISO, subDays, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';

interface InventoryReportsProps {
  inventory: VaccineInventory[];
  transactions: InventoryTransaction[];
  wastageRecords: VaccineWastage[];
  getStockSummary: () => Record<string, any>;
  getConsumptionRate: () => Record<string, number>;
  getWastageRate: () => { byType: Record<string, number>; byVaccine: Record<string, number>; totalWasted: number };
}

export function InventoryReports({
  inventory,
  transactions,
  wastageRecords,
  getStockSummary,
  getConsumptionRate,
  getWastageRate
}: InventoryReportsProps) {
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [activeReport, setActiveReport] = useState('stock_balance');

  const stockSummary = useMemo(() => getStockSummary(), [getStockSummary]);
  const consumptionRate = useMemo(() => getConsumptionRate(), [getConsumptionRate]);
  const wastageRate = useMemo(() => getWastageRate(), [getWastageRate]);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    end.setHours(23, 59, 59);
    
    return transactions.filter(t => {
      const txDate = parseISO(t.created_at);
      return isWithinInterval(txDate, { start, end });
    });
  }, [transactions, dateRange]);

  // Filter wastage by date range
  const filteredWastage = useMemo(() => {
    const start = parseISO(dateRange.start);
    const end = parseISO(dateRange.end);
    end.setHours(23, 59, 59);
    
    return wastageRecords.filter(w => {
      const wDate = parseISO(w.created_at);
      return isWithinInterval(wDate, { start, end });
    });
  }, [wastageRecords, dateRange]);

  // Calculate consumption by vaccine for date range
  const consumptionByVaccine = useMemo(() => {
    const consumption: Record<string, { administered: number; wasted: number; received: number }> = {};
    
    filteredTransactions.forEach(tx => {
      const invItem = inventory.find(i => i.id === tx.inventory_id);
      if (invItem) {
        const vaccineName = invItem.vaccine_name.split(' ')[0];
        if (!consumption[vaccineName]) {
          consumption[vaccineName] = { administered: 0, wasted: 0, received: 0 };
        }
        
        if (tx.transaction_type === 'administered') {
          consumption[vaccineName].administered += tx.quantity;
        } else if (tx.transaction_type === 'wasted' || tx.transaction_type === 'expired') {
          consumption[vaccineName].wasted += tx.quantity;
        } else if (tx.transaction_type === 'received') {
          consumption[vaccineName].received += tx.quantity;
        }
      }
    });
    
    return consumption;
  }, [filteredTransactions, inventory]);

  // Wastage analysis
  const wastageAnalysis = useMemo(() => {
    const byType: Record<string, number> = {};
    const byVaccine: Record<string, number> = {};
    let total = 0;

    filteredWastage.forEach(w => {
      byType[w.wastage_type] = (byType[w.wastage_type] || 0) + w.quantity;
      
      const invItem = inventory.find(i => i.id === w.inventory_id);
      if (invItem) {
        const vaccineName = invItem.vaccine_name.split(' ')[0];
        byVaccine[vaccineName] = (byVaccine[vaccineName] || 0) + w.quantity;
      }
      
      total += w.quantity;
    });

    return { byType, byVaccine, total };
  }, [filteredWastage, inventory]);

  // Export functions
  const exportStockBalance = () => {
    const csvContent = [
      ['Vaccine', 'Total Stock', 'Active Batches', 'Near Expiry', 'Expired', 'Status'].join(','),
      ...Object.entries(stockSummary).map(([vaccine, data]: [string, any]) => {
        let status = 'In Stock';
        if (data.outOfStock) status = 'Out of Stock';
        else if (data.criticalStock) status = 'Critical';
        else if (data.lowStock) status = 'Low';
        
        return [
          vaccine,
          data.total,
          data.batches,
          data.nearExpiry,
          data.expired,
          status
        ].join(',');
      })
    ].join('\n');

    downloadCSV(csvContent, 'stock-balance-report');
  };

  const exportConsumption = () => {
    const csvContent = [
      ['Vaccine', 'Administered', 'Wasted', 'Received', 'Net Change'].join(','),
      ...Object.entries(consumptionByVaccine).map(([vaccine, data]) => {
        const netChange = data.received - data.administered - data.wasted;
        return [
          vaccine,
          data.administered,
          data.wasted,
          data.received,
          netChange
        ].join(',');
      })
    ].join('\n');

    downloadCSV(csvContent, 'consumption-report');
  };

  const exportWastage = () => {
    const csvContent = [
      ['Date', 'Vaccine', 'Batch', 'Quantity', 'Type', 'Reason', 'Notes'].join(','),
      ...filteredWastage.map(w => {
        const invItem = inventory.find(i => i.id === w.inventory_id);
        return [
          format(parseISO(w.created_at), 'yyyy-MM-dd HH:mm'),
          invItem?.vaccine_name || 'Unknown',
          invItem?.batch_number || '',
          w.quantity,
          w.wastage_type,
          `"${w.reason.replace(/"/g, '""')}"`,
          `"${(w.notes || '').replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    downloadCSV(csvContent, 'wastage-report');
  };

  const exportAuditTrail = () => {
    const csvContent = [
      ['Date', 'Vaccine', 'Batch', 'Transaction Type', 'Quantity', 'Old Qty', 'New Qty', 'Reason'].join(','),
      ...filteredTransactions.map(tx => {
        const invItem = inventory.find(i => i.id === tx.inventory_id);
        return [
          format(parseISO(tx.created_at), 'yyyy-MM-dd HH:mm:ss'),
          invItem?.vaccine_name || 'Unknown',
          tx.batch_number || invItem?.batch_number || '',
          tx.transaction_type,
          tx.quantity,
          tx.old_quantity || '',
          tx.new_quantity || '',
          `"${(tx.reason || '').replace(/"/g, '""')}"`
        ].join(',');
      })
    ].join('\n');

    downloadCSV(csvContent, 'audit-trail-report');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                  end: format(new Date(), 'yyyy-MM-dd')
                })}
              >
                Last 7 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                  end: format(new Date(), 'yyyy-MM-dd')
                })}
              >
                Last 30 days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDateRange({
                  start: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
                  end: format(new Date(), 'yyyy-MM-dd')
                })}
              >
                Last 90 days
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeReport} onValueChange={setActiveReport}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="stock_balance" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stock Balance
          </TabsTrigger>
          <TabsTrigger value="consumption" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Consumption
          </TabsTrigger>
          <TabsTrigger value="wastage" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Wastage
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* Stock Balance Report */}
        <TabsContent value="stock_balance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Stock Balance Report</CardTitle>
              <Button variant="outline" onClick={exportStockBalance}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vaccine</TableHead>
                      <TableHead className="text-center">Total Stock</TableHead>
                      <TableHead className="text-center">Batches</TableHead>
                      <TableHead className="text-center">Near Expiry</TableHead>
                      <TableHead className="text-center">Expired</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(stockSummary).map(([vaccine, data]: [string, any]) => (
                      <TableRow key={vaccine}>
                        <TableCell className="font-medium">{vaccine}</TableCell>
                        <TableCell className="text-center font-bold">{data.total}</TableCell>
                        <TableCell className="text-center">{data.batches}</TableCell>
                        <TableCell className="text-center">
                          {data.nearExpiry > 0 && (
                            <Badge className="bg-yellow-500">{data.nearExpiry}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {data.expired > 0 && (
                            <Badge variant="destructive">{data.expired}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {data.outOfStock ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : data.criticalStock ? (
                            <Badge className="bg-orange-500">Critical</Badge>
                          ) : data.lowStock ? (
                            <Badge className="bg-yellow-500">Low</Badge>
                          ) : (
                            <Badge className="bg-green-500">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consumption Report */}
        <TabsContent value="consumption">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Consumption Report ({format(parseISO(dateRange.start), 'dd MMM')} - {format(parseISO(dateRange.end), 'dd MMM yyyy')})</CardTitle>
              <Button variant="outline" onClick={exportConsumption}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vaccine</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          Received
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Administered</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          Wasted
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Net Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(consumptionByVaccine).map(([vaccine, data]) => {
                      const netChange = data.received - data.administered - data.wasted;
                      return (
                        <TableRow key={vaccine}>
                          <TableCell className="font-medium">{vaccine}</TableCell>
                          <TableCell className="text-center text-green-600">+{data.received}</TableCell>
                          <TableCell className="text-center">{data.administered}</TableCell>
                          <TableCell className="text-center text-red-600">{data.wasted}</TableCell>
                          <TableCell className="text-center">
                            <span className={netChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {netChange >= 0 ? '+' : ''}{netChange}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {Object.keys(consumptionByVaccine).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No transactions in selected date range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wastage Report */}
        <TabsContent value="wastage">
          <div className="grid gap-4 md:grid-cols-2 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Wastage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">{wastageAnalysis.total}</p>
                <p className="text-sm text-muted-foreground">doses in selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Wastage by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(wastageAnalysis.byType).map(([type, count]) => (
                    <Badge key={type} variant="outline">
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Wastage Records</CardTitle>
              <Button variant="outline" onClick={exportWastage}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vaccine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWastage.map(w => {
                      const invItem = inventory.find(i => i.id === w.inventory_id);
                      return (
                        <TableRow key={w.id}>
                          <TableCell>{format(parseISO(w.created_at), 'dd MMM yyyy')}</TableCell>
                          <TableCell>{invItem?.vaccine_name || 'Unknown'}</TableCell>
                          <TableCell className="font-mono text-xs">{invItem?.batch_number}</TableCell>
                          <TableCell className="text-center text-destructive font-medium">{w.quantity}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{w.wastage_type}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{w.reason}</TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredWastage.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No wastage records in selected date range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Report */}
        <TabsContent value="audit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inventory Audit Trail</CardTitle>
              <Button variant="outline" onClick={exportAuditTrail}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Vaccine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-center">Before → After</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map(tx => {
                      const invItem = inventory.find(i => i.id === tx.inventory_id);
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs">
                            {format(parseISO(tx.created_at), 'dd MMM yyyy HH:mm')}
                          </TableCell>
                          <TableCell>{invItem?.vaccine_name || 'Unknown'}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {tx.batch_number || invItem?.batch_number}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              tx.transaction_type === 'received' ? 'default' :
                              tx.transaction_type === 'administered' ? 'secondary' :
                              tx.transaction_type === 'returned' ? 'outline' :
                              'destructive'
                            }>
                              {tx.transaction_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={
                              ['received', 'adjusted', 'returned'].includes(tx.transaction_type) 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }>
                              {['received', 'adjusted', 'returned'].includes(tx.transaction_type) ? '+' : '-'}
                              {tx.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs">
                            {tx.old_quantity !== undefined && tx.new_quantity !== undefined ? (
                              <span>{tx.old_quantity} → {tx.new_quantity}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs">
                            {tx.reason || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredTransactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No transactions in selected date range
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
