import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useInventory } from './useInventory';
import { toast } from 'sonner';

interface StockAlert {
  id: string;
  type: 'low_stock' | 'critical_stock' | 'near_expiry' | 'expired';
  vaccine: string;
  message: string;
  severity: 'warning' | 'critical';
  quantity?: number;
  expiryDate?: string;
  daysUntilExpiry?: number;
  createdAt: string;
}

interface StockAlertSettings {
  enabled: boolean;
  lowStockThreshold: number;
  criticalStockThreshold: number;
  nearExpiryDays: number;
  lastChecked: string | null;
}

const STOCK_ALERT_SETTINGS_KEY = 'stock_alert_settings';
const STOCK_ALERTS_KEY = 'stock_alerts_history';

const loadSettings = (): StockAlertSettings => {
  try {
    const stored = localStorage.getItem(STOCK_ALERT_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading stock alert settings:', e);
  }
  return { 
    enabled: true, 
    lowStockThreshold: 50, 
    criticalStockThreshold: 20,
    nearExpiryDays: 30,
    lastChecked: null 
  };
};

const saveSettings = (settings: StockAlertSettings) => {
  try {
    localStorage.setItem(STOCK_ALERT_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving stock alert settings:', e);
  }
};

const loadAlerts = (): StockAlert[] => {
  try {
    const stored = localStorage.getItem(STOCK_ALERTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading stock alerts:', e);
  }
  return [];
};

const saveAlerts = (alerts: StockAlert[]) => {
  try {
    // Keep only last 50 alerts
    localStorage.setItem(STOCK_ALERTS_KEY, JSON.stringify(alerts.slice(0, 50)));
  } catch (e) {
    console.error('Error saving stock alerts:', e);
  }
};

export function useStockAlerts() {
  const { user } = useAuth();
  const { inventory, getLowStockAlerts, getExpiryAlerts } = useInventory();
  const [settings, setSettings] = useState<StockAlertSettings>(loadSettings);
  const [alerts, setAlerts] = useState<StockAlert[]>(loadAlerts);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // Check if notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        toast.success('Stock alerts enabled! You will receive notifications for low stock and expiring vaccines.');
        return true;
      } else if (permission === 'denied') {
        toast.error('Notifications were denied. Please enable them in browser settings.');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    }
  }, [isSupported]);

  // Show a notification
  const showNotification = useCallback((title: string, body: string, tag?: string) => {
    if (permissionStatus !== 'granted' || !settings.enabled) return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: tag || 'stock-alert',
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }, [permissionStatus, settings.enabled]);

  // Check stock levels and generate alerts
  const checkStockLevels = useCallback(() => {
    if (!settings.enabled || !inventory.length) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Only check once per day unless forced
    if (settings.lastChecked === today) return;

    const newAlerts: StockAlert[] = [];
    const now = new Date();

    // Check low stock
    const lowStockItems = getLowStockAlerts(settings.lowStockThreshold);
    const criticalStockItems = getLowStockAlerts(settings.criticalStockThreshold);

    criticalStockItems.forEach(item => {
      newAlerts.push({
        id: `critical-${item.vaccine}-${now.getTime()}`,
        type: 'critical_stock',
        vaccine: item.vaccine,
        message: `${item.vaccine} is critically low: only ${item.total} doses remaining!`,
        severity: 'critical',
        quantity: item.total,
        createdAt: now.toISOString()
      });
    });

    lowStockItems.filter(item => 
      !criticalStockItems.find(c => c.vaccine === item.vaccine)
    ).forEach(item => {
      newAlerts.push({
        id: `low-${item.vaccine}-${now.getTime()}`,
        type: 'low_stock',
        vaccine: item.vaccine,
        message: `${item.vaccine} is running low: ${item.total} doses remaining`,
        severity: 'warning',
        quantity: item.total,
        createdAt: now.toISOString()
      });
    });

    // Check expiry
    const expiryItems = getExpiryAlerts();
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    expiryItems.forEach(item => {
      const expiryDate = new Date(item.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        newAlerts.push({
          id: `expired-${item.id}-${now.getTime()}`,
          type: 'expired',
          vaccine: item.vaccine_name,
          message: `${item.vaccine_name} (Batch: ${item.batch_number}) has EXPIRED! ${item.quantity} doses affected.`,
          severity: 'critical',
          quantity: item.quantity,
          expiryDate: item.expiry_date,
          daysUntilExpiry,
          createdAt: now.toISOString()
        });
      } else if (daysUntilExpiry <= 7) {
        newAlerts.push({
          id: `near-expiry-${item.id}-${now.getTime()}`,
          type: 'near_expiry',
          vaccine: item.vaccine_name,
          message: `${item.vaccine_name} (Batch: ${item.batch_number}) expires in ${daysUntilExpiry} day(s)! ${item.quantity} doses at risk.`,
          severity: 'critical',
          quantity: item.quantity,
          expiryDate: item.expiry_date,
          daysUntilExpiry,
          createdAt: now.toISOString()
        });
      } else if (daysUntilExpiry <= settings.nearExpiryDays) {
        newAlerts.push({
          id: `near-expiry-${item.id}-${now.getTime()}`,
          type: 'near_expiry',
          vaccine: item.vaccine_name,
          message: `${item.vaccine_name} (Batch: ${item.batch_number}) expires in ${daysUntilExpiry} days`,
          severity: 'warning',
          quantity: item.quantity,
          expiryDate: item.expiry_date,
          daysUntilExpiry,
          createdAt: now.toISOString()
        });
      }
    });

    // Show notifications for critical alerts
    if (newAlerts.length > 0 && permissionStatus === 'granted') {
      const criticalAlerts = newAlerts.filter(a => a.severity === 'critical');
      const warningAlerts = newAlerts.filter(a => a.severity === 'warning');

      if (criticalAlerts.length > 0) {
        showNotification(
          '🚨 Critical Stock Alert!',
          `${criticalAlerts.length} critical issue(s): ${criticalAlerts.slice(0, 2).map(a => a.vaccine).join(', ')}${criticalAlerts.length > 2 ? '...' : ''}`,
          'stock-critical'
        );
      }

      if (warningAlerts.length > 0) {
        showNotification(
          '⚠️ Stock Warning',
          `${warningAlerts.length} warning(s): ${warningAlerts.slice(0, 2).map(a => a.vaccine).join(', ')}${warningAlerts.length > 2 ? '...' : ''}`,
          'stock-warning'
        );
      }
    }

    // Update state and storage
    const updatedAlerts = [...newAlerts, ...alerts];
    setAlerts(updatedAlerts);
    saveAlerts(updatedAlerts);

    const updatedSettings = { ...settings, lastChecked: today };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);

    // Show toast for critical alerts
    if (newAlerts.filter(a => a.severity === 'critical').length > 0) {
      toast.error(`${newAlerts.filter(a => a.severity === 'critical').length} critical stock alert(s)!`, {
        description: 'Check inventory for low stock or expiring vaccines',
        duration: 10000
      });
    }

  }, [settings, inventory, getLowStockAlerts, getExpiryAlerts, alerts, permissionStatus, showNotification]);

  // Force check (ignores lastChecked)
  const forceCheck = useCallback(() => {
    const updatedSettings = { ...settings, lastChecked: null };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
    
    // Run check after state update
    setTimeout(() => checkStockLevels(), 100);
  }, [settings, checkStockLevels]);

  // Enable/disable alerts
  const enableAlerts = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      const newSettings = { ...settings, enabled: true };
      setSettings(newSettings);
      saveSettings(newSettings);
      forceCheck();
    }
    return granted;
  }, [requestPermission, settings, forceCheck]);

  const disableAlerts = useCallback(() => {
    const newSettings = { ...settings, enabled: false };
    setSettings(newSettings);
    saveSettings(newSettings);
    toast.info('Stock alerts disabled');
  }, [settings]);

  // Update thresholds
  const updateThresholds = useCallback((
    lowStock?: number, 
    criticalStock?: number, 
    nearExpiryDays?: number
  ) => {
    const newSettings = { 
      ...settings, 
      lowStockThreshold: lowStock ?? settings.lowStockThreshold,
      criticalStockThreshold: criticalStock ?? settings.criticalStockThreshold,
      nearExpiryDays: nearExpiryDays ?? settings.nearExpiryDays,
      lastChecked: null // Force recheck with new thresholds
    };
    setSettings(newSettings);
    saveSettings(newSettings);
    toast.success('Alert thresholds updated');
  }, [settings]);

  // Clear alert history
  const clearAlerts = useCallback(() => {
    setAlerts([]);
    saveAlerts([]);
    toast.success('Alert history cleared');
  }, []);

  // Dismiss a specific alert
  const dismissAlert = useCallback((alertId: string) => {
    const updatedAlerts = alerts.filter(a => a.id !== alertId);
    setAlerts(updatedAlerts);
    saveAlerts(updatedAlerts);
  }, [alerts]);

  // Check on mount and when inventory changes
  useEffect(() => {
    if (settings.enabled && inventory.length > 0) {
      const timer = setTimeout(checkStockLevels, 2000);
      return () => clearTimeout(timer);
    }
  }, [inventory.length, settings.enabled, checkStockLevels]);

  // Periodic check every hour
  useEffect(() => {
    if (!settings.enabled) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkStockLevels();
      }
    }, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.enabled, checkStockLevels]);

  // Get current alerts summary
  const getAlertsSummary = useCallback(() => {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;
    const recentAlerts = alerts.slice(0, 10);

    return {
      total: alerts.length,
      critical: criticalCount,
      warnings: warningCount,
      recent: recentAlerts
    };
  }, [alerts]);

  // Send test notification
  const sendTestNotification = useCallback(() => {
    if (permissionStatus !== 'granted') {
      toast.error('Please enable notifications first');
      return;
    }

    showNotification(
      '🧪 Test Stock Alert',
      'Stock alert notifications are working correctly!',
      'test-stock-alert'
    );
    toast.success('Test notification sent');
  }, [permissionStatus, showNotification]);

  return {
    isSupported,
    permissionStatus,
    settings,
    alerts,
    enableAlerts,
    disableAlerts,
    updateThresholds,
    forceCheck,
    clearAlerts,
    dismissAlert,
    getAlertsSummary,
    sendTestNotification,
    requestPermission
  };
}
