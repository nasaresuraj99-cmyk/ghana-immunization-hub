import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, Calendar, Package } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import type { VaccineInventory } from '@/types/inventory';

export interface WastageFormData {
  inventory_id: string;
  quantity: number;
  wastage_type: 'expired' | 'broken_vial' | 'cold_chain_failure' | 'open_vial_policy' | 'contaminated' | 'other';
  reason: string;
  notes?: string;
}

interface VaccineWastageModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: VaccineInventory[];
  onRecordWastage: (data: WastageFormData) => Promise<boolean>;
}

const WASTAGE_TYPES = [
  { value: 'expired', label: 'Expired', description: 'Vaccine past expiry date' },
  { value: 'broken_vial', label: 'Broken Vial', description: 'Physical damage to vial' },
  { value: 'cold_chain_failure', label: 'Cold Chain Failure', description: 'Temperature excursion' },
  { value: 'open_vial_policy', label: 'Open Vial Policy', description: 'Unused doses after opening' },
  { value: 'contaminated', label: 'Contaminated', description: 'Suspected contamination' },
  { value: 'other', label: 'Other', description: 'Other reason' },
] as const;

export function VaccineWastageModal({ 
  isOpen, 
  onClose, 
  inventory, 
  onRecordWastage 
}: VaccineWastageModalProps) {
  const [formData, setFormData] = useState<WastageFormData>({
    inventory_id: '',
    quantity: 1,
    wastage_type: 'expired',
    reason: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Filter inventory to only show items with stock
  const availableInventory = useMemo(() => {
    return inventory.filter(item => item.quantity > 0 && item.is_active);
  }, [inventory]);

  // Get selected inventory item
  const selectedItem = useMemo(() => {
    return inventory.find(item => item.id === formData.inventory_id);
  }, [inventory, formData.inventory_id]);

  // Get expiry status badge
  const getExpiryBadge = (item: VaccineInventory) => {
    const today = new Date();
    const expiryDate = parseISO(item.expiry_date);
    const daysUntilExpiry = differenceInDays(expiryDate, today);

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysUntilExpiry <= 7) {
      return <Badge className="bg-red-500">Expires in {daysUntilExpiry} days</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge className="bg-orange-500">Expires in {daysUntilExpiry} days</Badge>;
    }
    return null;
  };

  // Auto-set reason based on wastage type
  const handleWastageTypeChange = (type: WastageFormData['wastage_type']) => {
    const typeInfo = WASTAGE_TYPES.find(t => t.value === type);
    setFormData({ 
      ...formData, 
      wastage_type: type,
      reason: typeInfo?.description || ''
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!formData.inventory_id) {
      return;
    }
    if (!formData.quantity || formData.quantity <= 0) {
      return;
    }
    if (selectedItem && formData.quantity > selectedItem.quantity) {
      return;
    }
    if (!formData.reason.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const success = await onRecordWastage(formData);
      if (success) {
        // Reset form
        setFormData({
          inventory_id: '',
          quantity: 1,
          wastage_type: 'expired',
          reason: '',
          notes: ''
        });
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form when modal closes
  const handleClose = () => {
    setFormData({
      inventory_id: '',
      quantity: 1,
      wastage_type: 'expired',
      reason: '',
      notes: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Record Vaccine Wastage
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Wastage Recording</p>
              <p className="text-muted-foreground">
                This will permanently deduct doses from inventory. This action is logged for audit purposes.
              </p>
            </div>
          </div>

          {/* Select Vaccine Batch */}
          <div className="space-y-2">
            <Label>Select Vaccine Batch *</Label>
            <Select 
              value={formData.inventory_id} 
              onValueChange={(value) => setFormData({ ...formData, inventory_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vaccine batch" />
              </SelectTrigger>
              <SelectContent>
                {availableInventory.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No vaccine batches with available stock
                  </div>
                ) : (
                  availableInventory.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <span>{item.vaccine_name}</span>
                        <span className="text-muted-foreground">({item.batch_number})</span>
                        <span className="text-muted-foreground">- {item.quantity} doses</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Batch Details */}
          {selectedItem && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedItem.vaccine_name}</span>
                </div>
                {getExpiryBadge(selectedItem)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                <div>Batch: {selectedItem.batch_number}</div>
                <div>Available: {selectedItem.quantity} doses</div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Expires: {format(parseISO(selectedItem.expiry_date), 'dd MMM yyyy')}
                </div>
                {selectedItem.storage_location && (
                  <div>Location: {selectedItem.storage_location}</div>
                )}
              </div>
            </div>
          )}

          {/* Wastage Type */}
          <div className="space-y-2">
            <Label>Wastage Type *</Label>
            <Select 
              value={formData.wastage_type} 
              onValueChange={handleWastageTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WASTAGE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity (doses) *</Label>
            <Input
              type="number"
              min="1"
              max={selectedItem?.quantity || undefined}
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              placeholder="Number of doses wasted"
            />
            {selectedItem && formData.quantity > selectedItem.quantity && (
              <p className="text-sm text-destructive">
                Cannot exceed available stock ({selectedItem.quantity} doses)
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Input
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Reason for wastage"
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label>Additional Notes (Optional)</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional details about this wastage..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            variant="destructive"
            disabled={
              submitting || 
              !formData.inventory_id || 
              !formData.quantity || 
              formData.quantity <= 0 ||
              (selectedItem && formData.quantity > selectedItem.quantity) ||
              !formData.reason.trim()
            }
          >
            {submitting ? 'Recording...' : 'Record Wastage'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
