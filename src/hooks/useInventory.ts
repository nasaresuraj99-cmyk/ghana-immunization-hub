import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import type { 
  VaccineInventory, 
  InventoryTransaction, 
  OutreachSession,
  OutreachInventoryAllocation,
  VaccineWastage,
  InventoryStockSettings,
  InventoryFormData, 
  TransactionFormData,
  WastageFormData,
  StockAlert
} from '@/types/inventory';

export function useInventory() {
  const { user } = useAuth();
  const facilityId = user?.facilityId;
  const userId = user?.uid;
  
  const [inventory, setInventory] = useState<VaccineInventory[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [outreachSessions, setOutreachSessions] = useState<OutreachSession[]>([]);
  const [allocations, setAllocations] = useState<OutreachInventoryAllocation[]>([]);
  const [wastageRecords, setWastageRecords] = useState<VaccineWastage[]>([]);
  const [stockSettings, setStockSettings] = useState<InventoryStockSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all inventory data
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
      
      // Map database fields to our interface
      const mappedData: VaccineInventory[] = (data || []).map(item => ({
        ...item,
        status: item.status as VaccineInventory['status'] || 'available',
        source: item.source as VaccineInventory['source'],
        minimum_stock_level: item.minimum_stock_level || 50,
        critical_stock_level: item.critical_stock_level || 20
      }));
      
      setInventory(mappedData);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (inventoryId?: string, limit = 100) => {
    if (!facilityId) return;
    
    try {
      let query = supabase
        .from('inventory_transactions')
        .select('*')
        .eq('facility_id', facilityId)
        .order('created_at', { ascending: false })
        .limit(limit);

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

  // Fetch outreach sessions
  const fetchOutreachSessions = useCallback(async () => {
    if (!facilityId) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('outreach_sessions')
        .select('*')
        .eq('facility_id', facilityId)
        .order('session_date', { ascending: false });

      if (fetchError) throw fetchError;
      setOutreachSessions((data as OutreachSession[]) || []);
    } catch (err: any) {
      console.error('Error fetching outreach sessions:', err);
    }
  }, [facilityId]);

  // Fetch allocations
  const fetchAllocations = useCallback(async (sessionId?: string) => {
    if (!facilityId) return;
    
    try {
      let query = supabase
        .from('outreach_inventory_allocations')
        .select('*')
        .eq('facility_id', facilityId);

      if (sessionId) {
        query = query.eq('outreach_session_id', sessionId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setAllocations((data as OutreachInventoryAllocation[]) || []);
    } catch (err: any) {
      console.error('Error fetching allocations:', err);
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
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWastageRecords((data as VaccineWastage[]) || []);
    } catch (err: any) {
      console.error('Error fetching wastage records:', err);
    }
  }, [facilityId]);

  // Fetch stock settings
  const fetchStockSettings = useCallback(async () => {
    if (!facilityId) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('inventory_stock_settings')
        .select('*')
        .eq('facility_id', facilityId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setStockSettings(data as InventoryStockSettings | null);
    } catch (err: any) {
      console.error('Error fetching stock settings:', err);
    }
  }, [facilityId]);

  useEffect(() => {
    if (facilityId) {
      Promise.all([
        fetchInventory(),
        fetchTransactions(),
        fetchOutreachSessions(),
        fetchAllocations(),
        fetchWastageRecords(),
        fetchStockSettings()
      ]);
    }
  }, [facilityId, fetchInventory, fetchTransactions, fetchOutreachSessions, fetchAllocations, fetchWastageRecords, fetchStockSettings]);

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
          manufacturer: data.manufacturer || null,
          quantity: data.quantity,
          initial_quantity: data.quantity,
          expiry_date: data.expiry_date,
          received_date: data.received_date || new Date().toISOString().split('T')[0],
          supplier: data.supplier || null,
          source: data.source || 'GHS',
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
        old_quantity: 0,
        new_quantity: data.quantity,
        batch_number: data.batch_number,
        reason: `Initial stock received from ${data.supplier || data.source || 'supplier'}`,
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

  // Update inventory quantity with concurrency control
  const updateInventoryQuantity = async (
    inventoryId: string,
    transactionData: TransactionFormData
  ): Promise<boolean> => {
    if (!facilityId || !userId) {
      toast.error('Please log in to update inventory');
      return false;
    }

    try {
      // Get current item with fresh data
      const { data: currentItem, error: fetchErr } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .eq('id', inventoryId)
        .single();
      
      if (fetchErr || !currentItem) throw new Error('Inventory item not found');

      const oldQuantity = currentItem.quantity;
      let newQuantity = oldQuantity;
      
      if (transactionData.transaction_type === 'received' || transactionData.transaction_type === 'adjusted' || transactionData.transaction_type === 'returned') {
        newQuantity += transactionData.quantity;
      } else {
        newQuantity -= transactionData.quantity;
        if (newQuantity < 0) {
          toast.error('Insufficient stock - cannot go below zero');
          return false;
        }
      }

      // Update inventory quantity with optimistic locking
      const { error: updateError } = await supabase
        .from('vaccine_inventory')
        .update({ quantity: newQuantity })
        .eq('id', inventoryId)
        .eq('quantity', oldQuantity); // Optimistic lock

      if (updateError) throw updateError;

      // Log the transaction
      await supabase.from('inventory_transactions').insert({
        facility_id: facilityId,
        inventory_id: inventoryId,
        transaction_type: transactionData.transaction_type,
        quantity: transactionData.quantity,
        old_quantity: oldQuantity,
        new_quantity: newQuantity,
        batch_number: currentItem.batch_number,
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

  // Get available batch for vaccine using FIFO (First Expiry First Out)
  const getAvailableBatchFIFO = useCallback((vaccineName: string, quantity: number = 1): VaccineInventory | null => {
    const today = new Date().toISOString().split('T')[0];
    
    // Filter valid batches: not expired, has enough stock, is active
    const availableBatches = inventory
      .filter(i => 
        i.vaccine_name.toLowerCase().includes(vaccineName.toLowerCase()) && 
        i.quantity >= quantity && 
        i.expiry_date >= today &&
        i.is_active &&
        i.status !== 'expired'
      )
      .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

    return availableBatches[0] || null;
  }, [inventory]);

  // Record vaccine administration (deduct from inventory with FIFO)
  const recordAdministration = async (
    vaccineName: string,
    quantity: number = 1,
    childId?: string,
    sessionId?: string,
    outreachSessionId?: string
  ): Promise<{ success: boolean; batchNumber?: string; inventoryId?: string }> => {
    if (!facilityId || !userId) return { success: false };

    try {
      // Find the oldest non-expired batch with sufficient stock (FIFO)
      const availableBatch = getAvailableBatchFIFO(vaccineName, quantity);

      if (!availableBatch) {
        console.warn(`No available stock for ${vaccineName}`);
        return { success: false };
      }

      // Check if expired
      const today = new Date().toISOString().split('T')[0];
      if (availableBatch.expiry_date < today) {
        toast.error(`Cannot use expired vaccine batch: ${availableBatch.batch_number}`);
        return { success: false };
      }

      const oldQuantity = availableBatch.quantity;
      const newQuantity = oldQuantity - quantity;

      // Update inventory with optimistic locking
      const { error: updateError } = await supabase
        .from('vaccine_inventory')
        .update({ quantity: newQuantity })
        .eq('id', availableBatch.id)
        .eq('quantity', oldQuantity);

      if (updateError) throw updateError;

      // Log transaction
      await supabase.from('inventory_transactions').insert({
        facility_id: facilityId,
        inventory_id: availableBatch.id,
        transaction_type: 'administered',
        quantity: quantity,
        old_quantity: oldQuantity,
        new_quantity: newQuantity,
        batch_number: availableBatch.batch_number,
        child_id: childId || null,
        session_id: sessionId || null,
        outreach_session_id: outreachSessionId || null,
        reason: `Vaccine administered`,
        performed_by_user_id: userId
      });

      // Refresh inventory in background
      fetchInventory();

      return { 
        success: true, 
        batchNumber: availableBatch.batch_number,
        inventoryId: availableBatch.id
      };
    } catch (err: any) {
      console.error('Error recording administration:', err);
      return { success: false };
    }
  };

  // Record wastage
  const recordWastage = async (data: WastageFormData): Promise<boolean> => {
    if (!facilityId || !userId) {
      toast.error('Please log in to record wastage');
      return false;
    }

    try {
      // Get current inventory item
      const { data: currentItem, error: fetchErr } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .eq('id', data.inventory_id)
        .single();
      
      if (fetchErr || !currentItem) throw new Error('Inventory item not found');

      const oldQuantity = currentItem.quantity;
      const newQuantity = oldQuantity - data.quantity;

      if (newQuantity < 0) {
        toast.error('Cannot waste more than available stock');
        return false;
      }

      // Update inventory
      const { error: updateError } = await supabase
        .from('vaccine_inventory')
        .update({ quantity: newQuantity })
        .eq('id', data.inventory_id)
        .eq('quantity', oldQuantity);

      if (updateError) throw updateError;

      // Record wastage
      const { error: wastageError } = await supabase
        .from('vaccine_wastage')
        .insert({
          facility_id: facilityId,
          inventory_id: data.inventory_id,
          quantity: data.quantity,
          reason: data.reason,
          wastage_type: data.wastage_type,
          outreach_session_id: data.outreach_session_id || null,
          notes: data.notes || null,
          recorded_by_user_id: userId
        });

      if (wastageError) throw wastageError;

      // Log transaction
      await supabase.from('inventory_transactions').insert({
        facility_id: facilityId,
        inventory_id: data.inventory_id,
        transaction_type: 'wasted',
        quantity: data.quantity,
        old_quantity: oldQuantity,
        new_quantity: newQuantity,
        batch_number: currentItem.batch_number,
        outreach_session_id: data.outreach_session_id || null,
        reason: `Wastage: ${data.reason} (${data.wastage_type})`,
        performed_by_user_id: userId
      });

      toast.success('Wastage recorded successfully');
      await Promise.all([fetchInventory(), fetchTransactions(), fetchWastageRecords()]);
      return true;
    } catch (err: any) {
      toast.error(`Failed to record wastage: ${err.message}`);
      return false;
    }
  };

  // Create outreach session
  const createOutreachSession = async (data: Omit<OutreachSession, 'id' | 'facility_id' | 'created_by_user_id' | 'created_at' | 'updated_at'>): Promise<string | null> => {
    if (!facilityId || !userId) {
      toast.error('Please log in to create session');
      return null;
    }

    try {
      const { data: newSession, error: insertError } = await supabase
        .from('outreach_sessions')
        .insert({
          facility_id: facilityId,
          session_name: data.session_name,
          session_date: data.session_date,
          location: data.location || null,
          status: data.status || 'planned',
          notes: data.notes || null,
          created_by_user_id: userId
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Outreach session created');
      await fetchOutreachSessions();
      return newSession.id;
    } catch (err: any) {
      toast.error(`Failed to create session: ${err.message}`);
      return null;
    }
  };

  // Allocate inventory to outreach session
  const allocateToOutreach = async (
    sessionId: string,
    inventoryId: string,
    quantity: number
  ): Promise<boolean> => {
    if (!facilityId || !userId) {
      toast.error('Please log in to allocate inventory');
      return false;
    }

    try {
      // Get current inventory item
      const { data: currentItem, error: fetchErr } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .eq('id', inventoryId)
        .single();
      
      if (fetchErr || !currentItem) throw new Error('Inventory item not found');

      const oldQuantity = currentItem.quantity;
      
      if (quantity > oldQuantity) {
        toast.error('Cannot allocate more than available stock');
        return false;
      }

      const newQuantity = oldQuantity - quantity;

      // Update inventory
      const { error: updateError } = await supabase
        .from('vaccine_inventory')
        .update({ quantity: newQuantity })
        .eq('id', inventoryId)
        .eq('quantity', oldQuantity);

      if (updateError) throw updateError;

      // Create allocation record
      const { error: allocError } = await supabase
        .from('outreach_inventory_allocations')
        .insert({
          facility_id: facilityId,
          outreach_session_id: sessionId,
          inventory_id: inventoryId,
          allocated_quantity: quantity,
          status: 'allocated',
          created_by_user_id: userId
        });

      if (allocError) throw allocError;

      // Log transaction
      await supabase.from('inventory_transactions').insert({
        facility_id: facilityId,
        inventory_id: inventoryId,
        transaction_type: 'allocated',
        quantity: quantity,
        old_quantity: oldQuantity,
        new_quantity: newQuantity,
        batch_number: currentItem.batch_number,
        outreach_session_id: sessionId,
        reason: 'Allocated to outreach session',
        performed_by_user_id: userId
      });

      toast.success('Inventory allocated to session');
      await Promise.all([fetchInventory(), fetchTransactions(), fetchAllocations(sessionId)]);
      return true;
    } catch (err: any) {
      toast.error(`Failed to allocate: ${err.message}`);
      return false;
    }
  };

  // Reconcile outreach allocation (return unused vaccines)
  const reconcileOutreachAllocation = async (
    allocationId: string,
    usedQuantity: number,
    wastedQuantity: number,
    wastageReason?: string
  ): Promise<boolean> => {
    if (!facilityId || !userId) {
      toast.error('Please log in to reconcile');
      return false;
    }

    try {
      // Get allocation
      const { data: allocation, error: allocErr } = await supabase
        .from('outreach_inventory_allocations')
        .select('*')
        .eq('id', allocationId)
        .single();

      if (allocErr || !allocation) throw new Error('Allocation not found');

      const returnedQuantity = allocation.allocated_quantity - usedQuantity - wastedQuantity;
      
      if (returnedQuantity < 0) {
        toast.error('Used + wasted cannot exceed allocated quantity');
        return false;
      }

      // Get inventory item
      const { data: inventoryItem, error: invErr } = await supabase
        .from('vaccine_inventory')
        .select('*')
        .eq('id', allocation.inventory_id)
        .single();

      if (invErr || !inventoryItem) throw new Error('Inventory item not found');

      const oldQuantity = inventoryItem.quantity;
      const newQuantity = oldQuantity + returnedQuantity;

      // Update inventory (return unused)
      if (returnedQuantity > 0) {
        const { error: updateError } = await supabase
          .from('vaccine_inventory')
          .update({ quantity: newQuantity })
          .eq('id', allocation.inventory_id);

        if (updateError) throw updateError;

        // Log return transaction
        await supabase.from('inventory_transactions').insert({
          facility_id: facilityId,
          inventory_id: allocation.inventory_id,
          transaction_type: 'returned',
          quantity: returnedQuantity,
          old_quantity: oldQuantity,
          new_quantity: newQuantity,
          batch_number: inventoryItem.batch_number,
          outreach_session_id: allocation.outreach_session_id,
          reason: 'Returned from outreach session',
          performed_by_user_id: userId
        });
      }

      // Record wastage if any
      if (wastedQuantity > 0 && wastageReason) {
        await supabase.from('vaccine_wastage').insert({
          facility_id: facilityId,
          inventory_id: allocation.inventory_id,
          quantity: wastedQuantity,
          reason: wastageReason,
          wastage_type: 'other',
          outreach_session_id: allocation.outreach_session_id,
          recorded_by_user_id: userId
        });

        await supabase.from('inventory_transactions').insert({
          facility_id: facilityId,
          inventory_id: allocation.inventory_id,
          transaction_type: 'wasted',
          quantity: wastedQuantity,
          batch_number: inventoryItem.batch_number,
          outreach_session_id: allocation.outreach_session_id,
          reason: `Outreach wastage: ${wastageReason}`,
          performed_by_user_id: userId
        });
      }

      // Update allocation
      const { error: allocUpdateErr } = await supabase
        .from('outreach_inventory_allocations')
        .update({
          used_quantity: usedQuantity,
          returned_quantity: returnedQuantity,
          wasted_quantity: wastedQuantity,
          status: 'reconciled',
          reconciled_at: new Date().toISOString(),
          reconciled_by_user_id: userId
        })
        .eq('id', allocationId);

      if (allocUpdateErr) throw allocUpdateErr;

      toast.success('Outreach allocation reconciled');
      await Promise.all([fetchInventory(), fetchTransactions(), fetchAllocations(), fetchWastageRecords()]);
      return true;
    } catch (err: any) {
      toast.error(`Failed to reconcile: ${err.message}`);
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
    const summary: Record<string, { 
      total: number; 
      batches: number; 
      nearExpiry: number; 
      expired: number;
      lowStock: boolean;
      criticalStock: boolean;
      outOfStock: boolean;
    }> = {};
    
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    inventory.forEach(item => {
      const vaccineName = item.vaccine_name.split(' ')[0]; // Group by base vaccine name
      
      if (!summary[vaccineName]) {
        summary[vaccineName] = { 
          total: 0, 
          batches: 0, 
          nearExpiry: 0, 
          expired: 0,
          lowStock: false,
          criticalStock: false,
          outOfStock: false
        };
      }

      const expiryDate = new Date(item.expiry_date);
      summary[vaccineName].total += item.quantity;
      summary[vaccineName].batches += 1;

      if (expiryDate < today) {
        summary[vaccineName].expired += item.quantity;
      } else if (expiryDate <= thirtyDaysFromNow) {
        summary[vaccineName].nearExpiry += item.quantity;
      }
    });

    // Calculate stock status for each vaccine
    Object.keys(summary).forEach(vaccine => {
      const minStock = stockSettings?.vaccine_specific_settings?.[vaccine]?.minimum || stockSettings?.default_minimum_stock || 50;
      const critStock = stockSettings?.vaccine_specific_settings?.[vaccine]?.critical || stockSettings?.default_critical_stock || 20;
      
      summary[vaccine].outOfStock = summary[vaccine].total === 0;
      summary[vaccine].criticalStock = summary[vaccine].total > 0 && summary[vaccine].total <= critStock;
      summary[vaccine].lowStock = summary[vaccine].total > critStock && summary[vaccine].total <= minStock;
    });

    return summary;
  }, [inventory, stockSettings]);

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
        const vaccineName = inventoryItem.vaccine_name.split(' ')[0];
        rateByVaccine[vaccineName] = (rateByVaccine[vaccineName] || 0) + t.quantity;
      }
    });

    return rateByVaccine;
  }, [transactions, inventory]);

  // Get wastage rate
  const getWastageRate = useCallback(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentWastage = wastageRecords.filter(
      w => new Date(w.created_at) >= thirtyDaysAgo
    );

    const byType: Record<string, number> = {};
    const byVaccine: Record<string, number> = {};
    let totalWasted = 0;

    recentWastage.forEach(w => {
      byType[w.wastage_type] = (byType[w.wastage_type] || 0) + w.quantity;
      
      const inventoryItem = inventory.find(i => i.id === w.inventory_id);
      if (inventoryItem) {
        const vaccineName = inventoryItem.vaccine_name.split(' ')[0];
        byVaccine[vaccineName] = (byVaccine[vaccineName] || 0) + w.quantity;
      }
      
      totalWasted += w.quantity;
    });

    return { byType, byVaccine, totalWasted };
  }, [wastageRecords, inventory]);

  // Get stock alerts
  const getStockAlerts = useCallback((): StockAlert[] => {
    const alerts: StockAlert[] = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    inventory.forEach(item => {
      const expiryDate = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const minStock = item.minimum_stock_level || 50;
      const critStock = item.critical_stock_level || 20;

      // Expired
      if (expiryDate < today) {
        alerts.push({
          type: 'expired',
          vaccine_name: item.vaccine_name,
          batch_number: item.batch_number,
          inventory_id: item.id,
          quantity: item.quantity,
          expiry_date: item.expiry_date,
          days_until_expiry: daysUntilExpiry,
          message: `EXPIRED: ${item.vaccine_name} batch ${item.batch_number} has expired`
        });
      }
      // Near expiry (7 days)
      else if (expiryDate <= sevenDaysFromNow) {
        alerts.push({
          type: 'near-expiry',
          vaccine_name: item.vaccine_name,
          batch_number: item.batch_number,
          inventory_id: item.id,
          quantity: item.quantity,
          expiry_date: item.expiry_date,
          days_until_expiry: daysUntilExpiry,
          message: `CRITICAL EXPIRY: ${item.vaccine_name} batch ${item.batch_number} expires in ${daysUntilExpiry} days`
        });
      }
      // Near expiry (30 days)
      else if (expiryDate <= thirtyDaysFromNow) {
        alerts.push({
          type: 'near-expiry',
          vaccine_name: item.vaccine_name,
          batch_number: item.batch_number,
          inventory_id: item.id,
          quantity: item.quantity,
          expiry_date: item.expiry_date,
          days_until_expiry: daysUntilExpiry,
          message: `WARNING: ${item.vaccine_name} batch ${item.batch_number} expires in ${daysUntilExpiry} days`
        });
      }

      // Out of stock
      if (item.quantity === 0) {
        alerts.push({
          type: 'out-of-stock',
          vaccine_name: item.vaccine_name,
          batch_number: item.batch_number,
          inventory_id: item.id,
          quantity: 0,
          message: `OUT OF STOCK: ${item.vaccine_name} batch ${item.batch_number}`
        });
      }
      // Critical stock
      else if (item.quantity <= critStock) {
        alerts.push({
          type: 'critical',
          vaccine_name: item.vaccine_name,
          batch_number: item.batch_number,
          inventory_id: item.id,
          quantity: item.quantity,
          message: `CRITICAL: ${item.vaccine_name} batch ${item.batch_number} has only ${item.quantity} doses`
        });
      }
      // Low stock
      else if (item.quantity <= minStock) {
        alerts.push({
          type: 'low',
          vaccine_name: item.vaccine_name,
          batch_number: item.batch_number,
          inventory_id: item.id,
          quantity: item.quantity,
          message: `LOW STOCK: ${item.vaccine_name} batch ${item.batch_number} has ${item.quantity} doses`
        });
      }
    });

    // Sort by severity
    const severityOrder = { 'expired': 0, 'out-of-stock': 1, 'critical': 2, 'near-expiry': 3, 'low': 4 };
    alerts.sort((a, b) => severityOrder[a.type] - severityOrder[b.type]);

    return alerts;
  }, [inventory]);

  // Get low stock alerts (legacy - for backward compatibility)
  const getLowStockAlerts = useCallback((threshold: number = 50) => {
    const summary = getStockSummary();
    return Object.entries(summary)
      .filter(([_, data]) => data.total < threshold)
      .map(([vaccine, data]) => ({ vaccine, ...data }));
  }, [getStockSummary]);

  // Get expiry alerts (legacy - for backward compatibility)
  const getExpiryAlerts = useCallback(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return inventory.filter(item => {
      const expiryDate = new Date(item.expiry_date);
      return expiryDate <= thirtyDaysFromNow && item.quantity > 0;
    }).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  }, [inventory]);

  // Check if vaccine is available for administration
  const isVaccineAvailable = useCallback((vaccineName: string, quantity: number = 1): boolean => {
    return getAvailableBatchFIFO(vaccineName, quantity) !== null;
  }, [getAvailableBatchFIFO]);

  // Memoized alerts for dashboard
  const stockAlerts = useMemo(() => getStockAlerts(), [getStockAlerts]);
  const criticalAlerts = useMemo(() => stockAlerts.filter(a => a.type === 'expired' || a.type === 'critical' || a.type === 'out-of-stock'), [stockAlerts]);

  return {
    // Data
    inventory,
    transactions,
    outreachSessions,
    allocations,
    wastageRecords,
    stockSettings,
    loading,
    error,
    
    // CRUD Operations
    addInventoryItem,
    updateInventoryQuantity,
    deleteInventoryItem,
    recordAdministration,
    recordWastage,
    
    // Outreach Operations
    createOutreachSession,
    allocateToOutreach,
    reconcileOutreachAllocation,
    
    // Stock Analysis
    getStockSummary,
    getConsumptionRate,
    getWastageRate,
    getStockAlerts,
    getLowStockAlerts,
    getExpiryAlerts,
    getAvailableBatchFIFO,
    isVaccineAvailable,
    
    // Computed
    stockAlerts,
    criticalAlerts,
    
    // Refetch
    refetch: fetchInventory,
    refetchAll: () => Promise.all([
      fetchInventory(),
      fetchTransactions(),
      fetchOutreachSessions(),
      fetchAllocations(),
      fetchWastageRecords()
    ])
  };
}
