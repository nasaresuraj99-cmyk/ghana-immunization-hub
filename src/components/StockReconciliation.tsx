import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Scale, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  RefreshCw,
  Save,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import type { VaccineInventory } from '@/types/inventory';
import { format } from 'date-fns';

interface StockReconciliationProps {
  inventory: VaccineInventory[];
  onReconcile: (inventoryId: string, physicalCount: number, reason: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

interface ReconciliationItem {
  inventoryId: string;
  vaccineName: string;
  batchNumber: string;
  systemQuantity: number;
  physicalCount: number | null;
  difference: number;
  reason: string;
  status: 'pending' | 'matched' | 'discrepancy' | 'reconciled';
}

export function StockReconciliation({ inventory, onReconcile, onRefresh }: StockReconciliationProps) {
  const [open, setOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [items, setItems] = useState<ReconciliationItem[]>([]);
  const [globalReason, setGlobalReason] = useState('Monthly stock count');

  // Initialize items from inventory
  const initializeItems = () => {
    const newItems: ReconciliationItem[] = inventory.map(item => ({
      inventoryId: item.id,
      vaccineName: item.vaccine_name,
      batchNumber: item.batch_number,
      systemQuantity: item.quantity,
      physicalCount: null,
      difference: 0,
      reason: '',
      status: 'pending'
    }));
    setItems(newItems);
  };

  // Update physical count for an item
  const updatePhysicalCount = (inventoryId: string, count: string) => {
    const numCount = count === '' ? null : parseInt(count);
    setItems(prev => prev.map(item => {
      if (item.inventoryId === inventoryId) {
        const difference = numCount !== null ? numCount - item.systemQuantity : 0;
        return {
          ...item,
          physicalCount: numCount,
          difference,
          status: numCount === null ? 'pending' : 
                  difference === 0 ? 'matched' : 'discrepancy'
        };
      }
      return item;
    }));
  };

  // Update reason for an item
  const updateReason = (inventoryId: string, reason: string) => {
    setItems(prev => prev.map(item => 
      item.inventoryId === inventoryId ? { ...item, reason } : item
    ));
  };

  // Apply global reason to all discrepancies
  const applyGlobalReason = () => {
    setItems(prev => prev.map(item => ({
      ...item,
      reason: item.status === 'discrepancy' && !item.reason ? globalReason : item.reason
    })));
  };

  // Submit reconciliation
  const handleReconcile = async () => {
    const discrepancies = items.filter(item => 
      item.status === 'discrepancy' && item.physicalCount !== null
    );

    if (discrepancies.length === 0) {
      toast.info('No discrepancies to reconcile');
      return;
    }

    // Check all discrepancies have reasons
    const missingReasons = discrepancies.filter(item => !item.reason.trim());
    if (missingReasons.length > 0) {
      toast.error('Please provide a reason for all discrepancies');
      return;
    }

    setReconciling(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of discrepancies) {
      try {
        const success = await onReconcile(
          item.inventoryId, 
          item.physicalCount!, 
          item.reason
        );
        
        if (success) {
          successCount++;
          setItems(prev => prev.map(i => 
            i.inventoryId === item.inventoryId ? { ...i, status: 'reconciled' as const } : i
          ));
        } else {
          errorCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }

    setReconciling(false);

    if (successCount > 0) {
      toast.success(`Successfully reconciled ${successCount} items`);
      await onRefresh();
    }
    if (errorCount > 0) {
      toast.error(`Failed to reconcile ${errorCount} items`);
    }
  };

  // Summary stats
  const summary = useMemo(() => {
    const matched = items.filter(i => i.status === 'matched').length;
    const discrepancies = items.filter(i => i.status === 'discrepancy').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const reconciled = items.filter(i => i.status === 'reconciled').length;
    const totalDifference = items.reduce((sum, i) => sum + i.difference, 0);

    return { matched, discrepancies, pending, reconciled, totalDifference };
  }, [items]);

  // Get difference indicator
  const getDifferenceDisplay = (difference: number) => {
    if (difference === 0) {
      return <span className="text-green-600 flex items-center gap-1"><Minus className="h-3 w-3" /> Match</span>;
    } else if (difference > 0) {
      return <span className="text-blue-600 flex items-center gap-1"><ArrowUp className="h-3 w-3" /> +{difference}</span>;
    } else {
      return <span className="text-red-600 flex items-center gap-1"><ArrowDown className="h-3 w-3" /> {difference}</span>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) initializeItems();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Scale className="h-4 w-4 mr-2" />
          Reconcile Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Stock Reconciliation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          {/* Instructions */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Enter the physical count for each batch. Discrepancies will be highlighted and can be reconciled.
            </AlertDescription>
          </Alert>

          {/* Global Reason */}
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label>Default Reason for Adjustments</Label>
              <Input
                value={globalReason}
                onChange={(e) => setGlobalReason(e.target.value)}
                placeholder="e.g., Monthly stock count, Physical inventory audit"
              />
            </div>
            <Button variant="outline" onClick={applyGlobalReason}>
              Apply to All
            </Button>
          </div>

          {/* Summary */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{items.length} Total Batches</Badge>
            {summary.pending > 0 && <Badge className="bg-gray-500">{summary.pending} Pending</Badge>}
            {summary.matched > 0 && <Badge className="bg-green-500">{summary.matched} Matched</Badge>}
            {summary.discrepancies > 0 && <Badge className="bg-yellow-500">{summary.discrepancies} Discrepancies</Badge>}
            {summary.reconciled > 0 && <Badge className="bg-blue-500">{summary.reconciled} Reconciled</Badge>}
            {summary.totalDifference !== 0 && (
              <Badge variant={summary.totalDifference > 0 ? 'default' : 'destructive'}>
                Net: {summary.totalDifference > 0 ? '+' : ''}{summary.totalDifference} doses
              </Badge>
            )}
          </div>

          {/* Table */}
          <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vaccine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">System Qty</TableHead>
                  <TableHead className="text-right">Physical Count</TableHead>
                  <TableHead className="text-center">Difference</TableHead>
                  <TableHead>Reason (if different)</TableHead>
                  <TableHead className="w-20">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No inventory items to reconcile
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow 
                      key={item.inventoryId}
                      className={
                        item.status === 'discrepancy' ? 'bg-yellow-50 dark:bg-yellow-950/20' :
                        item.status === 'matched' ? 'bg-green-50 dark:bg-green-950/20' :
                        item.status === 'reconciled' ? 'bg-blue-50 dark:bg-blue-950/20' :
                        ''
                      }
                    >
                      <TableCell className="font-medium">{item.vaccineName}</TableCell>
                      <TableCell className="font-mono text-xs">{item.batchNumber}</TableCell>
                      <TableCell className="text-right font-mono">{item.systemQuantity}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={item.physicalCount ?? ''}
                          onChange={(e) => updatePhysicalCount(item.inventoryId, e.target.value)}
                          className="w-24 text-right"
                          placeholder="Count"
                          disabled={item.status === 'reconciled'}
                        />
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {item.physicalCount !== null ? getDifferenceDisplay(item.difference) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.status === 'discrepancy' && (
                          <Input
                            value={item.reason}
                            onChange={(e) => updateReason(item.inventoryId, e.target.value)}
                            placeholder="Reason for difference"
                            className="text-sm"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {item.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                        {item.status === 'matched' && <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Match</Badge>}
                        {item.status === 'discrepancy' && <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" /> Check</Badge>}
                        {item.status === 'reconciled' && <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" /> Done</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleReconcile}
              disabled={reconciling || summary.discrepancies === 0}
            >
              {reconciling ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Reconciling...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Reconcile {summary.discrepancies} Discrepancies
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}