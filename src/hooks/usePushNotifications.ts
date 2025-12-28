import { useState, useEffect, useCallback } from 'react';
import { Child } from '@/types/child';
import { toast } from 'sonner';

interface NotificationSettings {
  enabled: boolean;
  daysBefore: number;
  lastChecked: string | null;
}

const NOTIFICATION_SETTINGS_KEY = 'vaccine_notification_settings';
const NOTIFICATION_PERMISSION_KEY = 'notification_permission_asked';

const loadSettings = (): NotificationSettings => {
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error loading notification settings:', e);
  }
  return { enabled: false, daysBefore: 3, lastChecked: null };
};

const saveSettings = (settings: NotificationSettings) => {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving notification settings:', e);
  }
};

export function usePushNotifications(children: Child[]) {
  const [settings, setSettings] = useState<NotificationSettings>(loadSettings);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // Check if notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
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
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
      
      if (permission === 'granted') {
        toast.success('Notifications enabled! You will receive vaccine reminders.');
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

  // Enable notifications
  const enableNotifications = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      const newSettings = { ...settings, enabled: true };
      setSettings(newSettings);
      saveSettings(newSettings);
    }
    return granted;
  }, [requestPermission, settings]);

  // Disable notifications
  const disableNotifications = useCallback(() => {
    const newSettings = { ...settings, enabled: false };
    setSettings(newSettings);
    saveSettings(newSettings);
    toast.info('Notifications disabled');
  }, [settings]);

  // Update days before reminder
  const setDaysBefore = useCallback((days: number) => {
    const newSettings = { ...settings, daysBefore: days };
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings]);

  // Get upcoming vaccines that need reminders
  const getUpcomingVaccines = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const reminderDate = new Date(today);
    reminderDate.setDate(reminderDate.getDate() + settings.daysBefore);

    const upcoming: Array<{
      child: Child;
      vaccine: { name: string; dueDate: string };
      daysUntilDue: number;
    }> = [];

    children.forEach(child => {
      child.vaccines.forEach(vaccine => {
        if (vaccine.status === 'pending') {
          const dueDate = new Date(vaccine.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Include vaccines due within the reminder window
          if (daysUntilDue >= 0 && daysUntilDue <= settings.daysBefore) {
            upcoming.push({
              child,
              vaccine: { name: vaccine.name, dueDate: vaccine.dueDate },
              daysUntilDue,
            });
          }
        }
      });
    });

    return upcoming.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }, [children, settings.daysBefore]);

  // Show a notification
  const showNotification = useCallback((title: string, body: string, tag?: string) => {
    if (permissionStatus !== 'granted' || !settings.enabled) return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: tag || 'vaccine-reminder',
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

  // Check and send reminders
  const checkReminders = useCallback(() => {
    if (!settings.enabled || permissionStatus !== 'granted') return;

    const today = new Date().toISOString().split('T')[0];
    
    // Only check once per day
    if (settings.lastChecked === today) return;

    const upcoming = getUpcomingVaccines();
    
    if (upcoming.length === 0) {
      // Update last checked even if no reminders
      const newSettings = { ...settings, lastChecked: today };
      setSettings(newSettings);
      saveSettings(newSettings);
      return;
    }

    // Group by days until due
    const todayVaccines = upcoming.filter(v => v.daysUntilDue === 0);
    const tomorrowVaccines = upcoming.filter(v => v.daysUntilDue === 1);
    const otherVaccines = upcoming.filter(v => v.daysUntilDue > 1);

    // Show notifications
    if (todayVaccines.length > 0) {
      showNotification(
        '⚠️ Vaccines Due Today!',
        `${todayVaccines.length} vaccination${todayVaccines.length > 1 ? 's' : ''} due today: ${todayVaccines.map(v => v.child.name).slice(0, 3).join(', ')}${todayVaccines.length > 3 ? '...' : ''}`,
        'vaccine-today'
      );
    }

    if (tomorrowVaccines.length > 0) {
      showNotification(
        '📅 Vaccines Due Tomorrow',
        `${tomorrowVaccines.length} vaccination${tomorrowVaccines.length > 1 ? 's' : ''} due tomorrow: ${tomorrowVaccines.map(v => v.child.name).slice(0, 3).join(', ')}${tomorrowVaccines.length > 3 ? '...' : ''}`,
        'vaccine-tomorrow'
      );
    }

    if (otherVaccines.length > 0) {
      showNotification(
        '🔔 Upcoming Vaccinations',
        `${otherVaccines.length} vaccination${otherVaccines.length > 1 ? 's' : ''} due in the next ${settings.daysBefore} days`,
        'vaccine-upcoming'
      );
    }

    // Update last checked
    const newSettings = { ...settings, lastChecked: today };
    setSettings(newSettings);
    saveSettings(newSettings);
  }, [settings, permissionStatus, getUpcomingVaccines, showNotification]);

  // Check reminders on mount and when children change
  useEffect(() => {
    if (settings.enabled && permissionStatus === 'granted') {
      // Small delay to ensure data is loaded
      const timer = setTimeout(checkReminders, 2000);
      return () => clearTimeout(timer);
    }
  }, [children.length, settings.enabled, permissionStatus, checkReminders]);

  // Set up periodic checks (every hour when page is visible)
  useEffect(() => {
    if (!settings.enabled || permissionStatus !== 'granted') return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkReminders();
      }
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(interval);
  }, [settings.enabled, permissionStatus, checkReminders]);

  // Manual trigger for testing
  const sendTestNotification = useCallback(() => {
    if (permissionStatus !== 'granted') {
      toast.error('Please enable notifications first');
      return;
    }

    showNotification(
      '🧪 Test Notification',
      'Push notifications are working correctly!',
      'test-notification'
    );
    toast.success('Test notification sent');
  }, [permissionStatus, showNotification]);

  return {
    isSupported,
    permissionStatus,
    settings,
    enableNotifications,
    disableNotifications,
    setDaysBefore,
    requestPermission,
    checkReminders,
    sendTestNotification,
    getUpcomingVaccines,
  };
}
