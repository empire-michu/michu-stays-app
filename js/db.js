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
const firestore = firebase.firestore();
const storage = firebase.storage();

let messaging = null;
try {
    // Only attempt web messaging if NOT on a native platform
    const isWeb = !window.Capacitor || window.Capacitor.getPlatform() === 'web';
    if (isWeb && firebase.messaging.isSupported()) {
        messaging = firebase.messaging();
    }
} catch(e) {
    console.warn("Firebase Messaging initialization skipped/failed:", e);
}

// Push notification utility removed - replaced with pre-calculated byte array in requestPushPermission to guarantee compatibility.

class Database {
    constructor() {
        this.cache = {
            properties: null,
            propertiesLastFetch: 0,
            bookings: null,
            bookingsLastFetch: 0,
            cacheDuration: 1000 * 60 * 30 // Increased to 30 mins for Ethiopia
        };

        // Initialize Persistence
        firebase.firestore().enablePersistence({ synchronizeTabs: true }).catch(err => {
            if (err.code == 'failed-precondition') console.warn("Persistence failed: Multiple tabs open");
            else if (err.code == 'unimplemented') console.warn("Persistence not supported");
        });

        // Load properties from localStorage if available
        try {
            const stored = localStorage.getItem('michu_prop_cache');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Date.now() - parsed.ts < 1000 * 60 * 60 * 24) { // 24h stale limit
                    this.cache.properties = parsed.data;
                    this.cache.propertiesLastFetch = parsed.ts;
                }
            }
        } catch(e) {}
    }

    clearCache(type) {
        if (type === 'properties' || type === 'all') {
            this.cache.properties = null;
            this.cache.propertiesLastFetch = 0;
            localStorage.removeItem('michu_prop_cache');
        }
        if (type === 'bookings' || type === 'all') {
            this.cache.bookings = null;
            this.cache.bookingsLastFetch = 0;
        }
    }

    // ─── PROPERTIES ───────────────────────────────────────────
    async getProperties(managerId = null, forceRefresh = false) {
        // Use cache if fresh enough
        if (!forceRefresh && !managerId && this.cache.properties && (Date.now() - this.cache.propertiesLastFetch < this.cache.cacheDuration)) {
            return this.cache.properties;
        }

        try {
            let query = firestore.collection('properties');
            if (managerId) query = query.where('managerId', '==', managerId);
            
            // Add a timeout for the fetch
            const fetchPromise = query.get();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
            
            const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            if (!managerId) {
                this.cache.properties = data;
                this.cache.propertiesLastFetch = Date.now();
                localStorage.setItem('michu_prop_cache', JSON.stringify({ data, ts: Date.now() }));
            }
            return data;
        } catch(e) {
            console.warn("Fetch failed, returning cached data if available:", e);
            if (this.cache.properties) return this.cache.properties;
            throw e;
        }
    }

    async getPropertyById(id, forceRefresh = false) {
        try {
            const options = forceRefresh ? { source: 'server' } : {};
            const doc = await firestore.collection('properties').doc(id).get(options);
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (e) {
            // Fallback to cache if server fetch fails
            const doc = await firestore.collection('properties').doc(id).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        }
    }

    // Admin creates a new hotel/property
    async addProperty(property) {
        const payload = { 
            ...property, 
            isActive: true, 
            createdAt: Date.now(),
            availableRooms: property.totalRooms || 0,
            telebirrNumber: property.telebirrNumber || '',
            telebirrName: property.telebirrName || ''
        };
        const ref = await firestore.collection('properties').add(payload);
        this.clearCache('properties');
        return { id: ref.id, ...payload };
    }

    // Manager updates room availability
    async updateRoomAvailability(propertyId, availableRooms) {
        await firestore.collection('properties').doc(propertyId).update({ availableRooms });
        this.clearCache('properties');
    }

    // Admin toggles hotel active/inactive
    async togglePropertyActive(propertyId, isActive) {
        await firestore.collection('properties').doc(propertyId).update({ isActive });
        this.clearCache('properties');
    }

    // Admin deletes a property
    async deleteProperty(id) {
        await firestore.collection('properties').doc(id).delete();
        this.clearCache('properties');
    }

    // Manager/Admin updates property details (Description, Photos, Amenities)
    async updateProperty(id, data) {
        await firestore.collection('properties').doc(id).set(data, { merge: true });
        this.clearCache('properties');
    }

    async updatePropertyDiscount(id, discountPercent) {
        const doc = await firestore.collection('properties').doc(id).get();
        if (!doc.exists) throw new Error("Property not found");
        const data = doc.data();
        const price = Number(String(data.price || 0).replace(/[^\d.-]/g, ''));
        const originalPrice = discountPercent > 0 ? Math.round(price / (1 - (discountPercent / 100))) : 0;
        
        await firestore.collection('properties').doc(id).update({
            discountPercent: Number(discountPercent),
            discount: Number(discountPercent),
            originalPrice: originalPrice
        });
        this.clearCache('properties');
    }

    // ─── BOOKINGS ─────────────────────────────────────────────
    async createBooking(propertyId, userDetails, referenceCode, paymentProofUrl = '', paymentMethod = 'CBE Mobile Banking') {
        const property = await this.getPropertyById(propertyId);
        const user = window.auth?.currentUser;
        const newBooking = {
            propertyId,
            propertyTitle: property.title,
            customerName: userDetails.name || (user?.email || 'Guest'),
            customerEmail: userDetails.email || user?.email || '',
            customerPhone: userDetails.phone || '',
            customerId: user?.uid || 'guest',
            managerId: property.managerId || '',
            totalAmount: userDetails.totalAmount || (property.price * 2), 
            status: 'Awaiting Verification',
            paymentMethod,
            referenceCode,
            paymentProofUrl,
            checkIn: userDetails.checkIn || '',
            checkOut: userDetails.checkOut || '',
            guests: userDetails.guests || 1,
            packageInfo: userDetails.packageInfo || null,
            createdAt: new Date().toISOString()
        };
        const ref = await firestore.collection('bookings').add(newBooking);

        // CREATE NOTIFICATION FOR MANAGER & ADMIN
        await this.createNotification({
            message: '🛎️ New Booking!',
            details: `${newBooking.customerName} booked ${property.title}${newBooking.packageInfo ? ' (Package: ' + newBooking.packageInfo.title + ')' : ''}. Amount: ${newBooking.totalAmount} Birr. Reference: ${referenceCode}`,
            targetUserId: property.managerId || 'admin', // target manager
            targetRole: 'admin', // also target all admins
            type: 'booking_new',
            link: 'manager',
            params: { tab: 'bookings' }
        });

        // SEND HARD NOTIFICATION (PUSH)
        this.triggerPushNotification(
            propertyId,
            '🛎️ New Booking!',
            `${newBooking.customerName} booked ${property.title}. Ref: ${referenceCode}`,
            null // Guest shouldn't get the 'New Booking' alert on their own action, they just see success UI. Admin/Manager get it.
        );

        this.clearCache('bookings');
        this.clearCache('properties'); // Just in case rooms changed
        return { id: ref.id, ...newBooking };
    }

    async getBookings(managerId = null, customerId = null, forceRefresh = false) {
        if (!forceRefresh && !managerId && !customerId && this.cache.bookings && (Date.now() - this.cache.bookingsLastFetch < this.cache.cacheDuration)) {
            return this.cache.bookings;
        }

        let query = firestore.collection('bookings');
        if (managerId) query = query.where('managerId', '==', managerId);
        if (customerId) query = query.where('customerId', '==', customerId);
        const snapshot = await query.get();
        const data = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (!managerId && !customerId) {
            this.cache.bookings = data;
            this.cache.bookingsLastFetch = Date.now();
        }
        return data;
    }

    async updateBookingStatus(bookingId, status) {
        const booking = (await firestore.collection('bookings').doc(bookingId).get()).data();
        await firestore.collection('bookings').doc(bookingId).update({ status });
        this.clearCache('bookings');

        // NOTIFY CLIENT
        await this.createNotification({
            message: '📢 Booking Update',
            details: `Your booking for ${booking.propertyTitle} (${booking.referenceCode}) is now: ${status}`,
            targetUserId: booking.customerId,
            type: 'booking_update',
            link: 'profile',
            params: { tab: 'bookings' }
        });

        // SEND HARD NOTIFICATION (PUSH) to all users (guest, admin, manager) if confirmed
        if (status === 'Confirmed') {
            this.triggerPushNotification(
                booking.propertyId,
                '✅ Booking Confirmed!',
                `Booking ${booking.referenceCode} at ${booking.propertyTitle} has been confirmed.`,
                booking.customerId
            );
        } else if (status === 'Denied') {
            this.triggerPushNotification(
                booking.propertyId,
                '❌ Booking Denied',
                `Booking ${booking.referenceCode} at ${booking.propertyTitle} was denied.`,
                booking.customerId
            );
        }
    }

    // ─── USERS ────────────────────────────────────────────────
    async getAllUsers() {
        const snapshot = await firestore.collection('users').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async getUserById(uid) {
        const doc = await firestore.collection('users').doc(uid).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    // Admin deletes a user account (Firestore doc)
    async deleteUser(uid) {
        await firestore.collection('users').doc(uid).delete();
    }

    // ─── STORAGE (Cloudinary — Free persistent files) ──────────
    async uploadFile(file, folder = 'properties', onProgress = null) {
        const cloudName = 'dudc1zwmq';
        const uploadPreset = 'michu_stays';
        const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);

            // Mock the Firebase task object so the UI's .cancel() still works
            this.lastTask = {
                cancel: () => xhr.abort()
            };

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable && onProgress) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onProgress(percent);
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    this.lastTask = null;
                    resolve(response.secure_url);
                } else {
                    const err = JSON.parse(xhr.responseText || '{}');
                    console.error("Cloudinary Error:", err);
                    reject(new Error(err.error?.message || "Upload failed."));
                }
            };

            xhr.onerror = () => {
                console.error("Cloudinary Network Error");
                reject(new Error("Network error during upload."));
            };

            xhr.onabort = () => {
                reject(new Error("Upload aborted."));
            };

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', folder);
            
            xhr.send(formData);
        });
    }

    // ─── REVIEWS / RATINGS ─────────────────────────────────────
    async addReview(propertyId, userId, userName, rating, bookingId, text = '', images = []) {
        const existing = await firestore.collection('reviews')
            .where('bookingId', '==', bookingId).get();
        if (!existing.empty) {
            // Update existing review
            const docId = existing.docs[0].id;
            await firestore.collection('reviews').doc(docId).update({ rating, text, images, updatedAt: new Date().toISOString() });
            return { id: docId, updated: true };
        }
        const review = {
            propertyId,
            userId,
            userName,
            bookingId,
            rating,
            text,
            images,
            createdAt: new Date().toISOString()
        };
        const ref = await firestore.collection('reviews').add(review);
        return { id: ref.id, ...review };
    }

    async addReviewReply(reviewId, replyText, managerName) {
        const reply = {
            text: replyText,
            managerName: managerName || 'Hotel Manager',
            createdAt: new Date().toISOString()
        };
        await firestore.collection('reviews').doc(reviewId).update({
            managerReply: reply
        });

        // NOTIFY GUEST
        try {
            const reviewDoc = await firestore.collection('reviews').doc(reviewId).get();
            if (reviewDoc.exists) {
                const reviewData = reviewDoc.data();
                // Add in-app notification
                await this.createNotification({
                    message: '💬 Review Reply',
                    details: `${managerName} replied to your review: "${replyText.substring(0, 50)}..."`,
                    targetUserId: reviewData.userId,
                    type: 'review_reply',
                    link: 'hotel_detail_view',
                    params: { id: reviewData.propertyId }
                });
                // Send push notification
                this.triggerPushNotification(
                    null, 
                    'New Reply to Your Review! 💬', 
                    `${managerName} replied: "${replyText.substring(0, 50)}..."`,
                    reviewData.userId
                );
            }
        } catch (e) {
            console.warn("Notification for review reply failed:", e);
        }

        return reply;
    }

    async deleteReview(reviewId) {
        return await firestore.collection('reviews').doc(reviewId).delete();
    }

    async deleteReviewReply(reviewId) {
        return await firestore.collection('reviews').doc(reviewId).update({
            managerReply: firebase.firestore.FieldValue.delete()
        });
    }

    async getReviews(propertyId) {
        const snapshot = await firestore.collection('reviews')
            .where('propertyId', '==', propertyId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async getAverageRating(propertyId) {
        const reviews = await this.getReviews(propertyId);
        if (reviews.length === 0) return { avg: 0, count: 0 };
        const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
        return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
    }

    async getUserReviewForBooking(bookingId) {
        const snapshot = await firestore.collection('reviews')
            .where('bookingId', '==', bookingId).get();
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    async uploadPaymentProof(file, bookingRefCode) {
        // Upload to Cloudinary instead of storing as base64 in Firestore
        // This avoids Firestore's 1MB document limit and saves storage
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('Image is too large. Please use a file under 5MB.');
        }
        return await this.uploadFile(file, 'payment-proofs');
    }

    // ─── NOTIFICATIONS ─────────────────────────────────────────
    async createNotification(data) {
        const payload = {
            ...data,
            createdAt: new Date().toISOString()
        };
        return await firestore.collection('notifications').add(payload);
    }

    listenToBookings(callback, managerId = null, customerId = null) {
        let query = firestore.collection('bookings');
        if (managerId) query = query.where('managerId', '==', managerId);
        if (customerId) query = query.where('customerId', '==', customerId);
        
        return query.onSnapshot(snapshot => {
            const bookings = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            callback(bookings);
        }, err => console.warn('Booking listener error:', err));
    }

    listenForNotifications(callback, onError) {
        const user = window.auth?.currentUser;
        const role = window.auth?.role || window.auth?.userData?.role;
        if (!user) return;

        // Look for notifications created in the last 10 minutes
        const startTime = new Date(Date.now() - 600000).toISOString();
        
        return firestore.collection('notifications')
            .where('createdAt', '>', startTime)
            .onSnapshot(snapshot => {
                const changes = snapshot.docChanges();
                const filtered = changes
                    .filter(c => c.type === 'added')
                    .map(c => ({ id: c.doc.id, ...c.doc.data() }))
                    .filter(n => {
                        // Filter for current user: specifically for them, OR for their role
                        return n.targetUserId === user.uid || (n.targetRole === role && role);
                    })
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                
                filtered.forEach(notif => callback(notif));
            }, err => {
                if (onError) onError(err);
                else console.warn('Notification listener error:', err);
            });
    }

    // ─── PUSH NOTIFICATIONS (FCM) ───────────────────────────
    async requestPushPermission(userId) {
        const platform = window.Capacitor ? window.Capacitor.getPlatform() : 'web';
        
        if (platform !== 'web') {
            // NATIVE PUSH (Android/iOS)
            try {
                const { PushNotifications } = window.Capacitor.Plugins;
                if (!PushNotifications) throw new Error("PushNotifications plugin not loaded");

                let perm = await PushNotifications.checkPermissions();
                if (perm.receive !== 'granted') {
                    perm = await PushNotifications.requestPermissions();
                }

                if (perm.receive === 'granted') {
                    await PushNotifications.register();
                    
                    // The actual token is received via 'registration' listener
                    return new Promise((resolve, reject) => {
                        PushNotifications.addListener('registration', async (token) => {
                            const fcmToken = token.value;
                            await firestore.collection('users').doc(userId).set({
                                fcmTokens: firebase.firestore.FieldValue.arrayUnion(fcmToken)
                            }, { merge: true });
                            resolve(fcmToken);
                        });
                        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                            console.log('Push action performed: ', notification);
                            const data = notification.notification.data || {};
                            const title = notification.notification.title || '';
                            const body = notification.notification.body || '';
                            
                            const isBooking = data.type === 'booking' || title.toLowerCase().includes('booking') || body.toLowerCase().includes('booking');
                            
                            if (isBooking) {
                                window.location.hash = '#redirect-bookings';
                            } else {
                                window.location.hash = '#home';
                            }
                        });
                        PushNotifications.addListener('registrationError', (err) => {
                            reject(err);
                        });
                    });
                } else {
                    throw new Error("Push permission denied on device.");
                }
            } catch (err) {
                console.error("Native push error:", err);
                throw err;
            }
        }

        // WEB PUSH (Desktop/PWA)
        if (!messaging) throw new Error("Firebase Messaging not supported by your browser.");

        // Automatically handle foreground notifications if the browser tab is currently open.
        if (!window.__pushListenerAdded) {
            messaging.onMessage((payload) => {
                console.log("Foreground Notification Received:", payload);
                window.showToast("🔔 Push Alert: " + (payload.notification?.body || 'New Update!'));
            });
            window.__pushListenerAdded = true;
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                const currentToken = await messaging.getToken({
                    serviceWorkerRegistration: registration,
                    vapidKey: 'BDO3OkgwZmVticyOc3vxB-ytVWSyM8XOjPqis7KfyJ5hckPa6qLi8Vvn4-BxcZqUTesZjgVy3dkJ4GwIFQoMc44'
                });
                
                if (currentToken) {
                    await firestore.collection('users').doc(userId).set({
                        fcmTokens: firebase.firestore.FieldValue.arrayUnion(currentToken)
                    }, { merge: true });
                    return currentToken;
                }
            } else {
                throw new Error("Notification permission denied by user.");
            }
        } catch (err) {
            console.error("Web push error:", err);
            throw err;
        }
    }

    async removePushPermission(userId) {
        try {
            await firestore.collection('users').doc(userId).update({
                fcmTokens: [] // clear all devices for this user
            });
            if (window.auth && window.auth.userData) {
                window.auth.userData.fcmTokens = [];
            }
            return true;
        } catch (err) {
            console.error("Error removing token", err);
            throw err;
        }
    }

    async triggerPushNotification(hotelId, title, body, targetUserId = null) {
        try {
            let tokens = [];

            // 1. Get ALL Admin tokens
            const adminsSnap = await firestore.collection('users').where('role', '==', 'admin').get();
            adminsSnap.docs.forEach(doc => {
                const data = doc.data();
                if (data.fcmTokens) tokens = tokens.concat(data.fcmTokens);
            });

            // 2. Get the specific Hotel Manager's tokens
            if (hotelId) {
                const hotelDoc = await firestore.collection('properties').doc(hotelId).get();
                if (hotelDoc.exists && hotelDoc.data().managerId) {
                    const managerDoc = await firestore.collection('users').doc(hotelDoc.data().managerId).get();
                    if (managerDoc.exists && managerDoc.data().fcmTokens) {
                        tokens = tokens.concat(managerDoc.data().fcmTokens);
                    }
                }
            }

            // 3. Get the specific Target User's tokens (e.g. for review replies)
            if (targetUserId) {
                const userDoc = await firestore.collection('users').doc(targetUserId).get();
                if (userDoc.exists && userDoc.data().fcmTokens) {
                    tokens = tokens.concat(userDoc.data().fcmTokens);
                }
            }

            // Remove duplicates
            tokens = [...new Set(tokens)];

            if (tokens.length === 0) return; // No one subscribed
            
            console.log("Push trigger: sending to " + tokens.length + " subscribed devices.");

            // Ping your free Render server!
            await fetch('https://michu-push-server.onrender.com/send-push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokens, title, body })
            });
            console.log("Push Ping Sent to Render!");
        } catch (e) {
            console.error("Push Server Error:", e);
        }
    }
}

window.db = new Database();
