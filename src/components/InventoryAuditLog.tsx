import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  History, 
  Search, 
  Download, 
  Filter,
  ArrowDown,
  ArrowUp,
  Package,
  Trash2,
  RefreshCw,
  Syringe,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import type { InventoryTransaction, VaccineInventory } from '@/types/inventory';
import { toast } from 'sonner';

interface InventoryAuditLogProps {
  transactions: InventoryTransaction[];
  inventory: VaccineInventory[];
}

export function InventoryAuditLog({ transactions, inventory }: InventoryAuditLogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterVaccine, setFilterVaccine] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'created_at' | 'quantity'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Get unique vaccine names from inventory
  const vaccineNames = useMemo(() => {
    const names = new Set(inventory.map(i => i.vaccine_name));
    return Array.from(names).sort();
  }, [inventory]);

  // Get inventory item details by ID
  const getInventoryItem = (inventoryId: string) => {
    return inventory.find(i => i.id === inventoryId);
  };

  // Transaction type labels and colors
  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'received':
        return { label: 'Received', color: 'bg-green-500', icon: ArrowDown };
      case 'administered':
        return { label: 'Administered', color: 'bg-blue-500', icon: Syringe };
      case 'wasted':
        return { label: 'Wasted', color: 'bg-red-500', icon: Trash2 };
      case 'expired':
        return { label: 'Expired', color: 'bg-orange-500', icon: AlertCircle };
      case 'transferred':
        return { label: 'Transferred', color: 'bg-purple-500', icon: ArrowUp };
      case 'adjusted':
        return { label: 'Adjusted', color: 'bg-yellow-500', icon: RefreshCw };
      default:
        return { label: type, color: 'bg-gray-500', icon: Package };
    }
  };

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        const item = getInventoryItem(t.inventory_id);
        return (
          t.batch_number?.toLowerCase().includes(term) ||
          item?.vaccine_name.toLowerCase().includes(term) ||
          t.reason?.toLowerCase().includes(term)
        );
      });
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === filterType);
    }

    // Vaccine filter
    if (filterVaccine !== 'all') {
      filtered = filtered.filter(t => {
        const item = getInventoryItem(t.inventory_id);
        return item?.vaccine_name === filterVaccine;
      });
    }

    // Date filters
    if (dateFrom) {
      const fromDate = startOfDay(parseISO(dateFrom));
      filtered = filtered.filter(t => isAfter(parseISO(t.created_at), fromDate) || parseISO(t.created_at).getTime() === fromDate.getTime());
    }
    if (dateTo) {
      const toDate = endOfDay(parseISO(dateTo));
      filtered = filtered.filter(t => isBefore(parseISO(t.created_at), toDate) || parseISO(t.created_at).getTime() === toDate.getTime());
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'quantity') {
        comparison = a.quantity - b.quantity;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [transactions, searchTerm, filterType, filterVaccine, dateFrom, dateTo, sortField, sortDirection, inventory]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const stats = {
      totalReceived: 0,
      totalAdministered: 0,
      totalWasted: 0,
      totalExpired: 0,
      totalTransferred: 0,
      totalAdjusted: 0
    };

    filteredTransactions.forEach(t => {
      switch (t.transaction_type) {
        case 'received':
          stats.totalReceived += t.quantity;
          break;
        case 'administered':
          stats.totalAdministered += t.quantity;
          break;
        case 'wasted':
          stats.totalWasted += t.quantity;
          break;
        case 'expired':
          stats.totalExpired += t.quantity;
          break;
        case 'transferred':
          stats.totalTransferred += t.quantity;
          break;
        case 'adjusted':
          stats.totalAdjusted += Math.abs(t.quantity);
          break;
      }
    });

    return stats;
  }, [filteredTransactions]);

  // Export audit log
  const exportAuditLog = () => {
    const headers = [
      'Date',
      'Time',
      'Vaccine',
      'Batch Number',
      'Transaction Type',
      'Quantity',
      'Old Quantity',
      'New Quantity',
      'Reason',
      'Performed By'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredTransactions.map(t => {
        const item = getInventoryItem(t.inventory_id);
        const date = parseISO(t.created_at);
        return [
          format(date, 'yyyy-MM-dd'),
          format(date, 'HH:mm:ss'),
          item?.vaccine_name || 'Unknown',
          t.batch_number || item?.batch_number || '',
          t.transaction_type,
          t.quantity,
          t.old_quantity ?? '',
          t.new_quantity ?? '',
          `"${(t.reason || '').replace(/"/g, '""')}"`,
          t.performed_by_user_id
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-audit-log-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Audit log exported');
  };

  // Toggle sort
  const toggleSort = (field: 'created_at' | 'quantity') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterVaccine('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <History className="h-4 w-4 mr-2" />
          Audit Log
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Inventory Audit Log
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div className="col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="administered">Administered</SelectItem>
                <SelectItem value="wasted">Wasted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="transferred">Transferred</SelectItem>
                <SelectItem value="adjusted">Adjusted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterVaccine} onValueChange={setFilterVaccine}>
              <SelectTrigger>
                <SelectValue placeholder="All Vaccines" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vaccines</SelectItem>
                {vaccineNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap items-center">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
            <Button variant="outline" size="sm" onClick={exportAuditLog}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {filteredTransactions.length} records
            </span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <Card className="p-2">
              <div className="text-xs text-muted-foreground">Received</div>
              <div className="text-lg font-bold text-green-600">{summary.totalReceived.toLocaleString()}</div>
            </Card>
            <Card className="p-2">
              <div className="text-xs text-muted-foreground">Administered</div>
              <div className="text-lg font-bold text-blue-600">{summary.totalAdministered.toLocaleString()}</div>
            </Card>
            <Card className="p-2">
              <div className="text-xs text-muted-foreground">Wasted</div>
              <div className="text-lg font-bold text-red-600">{summary.totalWasted.toLocaleString()}</div>
            </Card>
            <Card className="p-2">
              <div className="text-xs text-muted-foreground">Expired</div>
              <div className="text-lg font-bold text-orange-600">{summary.totalExpired.toLocaleString()}</div>
            </Card>
            <Card className="p-2">
              <div className="text-xs text-muted-foreground">Transferred</div>
              <div className="text-lg font-bold text-purple-600">{summary.totalTransferred.toLocaleString()}</div>
            </Card>
            <Card className="p-2">
              <div className="text-xs text-muted-foreground">Adjusted</div>
              <div className="text-lg font-bold text-yellow-600">{summary.totalAdjusted.toLocaleString()}</div>
            </Card>
          </div>

          {/* Table */}
          <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Date/Time
                      {sortField === 'created_at' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Vaccine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 text-right"
                    onClick={() => toggleSort('quantity')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Qty
                      {sortField === 'quantity' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const item = getInventoryItem(transaction.inventory_id);
                    const typeInfo = getTransactionTypeInfo(transaction.transaction_type);
                    const TypeIcon = typeInfo.icon;
                    const isExpanded = expandedRow === transaction.id;

                    return (
                      <React.Fragment key={transaction.id}>
                        <TableRow 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedRow(isExpanded ? null : transaction.id)}
                        >
                          <TableCell>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <div>{format(parseISO(transaction.created_at), 'dd MMM yyyy')}</div>
                            <div className="text-muted-foreground">{format(parseISO(transaction.created_at), 'HH:mm')}</div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {item?.vaccine_name || 'Unknown'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {transaction.batch_number || item?.batch_number || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${typeInfo.color} text-white`}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {typeInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={transaction.transaction_type === 'received' || transaction.transaction_type === 'adjusted' ? 'text-green-600' : 'text-red-600'}>
                              {transaction.transaction_type === 'received' ? '+' : '-'}{transaction.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {transaction.old_quantity ?? '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {transaction.new_quantity ?? '-'}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={8} className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <div className="text-muted-foreground text-xs">Reason</div>
                                  <div>{transaction.reason || 'No reason provided'}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground text-xs">Performed By</div>
                                  <div className="font-mono text-xs truncate">{transaction.performed_by_user_id}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground text-xs">Session ID</div>
                                  <div className="font-mono text-xs">{transaction.session_id || '-'}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground text-xs">Transaction ID</div>
                                  <div className="font-mono text-xs truncate">{transaction.id}</div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
