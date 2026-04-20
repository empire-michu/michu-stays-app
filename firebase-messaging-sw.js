// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// 1. Initialize the Firebase app in the service worker
const firebaseConfig = {
  apiKey: "AIzaSyAvX4GF0ZTaW9O0rTNiugGH_aKYpVROq4Y",
  authDomain: "michu-stays.firebaseapp.com",
  projectId: "michu-stays",
  storageBucket: "michu-stays.firebasestorage.app",
  messagingSenderId: "1054031423633",
  appId: "1:1054031423633:web:7f40e5abd824944bc33730",
  measurementId: "G-NXMD00BT77"
};

firebase.initializeApp(firebaseConfig);

// 2. Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// 3. Customize Background Notifications (When the app is closed)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Michu Stays Update';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update.',
    icon: '/images/michu-logo.png', // Assuming we add a logo later
    badge: '/images/michu-logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 4. Handle Notification Clicks (When the user clicks the push notification)
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const title = event.notification.title || '';
  const body = event.notification.body || '';
  const isBooking = title.toLowerCase().includes('booking') || body.toLowerCase().includes('booking');
  
  // If it's a booking notification, redirect to the smart redirect route
  const targetUrl = isBooking ? '/#redirect-bookings' : '/';

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
