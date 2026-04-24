// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js');

// ─── ASSET CACHING (merged from sw.js) ─────────────────────
const CACHE_NAME = 'michu-stays-v3.0';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/components.css',
  '/css/variables.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/db.js',
  '/js/views/home.js',
  '/js/views/hotel-detail.js',
  '/js/views/booking.js',
  '/js/views/profile.js',
  '/js/views/admin.js',
  '/js/views/manager.js',
  '/js/views/login.js',
  '/js/views/signup.js',
  '/js/views/add-property.js',
  '/images/logo.png',
  '/favicon.ico',
  '/images/icon-192.png',
  '/images/icon-512.png',
  '/images/iconic_dire_dawa_hero.jpg',
  '/images/news_1.jpg',
  '/images/news_2.jpg',
  '/images/news_3.jpg',
  '/images/news_4.jpg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip caching for Firestore, Auth, and external API requests
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firestore') ||
      url.hostname.includes('cloudinary') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('brevo') ||
      url.hostname.includes('emailjs') ||
      url.hostname.includes('render.com') ||
      event.request.method !== 'GET') {
    return;
  }
  
  // Stale-While-Revalidate for app assets
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((response) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {});
        return response || fetchPromise;
      });
    })
  );
});

// ─── FIREBASE CLOUD MESSAGING ──────────────────────────────
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

const messaging = firebase.messaging();

// Handle background push notifications (when app is closed)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Michu Stays Update';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update.',
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const title = event.notification.title || '';
  const body = event.notification.body || '';
  const isBooking = title.toLowerCase().includes('booking') || body.toLowerCase().includes('booking');
  
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
