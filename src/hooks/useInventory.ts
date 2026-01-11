import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { VaccineInventory, InventoryTransaction, InventoryFormData, TransactionFormData } from '@/types/inventory';

export function useInventory() {
  const { user } = useAuth();
  const facilityId = user?.facilityId;
  const userId = user?.uid;
  
  const [inventory, setInventory] = useState<VaccineInventory[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    if (!facilityId) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .eq('facility_id', facilityId)
        .eq('is_active', true)
        .order('expiry_date', { ascending: true });

      if (fetchError) throw fetchError;
      setInventory((data as VaccineInventory[]) || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (inventoryId?: string) => {
    if (!facilityId) return;
    
    try {
      let query = supabase
        .from('inventory_transactions')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (inventoryId) {
        query = query.eq('inventory_id', inventoryId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setTransactions((data as InventoryTransaction[]) || []);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    }
  }, [facilityId]);

  useEffect(() => {
    if (facilityId) {
      fetchInventory();
      fetchTransactions();
    }
  }, [facilityId, fetchInventory, fetchTransactions]);

  // Add new inventory item
  const addInventoryItem = async (data: InventoryFormData): Promise<boolean> => {
    if (!facilityId || !userId) {
      toast.error('Please log in to add inventory');
      return false;
    }

    try {
      const { data: newItem, error: insertError } = await supabase
        .from('vaccine_inventory')
        .insert({
          facility_id: facilityId,
          vaccine_name: data.vaccine_name,
          batch_number: data.batch_number,
          quantity: data.quantity,
          initial_quantity: data.quantity,
          expiry_date: data.expiry_date,
          received_date: data.received_date || new Date().toISOString().split('T')[0],
          supplier: data.supplier || null,
          storage_location: data.storage_location || null,
          temperature_requirement: data.temperature_requirement || '2-8°C',
          notes: data.notes || null,
          created_by_user_id: userId
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Log the transaction
      await supabase.from('inventory_transactions').insert({
        facility_id: facilityId,
        inventory_id: newItem.id,
        transaction_type: 'received',
        quantity: data.quantity,
        reason: `Initial stock received from ${data.supplier || 'supplier'}`,
        performed_by_user_id: userId
      });

      toast.success('Inventory item added successfully');
      await fetchInventory();
      await fetchTransactions();
      return true;
    } catch (err: any) {
      toast.error(`Failed to add inventory: ${err.message}`);
      return false;
    }
  };

  // Update inventory quantity
  const updateInventoryQuantity = async (
    inventoryId: string,
    transactionData: TransactionFormData
  ): Promise<boolean> => {
    if (!facilityId || !userId) {
      toast.error('Please log in to update inventory');
      return false;
    }

    try {
      const item = inventory.find(i => i.id === inventoryId);
      if (!item) throw new Error('Inventory item not found');

      let newQuantity = item.quantity;
      
      if (transactionData.transaction_type === 'received' || transactionData.transaction_type === 'adjusted') {
        newQuantity += transactionData.quantity;
      } else {
        newQuantity -= transactionData.quantity;
        if (newQuantity < 0) {
          toast.error('Insufficient stock');
          return false;
        }
      }

      // Update inventory quantity
      const { error: updateError } = await supabase
        .from('vaccine_inventory')
        .update({ quantity: newQuantity })
        .eq('id', inventoryId);

      if (updateError) throw updateError;

      // Log the transaction
      await supabase.from('inventory_transactions').insert({
        facility_id: facilityId,
        inventory_id: inventoryId,
        transaction_type: transactionData.transaction_type,
        quantity: transactionData.quantity,
        reason: transactionData.reason || null,
        performed_by_user_id: userId
      });

      toast.success('Inventory updated successfully');
      await fetchInventory();
      await fetchTransactions();
      return true;
    } catch (err: any) {
      toast.error(`Failed to update inventory: ${err.message}`);
      return false;
    }
  };

  // Record vaccine administration (deduct from inventory)
  const recordAdministration = async (
    vaccineName: string,
    quantity: number = 1,
    childId?: string,
    sessionId?: string
  ): Promise<boolean> => {
    if (!facilityId || !userId) return false;

    try {
      // Find the oldest non-expired batch with sufficient stock (FEFO - First Expiry First Out)
      const today = new Date().toISOString().split('T')[0];
      const availableBatch = inventory
        .filter(i => 
          i.vaccine_name === vaccineName && 
          i.quantity >= quantity && 
          i.expiry_date >= today &&
          i.is_active
        )
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0];

      if (!availableBatch) {
        console.warn(`No available stock for ${vaccineName}`);
        return false;
      }

      const newQuantity = availableBatch.quantity - quantity;

      // Update inventory
      const { error: updateError } = await supabase
        .from('vaccine_inventory')
        .update({ quantity: newQuantity })
        .eq('id', availableBatch.id);

      if (updateError) throw updateError;

      // Log transaction
      await supabase.from('inventory_transactions').insert({
        facility_id: facilityId,
        inventory_id: availableBatch.id,
        transaction_type: 'administered',
        quantity: quantity,
        child_id: childId || null,
        session_id: sessionId || null,
        reason: `Vaccine administered`,
        performed_by_user_id: userId
      });

      return true;
    } catch (err: any) {
      console.error('Error recording administration:', err);
      return false;
    }
  };

  // Delete inventory item (soft delete)
  const deleteInventoryItem = async (inventoryId: string): Promise<boolean> => {
    if (!facilityId || !userId) {
      toast.error('Please log in to delete inventory');
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('vaccine_inventory')
        .update({ is_active: false })
        .eq('id', inventoryId);

      if (deleteError) throw deleteError;

      toast.success('Inventory item deleted');
      await fetchInventory();
      return true;
    } catch (err: any) {
      toast.error(`Failed to delete inventory: ${err.message}`);
      return false;
    }
  };

  // Get stock summary by vaccine
  const getStockSummary = useCallback(() => {
    const summary: Record<string, { total: number; batches: number; nearExpiry: number; expired: number }> = {};
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    inventory.forEach(item => {
      if (!summary[item.vaccine_name]) {
        summary[item.vaccine_name] = { total: 0, batches: 0, nearExpiry: 0, expired: 0 };
      }

      const expiryDate = new Date(item.expiry_date);
      summary[item.vaccine_name].total += item.quantity;
      summary[item.vaccine_name].batches += 1;

      if (expiryDate < today) {
        summary[item.vaccine_name].expired += item.quantity;
      } else if (expiryDate <= thirtyDaysFromNow) {
        summary[item.vaccine_name].nearExpiry += item.quantity;
      }
    });

    return summary;
  }, [inventory]);

  // Get consumption rate (last 30 days)
  const getConsumptionRate = useCallback(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const administered = transactions.filter(
      t => t.transaction_type === 'administered' && new Date(t.created_at) >= thirtyDaysAgo
    );

    const rateByVaccine: Record<string, number> = {};
    
    administered.forEach(t => {
      const inventoryItem = inventory.find(i => i.id === t.inventory_id);
      if (inventoryItem) {
        const vaccineName = inventoryItem.vaccine_name;
        rateByVaccine[vaccineName] = (rateByVaccine[vaccineName] || 0) + t.quantity;
      }
    });

    return rateByVaccine;
  }, [transactions, inventory]);

  // Get low stock alerts
  const getLowStockAlerts = useCallback((threshold: number = 50) => {
    const summary = getStockSummary();
    return Object.entries(summary)
      .filter(([_, data]) => data.total < threshold)
      .map(([vaccine, data]) => ({ vaccine, ...data }));
  }, [getStockSummary]);

  // Get expiry alerts
  const getExpiryAlerts = useCallback(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return inventory.filter(item => {
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= thirtyDaysFromNow && item.quantity > 0;
    }).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  }, [inventory]);

  return {
    inventory,
    transactions,
    loading,
    error,
    addInventoryItem,
    updateInventoryQuantity,
    recordAdministration,
    deleteInventoryItem,
    getStockSummary,
    getConsumptionRate,
    getLowStockAlerts,
    getExpiryAlerts,
    refetch: fetchInventory
  };
}
