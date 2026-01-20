import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Package, 
  Plus, 
  AlertTriangle, 
  Calendar, 
  TrendingDown, 
  TrendingUp,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Clock,
  Thermometer,
  MapPin,
  RefreshCw,
  AlertCircle,
  History,
  Upload
} from 'lucide-react';
import { useInventory } from '@/hooks/useInventory';
import { GHANA_EPI_VACCINES, type InventoryFormData, type VaccineInventory } from '@/types/inventory';
import { VaccineWastageModal, type WastageFormData } from '@/components/modals/VaccineWastageModal';
import { InventoryCsvImport } from '@/components/InventoryCsvImport';
import { InventoryAuditLog } from '@/components/InventoryAuditLog';
import { StockReconciliation } from '@/components/StockReconciliation';
import { StockReorderAlerts } from '@/components/StockReorderAlerts';
import { format, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns';
import { toast } from 'sonner';

export function InventorySection() {
  const {
    inventory,
    transactions,
    wastageRecords,
    loading,
    facilityId,
    addInventoryItem,
    updateInventoryQuantity,
    deleteInventoryItem,
    recordWastage,
    reconcileStock,
    getStockSummary,
    getConsumptionRate,
    getLowStockAlerts,
    getExpiryAlerts,
    getWastageSummary,
    refetch
  } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterVaccine, setFilterVaccine] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showWastageModal, setShowWastageModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VaccineInventory | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Form state
  const [formData, setFormData] = useState<InventoryFormData>({
    vaccine_name: '',
    batch_number: '',
    quantity: 0,
    expiry_date: '',
    received_date: new Date().toISOString().split('T')[0],
    supplier: '',
    storage_location: '',
    temperature_requirement: '2-8°C',
    notes: ''
  });

  const [transactionData, setTransactionData] = useState({
    type: 'wasted' as 'wasted' | 'expired' | 'adjusted' | 'transferred',
    quantity: 0,
    reason: ''
  });

  const stockSummary = useMemo(() => getStockSummary(), [getStockSummary]);
  const consumptionRate = useMemo(() => getConsumptionRate(), [getConsumptionRate]);
  const lowStockAlerts = useMemo(() => getLowStockAlerts(50), [getLowStockAlerts]);
  const expiryAlerts = useMemo(() => getExpiryAlerts(), [getExpiryAlerts]);
  const wastageSummary = useMemo(() => getWastageSummary(), [getWastageSummary]);

  // Calculate total wastage
  const totalWastage = useMemo(() => {
    return Object.values(wastageSummary).reduce((sum, data) => sum + data.total, 0);
  }, [wastageSummary]);

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.vaccine_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (item.supplier?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesVaccine = filterVaccine === 'all' || item.vaccine_name === filterVaccine;
      return matchesSearch && matchesVaccine;
    });
  }, [inventory, searchTerm, filterVaccine]);

  // Get status badge for inventory item
  const getStatusBadge = (item: VaccineInventory) => {
    const today = new Date();
    const expiryDate = parseISO(item.expiry_date);
    const daysUntilExpiry = differenceInDays(expiryDate, today);

    if (isBefore(expiryDate, today)) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge className="bg-orange-500">Expiring Soon</Badge>;
    } else if (item.quantity < 20) {
      return <Badge className="bg-yellow-500">Low Stock</Badge>;
    }
    return <Badge className="bg-green-500">In Stock</Badge>;
  };

  // Calculate usage percentage
  const getUsagePercentage = (item: VaccineInventory) => {
    return ((item.initial_quantity - item.quantity) / item.initial_quantity) * 100;
  };

  // Handle form submission
  const handleAddInventory = async () => {
    if (!formData.vaccine_name || !formData.batch_number || !formData.quantity || !formData.expiry_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const success = await addInventoryItem(formData);
    if (success) {
      setShowAddDialog(false);
      setFormData({
        vaccine_name: '',
        batch_number: '',
        quantity: 0,
        expiry_date: '',
        received_date: new Date().toISOString().split('T')[0],
        supplier: '',
        storage_location: '',
        temperature_requirement: '2-8°C',
        notes: ''
      });
    }
  };

  // Handle transaction
  const handleTransaction = async () => {
    if (!selectedItem || !transactionData.quantity || transactionData.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    const success = await updateInventoryQuantity(selectedItem.id, {
      inventory_id: selectedItem.id,
      transaction_type: transactionData.type,
      quantity: transactionData.quantity,
      reason: transactionData.reason
    });

    if (success) {
      setShowTransactionDialog(false);
      setSelectedItem(null);
      setTransactionData({ type: 'wasted', quantity: 0, reason: '' });
    }
  };

  // Export inventory report
  const exportInventoryReport = () => {
    const csvContent = [
      ['Vaccine', 'Batch Number', 'Quantity', 'Initial Qty', 'Expiry Date', 'Received Date', 'Supplier', 'Location', 'Status'].join(','),
      ...filteredInventory.map(item => {
        const today = new Date();
        const expiryDate = parseISO(item.expiry_date);
        let status = 'In Stock';
        if (isBefore(expiryDate, today)) status = 'Expired';
        else if (differenceInDays(expiryDate, today) <= 30) status = 'Expiring Soon';
        else if (item.quantity < 20) status = 'Low Stock';

        return [
          item.vaccine_name,
          item.batch_number,
          item.quantity,
          item.initial_quantity,
          item.expiry_date,
          item.received_date,
          item.supplier || '',
          item.storage_location || '',
          status
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaccine-inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Inventory report exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6" />
            Vaccine Inventory Management
          </h2>
          <p className="text-muted-foreground">Track stock levels, expiry dates, and consumption</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportInventoryReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <InventoryCsvImport onImport={addInventoryItem} onRefresh={refetch} />
          <InventoryAuditLog transactions={transactions} inventory={inventory} />
          <StockReconciliation inventory={inventory} onReconcile={reconcileStock} onRefresh={refetch} />
          <StockReorderAlerts inventory={inventory} facilityId={facilityId} />
          <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10" onClick={() => setShowWastageModal(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Record Wastage
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Vaccine Stock</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Vaccine *</Label>
                  <Select 
                    value={formData.vaccine_name} 
                    onValueChange={(value) => setFormData({ ...formData, vaccine_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vaccine" />
                    </SelectTrigger>
                    <SelectContent>
                      {GHANA_EPI_VACCINES.map(vaccine => (
                        <SelectItem key={vaccine} value={vaccine}>{vaccine}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Batch Number *</Label>
                    <Input
                      value={formData.batch_number}
                      onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                      placeholder="e.g., BCG-2024-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity (doses) *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity || ''}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expiry Date *</Label>
                    <Input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Received Date</Label>
                    <Input
                      type="date"
                      value={formData.received_date}
                      onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input
                    value={formData.supplier || ''}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="e.g., UNICEF, Ghana Health Service"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Storage Location</Label>
                    <Input
                      value={formData.storage_location || ''}
                      onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
                      placeholder="e.g., Main Refrigerator"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature</Label>
                    <Select 
                      value={formData.temperature_requirement} 
                      onValueChange={(value) => setFormData({ ...formData, temperature_requirement: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2-8°C">2-8°C (Standard)</SelectItem>
                        <SelectItem value="-20°C">-20°C (Frozen)</SelectItem>
                        <SelectItem value="Room Temperature">Room Temperature</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    rows={2}
                  />
                </div>

                <Button onClick={handleAddInventory} className="w-full">
                  Add to Inventory
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockAlerts.length > 0 || expiryAlerts.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {lowStockAlerts.length > 0 && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <TrendingDown className="h-4 w-4" />
                  Low Stock Alerts ({lowStockAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {lowStockAlerts.map(alert => (
                    <Badge key={alert.vaccine} variant="outline" className="border-yellow-500">
                      {alert.vaccine}: {alert.total} doses
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {expiryAlerts.length > 0 && (
            <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <Clock className="h-4 w-4" />
                  Expiry Alerts ({expiryAlerts.length} batches)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {expiryAlerts.slice(0, 5).map(item => (
                    <Badge key={item.id} variant="outline" className="border-orange-500">
                      {item.vaccine_name} ({item.batch_number}): {format(parseISO(item.expiry_date), 'dd MMM')}
                    </Badge>
                  ))}
                  {expiryAlerts.length > 5 && (
                    <Badge variant="outline">+{expiryAlerts.length - 5} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="wastage">Wastage</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Vaccines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(stockSummary).length}</div>
                <p className="text-xs text-muted-foreground">Unique vaccine types</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.values(stockSummary).reduce((sum, v) => sum + v.total, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total doses available</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inventory.length}</div>
                <p className="text-xs text-muted-foreground">Active batches</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.values(consumptionRate).reduce((sum, v) => sum + v, 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Doses administered (30 days)</p>
              </CardContent>
            </Card>
          </div>

          {/* Stock by Vaccine */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stock by Vaccine</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {GHANA_EPI_VACCINES.map(vaccine => {
                  const data = stockSummary[vaccine] || { total: 0, batches: 0, nearExpiry: 0, expired: 0 };
                  const usage = consumptionRate[vaccine] || 0;
                  const monthsSupply = usage > 0 ? (data.total / usage).toFixed(1) : '∞';

                  return (
                    <Card key={vaccine} className="border">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold">{vaccine}</h4>
                            <p className="text-2xl font-bold">{data.total.toLocaleString()}</p>
                          </div>
                          {data.total < 50 && <Badge className="bg-yellow-500">Low</Badge>}
                          {data.nearExpiry > 0 && <Badge className="bg-orange-500">Expiring</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>{data.batches} batch(es)</p>
                          <p>{usage} used this month</p>
                          <p>~{monthsSupply} months supply</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by batch number, vaccine, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterVaccine} onValueChange={setFilterVaccine}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by vaccine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vaccines</SelectItem>
                {GHANA_EPI_VACCINES.map(vaccine => (
                  <SelectItem key={vaccine} value={vaccine}>{vaccine}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Table */}
          <Card>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Storage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No inventory items found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map(item => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.vaccine_name}</TableCell>
                        <TableCell className="font-mono text-sm">{item.batch_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{item.quantity}</span>
                            <span className="text-muted-foreground text-sm">/ {item.initial_quantity}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-20">
                            <Progress value={getUsagePercentage(item)} className="h-2" />
                            <span className="text-xs text-muted-foreground">
                              {Math.round(getUsagePercentage(item))}% used
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {format(parseISO(item.expiry_date), 'dd MMM yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Thermometer className="h-3 w-3" />
                            {item.temperature_requirement}
                          </div>
                          {item.storage_location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {item.storage_location}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(item)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedItem(item);
                                setShowTransactionDialog(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this inventory item?')) {
                                  deleteInventoryItem(item.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vaccine</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No transactions recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map(tx => {
                        const inventoryItem = inventory.find(i => i.id === tx.inventory_id);
                        return (
                          <TableRow key={tx.id}>
                            <TableCell>{format(parseISO(tx.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                            <TableCell>{inventoryItem?.vaccine_name || 'Unknown'}</TableCell>
                            <TableCell>
                              <Badge variant={
                                tx.transaction_type === 'received' ? 'default' :
                                tx.transaction_type === 'administered' ? 'secondary' :
                                'destructive'
                              }>
                                {tx.transaction_type === 'received' && <TrendingUp className="h-3 w-3 mr-1" />}
                                {tx.transaction_type !== 'received' && <TrendingDown className="h-3 w-3 mr-1" />}
                                {tx.transaction_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={tx.transaction_type === 'received' ? 'text-green-600' : 'text-red-600'}>
                                {tx.transaction_type === 'received' ? '+' : '-'}{tx.quantity}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{tx.reason || '-'}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wastage Tab */}
        <TabsContent value="wastage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Wastage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{totalWastage}</div>
                <p className="text-xs text-muted-foreground">Total doses wasted</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {Object.values(wastageSummary).reduce((sum, data) => sum + data.expired, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Doses expired</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Damaged</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {Object.values(wastageSummary).reduce((sum, data) => sum + data.damaged, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Damaged doses</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Other</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {Object.values(wastageSummary).reduce((sum, data) => sum + data.other, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Other reasons</p>
              </CardContent>
            </Card>
          </div>

          {/* Wastage by Vaccine */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Wastage by Vaccine
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(wastageSummary).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No wastage records found</p>
                  <p className="text-sm">Record wastage using the "Record Wastage" button</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(wastageSummary)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([vaccine, data]) => (
                      <div key={vaccine} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{vaccine}</span>
                          <Badge variant="destructive">{data.total} doses</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="text-muted-foreground">Expired:</span>
                            <span>{data.expired}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-yellow-500" />
                            <span className="text-muted-foreground">Opened:</span>
                            <span>{data.opened}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-muted-foreground">Damaged:</span>
                            <span>{data.damaged}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-gray-500" />
                            <span className="text-muted-foreground">Other:</span>
                            <span>{data.other}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Wastage Records */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Wastage Records</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vaccine</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wastageRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No wastage records
                        </TableCell>
                      </TableRow>
                    ) : (
                      wastageRecords.map(record => {
                        const inventoryItem = inventory.find(i => i.id === record.inventory_id);
                        return (
                          <TableRow key={record.id}>
                            <TableCell>{format(parseISO(record.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                            <TableCell>{inventoryItem?.vaccine_name || 'Unknown'}</TableCell>
                            <TableCell className="font-mono text-sm">{inventoryItem?.batch_number || '-'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {record.wastage_type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-destructive font-medium">-{record.quantity}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {record.reason}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Consumption Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(consumptionRate)
                    .sort((a, b) => b[1] - a[1])
                    .map(([vaccine, count]) => {
                      const maxConsumption = Math.max(...Object.values(consumptionRate), 1);
                      return (
                        <div key={vaccine}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{vaccine}</span>
                            <span className="font-semibold">{count} doses</span>
                          </div>
                          <Progress value={(count / maxConsumption) * 100} className="h-2" />
                        </div>
                      );
                    })}
                  {Object.keys(consumptionRate).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No consumption data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stock Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stockSummary)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([vaccine, data]) => {
                      const maxStock = Math.max(...Object.values(stockSummary).map(s => s.total), 1);
                      return (
                        <div key={vaccine}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{vaccine}</span>
                            <span className="font-semibold">{data.total} doses</span>
                          </div>
                          <Progress 
                            value={(data.total / maxStock) * 100} 
                            className={`h-2 ${data.total < 50 ? '[&>div]:bg-yellow-500' : ''}`}
                          />
                        </div>
                      );
                    })}
                  {Object.keys(stockSummary).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No stock data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transaction Dialog */}
      <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Stock Adjustment</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedItem.vaccine_name}</p>
                <p className="text-sm text-muted-foreground">
                  Batch: {selectedItem.batch_number} | Current Stock: {selectedItem.quantity}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select 
                  value={transactionData.type} 
                  onValueChange={(value: any) => setTransactionData({ ...transactionData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wasted">Wasted/Discarded</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="transferred">Transferred Out</SelectItem>
                    <SelectItem value="adjusted">Stock Adjustment (+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  max={transactionData.type !== 'adjusted' ? selectedItem.quantity : undefined}
                  value={transactionData.quantity || ''}
                  onChange={(e) => setTransactionData({ ...transactionData, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={transactionData.reason}
                  onChange={(e) => setTransactionData({ ...transactionData, reason: e.target.value })}
                  placeholder="Reason for this adjustment..."
                  rows={2}
                />
              </div>

              <Button onClick={handleTransaction} className="w-full">
                Record Transaction
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Wastage Modal */}
      <VaccineWastageModal
        isOpen={showWastageModal}
        onClose={() => setShowWastageModal(false)}
        inventory={inventory}
        onRecordWastage={recordWastage}
      />
    </div>
  );
}
