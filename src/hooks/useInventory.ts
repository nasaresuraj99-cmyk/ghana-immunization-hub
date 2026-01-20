import { useState, useEffect, useCallback } from 'react';
import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc,
  deleteDoc,
  query, 
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from '@/lib/firebase';
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

export interface StockSettings {
  id: string;
  facility_id: string;
  default_minimum_stock: number;
  default_critical_stock: number;
  near_expiry_warning_days: number;
  critical_expiry_warning_days: number;
  vaccine_specific_settings: Record<string, { minimum_stock: number; critical_stock: number }>;
  created_at: string;
  updated_at: string;
}

const LOCAL_STORAGE_KEY = 'immunization_inventory_data';
const PENDING_INVENTORY_SYNC_KEY = 'immunization_pending_inventory_sync';

interface PendingSync {
  action: 'add' | 'update' | 'delete';
  itemId: string;
  collectionName: string;
  data?: any;
  timestamp: number;
}

const loadFromLocalStorage = (): VaccineInventory[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading inventory from localStorage:', e);
  }
  return [];
};

const saveToLocalStorage = (inventory: VaccineInventory[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(inventory));
  } catch (e) {
    console.error('Error saving inventory to localStorage:', e);
  }
};

const loadPendingSyncs = (): PendingSync[] => {
  try {
    const stored = localStorage.getItem(PENDING_INVENTORY_SYNC_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading pending inventory syncs:', e);
  }
  return [];
};

const savePendingSyncs = (syncs: PendingSync[]) => {
  try {
    localStorage.setItem(PENDING_INVENTORY_SYNC_KEY, JSON.stringify(syncs));
  } catch (e) {
    console.error('Error saving pending inventory syncs:', e);
  }
};

// Sanitize object for Firebase (remove undefined values)
const sanitizeForFirebase = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirebase(item));
  }
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirebase(value);
      }
    }
    return sanitized;
  }
  return obj;
};

export function useInventory() {
  const { user } = useAuth();
  const facilityId = user?.facilityId;
  const facilityName = user?.facility;
  const userId = user?.uid;
  
  const [inventory, setInventory] = useState<VaccineInventory[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [wastageRecords, setWastageRecords] = useState<VaccineWastageRecord[]>([]);
  const [stockSettings, setStockSettings] = useState<StockSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add pending sync
  const addPendingSync = useCallback((sync: PendingSync) => {
    const pending = loadPendingSyncs();
    const filtered = pending.filter(p => !(p.itemId === sync.itemId && p.collectionName === sync.collectionName));
    filtered.push(sync);
    savePendingSyncs(filtered);
  }, []);

  // Sync to Firebase
  const syncToFirebase = useCallback(async (
    collectionName: string,
    itemId: string, 
    data: any | null, 
    action: PendingSync['action']
  ) => {
    const sanitizedData = data ? sanitizeForFirebase(data) : null;
    
    // Add to pending first
    addPendingSync({ 
      action, 
      itemId, 
      collectionName,
      data: sanitizedData, 
      timestamp: Date.now() 
    });

    if (navigator.onLine) {
      try {
        const docRef = doc(db, collectionName, itemId);
        if (action === 'delete') {
          await deleteDoc(docRef);
        } else if (sanitizedData) {
          await setDoc(docRef, sanitizedData);
        }
        
        // Remove from pending on success
        const pending = loadPendingSyncs();
        const filtered = pending.filter(p => !(p.itemId === itemId && p.collectionName === collectionName));
        savePendingSyncs(filtered);
      } catch (error) {
        console.error('Firebase sync error:', error);
      }
    }
  }, [addPendingSync]);

  // Sync pending changes
  const syncPendingChanges = useCallback(async () => {
    if (!navigator.onLine) return;

    const pendingSyncs = loadPendingSyncs();
    if (pendingSyncs.length === 0) return;

    const successfulSyncs: number[] = [];

    for (let i = 0; i < pendingSyncs.length; i++) {
      const sync = pendingSyncs[i];
      try {
        const docRef = doc(db, sync.collectionName, sync.itemId);
        if (sync.action === 'delete') {
          await deleteDoc(docRef);
        } else if (sync.data) {
          await setDoc(docRef, sync.data);
        }
        successfulSyncs.push(i);
      } catch (error) {
        console.error('Error syncing:', error);
      }
    }

    const remainingSyncs = pendingSyncs.filter((_, index) => !successfulSyncs.includes(index));
    savePendingSyncs(remainingSyncs);
  }, []);

  // Fetch inventory from Firebase
  const fetchInventory = useCallback(async () => {
    if (!facilityId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);

      if (!navigator.onLine) {
        // Use local data when offline
        const localData = loadFromLocalStorage().filter(i => i.facility_id === facilityId && i.is_active);
        setInventory(localData);
        setLoading(false);
        return;
      }

      const inventoryRef = collection(db, 'vaccineInventory');
      const inventoryQuery = query(
        inventoryRef, 
        where('facility_id', '==', facilityId),
        where('is_active', '==', true)
      );
      
      const snapshot = await getDocs(inventoryQuery);
      const items: VaccineInventory[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          facility_id: data.facility_id,
          vaccine_name: data.vaccine_name,
          batch_number: data.batch_number,
          quantity: data.quantity,
          initial_quantity: data.initial_quantity,
          unit: data.unit || 'doses',
          expiry_date: data.expiry_date,
          received_date: data.received_date,
          supplier: data.supplier,
          storage_location: data.storage_location,
          temperature_requirement: data.temperature_requirement || '2-8°C',
          notes: data.notes,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at,
          created_by_user_id: data.created_by_user_id,
        } as VaccineInventory);
      });
      
      // Sort by expiry date (FEFO)
      items.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
      
      setInventory(items);
      saveToLocalStorage(items);

      // Sync any pending changes
      await syncPendingChanges();
    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      setError(err.message);
      // Fall back to local data
      const localData = loadFromLocalStorage().filter(i => i.facility_id === facilityId && i.is_active);
      setInventory(localData);
    } finally {
      setLoading(false);
    }
  }, [facilityId, syncPendingChanges]);

  // Fetch transactions from Firebase
  const fetchTransactions = useCallback(async (inventoryId?: string) => {
    if (!facilityId) return;
    
    try {
      if (!navigator.onLine) return;

      const transactionsRef = collection(db, 'inventoryTransactions');
      let transactionQuery = query(
        transactionsRef, 
        where('facility_id', '==', facilityId)
      );
      
      const snapshot = await getDocs(transactionQuery);
      const items: InventoryTransaction[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!inventoryId || data.inventory_id === inventoryId) {
          items.push({
            id: docSnap.id,
            facility_id: data.facility_id,
            inventory_id: data.inventory_id,
            transaction_type: data.transaction_type,
            quantity: data.quantity,
            child_id: data.child_id,
            session_id: data.session_id,
            outreach_session_id: data.outreach_session_id,
            batch_number: data.batch_number,
            old_quantity: data.old_quantity,
            new_quantity: data.new_quantity,
            reason: data.reason,
            performed_by_user_id: data.performed_by_user_id,
            created_at: data.created_at,
          } as InventoryTransaction);
        }
      });
      
      // Sort by created_at descending
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setTransactions(items.slice(0, 100));
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    }
  }, [facilityId]);

  // Fetch wastage records from Firebase
  const fetchWastageRecords = useCallback(async () => {
    if (!facilityId) return;
    
    try {
      if (!navigator.onLine) return;

      const wastageRef = collection(db, 'vaccineWastage');
      const wastageQuery = query(
        wastageRef, 
        where('facility_id', '==', facilityId)
      );
      
      const snapshot = await getDocs(wastageQuery);
      const items: VaccineWastageRecord[] = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          facility_id: data.facility_id,
          inventory_id: data.inventory_id,
          quantity: data.quantity,
          wastage_type: data.wastage_type,
          reason: data.reason,
          notes: data.notes,
          recorded_by_user_id: data.recorded_by_user_id,
          outreach_session_id: data.outreach_session_id,
          created_at: data.created_at,
        });
      });
      
      // Sort by created_at descending
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setWastageRecords(items.slice(0, 100));
    } catch (err: any) {
      console.error('Error fetching wastage records:', err);
    }
  }, [facilityId]);

  // Fetch stock settings
  const fetchStockSettings = useCallback(async () => {
    if (!facilityId) return;
    
    try {
      if (!navigator.onLine) return;

      const settingsRef = doc(db, 'inventoryStockSettings', facilityId);
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        setStockSettings({
          id: settingsSnap.id,
          facility_id: facilityId,
          default_minimum_stock: data.default_minimum_stock || 50,
          default_critical_stock: data.default_critical_stock || 20,
          near_expiry_warning_days: data.near_expiry_warning_days || 30,
          critical_expiry_warning_days: data.critical_expiry_warning_days || 7,
          vaccine_specific_settings: data.vaccine_specific_settings || {},
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      }
    } catch (err: any) {
      console.error('Error fetching stock settings:', err);
    }
  }, [facilityId]);

  useEffect(() => {
    if (facilityId) {
      fetchInventory();
      fetchTransactions();
      fetchWastageRecords();
      fetchStockSettings();
    }
  }, [facilityId, fetchInventory, fetchTransactions, fetchWastageRecords, fetchStockSettings]);

  // Add new inventory item
  const addInventoryItem = async (data: InventoryFormData): Promise<boolean> => {
    if (!userId) {
      toast.error('Please log in to add inventory');
      return false;
    }
    
    if (!facilityId) {
      toast.error('Please complete facility onboarding first. Go to Settings.');
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
      const itemId = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      const newItem: VaccineInventory = {
        id: itemId,
        facility_id: facilityId,
        vaccine_name: data.vaccine_name.trim(),
        batch_number: data.batch_number.trim(),
        quantity: data.quantity,
        initial_quantity: data.quantity,
        unit: 'doses',
        expiry_date: data.expiry_date,
        received_date: data.received_date || new Date().toISOString().split('T')[0],
        supplier: data.supplier?.trim() || undefined,
        storage_location: data.storage_location?.trim() || undefined,
        temperature_requirement: data.temperature_requirement || '2-8°C',
        notes: data.notes?.trim() || undefined,
        is_active: true,
        created_at: now,
        updated_at: now,
        created_by_user_id: userId,
      };

      // Update local state immediately
      setInventory(prev => [...prev, newItem].sort((a, b) => 
        new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
      ));

      // Sync to Firebase
      await syncToFirebase('vaccineInventory', itemId, newItem, 'add');

      // Log the transaction
      const transactionId = `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transaction: InventoryTransaction = {
        id: transactionId,
        facility_id: facilityId,
        inventory_id: itemId,
        transaction_type: 'received',
        quantity: data.quantity,
        old_quantity: 0,
        new_quantity: data.quantity,
        batch_number: data.batch_number.trim(),
        reason: `Initial stock received from ${data.supplier?.trim() || 'supplier'}`,
        performed_by_user_id: userId,
        created_at: now,
      };

      await syncToFirebase('inventoryTransactions', transactionId, transaction, 'add');
      setTransactions(prev => [transaction, ...prev]);

      toast.success('Inventory item added successfully');
      saveToLocalStorage([...inventory, newItem]);
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
    
    if (!facilityId) {
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

      const now = new Date().toISOString();

      // Update local state
      const updatedItem = { ...item, quantity: newQuantity, updated_at: now };
      setInventory(prev => prev.map(i => i.id === inventoryId ? updatedItem : i));

      // Sync to Firebase
      await syncToFirebase('vaccineInventory', inventoryId, updatedItem, 'update');

      // Log the transaction
      const transactionId = `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transaction: InventoryTransaction = {
        id: transactionId,
        facility_id: facilityId,
        inventory_id: inventoryId,
        transaction_type: transactionData.transaction_type,
        quantity: transactionData.quantity,
        old_quantity: item.quantity,
        new_quantity: newQuantity,
        batch_number: item.batch_number,
        reason: transactionData.reason || null,
        performed_by_user_id: userId,
        created_at: now,
      };

      await syncToFirebase('inventoryTransactions', transactionId, transaction, 'add');
      setTransactions(prev => [transaction, ...prev]);

      saveToLocalStorage(inventory.map(i => i.id === inventoryId ? updatedItem : i));
      toast.success('Inventory updated successfully');
      return true;
    } catch (err: any) {
      console.error('Failed to update inventory:', err);
      toast.error(`Failed to update inventory: ${err.message}`);
      return false;
    }
  };

  // Record vaccine administration using FEFO
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
      // Find the oldest non-expired batch with sufficient stock (FEFO)
      const today = new Date().toISOString().split('T')[0];
      const eligibleBatches = inventory.filter(item => 
        item.vaccine_name === vaccineName &&
        item.quantity >= quantity &&
        item.expiry_date >= today &&
        item.is_active
      ).sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

      if (eligibleBatches.length === 0) {
        // Check why
        const allBatches = inventory.filter(item => item.vaccine_name === vaccineName && item.is_active);
        const totalStock = allBatches.reduce((sum, item) => sum + item.quantity, 0);
        const expiredStock = allBatches.filter(item => item.expiry_date < today)
          .reduce((sum, item) => sum + item.quantity, 0);

        if (totalStock === 0) {
          return { success: false, reason: 'no_stock' };
        } else if (totalStock < quantity) {
          return { success: false, reason: 'insufficient_stock' };
        } else if (expiredStock === totalStock) {
          return { success: false, reason: 'all_expired' };
        } else {
          return { success: false, reason: 'insufficient_non_expired' };
        }
      }

      const batch = eligibleBatches[0];
      const newQuantity = batch.quantity - quantity;
      const now = new Date().toISOString();

      // Update local state
      const updatedItem = { ...batch, quantity: newQuantity, updated_at: now };
      setInventory(prev => prev.map(i => i.id === batch.id ? updatedItem : i));

      // Sync to Firebase
      await syncToFirebase('vaccineInventory', batch.id, updatedItem, 'update');

      // Log the transaction
      const transactionId = `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transaction: InventoryTransaction = {
        id: transactionId,
        facility_id: facilityId,
        inventory_id: batch.id,
        transaction_type: 'administered',
        quantity: quantity,
        old_quantity: batch.quantity,
        new_quantity: newQuantity,
        batch_number: batch.batch_number,
        child_id: childId || null,
        session_id: sessionId || null,
        reason: 'Vaccine administered via FEFO',
        performed_by_user_id: userId,
        created_at: now,
      };

      await syncToFirebase('inventoryTransactions', transactionId, transaction, 'add');
      setTransactions(prev => [transaction, ...prev]);

      saveToLocalStorage(inventory.map(i => i.id === batch.id ? updatedItem : i));

      return { 
        success: true, 
        batchNumber: batch.batch_number 
      };
    } catch (err: any) {
      console.error('Error in recordAdministration:', err);
      return { success: false, reason: 'exception' };
    }
  };

  // Get inventory status for a specific vaccine
  const getVaccineInventoryStatus = async (vaccineName: string) => {
    if (!facilityId) return null;

    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const vaccineItems = inventory.filter(item => 
        item.vaccine_name === vaccineName && item.is_active
      );

      const totalStock = vaccineItems.reduce((sum, item) => sum + item.quantity, 0);
      const availableStock = vaccineItems
        .filter(item => item.expiry_date >= today)
        .reduce((sum, item) => sum + item.quantity, 0);
      const expiredStock = vaccineItems
        .filter(item => item.expiry_date < today)
        .reduce((sum, item) => sum + item.quantity, 0);
      const nearExpiryStock = vaccineItems
        .filter(item => item.expiry_date >= today && item.expiry_date <= thirtyDaysFromNow)
        .reduce((sum, item) => sum + item.quantity, 0);

      const availableBatches = vaccineItems
        .filter(item => item.expiry_date >= today && item.quantity > 0)
        .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
        .map(item => ({
          id: item.id,
          batch_number: item.batch_number,
          quantity: item.quantity,
          expiry_date: item.expiry_date,
          days_until_expiry: Math.floor((new Date(item.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        }));

      return {
        vaccine_name: vaccineName,
        total_stock: totalStock,
        available_stock: availableStock,
        expired_stock: expiredStock,
        near_expiry_stock: nearExpiryStock,
        batch_count: vaccineItems.length,
        available_batches: availableBatches
      };
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
      const item = inventory.find(i => i.id === inventoryId);
      if (!item) {
        toast.error('Inventory item not found');
        return false;
      }

      const now = new Date().toISOString();
      const updatedItem = { ...item, is_active: false, updated_at: now };

      // Update local state
      setInventory(prev => prev.filter(i => i.id !== inventoryId));

      // Sync to Firebase
      await syncToFirebase('vaccineInventory', inventoryId, updatedItem, 'update');

      saveToLocalStorage(inventory.filter(i => i.id !== inventoryId));
      toast.success('Inventory item deleted');
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

  // Record vaccine wastage
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

      if (data.quantity <= 0) {
        toast.error('Quantity must be greater than 0');
        return false;
      }

      if (data.quantity > item.quantity) {
        toast.error(`Cannot waste more than available stock (${item.quantity} doses)`);
        return false;
      }

      const now = new Date().toISOString();
      const newQuantity = item.quantity - data.quantity;

      // Update inventory
      const updatedItem = { ...item, quantity: newQuantity, updated_at: now };
      setInventory(prev => prev.map(i => i.id === data.inventory_id ? updatedItem : i));
      await syncToFirebase('vaccineInventory', data.inventory_id, updatedItem, 'update');

      // Record wastage
      const wastageId = `waste-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const wastageRecord: VaccineWastageRecord = {
        id: wastageId,
        facility_id: facilityId,
        inventory_id: data.inventory_id,
        quantity: data.quantity,
        wastage_type: data.wastage_type,
        reason: data.reason,
        notes: data.notes || undefined,
        recorded_by_user_id: userId,
        created_at: now,
      };

      await syncToFirebase('vaccineWastage', wastageId, wastageRecord, 'add');
      setWastageRecords(prev => [wastageRecord, ...prev]);

      // Log transaction
      const transactionId = `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transaction: InventoryTransaction = {
        id: transactionId,
        facility_id: facilityId,
        inventory_id: data.inventory_id,
        transaction_type: 'wasted',
        quantity: data.quantity,
        old_quantity: item.quantity,
        new_quantity: newQuantity,
        batch_number: item.batch_number,
        reason: `${data.wastage_type}: ${data.reason}${data.notes ? ` - ${data.notes}` : ''}`,
        performed_by_user_id: userId,
        created_at: now,
      };

      await syncToFirebase('inventoryTransactions', transactionId, transaction, 'add');
      setTransactions(prev => [transaction, ...prev]);

      saveToLocalStorage(inventory.map(i => i.id === data.inventory_id ? updatedItem : i));
      toast.success('Wastage recorded successfully');
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
    if (!facilityId || !userId) {
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

      const now = new Date().toISOString();

      // Update inventory to physical count
      const updatedItem = { ...item, quantity: physicalCount, updated_at: now };
      setInventory(prev => prev.map(i => i.id === inventoryId ? updatedItem : i));
      await syncToFirebase('vaccineInventory', inventoryId, updatedItem, 'update');

      // Log the adjustment transaction
      const transactionId = `trans-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transaction: InventoryTransaction = {
        id: transactionId,
        facility_id: facilityId,
        inventory_id: inventoryId,
        transaction_type: 'adjusted',
        quantity: Math.abs(difference),
        old_quantity: item.quantity,
        new_quantity: physicalCount,
        batch_number: item.batch_number,
        reason: `Stock reconciliation: ${reason}. ${difference > 0 ? 'Added' : 'Removed'} ${Math.abs(difference)} doses.`,
        performed_by_user_id: userId,
        created_at: now,
      };

      await syncToFirebase('inventoryTransactions', transactionId, transaction, 'add');
      setTransactions(prev => [transaction, ...prev]);

      saveToLocalStorage(inventory.map(i => i.id === inventoryId ? updatedItem : i));
      toast.success(`Stock reconciled: ${difference > 0 ? '+' : ''}${difference} doses adjusted`);
      return true;
    } catch (err: any) {
      console.error('Failed to reconcile stock:', err);
      toast.error(`Failed to reconcile stock: ${err.message}`);
      return false;
    }
  };

  // Save stock settings
  const saveStockSettings = async (settings: Partial<StockSettings>): Promise<boolean> => {
    if (!facilityId || !userId) {
      toast.error('Please log in to save settings');
      return false;
    }

    try {
      const now = new Date().toISOString();
      const newSettings: StockSettings = {
        id: facilityId,
        facility_id: facilityId,
        default_minimum_stock: settings.default_minimum_stock ?? stockSettings?.default_minimum_stock ?? 50,
        default_critical_stock: settings.default_critical_stock ?? stockSettings?.default_critical_stock ?? 20,
        near_expiry_warning_days: settings.near_expiry_warning_days ?? stockSettings?.near_expiry_warning_days ?? 30,
        critical_expiry_warning_days: settings.critical_expiry_warning_days ?? stockSettings?.critical_expiry_warning_days ?? 7,
        vaccine_specific_settings: settings.vaccine_specific_settings ?? stockSettings?.vaccine_specific_settings ?? {},
        created_at: stockSettings?.created_at ?? now,
        updated_at: now,
      };

      await syncToFirebase('inventoryStockSettings', facilityId, newSettings, 'update');
      setStockSettings(newSettings);
      toast.success('Stock settings saved');
      return true;
    } catch (err: any) {
      console.error('Failed to save stock settings:', err);
      toast.error(`Failed to save settings: ${err.message}`);
      return false;
    }
  };

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([fetchInventory(), fetchTransactions(), fetchWastageRecords(), fetchStockSettings()]);
  }, [fetchInventory, fetchTransactions, fetchWastageRecords, fetchStockSettings]);

  return {
    inventory,
    transactions,
    wastageRecords,
    stockSettings,
    loading,
    error,
    facilityId,
    addInventoryItem,
    updateInventoryQuantity,
    deleteInventoryItem,
    recordAdministration,
    recordWastage,
    reconcileStock,
    saveStockSettings,
    getStockSummary,
    getConsumptionRate,
    getLowStockAlerts,
    getExpiryAlerts,
    getWastageSummary,
    getVaccineInventoryStatus,
    refetch,
  };
}
