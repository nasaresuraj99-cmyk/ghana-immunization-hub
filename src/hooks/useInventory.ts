import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { VaccineInventory, InventoryTransaction, InventoryFormData, TransactionFormData } from '@/types/inventory';
import type { WastageFormData } from '@/components/modals/VaccineWastageModal';

export interface VaccineWastageRecord {
  id: string;
  facility_id: string;
  inventory_id: string;
  quantity: number;
  wastage_type: string;
  reason: string;
  notes?: string;
  recorded_by_user_id: string;
  outreach_session_id?: string;
  created_at: string;
}

export function useInventory() {
  const { user } = useAuth();
  const facilityId = user?.facilityId;
  const userId = user?.uid;
  
  const [inventory, setInventory] = useState<VaccineInventory[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [wastageRecords, setWastageRecords] = useState<VaccineWastageRecord[]>([]);
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

  // Fetch wastage records
  const fetchWastageRecords = useCallback(async () => {
    if (!facilityId) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('vaccine_wastage')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      setWastageRecords((data as VaccineWastageRecord[]) || []);
    } catch (err: any) {
      console.error('Error fetching wastage records:', err);
    }
  }, [facilityId]);

  useEffect(() => {
    if (facilityId) {
      fetchInventory();
      fetchTransactions();
      fetchWastageRecords();
    }
  }, [facilityId, fetchInventory, fetchTransactions, fetchWastageRecords]);

  // Add new inventory item
  const addInventoryItem = async (data: InventoryFormData): Promise<boolean> => {
    // Validate user and facility
    if (!userId) {
      toast.error('Please log in to add inventory');
      return false;
    }
    
    if (!facilityId || facilityId.trim() === '') {
      toast.error('Please complete facility onboarding first');
      return false;
    }

    // Validate required fields
    if (!data.vaccine_name?.trim()) {
      toast.error('Vaccine name is required');
      return false;
    }
    if (!data.batch_number?.trim()) {
      toast.error('Batch number is required');
      return false;
    }
    if (!data.quantity || data.quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return false;
    }
    if (!data.expiry_date) {
      toast.error('Expiry date is required');
      return false;
    }

    try {
      console.log('Adding inventory item:', { 
        facility_id: facilityId, 
        user_id: userId,
        vaccine_name: data.vaccine_name,
        batch_number: data.batch_number,
        quantity: data.quantity
      });

      const { data: newItem, error: insertError } = await supabase
        .from('vaccine_inventory')
        .insert({
          facility_id: facilityId,
          vaccine_name: data.vaccine_name.trim(),
          batch_number: data.batch_number.trim(),
          quantity: data.quantity,
          initial_quantity: data.quantity,
          expiry_date: data.expiry_date,
          received_date: data.received_date || new Date().toISOString().split('T')[0],
          supplier: data.supplier?.trim() || null,
          storage_location: data.storage_location?.trim() || null,
          temperature_requirement: data.temperature_requirement || '2-8°C',
          notes: data.notes?.trim() || null,
          created_by_user_id: userId
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Inventory item added successfully:', newItem);

      // Log the transaction
      const { error: transactionError } = await supabase.from('inventory_transactions').insert({
        facility_id: facilityId,
        inventory_id: newItem.id,
        transaction_type: 'received',
        quantity: data.quantity,
        reason: `Initial stock received from ${data.supplier?.trim() || 'supplier'}`,
        performed_by_user_id: userId
      });

      if (transactionError) {
        console.error('Transaction log error:', transactionError);
        // Don't throw here - inventory was added successfully
      }

      toast.success('Inventory item added successfully');
      await fetchInventory();
      await fetchTransactions();
      return true;
    } catch (err: any) {
      console.error('Failed to add inventory:', err);
      toast.error(`Failed to add inventory: ${err.message}`);
      return false;
    }
  };

  // Update inventory quantity
  const updateInventoryQuantity = async (
    inventoryId: string,
    transactionData: TransactionFormData
  ): Promise<boolean> => {
    if (!userId) {
      toast.error('Please log in to update inventory');
      return false;
    }
    
    if (!facilityId || facilityId.trim() === '') {
      toast.error('Please complete facility onboarding first');
      return false;
    }

    if (!inventoryId) {
      toast.error('Invalid inventory item');
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
      const { error: transactionError } = await supabase.from('inventory_transactions').insert({
        facility_id: facilityId,
        inventory_id: inventoryId,
        transaction_type: transactionData.transaction_type,
        quantity: transactionData.quantity,
        reason: transactionData.reason || null,
        performed_by_user_id: userId
      });

      if (transactionError) {
        console.error('Transaction log error:', transactionError);
      }

      toast.success('Inventory updated successfully');
      await fetchInventory();
      await fetchTransactions();
      return true;
    } catch (err: any) {
      console.error('Failed to update inventory:', err);
      toast.error(`Failed to update inventory: ${err.message}`);
      return false;
    }
  };

  // Record vaccine administration using atomic FEFO deduction (concurrency-safe)
  const recordAdministration = async (
    vaccineName: string,
    quantity: number = 1,
    childId?: string,
    sessionId?: string
  ): Promise<{ success: boolean; batchNumber?: string; reason?: string }> => {
    if (!facilityId || !userId) {
      return { success: false, reason: 'not_authenticated' };
    }

    try {
      // Call the atomic FEFO deduction function
      const { data, error } = await supabase.rpc('deduct_vaccine_fefo', {
        p_facility_id: facilityId,
        p_vaccine_name: vaccineName,
        p_quantity: quantity,
        p_child_id: childId || null,
        p_session_id: sessionId || null,
        p_performed_by_user_id: userId
      });

      if (error) {
        console.error('FEFO deduction error:', error);
        return { success: false, reason: 'database_error' };
      }

      const result = data as {
        success: boolean;
        reason?: string;
        batch_number?: string;
        inventory_id?: string;
        available_stock?: number;
        message?: string;
      };

      if (result.success) {
        // Refresh inventory after successful deduction
        await fetchInventory();
        await fetchTransactions();
        return { 
          success: true, 
          batchNumber: result.batch_number 
        };
      } else {
        console.warn(`FEFO deduction failed: ${result.reason}`, result);
        return { 
          success: false, 
          reason: result.reason || 'unknown_error'
        };
      }
    } catch (err: any) {
      console.error('Error in recordAdministration:', err);
      return { success: false, reason: 'exception' };
    }
  };

  // Get inventory status for a specific vaccine (for debug panel)
  const getVaccineInventoryStatus = async (vaccineName: string) => {
    if (!facilityId) return null;

    try {
      const { data, error } = await supabase.rpc('get_vaccine_inventory_status', {
        p_facility_id: facilityId,
        p_vaccine_name: vaccineName
      });

      if (error) {
        console.error('Error getting vaccine inventory status:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Exception getting vaccine inventory status:', err);
      return null;
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

  // Record vaccine wastage with automatic inventory deduction
  const recordWastage = async (data: WastageFormData): Promise<boolean> => {
    if (!facilityId || !userId) {
      toast.error('Please log in to record wastage');
      return false;
    }

    try {
      const item = inventory.find(i => i.id === data.inventory_id);
      if (!item) {
        toast.error('Inventory item not found');
        return false;
      }

      // Validate quantity
      if (data.quantity <= 0) {
        toast.error('Quantity must be greater than 0');
        return false;
      }

      if (data.quantity > item.quantity) {
        toast.error(`Cannot waste more than available stock (${item.quantity} doses)`);
        return false;
      }

      // Calculate new quantity
      const newQuantity = item.quantity - data.quantity;

      // Update inventory quantity (atomic operation)
      const { error: updateError } = await supabase
        .from('vaccine_inventory')
        .update({ quantity: newQuantity })
        .eq('id', data.inventory_id)
        .eq('quantity', item.quantity); // Optimistic concurrency check

      if (updateError) throw updateError;

      // Record wastage in vaccine_wastage table
      const { error: wastageError } = await supabase
        .from('vaccine_wastage')
        .insert({
          facility_id: facilityId,
          inventory_id: data.inventory_id,
          quantity: data.quantity,
          wastage_type: data.wastage_type,
          reason: data.reason,
          notes: data.notes || null,
          recorded_by_user_id: userId
        });

      if (wastageError) throw wastageError;

      // Log the transaction
      await supabase.from('inventory_transactions').insert({
        facility_id: facilityId,
        inventory_id: data.inventory_id,
        transaction_type: 'wasted',
        quantity: data.quantity,
        old_quantity: item.quantity,
        new_quantity: newQuantity,
        batch_number: item.batch_number,
        reason: `${data.wastage_type}: ${data.reason}`,
        performed_by_user_id: userId
      });

      toast.success(`Recorded ${data.quantity} dose(s) wastage for ${item.vaccine_name}`);
      await fetchInventory();
      await fetchTransactions();
      await fetchWastageRecords();
      return true;
    } catch (err: any) {
      toast.error(`Failed to record wastage: ${err.message}`);
      return false;
    }
  };

  // Get wastage summary
  const getWastageSummary = useCallback(() => {
    const summary: Record<string, { 
      total: number; 
      expired: number; 
      broken_vial: number; 
      cold_chain_failure: number; 
      open_vial_policy: number;
      other: number;
    }> = {};

    wastageRecords.forEach(record => {
      const inventoryItem = inventory.find(i => i.id === record.inventory_id);
      const vaccineName = inventoryItem?.vaccine_name || 'Unknown';

      if (!summary[vaccineName]) {
        summary[vaccineName] = { 
          total: 0, 
          expired: 0, 
          broken_vial: 0, 
          cold_chain_failure: 0, 
          open_vial_policy: 0,
          other: 0 
        };
      }

      summary[vaccineName].total += record.quantity;
      
      switch (record.wastage_type) {
        case 'expired':
          summary[vaccineName].expired += record.quantity;
          break;
        case 'broken_vial':
          summary[vaccineName].broken_vial += record.quantity;
          break;
        case 'cold_chain_failure':
          summary[vaccineName].cold_chain_failure += record.quantity;
          break;
        case 'open_vial_policy':
          summary[vaccineName].open_vial_policy += record.quantity;
          break;
        default:
          summary[vaccineName].other += record.quantity;
      }
    });

    return summary;
  }, [wastageRecords, inventory]);

  return {
    inventory,
    transactions,
    wastageRecords,
    loading,
    error,
    addInventoryItem,
    updateInventoryQuantity,
    recordAdministration,
    recordWastage,
    deleteInventoryItem,
    getStockSummary,
    getConsumptionRate,
    getLowStockAlerts,
    getExpiryAlerts,
    getWastageSummary,
    getVaccineInventoryStatus,
    refetch: fetchInventory,
    refetchWastage: fetchWastageRecords
  };
}
