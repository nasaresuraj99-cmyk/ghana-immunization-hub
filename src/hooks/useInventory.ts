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

// Helper to ensure facility exists in Supabase
async function ensureFacilityExists(facilityId: string, facilityName: string): Promise<string | null> {
  if (!facilityId || facilityId.trim() === '') {
    console.error('No facility ID provided');
    return null;
  }

  try {
    // Check if facility exists
    const { data: existing, error: checkError } = await supabase
      .from('facilities')
      .select('id')
      .eq('id', facilityId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking facility:', checkError);
      // If error is about invalid UUID format, we need to create with a proper UUID
      if (checkError.message?.includes('invalid input syntax for type uuid')) {
        // Generate a proper UUID for this facility
        const newFacilityId = crypto.randomUUID();
        const { data: newFacility, error: insertError } = await supabase
          .from('facilities')
          .insert({
            id: newFacilityId,
            name: facilityName || 'Health Facility',
            code: facilityId.substring(0, 10).toUpperCase(), // Use original ID as code
          })
          .select('id')
          .single();

        if (insertError) {
          console.error('Error creating facility with new UUID:', insertError);
          return null;
        }
        
        console.log('Created new facility with UUID:', newFacilityId);
        return newFacilityId;
      }
      return null;
    }

    if (existing) {
      return existing.id;
    }

    // Facility doesn't exist - check if facilityId is valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let finalFacilityId = facilityId;

    if (!uuidRegex.test(facilityId)) {
      // Generate a proper UUID
      finalFacilityId = crypto.randomUUID();
    }

    // Create the facility
    const { data: newFacility, error: insertError } = await supabase
      .from('facilities')
      .insert({
        id: finalFacilityId,
        name: facilityName || 'Health Facility',
        code: facilityId.substring(0, 10).toUpperCase(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error creating facility:', insertError);
      return null;
    }

    console.log('Created facility:', newFacility.id);
    return newFacility.id;
  } catch (err) {
    console.error('Error in ensureFacilityExists:', err);
    return null;
  }
}

export function useInventory() {
  const { user } = useAuth();
  const facilityId = user?.facilityId;
  const facilityName = user?.facility;
  const userId = user?.uid;
  
  const [inventory, setInventory] = useState<VaccineInventory[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [wastageRecords, setWastageRecords] = useState<VaccineWastageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supabaseFacilityId, setSupabaseFacilityId] = useState<string | null>(null);

  // Initialize facility in Supabase
  useEffect(() => {
    if (facilityId && facilityName) {
      ensureFacilityExists(facilityId, facilityName).then(id => {
        if (id) {
          setSupabaseFacilityId(id);
        }
      });
    }
  }, [facilityId, facilityName]);

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    const effectiveFacilityId = supabaseFacilityId || facilityId;
    if (!effectiveFacilityId) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .eq('facility_id', effectiveFacilityId)
        .eq('is_active', true)
        .order('expiry_date', { ascending: true });

      if (fetchError) {
        // If UUID format error, inventory table might be empty for this facility
        if (fetchError.message?.includes('invalid input syntax for type uuid')) {
          setInventory([]);
          return;
        }
        throw fetchError;
      }
      setInventory((data as VaccineInventory[]) || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [supabaseFacilityId, facilityId]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (inventoryId?: string) => {
    const effectiveFacilityId = supabaseFacilityId || facilityId;
    if (!effectiveFacilityId) return;
    
    try {
      let query = supabase
        .from('inventory_transactions')
        .select('*')
        .eq('facility_id', effectiveFacilityId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (inventoryId) {
        query = query.eq('inventory_id', inventoryId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        if (fetchError.message?.includes('invalid input syntax for type uuid')) {
          setTransactions([]);
          return;
        }
        throw fetchError;
      }
      setTransactions((data as InventoryTransaction[]) || []);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    }
  }, [supabaseFacilityId, facilityId]);

  // Fetch wastage records
  const fetchWastageRecords = useCallback(async () => {
    const effectiveFacilityId = supabaseFacilityId || facilityId;
    if (!effectiveFacilityId) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('vaccine_wastage')
        .select('*')
        .eq('facility_id', effectiveFacilityId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) {
        if (fetchError.message?.includes('invalid input syntax for type uuid')) {
          setWastageRecords([]);
          return;
        }
        throw fetchError;
      }
      setWastageRecords((data as VaccineWastageRecord[]) || []);
    } catch (err: any) {
      console.error('Error fetching wastage records:', err);
    }
  }, [supabaseFacilityId, facilityId]);

  useEffect(() => {
    if (supabaseFacilityId || facilityId) {
      fetchInventory();
      fetchTransactions();
      fetchWastageRecords();
    }
  }, [supabaseFacilityId, facilityId, fetchInventory, fetchTransactions, fetchWastageRecords]);

  // Add new inventory item
  const addInventoryItem = async (data: InventoryFormData): Promise<boolean> => {
    // Validate user
    if (!userId) {
      toast.error('Please log in to add inventory');
      return false;
    }
    
    // Get or create facility ID
    let effectiveFacilityId = supabaseFacilityId;
    if (!effectiveFacilityId && facilityId && facilityName) {
      effectiveFacilityId = await ensureFacilityExists(facilityId, facilityName);
      if (effectiveFacilityId) {
        setSupabaseFacilityId(effectiveFacilityId);
      }
    }

    if (!effectiveFacilityId) {
      toast.error('Please complete facility onboarding first. Go to Settings or logout and login again.');
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
        facility_id: effectiveFacilityId, 
        user_id: userId,
        vaccine_name: data.vaccine_name,
        batch_number: data.batch_number,
        quantity: data.quantity
      });

      const { data: newItem, error: insertError } = await supabase
        .from('vaccine_inventory')
        .insert({
          facility_id: effectiveFacilityId,
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

      // Log the transaction with full audit details
      const { error: transactionError } = await supabase.from('inventory_transactions').insert({
        facility_id: effectiveFacilityId,
        inventory_id: newItem.id,
        transaction_type: 'received',
        quantity: data.quantity,
        old_quantity: 0,
        new_quantity: data.quantity,
        batch_number: data.batch_number.trim(),
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
    
    const effectiveFacilityId = supabaseFacilityId || facilityId;
    if (!effectiveFacilityId) {
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

      // Log the transaction with full audit details
      const { error: transactionError } = await supabase.from('inventory_transactions').insert({
        facility_id: effectiveFacilityId,
        inventory_id: inventoryId,
        transaction_type: transactionData.transaction_type,
        quantity: transactionData.quantity,
        old_quantity: item.quantity,
        new_quantity: newQuantity,
        batch_number: item.batch_number,
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
    const effectiveFacilityId = supabaseFacilityId || facilityId;
    if (!effectiveFacilityId || !userId) {
      return { success: false, reason: 'not_authenticated' };
    }

    try {
      // Call the atomic FEFO deduction function
      const { data, error } = await supabase.rpc('deduct_vaccine_fefo', {
        p_facility_id: effectiveFacilityId,
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
    const effectiveFacilityId = supabaseFacilityId || facilityId;
    if (!effectiveFacilityId) return null;

    try {
      const { data, error } = await supabase.rpc('get_vaccine_inventory_status', {
        p_facility_id: effectiveFacilityId,
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
    const effectiveFacilityId = supabaseFacilityId || facilityId;
    if (!effectiveFacilityId || !userId) {
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
    const effectiveFacilityId = supabaseFacilityId || facilityId;
    if (!effectiveFacilityId || !userId) {
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
          facility_id: effectiveFacilityId,
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
        facility_id: effectiveFacilityId,
        inventory_id: data.inventory_id,
        transaction_type: 'wasted',
        quantity: data.quantity,
        old_quantity: item.quantity,
        new_quantity: newQuantity,
        batch_number: item.batch_number,
        reason: `${data.wastage_type}: ${data.reason}${data.notes ? ` - ${data.notes}` : ''}`,
        performed_by_user_id: userId
      });

      toast.success('Wastage recorded successfully');
      await fetchInventory();
      await fetchWastageRecords();
      await fetchTransactions();
      return true;
    } catch (err: any) {
      console.error('Failed to record wastage:', err);
      toast.error(`Failed to record wastage: ${err.message}`);
      return false;
    }
  };

  // Get wastage summary
  const getWastageSummary = useCallback(() => {
    const summary: Record<string, { total: number; opened: number; expired: number; damaged: number; other: number }> = {};
    
    wastageRecords.forEach(record => {
      const item = inventory.find(i => i.id === record.inventory_id);
      const vaccineName = item?.vaccine_name || 'Unknown';
      
      if (!summary[vaccineName]) {
        summary[vaccineName] = { total: 0, opened: 0, expired: 0, damaged: 0, other: 0 };
      }
      
      summary[vaccineName].total += record.quantity;
      
      switch (record.wastage_type) {
        case 'opened':
          summary[vaccineName].opened += record.quantity;
          break;
        case 'expired':
          summary[vaccineName].expired += record.quantity;
          break;
        case 'damaged':
          summary[vaccineName].damaged += record.quantity;
          break;
        default:
          summary[vaccineName].other += record.quantity;
      }
    });
    
    return summary;
  }, [wastageRecords, inventory]);

  // Reconcile stock - compare physical count with system and adjust
  const reconcileStock = async (
    inventoryId: string, 
    physicalCount: number, 
    reason: string
  ): Promise<boolean> => {
    const effectiveFacilityId = supabaseFacilityId || facilityId;
    if (!effectiveFacilityId || !userId) {
      toast.error('Please log in to reconcile stock');
      return false;
    }

    try {
      const item = inventory.find(i => i.id === inventoryId);
      if (!item) {
        toast.error('Inventory item not found');
        return false;
      }

      if (physicalCount < 0) {
        toast.error('Physical count cannot be negative');
        return false;
      }

      const difference = physicalCount - item.quantity;
      if (difference === 0) {
        toast.info('Stock count matches system records');
        return true;
      }

      // Update inventory to physical count
      const { error: updateError } = await supabase
        .from('vaccine_inventory')
        .update({ quantity: physicalCount })
        .eq('id', inventoryId);

      if (updateError) throw updateError;

      // Log the adjustment transaction
      const { error: transactionError } = await supabase.from('inventory_transactions').insert({
        facility_id: effectiveFacilityId,
        inventory_id: inventoryId,
        transaction_type: 'adjusted',
        quantity: Math.abs(difference),
        old_quantity: item.quantity,
        new_quantity: physicalCount,
        batch_number: item.batch_number,
        reason: `Stock reconciliation: ${reason}. ${difference > 0 ? 'Added' : 'Removed'} ${Math.abs(difference)} doses.`,
        performed_by_user_id: userId
      });

      if (transactionError) {
        console.error('Transaction log error:', transactionError);
      }

      toast.success(`Stock reconciled: ${difference > 0 ? '+' : ''}${difference} doses adjusted`);
      await fetchInventory();
      await fetchTransactions();
      return true;
    } catch (err: any) {
      console.error('Failed to reconcile stock:', err);
      toast.error(`Failed to reconcile stock: ${err.message}`);
      return false;
    }
  };

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([fetchInventory(), fetchTransactions(), fetchWastageRecords()]);
  }, [fetchInventory, fetchTransactions, fetchWastageRecords]);

  return {
    inventory,
    transactions,
    wastageRecords,
    loading,
    error,
    facilityId: supabaseFacilityId || facilityId,
    addInventoryItem,
    updateInventoryQuantity,
    deleteInventoryItem,
    recordAdministration,
    recordWastage,
    reconcileStock,
    getStockSummary,
    getConsumptionRate,
    getLowStockAlerts,
    getExpiryAlerts,
    getWastageSummary,
    getVaccineInventoryStatus,
    refetch,
  };
}