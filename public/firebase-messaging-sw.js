// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-IZkSs3muNFkgKC2KMEbArhJXcg8lyAY",
  authDomain: "imu-tracker-system.firebaseapp.com",
  projectId: "imu-tracker-system",
  storageBucket: "imu-tracker-system.firebasestorage.app",
  messagingSenderId: "930304179796",
  appId: "1:930304179796:web:8310c25c0264c0b5a3b7c1",
  measurementId: "G-RM7BBL7PGK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Vaccine Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'You have upcoming vaccinations',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.data?.tag || 'vaccine-reminder',
    requireInteraction: true,
    data: payload.data,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  // Open the app when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Handle push events directly
self.addEventListener('push', (event) => {
  console.log('[FCM SW] Push event received:', event);
  
  if (!event.data) return;

  try {
    const payload = event.data.json();
    
    const notificationTitle = payload.notification?.title || 'Vaccine Reminder';
    const notificationOptions = {
      body: payload.notification?.body || 'Check your vaccination schedule',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'vaccine-reminder',
      requireInteraction: true,
      vibrate: [200, 100, 200]
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (e) {
    console.error('[FCM SW] Error parsing push payload:', e);
  }
});

console.log('[FCM SW] Firebase Messaging Service Worker loaded');
