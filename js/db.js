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
            reviews: {},
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



        
        // Setup push listeners immediately
        this.setupPushListeners();
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
        if (type === 'reviews' || type === 'all') {
            this.cache.reviews = {};
            try {
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('michu_reviews_cache_')) {
                        localStorage.removeItem(key);
                    }
                });
            } catch(e) {}
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
            
            // Remove artificial timeout to allow slow connections to fetch
            const fetchPromise = query.get();
            
            const snapshot = await fetchPromise;
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const finalData = managerId ? data : data.filter(p => p.isAvailable !== false);
            
            if (!managerId) {
                this.cache.properties = finalData;
                this.cache.propertiesLastFetch = Date.now();
                localStorage.setItem('michu_prop_cache', JSON.stringify({ data: finalData, ts: Date.now() }));
            }
            return finalData;
        } catch(e) {
            console.warn("Fetch failed, returning cached data if available:", e);
            if (this.cache.properties) return this.cache.properties;
            throw e;
        }
    }

    async getPropertyById(id, forceRefresh = false) {
        // Fast path: check in-memory cache first for instant UI responsiveness
        if (!forceRefresh && this.cache && this.cache.properties) {
            const found = this.cache.properties.find(p => p.id === id);
            if (found) return found;
        }
        try {
            const options = forceRefresh ? { source: 'server' } : {};
            const fetchPromise = firestore.collection('properties').doc(id).get(options);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
            const doc = await Promise.race([fetchPromise, timeoutPromise]);
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
        } catch (e) {
            // Fallback to cache/local if server fetch fails or times out
            if (this.cache && this.cache.properties) {
                const found = this.cache.properties.find(p => p.id === id);
                if (found) return found;
            }
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
            adults: userDetails.adults,
            children: userDetails.children,
            totalRooms: userDetails.totalRooms,
            selectedRooms: userDetails.selectedRooms || null,
            packageInfo: userDetails.packageInfo || null,
            roomTypeId: userDetails.roomTypeId || null,
            roomTypeName: userDetails.roomTypeName || null,
            createdAt: new Date().toISOString()
        };
        const ref = await firestore.collection('bookings').add(newBooking);

        // CREATE NOTIFICATION FOR MANAGER & ADMIN
        await this.createNotification({
            message: '🛎️ New Booking!',
            details: `${newBooking.customerName} booked ${property.title}${newBooking.packageInfo ? ' (Package: ' + newBooking.packageInfo.title + ')' : ''}. Amount: ${newBooking.totalAmount} Birr. Reference: ${referenceCode}`,
            targetRole: 'admin',
            category: 'bookings',
            status: 'pending',
            link: 'admin',
            params: { tab: 'bookings' },
            bookingId: ref.id
        });

        // Trigger Push for Admin/Manager
        this.triggerPushNotification(property.id, '🛎️ New Booking!', `${newBooking.customerName} booked ${property.title}.`, null, 'admin', { tab: 'bookings' });

        if (property.managerId) {
            await this.createNotification({
                message: '🛎️ New Booking!',
                details: `${newBooking.customerName} booked ${property.title}. Please verify the payment.`,
                targetUserId: property.managerId,
                category: 'bookings',
                status: 'pending',
                link: 'manager',
                params: { tab: 'bookings' },
                bookingId: ref.id
            });
            this.triggerPushNotification(property.id, '🛎️ New Booking!', `New stay booked at ${property.title}.`, property.managerId, 'manager', { tab: 'bookings' });
        }

        this.clearCache('bookings');
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

    async getBookingByRefCode(refCode) {
        if (!refCode) return null;
        let cleanRef = refCode.trim();
        if (cleanRef.startsWith('#')) {
            cleanRef = cleanRef.substring(1);
        }
        
        // Query with hash prefix
        const snapshotWithHash = await firestore.collection('bookings')
            .where('referenceCode', '==', `#${cleanRef}`)
            .limit(1)
            .get();
        if (!snapshotWithHash.empty) {
            return { id: snapshotWithHash.docs[0].id, ...snapshotWithHash.docs[0].data() };
        }
        
        // Query without hash prefix
        const snapshotWithoutHash = await firestore.collection('bookings')
            .where('referenceCode', '==', cleanRef)
            .limit(1)
            .get();
        if (!snapshotWithoutHash.empty) {
            return { id: snapshotWithoutHash.docs[0].id, ...snapshotWithoutHash.docs[0].data() };
        }
        
        return null;
    }

    async updateBookingStatus(bookingId, status) {
        const bookingRef = firestore.collection('bookings').doc(bookingId);
        
        await firestore.runTransaction(async (transaction) => {
            const bookingDoc = await transaction.get(bookingRef);
            if (!bookingDoc.exists) throw new Error("Booking not found");
            const booking = bookingDoc.data();
            
            // Check if status actually changed in a way that affects inventory
            const wasConfirmed = booking.status === 'Confirmed';
            const isConfirmed = status === 'Confirmed';
            
            if (wasConfirmed !== isConfirmed) {
                const propertyRef = firestore.collection('properties').doc(booking.propertyId);
                const propertyDoc = await transaction.get(propertyRef);
                
                if (propertyDoc.exists) {
                    const property = propertyDoc.data();
                    let updated = false;
                    
                    if (booking.roomTypeId && property.roomTypes && property.roomTypes.length > 0) {
                        const roomIdx = property.roomTypes.findIndex(r => r.id === booking.roomTypeId);
                        if (roomIdx > -1) {
                            let currentAvail = Number(property.roomTypes[roomIdx].availableRooms) || 0;
                            if (isConfirmed) currentAvail = Math.max(0, currentAvail - 1); // Decrement, don't go below 0
                            else currentAvail += 1; // Increment on cancellation
                            property.roomTypes[roomIdx].availableRooms = currentAvail;
                            updated = true;
                        }
                    } else if (property.availableRooms !== undefined) {
                        let currentAvail = Number(property.availableRooms) || 0;
                        if (isConfirmed) currentAvail = Math.max(0, currentAvail - 1);
                        else currentAvail += 1;
                        property.availableRooms = currentAvail;
                        updated = true;
                    }
                    
                    if (updated) {
                        transaction.update(propertyRef, property);
                    }
                }
            }
            
            transaction.update(bookingRef, { status });
        });
        
        // Re-fetch booking for notifications after transaction
        const booking = (await bookingRef.get()).data();
        this.clearCache('bookings');
        this.clearCache('properties');

        // Update corresponding manager/admin notifications (Background)
        try {
            let notifSnap = await firestore.collection('notifications').where('bookingId', '==', bookingId).get();
            if (notifSnap.empty && booking.referenceCode) {
                const fallbackSnap = await firestore.collection('notifications').where('category', '==', 'bookings').get();
                const matchingDocs = fallbackSnap.docs.filter(doc => {
                    const data = doc.data();
                    return data.details && (data.details.includes(booking.referenceCode) || (data.details.includes(booking.customerName) && data.details.includes(booking.propertyTitle)));
                });
                notifSnap = { docs: matchingDocs };
            }
            
            if (notifSnap.docs.length > 0) {
                const batch = firestore.batch();
                const newStatus = status === 'Confirmed' ? 'confirmed' : (status === 'Denied' ? 'failed' : 'info');
                notifSnap.docs.forEach(doc => {
                    batch.update(doc.ref, { status: newStatus });
                });
                batch.commit().catch(e => console.warn("Background batch update failed", e));
            }
        } catch(e) {
            console.warn("Failed to update manager/admin notification status:", e);
        }

        // NOTIFY CLIENT AND MANAGER (Run in parallel to eliminate blocking UI)
        let message = '📢 Booking Update';
        let details = `Your booking for ${booking.propertyTitle} (${booking.referenceCode}) is now: ${status}`;
        
        if (status === 'Confirmed') {
            message = `🎉 Booking Confirmed!`;
            details = `Your stay at ${booking.propertyTitle} is ready. See you soon!`;
        } else if (status === 'Denied') {
            message = `❌ Booking Denied`;
            details = `We regret to inform you that your booking for ${booking.propertyTitle} was denied.`;
        }

        // Always fetch latest managerId directly from property to prevent missing notifications from old bookings
        let actualManagerId = null;
        try {
            const propDoc = await firestore.collection('properties').doc(booking.propertyId).get();
            if (propDoc.exists) actualManagerId = propDoc.data().managerId;
        } catch(e) {}
        if (!actualManagerId) actualManagerId = booking.managerId;

        const notificationTasks = [];

        // 1. Client App Notification
        notificationTasks.push(this.createNotification({
            message,
            details,
            targetUserId: booking.customerId,
            type: status === 'Confirmed' ? 'booking_confirmed' : 'booking_update',
            link: 'profile',
            params: { tab: 'bookings' }
        }));

        // 2. Client Push Notification
        notificationTasks.push(this.triggerPushNotification(
            booking.propertyId,
            message,
            details,
            booking.customerId,
            'profile',
            { tab: 'bookings' }
        ));

        if (status === 'Confirmed' && actualManagerId) {
            // 3. Manager App Notification
            notificationTasks.push(this.createNotification({
                message: '✅ Booking Confirmed',
                details: `Booking for ${booking.propertyTitle} (${booking.referenceCode}) has been confirmed successfully.`,
                targetUserId: actualManagerId,
                category: 'bookings',
                status: 'confirmed',
                link: 'manager',
                params: { tab: 'bookings' },
                bookingId: bookingId
            }));

            // 4. Manager Push Notification
            notificationTasks.push(this.triggerPushNotification(
                booking.propertyId,
                '✅ Booking Confirmed',
                `Booking for ${booking.propertyTitle} (${booking.referenceCode}) has been confirmed.`,
                actualManagerId,
                'manager',
                { tab: 'bookings' }
            ));
        }

        // Execute all notifications in background so UI updates instantly
        Promise.allSettled(notificationTasks).catch(e => console.warn("Background notification error", e));
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

    // ─── STORAGE (Cloudinary / Firebase) ──────────
    async deleteFile(url) {
        if (!url || typeof url !== 'string') return;
        try {
            if (url.includes('firebasestorage.googleapis.com')) {
                const fileRef = firebase.storage().refFromURL(url);
                await fileRef.delete();
            } else if (url.includes('cloudinary.com')) {
                console.warn("Cloudinary file deletion bypassed on client:", url);
            }
        } catch(e) {
            console.warn("Failed to delete file:", e);
        }
    }

    async uploadFile(file, folder = 'properties', onProgress = null, retries = 2) {
        const cloudName = 'dudc1zwmq';
        const uploadPreset = 'michu_stays';
        const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

        const attemptUpload = (attemptsLeft) => {
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
                    console.error("Cloudinary Network Error. Attempts left:", attemptsLeft);
                    if (attemptsLeft > 0) {
                        if (onProgress) onProgress(`Retrying... (${attemptsLeft})`);
                        setTimeout(() => {
                            attemptUpload(attemptsLeft - 1).then(resolve).catch(reject);
                        }, 2000);
                    } else {
                        reject(new Error("Network error during upload after retries."));
                    }
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
        };

        return attemptUpload(retries);
    }

    // ─── REVIEWS / RATINGS ─────────────────────────────────────
    async addReview(propertyId, userId, userName, rating, bookingId, text = '', images = [], subRatings = null) {
        const existing = await firestore.collection('reviews')
            .where('bookingId', '==', bookingId).get();
        const payloadUpdates = { rating, text, images, updatedAt: new Date().toISOString() };
        if (subRatings) payloadUpdates.subRatings = subRatings;

        if (!existing.empty) {
            // Update existing review
            const docId = existing.docs[0].id;
            await firestore.collection('reviews').doc(docId).update(payloadUpdates);
            this.clearCache('reviews');
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
            subRatings: subRatings || { cleanliness: rating, location: rating, service: rating, value: rating },
            helpfulCount: 0,
            reported: false,
            createdAt: new Date().toISOString()
        };
        const ref = await firestore.collection('reviews').add(review);
        this.clearCache('reviews');
        return { id: ref.id, ...review };
    }

    async voteReviewHelpful(reviewId) {
        const voted = JSON.parse(localStorage.getItem('michu_voted_reviews') || '{}');
        if (voted[reviewId]) {
            throw new Error('You have already voted this review helpful.');
        }
        await firestore.collection('reviews').doc(reviewId).update({
            helpfulCount: firebase.firestore.FieldValue.increment(1)
        });
        voted[reviewId] = true;
        localStorage.setItem('michu_voted_reviews', JSON.stringify(voted));
        this.clearCache('reviews');
        return true;
    }

    async reportReview(reviewId) {
        const reported = JSON.parse(localStorage.getItem('michu_reported_reviews') || '{}');
        if (reported[reviewId]) {
            throw new Error('You have already reported this review.');
        }
        await firestore.collection('reviews').doc(reviewId).update({
            reported: true,
            reportCount: firebase.firestore.FieldValue.increment(1)
        });
        reported[reviewId] = true;
        localStorage.setItem('michu_reported_reviews', JSON.stringify(reported));
        this.clearCache('reviews');
        return true;
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
                    reviewData.propertyId, 
                    'New Reply to Your Review! 💬', 
                    `${managerName} replied: "${replyText.substring(0, 50)}..."`,
                    reviewData.userId,
                    'hotel_detail_view',
                    { id: reviewData.propertyId }
                );
            }
        } catch (e) {
            console.warn("Notification for review reply failed:", e);
        }

        this.clearCache('reviews');
        return reply;
    }

    async deleteReview(reviewId) {
        const res = await firestore.collection('reviews').doc(reviewId).delete();
        this.clearCache('reviews');
        return res;
    }

    async deleteReviewReply(reviewId) {
        const res = await firestore.collection('reviews').doc(reviewId).update({
            managerReply: firebase.firestore.FieldValue.delete()
        });
        this.clearCache('reviews');
        return res;
    }

    async editReview(reviewId, newText, newRating) {
        const res = await firestore.collection('reviews').doc(reviewId).update({
            text: newText,
            rating: newRating,
            updatedAt: new Date().toISOString()
        });
        this.clearCache('reviews');
        return res;
    }

    async editReviewReply(reviewId, newReplyText) {
        const doc = await firestore.collection('reviews').doc(reviewId).get();
        if (!doc.exists) throw new Error('Review not found');
        const existing = doc.data().managerReply || {};
        const res = await firestore.collection('reviews').doc(reviewId).update({
            managerReply: {
                ...existing,
                text: newReplyText,
                updatedAt: new Date().toISOString()
            }
        });
        this.clearCache('reviews');
        return res;
    }

    async getReviews(propertyId) {
        // Fast path: check in-memory cache first
        if (this.cache && this.cache.reviews && this.cache.reviews[propertyId] && (Date.now() - this.cache.reviews[propertyId].ts < this.cache.cacheDuration)) {
            return this.cache.reviews[propertyId].data;
        }
        try {
            const fetchPromise = firestore.collection('reviews').where('propertyId', '==', propertyId).get();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
            const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (this.cache && this.cache.reviews) {
                this.cache.reviews[propertyId] = { data, ts: Date.now() };
            }
            try {
                localStorage.setItem('michu_reviews_cache_' + propertyId, JSON.stringify({ data, ts: Date.now() }));
            } catch(e) {}
            return data;
        } catch(e) {
            // Fallback to cache/local if server fetch fails or times out
            if (this.cache && this.cache.reviews && this.cache.reviews[propertyId]) {
                return this.cache.reviews[propertyId].data;
            }
            try {
                const stored = localStorage.getItem('michu_reviews_cache_' + propertyId);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (this.cache && this.cache.reviews) {
                        this.cache.reviews[propertyId] = parsed;
                    }
                    return parsed.data;
                }
            } catch(err) {}
            // Final fallback: non-timeout get()
            const snapshot = await firestore.collection('reviews').where('propertyId', '==', propertyId).get().catch(() => ({ docs: [] }));
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (this.cache && this.cache.reviews) {
                this.cache.reviews[propertyId] = { data, ts: Date.now() };
            }
            return data;
        }
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
            targetUserId: null,
            targetRole: null,
            isRead: false,
            category: 'system',
            status: 'info',
            ...data,
            createdAt: new Date().toISOString()
        };
        return await firestore.collection('notifications').add(payload);
    }

    // Old duplicate methods removed — using the unified versions at the bottom of this class

    listenToBookings(callback, managerId = null, customerId = null, filters = {}, limitCount = 20, propertyId = null) {
        let query = firestore.collection('bookings');
        if (propertyId) query = query.where('propertyId', '==', propertyId);
        else if (managerId) query = query.where('managerId', '==', managerId);
        if (customerId) query = query.where('customerId', '==', customerId);
        
        if (filters.status && filters.status !== 'all') {
            query = query.where('status', '==', filters.status);
        }
        if (filters.propertyTitle && filters.propertyTitle !== 'all') {
            query = query.where('propertyTitle', '==', filters.propertyTitle);
        }
        
        // Note: Firestore requires all range filters to be on the same field as the first orderBy
        if (filters.from) query = query.where('createdAt', '>=', filters.from);
        if (filters.to) query = query.where('createdAt', '<=', filters.to + 'T23:59:59');

        query = query.orderBy('createdAt', 'desc').limit(limitCount);

        return query.onSnapshot(snapshot => {
            const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(bookings);
        }, error => {
            console.error("listenToBookings Error:", error);
        });
    }

    listenToAnalytics(callback, managerId = null, filters = {}, propertyId = null) {
        let query = firestore.collection('bookings');
        if (propertyId) query = query.where('propertyId', '==', propertyId);
        else if (managerId) query = query.where('managerId', '==', managerId);
        
        if (filters.from) query = query.where('createdAt', '>=', filters.from);
        if (filters.to) query = query.where('createdAt', '<=', filters.to + 'T23:59:59');

        // Without a limit, this fetches all matching records for the timeframe.
        // If they select "All Time" (no dates), it might still be heavy for admin, 
        // but for a manager it's usually fine. We add an arbitrary safety limit of 5000.
        query = query.orderBy('createdAt', 'desc').limit(5000);

        return query.onSnapshot(snapshot => {
            const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(bookings);
        }, error => {
            console.error("listenToAnalytics Error:", error);
        });
    }

    listenForNotifications(callback, onError) {
        const user = window.auth?.currentUser;
        const role = window.auth?.role || window.auth?.userData?.role;
        if (!user) return;

        // Run background cleanup (7-day rule & 100-item limit)
        this.cleanupOldNotifications(user.uid);

        // CRITICAL: We show popups for notifications created AFTER the app loaded.
        // We add a 30s grace period to account for server/client clock drift.
        const sessionStartTime = Date.now() - 30000; 
        
        // Fetch the last 7 days of history to ensure users don't miss anything.
        const historyStartTime = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
        const seenIds = new Set();

        const handleSnapshot = (snapshot) => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const id = change.doc.id;
                    if (!seenIds.has(id)) {
                        seenIds.add(id);
                        
                        // Prevent admins from receiving direct chat notifications (they are between guest and manager)
                        if (role === 'admin' && data.link === 'chat') return;
                        
                        // Skip notifications this user has dismissed locally
                        if (this.isNotifDismissed(id)) return;
                        
                        // Apply local read state for shared notifications
                        const isShared = !data.targetUserId;
                        if (isShared && this.isSharedNotifRead(id)) {
                            data.isRead = true;
                        }
                        
                        // ONLY trigger the popup callback if the notification is brand new (created after session start)
                        const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : 0;
                        if (createdAt >= sessionStartTime) {
                            callback({ id, ...data });
                        } else {
                            if (window.updateNotifPanelOnly) window.updateNotifPanelOnly({ id, ...data });
                        }
                    }
                } else if (change.type === 'modified') {
                    const data = change.doc.data();
                    const id = change.doc.id;
                    if (window.updateExistingNotifOnly) window.updateExistingNotifOnly({ id, ...data });
                }
            });
        };

        const base = firestore.collection('notifications').where('createdAt', '>', historyStartTime);
        let unsubs = [];

        try {
            if (role === 'admin') {
                // Admins see ALL notifications (platform-wide visibility)
                unsubs.push(base.onSnapshot(handleSnapshot, onError));
            } else {
                // 1. Personal Notifications (targetUserId matches this user)
                //    This catches: booking alerts for their specific hotel, chat messages,
                //    review replies, and any notification addressed directly to them.
                unsubs.push(base.where('targetUserId', '==', user.uid).onSnapshot(handleSnapshot, onError));
                
                // 2. Global Announcements (targetRole == 'all') — for everyone
                unsubs.push(base.where('targetRole', '==', 'all').onSnapshot(handleSnapshot, onError));
                
                // 3. Customer-specific broadcasts
                if (role === 'customer') {
                    unsubs.push(base.where('targetRole', '==', 'customer').onSnapshot(handleSnapshot, onError));
                }
                
                // 4. Fallback for untargeted legacy system alerts
                unsubs.push(base.where('targetUserId', '==', null).where('targetRole', '==', null).onSnapshot(handleSnapshot, onError));
                
                // NOTE: We intentionally do NOT subscribe to targetRole == 'manager'.
                // Hotel-specific notifications (bookings, chats, reviews) use targetUserId
                // to address the correct manager. A broad role-based listener would leak
                // other hotels' private booking data to unrelated managers.
            }
        } catch (e) {
            console.warn("Failed to setup notification listeners:", e);
            if (onError) onError(e);
        }

        return () => unsubs.forEach(u => u && u());
    }

    // ─── PUSH NOTIFICATIONS (FCM) ───────────────────────────
    async requestPushPermission(userId) {
        const platform = window.Capacitor ? window.Capacitor.getPlatform() : 'web';
        
        if (platform !== 'web') {
            // NATIVE PUSH (Android/iOS)
            try {
                const { PushNotifications } = window.Capacitor.Plugins;
                if (!PushNotifications) {
                    throw new Error("PushNotifications plugin not loaded");
                }

                let perm = await PushNotifications.checkPermissions();
                console.log("📋 Permission status:", JSON.stringify(perm));
                
                if (perm.receive !== 'granted') {
                    perm = await PushNotifications.requestPermissions();
                    console.log("📋 After request:", JSON.stringify(perm));
                }

                if (perm.receive === 'granted') {
                    // Create notification channels with max importance
                    try {
                        // Primary channel
                        await PushNotifications.createChannel({
                            id: 'michu_urgent_v3',
                            name: 'Michu Urgent Alerts',
                            description: 'Important booking and status updates',
                            importance: 5,
                            visibility: 1,
                            vibration: true,
                            lights: true,
                            sound: 'default'
                        });
                        // Also override the default channel with high importance
                        await PushNotifications.createChannel({
                            id: 'default',
                            name: 'Default',
                            description: 'Default notifications',
                            importance: 5,
                            visibility: 1,
                            vibration: true,
                            lights: true,
                            sound: 'default'
                        });
                    } catch(e) { console.warn("Channel creation issue:", e); }

                    // CRITICAL: Attach listener BEFORE calling register() to avoid race condition
                    const tokenPromise = new Promise((resolve, reject) => {
                        PushNotifications.addListener('registration', async (token) => {
                            const fcmToken = token.value;
                            console.log("📱 FCM Token received:", fcmToken.substring(0, 20) + "...");
                            try {
                                await firestore.collection('users').doc(userId).set({
                                    fcmTokens: firebase.firestore.FieldValue.arrayUnion(fcmToken)
                                }, { merge: true });
                                console.log("✅ FCM Token saved to Firestore for user:", userId);
                            } catch(e) {
                                console.error("❌ Failed to save FCM token:", e);
                            }
                            resolve(fcmToken);
                        });
                        
                        PushNotifications.addListener('registrationError', (err) => {
                            console.error('❌ Push registration error:', err);
                            reject(new Error('Push registration failed: ' + JSON.stringify(err)));
                        });
                        
                        // Timeout after 30 seconds
                        setTimeout(() => reject(new Error("Push registration timed out")), 30000);
                    });

                    // NOW call register after listeners are ready
                    await PushNotifications.register();
                    return await tokenPromise;
                } else {
                    throw new Error("Push permission denied. Status: " + perm.receive);
                }
            } catch (err) {
                console.error("Native push error:", err);
                throw err;
            }
        } else {
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
    }

    setupPushListeners() {
        if (!window.Capacitor) return;
        const platform = window.Capacitor.getPlatform();
        if (platform === 'web') return;

        const { PushNotifications } = window.Capacitor.Plugins;
        if (!PushNotifications) return;

        if (window.__pushListenersSetup) return;
        window.__pushListenersSetup = true;

        console.log("🛠️ Setting up Push Listeners...");

        // Create the high-importance channel (Required for Android 8+ / Samsung background)
        try {
            PushNotifications.createChannel({
                id: 'michu_urgent_v3',
                name: 'Urgent Booking Alerts',
                description: 'Notifications for new bookings and status changes',
                importance: 5, // Importance.HIGH (5)
                visibility: 1, // Visibility.PUBLIC (1)
                vibration: true,
                lights: true
            });
            console.log("✅ Push channel 'michu_urgent_v3' created/verified");
        } catch(e) { console.error("Failed to create push channel:", e); }

        // Foreground listener — show our clickable overlay
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('📬 Foreground push received:', JSON.stringify(notification));
            
            // Show our own clickable overlay
            if (window.db && window.db.showClickableNotification) {
                window.db.showClickableNotification(notification);
            }
        });

        // Tap listener — fires when notification is tapped from tray (background/killed)
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('👆 Push notification tapped:', JSON.stringify(notification));
            const data = notification.notification?.data || {};
            
            // Use a small delay to ensure the app/router is fully loaded after cold start
            setTimeout(() => {
                if (data.link) {
                    let parsedParams = data.params || {};
                    if (typeof parsedParams === 'string') {
                        try { parsedParams = JSON.parse(parsedParams); } catch(e) { console.warn("Failed to parse push params:", e); }
                    }
                    if (window.router) window.router.navigate(data.link, parsedParams);
                } else {
                    // Fallback for legacy notifications
                    const title = notification.notification?.title || '';
                    const body = notification.notification?.body || '';
                    const isBooking = data.type === 'booking' || title.toLowerCase().includes('booking') || body.toLowerCase().includes('booking');
                    
                    if (isBooking && window.mobileBookings) {
                        window.mobileBookings();
                    } else {
                        if (window.router) window.router.navigate('home');
                        else window.location.hash = '#home';
                    }
                }
            }, 500);
        });
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

    async triggerPushNotification(hotelId, title, body, targetUserId = null, link = null, params = null) {
        console.log("🚀 Triggering Push (v2):", title, { hotelId, targetUserId, link });

        try {
            // Heartbeat for Render server (if used for other things)
            fetch('https://michu-push-server.onrender.com/').catch(() => {});

            const payload = {
                title,
                body,
                hotelId: hotelId || null,
                targetRoles: ['admin'], // Always notify admins
                data: {
                    link: link || null,
                    params: params ? JSON.stringify(params) : null
                }
            };

            // If we have a specific target user (like the guest themselves), get their tokens if possible
            if (targetUserId) {
                try {
                    const userDoc = await firestore.collection('users').doc(targetUserId).get();
                    if (userDoc.exists) {
                        const data = userDoc.data();
                        // Support both fcmToken (legacy) and fcmTokens (array)
                        let uTokens = [];
                        if (data.fcmTokens) uTokens = data.fcmTokens;
                        else if (data.fcmToken) uTokens = [data.fcmToken];
                        
                        if (uTokens.length > 0) payload.tokens = uTokens;
                    }
                } catch(e) {
                    console.log("Could not fetch target token on client (likely rules), backend will handle manager/admin roles.");
                }
            }

            const response = await fetch('https://us-central1-michu-stays.cloudfunctions.net/sendPush', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const err = await response.text();
                console.error("Push Error Response:", err);
            }
            console.log("✅ Push Request Sent to Backend");
        } catch (error) {
            console.error('Push Trigger Failed:', error);
        }
    }

    showClickableNotification(notif) {
        const title = notif.title || 'New Update';
        const body = notif.body || 'You have a new notification';
        const data = notif.data || {};
        
        const isBooking = data.type === 'booking' || title.toLowerCase().includes('booking') || body.toLowerCase().includes('booking');
        
        // Remove existing if any
        const old = document.getElementById('michu-push-overlay');
        if (old) old.remove();

        const overlay = document.createElement('div');
        overlay.id = 'michu-push-overlay';
        overlay.style = `
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(14, 68, 44, 0.95);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            padding: 2rem; color: white; text-align: center;
            backdrop-filter: blur(8px); animation: michuPop 0.5s ease;
        `;
        
        overlay.innerHTML = `
            <div style="font-size: 5rem; margin-bottom: 2rem; animation: pulse 2s infinite;">🔔</div>
            <h2 style="font-size: 2rem; font-weight: 800; margin-bottom: 1rem;">${title}</h2>
            <p style="font-size: 1.1rem; opacity: 0.9; margin-bottom: 3rem; max-width: 400px; line-height: 1.6;">${body}</p>
            
            <button id="michu-view-btn" style="
                background: white; color: #0e442c; border: none;
                padding: 1.2rem 3rem; border-radius: 50px; font-weight: 800;
                font-size: 1.2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                cursor: pointer; transform: scale(1); transition: transform 0.2s;
            ">VIEW BOOKINGS</button>
            
            <button id="michu-close-btn" style="
                background: transparent; color: rgba(255,255,255,0.6); border: none;
                margin-top: 2rem; font-weight: 600; cursor: pointer;
            ">Dismiss</button>

            <style>
                @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
            </style>
        `;
        
        document.body.appendChild(overlay);

        overlay.querySelector('#michu-view-btn').onclick = () => {
            overlay.remove();
            if (isBooking && window.mobileBookings) {
                window.mobileBookings();
            } else {
                if (window.router) window.router.navigate('home');
                else window.location.hash = '#home';
            }
        };

        overlay.querySelector('#michu-close-btn').onclick = () => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s';
            setTimeout(() => overlay.remove(), 300);
        };
    }

    // ─── CHAT METHODS ────────────────────────────────────────────────────────

    async getBookingById(bookingId) {
        const doc = await firestore.collection('bookings').doc(bookingId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    async getOrCreateChatThread(propertyId, guestId, bookingId, property, booking) {
        const threadId = `${propertyId}_${guestId}`;
        const ref = firestore.collection('chatThreads').doc(threadId);
        const doc = await ref.get();
        if (doc.exists) {
            const data = doc.data();
            let needsUpdate = false;
            let updatedFields = {};

            if (bookingId && data.bookingId !== bookingId) {
                updatedFields.bookingId = bookingId;
                updatedFields.bookingRef = booking?.referenceCode || data.bookingRef || '';
                needsUpdate = true;
            }

            // Sync guest name and email dynamically from users collection if stale or missing
            try {
                const uDoc = await firestore.collection('users').doc(guestId).get();
                if (uDoc.exists) {
                    const latestName = uDoc.data().fullName || uDoc.data().name || uDoc.data().displayName || null;
                    const latestEmail = uDoc.data().email || null;
                    if (data.guestName !== latestName) {
                        updatedFields.guestName = latestName;
                        needsUpdate = true;
                    }
                    if (data.guestEmail !== latestEmail) {
                        updatedFields.guestEmail = latestEmail;
                        needsUpdate = true;
                    }
                }
            } catch (e) {
                console.warn('Syncing guest details in getOrCreateChatThread failed:', e);
            }

            if (needsUpdate) {
                updatedFields.updatedAt = new Date().toISOString();
                await ref.update(updatedFields);
                return { id: doc.id, ...data, ...updatedFields };
            }
            return { id: doc.id, ...data };
        }
        const thread = {
            propertyId, propertyTitle: property?.title || '', managerId: property?.managerId || '',
            guestId, guestName: null, guestEmail: null,
            bookingId: bookingId || null, bookingRef: booking?.referenceCode || null,
            lastMessage: null, lastMessageAt: null,
            unreadByGuest: 0, unreadByManager: 0,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        try {
            const uDoc = await firestore.collection('users').doc(guestId).get();
            if (uDoc.exists) {
                thread.guestName  = uDoc.data().fullName || uDoc.data().name || uDoc.data().displayName || null;
                thread.guestEmail = uDoc.data().email || null;
            }
        } catch(e) {}
        await ref.set(thread);
        return { id: threadId, ...thread };
    }

    async sendChatMessage(threadId, { senderId, senderName, senderRole, text, imageUrl = null }) {
        await firestore.collection('chatThreads').doc(threadId).collection('messages').add({
            senderId, senderName: senderName || '', senderRole: senderRole || 'guest',
            text, imageUrl, readAt: null, createdAt: new Date().toISOString()
        });
        const update = { lastMessage: text.length > 100 ? text.slice(0,100)+'…' : text, lastMessageAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        if (senderRole === 'guest') { 
            update.unreadByManager = firebase.firestore.FieldValue.increment(1); 
            update.unreadByGuest = 0; 
        } else { 
            update.unreadByGuest = firebase.firestore.FieldValue.increment(1); 
            update.unreadByManager = 0; 
        }
        await firestore.collection('chatThreads').doc(threadId).update(update);

        // --- NEW: NOTIFY RECIPIENT ---
        try {
            const threadSnap = await firestore.collection('chatThreads').doc(threadId).get();
            if (threadSnap.exists) {
                const thread = threadSnap.data();
                const recipientId = senderRole === 'guest' ? thread.managerId : thread.guestId;
                
                if (recipientId) {
                    const messageTitle = `💬 New Message from ${senderName}`;
                    const messageBody = text.length > 60 ? text.slice(0, 60) + '...' : text;

                    // In-App
                    await this.createNotification({
                        message: messageTitle,
                        details: messageBody,
                        targetUserId: recipientId,
                        category: 'system',
                        status: 'info',
                        link: 'chat',
                        params: { threadId: threadId }
                    });

                    // Push
                    this.triggerPushNotification(
                        thread.propertyId,
                        messageTitle,
                        messageBody,
                        recipientId,
                        'chat',
                        { threadId: threadId }
                    );
                }
            }
        } catch(e) { console.warn('Chat notification trigger failed:', e); }
    }

    async editChatMessage(threadId, messageId, newText) {
        try {
            await firestore.collection('chatThreads').doc(threadId).collection('messages').doc(messageId).update({
                text: newText,
                editedAt: new Date().toISOString()
            });
        } catch(e) { console.warn('editChatMessage error:', e); throw e; }
    }

    async deleteChatMessageForMe(threadId, messageId, role) {
        try {
            const key = role === 'guest' ? 'hiddenForGuest' : 'hiddenForManager';
            await firestore.collection('chatThreads').doc(threadId).collection('messages').doc(messageId).update({
                [key]: true
            });
        } catch(e) { console.warn('deleteChatMessageForMe error:', e); throw e; }
    }

    async deleteChatMessageForEveryone(threadId, messageId) {
        try {
            await firestore.collection('chatThreads').doc(threadId).collection('messages').doc(messageId).update({
                text: "🚫 This message was deleted",
                isDeleted: true,
                deletedAt: new Date().toISOString()
            });
        } catch(e) { console.warn('deleteChatMessageForEveryone error:', e); throw e; }
    }

    async clearChatHistory(threadId, role) {
        try {
            const key = role === 'guest' ? 'clearedByGuestAt' : 'clearedByManagerAt';
            await firestore.collection('chatThreads').doc(threadId).update({
                [key]: new Date().toISOString()
            });
        } catch(e) { console.warn('clearChatHistory error:', e); throw e; }
    }

    listenToChatMessages(threadId, callback) {
        return firestore.collection('chatThreads').doc(threadId).collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.warn('Chat listener:', err));
    }

    async markThreadRead(threadId, userId) {
        try {
            const role = window.auth?.userData?.role || 'guest';
            const key  = role === 'guest' ? 'unreadByGuest' : 'unreadByManager';
            await firestore.collection('chatThreads').doc(threadId).update({ [key]: 0 });
            const unread = await firestore.collection('chatThreads').doc(threadId).collection('messages')
                .where('senderId', '!=', userId).where('readAt', '==', null).get();
            if (!unread.empty) {
                const batch = firestore.batch();
                unread.docs.forEach(d => batch.update(d.ref, { readAt: new Date().toISOString() }));
                await batch.commit();
            }
        } catch(e) { console.warn('markThreadRead:', e); }
    }

    async getManagerChatThreads(managerId) {
        try {
            const snap = await firestore.collection('chatThreads').where('managerId', '==', managerId).orderBy('lastMessageAt', 'desc').get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch(e) {
            console.warn('getManagerChatThreads (may need index):', e.message);
            // Fallback without orderBy if index not yet created
            const snap = await firestore.collection('chatThreads').where('managerId', '==', managerId).get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.lastMessageAt||'') > (a.lastMessageAt||'') ? 1 : -1);
        }
    }

    async getGuestChatThreads(guestId) {
        const snap = await firestore.collection('chatThreads').where('guestId', '==', guestId).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.lastMessageAt||'') > (a.lastMessageAt||'') ? 1 : -1);
    }
    async createNotification(notif) {
        const payload = {
            message: notif.message,
            details: notif.details || '',
            createdAt: new Date().toISOString(),
            isRead: false,
            targetUserId: notif.targetUserId || null,
            targetRole: notif.targetRole || null,
            category: notif.category || 'system',
            status: notif.status || 'info',
            link: notif.link || null,
            params: notif.params || null,
            bookingId: notif.bookingId || null,
            actions: notif.actions || []
        };
        const ref = await firestore.collection('notifications').add(payload);
        return { id: ref.id, ...payload };
    }

    async markNotificationAsRead(id) {
        await firestore.collection('notifications').doc(id).update({ isRead: true });
    }

    async markAllNotificationsAsRead(userId, role = null) {
        if (!userId) return;
        // 1. Mark personal notifications as read in Firestore (allowed by security rules)
        const personalSnap = await firestore.collection('notifications')
            .where('targetUserId', '==', userId)
            .where('isRead', '==', false)
            .get();

        if (!personalSnap.empty) {
            const batch = firestore.batch();
            personalSnap.docs.forEach(doc => batch.update(doc.ref, { isRead: true }));
            await batch.commit();
        }

        // 2. For shared/role-based notifications, store read IDs locally
        //    (we can't update shared docs — Firestore rules block it, and it would affect all users)
        try {
            const readSharedIds = JSON.parse(localStorage.getItem('michu_read_shared_notifs') || '[]');
            const historyStart = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
            const sharedSnaps = [];
            const allRoleSnap = await firestore.collection('notifications').where('targetRole', '==', 'all').where('createdAt', '>', historyStart).get();
            sharedSnaps.push(...allRoleSnap.docs);
            if (role && role !== 'customer') {
                const roleSnap = await firestore.collection('notifications').where('targetRole', '==', role).where('createdAt', '>', historyStart).get();
                sharedSnaps.push(...roleSnap.docs);
            }
            if (role === 'customer') {
                const custSnap = await firestore.collection('notifications').where('targetRole', '==', 'customer').where('createdAt', '>', historyStart).get();
                sharedSnaps.push(...custSnap.docs);
            }
            sharedSnaps.forEach(doc => {
                if (!readSharedIds.includes(doc.id)) readSharedIds.push(doc.id);
            });
            localStorage.setItem('michu_read_shared_notifs', JSON.stringify(readSharedIds));
        } catch(e) { console.warn('Failed to mark shared notifs as read locally:', e); }
    }

    async deleteAllNotifications(userId, role = null) {
        if (!userId) return;
        // 1. Delete only personal notifications from Firestore (allowed by security rules)
        const personalSnap = await firestore.collection('notifications')
            .where('targetUserId', '==', userId)
            .get();

        if (!personalSnap.empty) {
            const batch = firestore.batch();
            personalSnap.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }

        // 2. For shared/role-based notifications, store dismissed IDs locally
        //    (deleting shared docs from Firestore would remove them for ALL users)
        try {
            const dismissedIds = JSON.parse(localStorage.getItem('michu_dismissed_notifs') || '[]');
            const historyStart = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
            const sharedSnaps = [];
            const allRoleSnap = await firestore.collection('notifications').where('targetRole', '==', 'all').where('createdAt', '>', historyStart).get();
            sharedSnaps.push(...allRoleSnap.docs);
            if (role && role !== 'customer') {
                const roleSnap = await firestore.collection('notifications').where('targetRole', '==', role).where('createdAt', '>', historyStart).get();
                sharedSnaps.push(...roleSnap.docs);
            }
            if (role === 'customer') {
                const custSnap = await firestore.collection('notifications').where('targetRole', '==', 'customer').where('createdAt', '>', historyStart).get();
                sharedSnaps.push(...custSnap.docs);
            }
            sharedSnaps.forEach(doc => {
                if (!dismissedIds.includes(doc.id)) dismissedIds.push(doc.id);
            });
            localStorage.setItem('michu_dismissed_notifs', JSON.stringify(dismissedIds));
        } catch(e) { console.warn('Failed to dismiss shared notifs locally:', e); }
    }

    isNotifDismissed(notifId) {
        try {
            const dismissed = JSON.parse(localStorage.getItem('michu_dismissed_notifs') || '[]');
            return dismissed.includes(notifId);
        } catch(e) { return false; }
    }

    isSharedNotifRead(notifId) {
        try {
            const readIds = JSON.parse(localStorage.getItem('michu_read_shared_notifs') || '[]');
            return readIds.includes(notifId);
        } catch(e) { return false; }
    }

    async cleanupOldNotifications(userId) {
        if (!userId) return;
        const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)).toISOString();
        
        try {
            // 1. Delete notifications older than 7 days
            const oldOnes = await firestore.collection('notifications')
                .where('targetUserId', '==', userId)
                .where('createdAt', '<', sevenDaysAgo)
                .get();
            
            if (!oldOnes.empty) {
                const batch = firestore.batch();
                oldOnes.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
            
            // 2. Enforce 100-notification limit (Keep only the latest 100)
            const allNotifs = await firestore.collection('notifications')
                .where('targetUserId', '==', userId)
                .orderBy('createdAt', 'desc')
                .get();
            
            if (allNotifs.size > 100) {
                const batch = firestore.batch();
                allNotifs.docs.slice(100).forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
            
            console.log(`🧹 Notification cleanup complete for user ${userId}`);
        } catch(e) {
            console.warn("Notification cleanup issue (may need index):", e.message);
        }
    }
}

window.db = new Database();
