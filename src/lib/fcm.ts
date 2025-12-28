import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { app, db, doc, setDoc } from './firebase';

// VAPID key for web push (public key)
// This is the public key from Firebase Cloud Messaging settings
const VAPID_KEY = 'BNq_GCgRgY_nMdJ2bz4D2xQj1qG3vWp9H5Z8mFkL4YtXK9aP6rC1uS5wE7iO3nM8tB2hQ4kJ6vL9xD0fU5jA';

let messaging: ReturnType<typeof getMessaging> | null = null;

export const initializeFCM = async (): Promise<boolean> => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('FCM not supported in this browser');
      return false;
    }

    messaging = getMessaging(app);
    return true;
  } catch (error) {
    console.error('Error initializing FCM:', error);
    return false;
  }
};

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    console.log('FCM Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Error registering FCM service worker:', error);
    return null;
  }
};

export const requestFCMToken = async (userId: string): Promise<string | null> => {
  if (!messaging) {
    const initialized = await initializeFCM();
    if (!initialized) return null;
  }

  try {
    // Get permission first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Register the service worker
    const swRegistration = await registerServiceWorker();
    if (!swRegistration) return null;

    // Get the FCM token
    const token = await getToken(messaging!, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });

    if (token) {
      console.log('FCM Token received:', token.substring(0, 20) + '...');
      
      // Store token in Firestore for the user
      await saveFCMToken(userId, token);
      
      return token;
    } else {
      console.log('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const saveFCMToken = async (userId: string, token: string): Promise<void> => {
  try {
    const tokenRef = doc(db, 'fcm_tokens', userId);
    await setDoc(tokenRef, {
      token,
      userId,
      createdAt: new Date().toISOString(),
      platform: 'web',
      userAgent: navigator.userAgent,
    }, { merge: true });
    console.log('FCM token saved to Firestore');
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

export const setupForegroundMessageHandler = (
  onMessageReceived: (title: string, body: string, data?: Record<string, string>) => void
): (() => void) | null => {
  if (!messaging) {
    console.log('FCM messaging not initialized');
    return null;
  }

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);
    
    const title = payload.notification?.title || 'Notification';
    const body = payload.notification?.body || '';
    const data = payload.data as Record<string, string> | undefined;
    
    onMessageReceived(title, body, data);
  });

  return unsubscribe;
};

export { messaging };
