import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { VaccineInventory, WastageFormData } from '@/types/inventory';
import { WASTAGE_REASONS } from '@/types/inventory';
import { format, parseISO } from 'date-fns';

interface WastageRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: VaccineInventory[];
  onRecordWastage: (data: WastageFormData) => Promise<boolean>;
  preselectedInventoryId?: string;
}

export function WastageRecordModal({
  isOpen,
  onClose,
  inventory,
  onRecordWastage,
  preselectedInventoryId
}: WastageRecordModalProps) {
  const [formData, setFormData] = useState<WastageFormData>({
    inventory_id: preselectedInventoryId || '',
    quantity: 0,
    reason: '',
    wastage_type: 'other',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItem = inventory.find(i => i.id === formData.inventory_id);

  const handleSubmit = async () => {
    if (!formData.inventory_id || !formData.quantity || !formData.wastage_type) {
      return;
    }

    setIsSubmitting(true);
    const success = await onRecordWastage(formData);
    setIsSubmitting(false);

    if (success) {
      setFormData({
        inventory_id: '',
        quantity: 0,
        reason: '',
        wastage_type: 'other',
        notes: ''
      });
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      inventory_id: preselectedInventoryId || '',
      quantity: 0,
      reason: '',
      wastage_type: 'other',
      notes: ''
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Record Vaccine Wastage
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Notice */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Important</p>
              <p className="text-muted-foreground">
                This action will permanently record vaccine wastage and reduce inventory. 
                Please ensure all details are accurate.
              </p>
            </div>
          </div>

          {/* Select Inventory Item */}
          <div className="space-y-2">
            <Label>Select Vaccine Batch *</Label>
            <Select
              value={formData.inventory_id}
              onValueChange={(value) => setFormData({ ...formData, inventory_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vaccine batch" />
              </SelectTrigger>
              <SelectContent>
                {inventory.filter(i => i.quantity > 0).map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center gap-2">
                      <span>{item.vaccine_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.batch_number}
                      </Badge>
                      <span className="text-muted-foreground">
                        ({item.quantity} available)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Item Info */}
          {selectedItem && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Vaccine:</span>
                <span className="text-sm font-medium">{selectedItem.vaccine_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Batch:</span>
                <span className="text-sm font-mono">{selectedItem.batch_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Available:</span>
                <span className="text-sm font-medium">{selectedItem.quantity} doses</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Expiry:</span>
                <span className="text-sm">{format(parseISO(selectedItem.expiry_date), 'dd MMM yyyy')}</span>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity to Waste *</Label>
            <Input
              type="number"
              min="1"
              max={selectedItem?.quantity || 0}
              value={formData.quantity || ''}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
              placeholder="Enter number of doses"
            />
            {selectedItem && formData.quantity > selectedItem.quantity && (
              <p className="text-xs text-destructive">
                Cannot exceed available quantity ({selectedItem.quantity})
              </p>
            )}
          </div>

          {/* Wastage Type */}
          <div className="space-y-2">
            <Label>Wastage Reason *</Label>
            <Select
              value={formData.wastage_type}
              onValueChange={(value: WastageFormData['wastage_type']) => {
                const reason = WASTAGE_REASONS.find(r => r.value === value)?.label || '';
                setFormData({ ...formData, wastage_type: value, reason });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {WASTAGE_REASONS.map(reason => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional details about this wastage..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.inventory_id || 
                !formData.quantity || 
                formData.quantity <= 0 ||
                (selectedItem && formData.quantity > selectedItem.quantity) ||
                isSubmitting
              }
              variant="destructive"
              className="flex-1"
            >
              {isSubmitting ? 'Recording...' : 'Record Wastage'}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
