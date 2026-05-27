window.router.addRoute('admin', async (container, params) => {
    if (window.auth?.userData?.role !== 'admin') {
        window.router.navigate('home'); return;
    }

    let cachedProperties = [];
    let cachedBookings = [];
    let cachedUsers = [];
    let activeTab = params?.tab || 'analytics'; // analytics, hotels, bookings, managers, add-hotel, account
    let filterFrom = '';
    let filterTo = '';
    let filterHotel = '';
    let filterStatus = '';
    let bookingsPage = 1;
    let totalBookingsPages = 1;
    let hotelsPage = 1;
    let totalHotelsPages = 1;
    let managersPage = 1;
    let totalManagersPages = 1;
    let isSyncing = false;
    let analyticsStart = '';
    let analyticsEnd = '';

    // --- Global Assignments (Top-level for immediate button access) ---
    let editPropertyId = null;
    window.fastTab = (tab) => { 
        if (tab !== 'add-hotel') editPropertyId = null; 
        activeTab = tab; renderAdmin(); 
    };
    window.setAdmFilter = () => {
        filterFrom = document.getElementById('adm-book-from')?.value || '';
        filterTo = document.getElementById('adm-book-to')?.value || '';
        filterHotel = document.getElementById('adm-book-hotel')?.value || '';
        filterStatus = document.getElementById('adm-book-status')?.value || '';
        bookingsPage = 1;
        renderAdmin();
    };
    window.setBookingPage = (page) => {
        if (page < 1 || page > totalBookingsPages) return;
        bookingsPage = page;
        renderAdmin();
        document.getElementById('adm-tab-bookings')?.scrollIntoView({ behavior: 'smooth' });
    };
    window.setHotelPage = (page) => {
        if (page < 1 || page > totalHotelsPages) return;
        hotelsPage = page;
        renderAdmin();
        document.getElementById('adm-tab-hotels')?.scrollIntoView({ behavior: 'smooth' });
    };
    window.setManagerPage = (page) => {
        if (page < 1 || page > totalManagersPages) return;
        managersPage = page;
        renderAdmin();
        document.getElementById('adm-tab-managers')?.scrollIntoView({ behavior: 'smooth' });
    };
    let propsUnsub = null, booksUnsub = null, usersUnsub = null;
    window.testEmailSystem = async (templateId = 'temp_welcome') => {
        const userData = window.auth?.userData || {};
        const email = userData.email || window.auth?.currentUser?.email;
        if (!email) return window.showToast("❌ User email not found. Try logging out and back in.");
        
        window.showToast(`⏳ Testing ${templateId} to: ${email}`);
        try {
            await window.auth._triggerEmail(templateId, {
                to_name: userData.fullName || 'Admin',
                email: email,
                message: "This is a SYSTEM TEST email. If you see this, your Email Service is working perfectly!",
                link: "Michustays.com/verify-test-link",
                subject: `Michu Stays: ${templateId} Sync Test 📧`
            });
            window.showToast(`✅ ${templateId} SENT to ${email}`);
        } catch (e) {
            console.error("Test Email Fail:", e);
            window.showToast("❌ Email Failed: " + (e.message || "Unknown Error. Check Console."));
        }
    };

    window.admResendEmail = async (id) => {
        try {
            const bookingDoc = await firestore.collection('bookings').doc(id).get();
            const booking = bookingDoc.exists ? bookingDoc.data() : null;
            
            if (booking && booking.customerEmail) {
                window.showToast("⏳ Resending email...");
                // Heartbeat to wake up server
                await fetch('https://michu-push-server.onrender.com/').catch(() => {});
                
                let nights = 0;
                if (booking.checkIn && booking.checkOut) {
                    const diffTime = Math.abs(new Date(booking.checkOut) - new Date(booking.checkIn));
                    nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                const response = await fetch('https://michu-push-server.onrender.com/send-booking-confirmation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: booking.customerEmail,
                        customerName: booking.customerName || 'Guest',
                        hotelTitle: booking.propertyTitle || 'Michu Stay',
                        checkIn: booking.checkIn,
                        checkOut: booking.checkOut,
                        referenceCode: booking.referenceCode,
                        nights: nights,
                        totalAmount: booking.totalAmount || 0,
                        bookingId: id
                    })
                });
                if (response.ok) window.showToast("✅ Confirmation email sent!");
                else window.showToast("❌ Server error.");
            }
        } catch (e) {
            window.showToast("❌ Failed to resend.");
        }
    };

    window.syncData = async () => {
        isSyncing = true;
        container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">
            <div style="font-size:3rem; margin-bottom:1rem;">⏳</div>
            <h2 style="color:var(--color-primary);">Synchronizing Admin Data...</h2>
            <p style="color:#666;">Establishing live connection to properties, bookings, and users.</p>
        </div>`;
        
        if (propsUnsub) propsUnsub();
        if (booksUnsub) booksUnsub();
        if (usersUnsub) usersUnsub();

        try {
            // Properties Listener
            propsUnsub = firestore.collection('properties').onSnapshot(snap => {
                cachedProperties = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (!isSyncing) renderAdmin();
            });

            // Bookings Listener
            booksUnsub = window.db.listenToBookings(data => {
                cachedBookings = data;
                if (!isSyncing) renderAdmin();
            });

            // Users Listener
            usersUnsub = firestore.collection('users').onSnapshot(snap => {
                cachedUsers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (!isSyncing) renderAdmin();
            });

            // Announcements Listener
            window.annsUnsub = firestore.collection('announcements').orderBy('createdAt', 'desc').onSnapshot(snap => {
                window.cachedAnnouncements = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (activeTab === 'announcements') renderAdmin();
            });

            // Wait a moment for initial sync
            await new Promise(r => setTimeout(r, 1500));
        } catch(e) { console.error(e); }
        isSyncing = false;
        renderAdmin();
    };

    let editAnnouncementId = null;

    window.admEditAnnouncement = (id) => {
        const ann = (window.cachedAnnouncements || []).find(a => a.id === id);
        if (!ann) return;
        editAnnouncementId = id;
        // Populate form fields
        document.getElementById('ann-title').value = ann.title || '';
        document.getElementById('ann-body').value = ann.body || '';
        document.getElementById('ann-badge').value = ann.badge || '';
        document.getElementById('ann-cta').value = ann.cta || '';
        document.getElementById('ann-link').value = ann.ctaLink || '';
        document.getElementById('ann-type').value = ann.type || 'promo';
        document.getElementById('ann-active').checked = ann.active !== false;
        // Update button text
        const btn = document.getElementById('ann-save-btn');
        if (btn) btn.textContent = '💾 Save Changes';
        // Show cancel edit button
        const cancelBtn = document.getElementById('ann-cancel-edit-btn');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        // Scroll to form
        document.getElementById('adm-tab-announcements')?.scrollIntoView({ behavior: 'smooth' });
    };

    window.admCancelEditAnnouncement = () => {
        editAnnouncementId = null;
        document.getElementById('ann-title').value = '';
        document.getElementById('ann-body').value = '';
        document.getElementById('ann-badge').value = '';
        document.getElementById('ann-cta').value = '';
        document.getElementById('ann-link').value = '';
        document.getElementById('ann-media').value = '';
        document.getElementById('ann-active').checked = true;
        const btn = document.getElementById('ann-save-btn');
        if (btn) btn.textContent = '📢 Publish Announcement';
        const cancelBtn = document.getElementById('ann-cancel-edit-btn');
        if (cancelBtn) cancelBtn.style.display = 'none';
    };

    window.admSaveAnnouncement = async () => {
        const btn = document.getElementById('ann-save-btn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }
        try {
            const title = document.getElementById('ann-title').value.trim();
            const body = document.getElementById('ann-body').value.trim();
            const fileInput = document.getElementById('ann-media');

            if (!title && !body && !fileInput.files[0] && !editAnnouncementId) {
                window.showToast('❌ Please provide at least an image/video or a message.');
                if (btn) { btn.disabled = false; btn.textContent = editAnnouncementId ? '💾 Save Changes' : '📢 Publish Announcement'; }
                return;
            }

            const active = document.getElementById('ann-active').checked;
            const type = document.getElementById('ann-type').value;
            const badge = document.getElementById('ann-badge').value.trim();
            const cta = document.getElementById('ann-cta').value.trim();
            const link = document.getElementById('ann-link').value.trim();

            let mediaUrl = null, mediaType = null;
            if (fileInput.files[0]) {
                try {
                    const file = fileInput.files[0];
                    const storageRef = firebase.storage().ref(`announcements/${Date.now()}_${file.name}`);
                    await storageRef.put(file);
                    mediaUrl = await storageRef.getDownloadURL();
                    mediaType = file.type.startsWith('video') ? 'video' : 'image';
                } catch(storageErr) {
                    console.warn('Media upload failed (storage rules not deployed?):', storageErr.message);
                    window.showToast('⚠️ Media upload skipped (run: firebase deploy --only storage). Saving text-only...');
                }
            }

            if (editAnnouncementId) {
                // UPDATE existing announcement
                const updatePayload = { title, body, active, type, badge, cta, ctaLink: link };
                if (mediaUrl) {
                    updatePayload.mediaUrl = mediaUrl;
                    updatePayload.mediaType = mediaType;
                }
                updatePayload.updatedAt = new Date().toISOString();
                await firestore.collection('announcements').doc(editAnnouncementId).update(updatePayload);
                window.showToast('✅ Announcement updated!');
                editAnnouncementId = null;
            } else {
                // CREATE new announcement
                await firestore.collection('announcements').add({
                    title, body, active, type, badge, cta, ctaLink: link,
                    mediaUrl, mediaType, createdAt: new Date().toISOString()
                });
                window.showToast('✅ Announcement published!');
            }

            document.getElementById('ann-title').value = '';
            document.getElementById('ann-body').value = '';
            if (document.getElementById('ann-badge')) document.getElementById('ann-badge').value = '';
            if (document.getElementById('ann-cta')) document.getElementById('ann-cta').value = '';
            if (document.getElementById('ann-link')) document.getElementById('ann-link').value = '';
            document.getElementById('ann-media').value = '';
            
            if (btn) { btn.disabled = false; btn.textContent = '📢 Publish Announcement'; }
            const cancelBtn = document.getElementById('ann-cancel-edit-btn');
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (!isSyncing) renderAdmin();
        } catch(e) {
            console.error('admSaveAnnouncement error:', e);
            window.showToast('❌ Failed: ' + (e.code || e.message));
            if (btn) { btn.disabled = false; btn.textContent = editAnnouncementId ? '💾 Save Changes' : '📢 Publish Announcement'; }
        }
    };

    window.admDeleteAnnouncement = async (id) => {
        const ok = await window.showConfirm({
            title: 'Delete Announcement',
            message: 'Are you sure you want to remove this announcement forever?',
            confirmText: 'Delete',
            type: 'danger'
        });
        if(ok) {
            await firestore.collection('announcements').doc(id).delete();
            window.showToast("✅ Announcement removed.");
        }
    };

    window.admToggleAnnouncement = async (id, active) => {
        await firestore.collection('announcements').doc(id).update({ active: !active });
        window.showToast("✅ Status updated.");
    };

    window.admDelete = async (id, name) => { 
        const ok = await window.showConfirm({
            title: 'Delete Property',
            message: `Are you sure you want to permanently delete "${name}"? This action cannot be undone.`,
            confirmText: 'Delete Now',
            type: 'danger'
        });
        if(ok) { await window.db.deleteProperty(id); window.syncData(); } 
    };

    window.admQuickDiscount = async (id) => {
        const val = document.getElementById(`quick-disc-${id}`)?.value;
        if (val === undefined) return;
        try {
            window.showToast("Updating discount...");
            await window.db.updatePropertyDiscount(id, Number(val));
            window.showToast("✅ Discount updated!");
        } catch (e) {
            window.showToast("❌ Error: " + e.message);
        }
    };

    window.admEditProperty = (id) => {
        editPropertyId = id;
        activeTab = 'add-hotel';
        renderAdmin();
    };

    window.cancelEdit = () => {
        editPropertyId = null;
        activeTab = 'hotels';
        renderAdmin();
    };

    window.admRemoveUser = async (id) => { 
        const ok = await window.showConfirm({
            title: 'Remove Access',
            message: 'Are you sure you want to remove this manager? They will lose all access to their assigned property.',
            confirmText: 'Remove Access',
            type: 'danger'
        });
        if(ok) { await window.db.deleteUser(id); window.syncData(); } 
    };

    let uploadAborted = false;
    window.cancelUpload = () => {
        uploadAborted = true;
        if (window.db.lastTask) {
            try { window.db.lastTask.cancel(); } catch(e) { console.error("Cancel failed:", e); }
        }
        window.showToast("🛑 Upload Canceled");
    };

    let uploadSkipped = false;
    window.skipUpload = () => {
        uploadSkipped = true;
        if (window.db.lastTask) {
            try { window.db.lastTask.cancel(); } catch(e) { console.error("Skip failed:", e); }
        }
        window.showToast("⏩ Skipping Media Upload...");
    };

    window.previewNewPhoto = (id, input) => {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.getElementById(`adm-p-prev-${id}`);
                img.src = e.target.result; img.style.display = 'block';
                const plus = document.getElementById(`adm-p-plus-${id}`);
                if(plus) plus.style.display = 'none';
                const cancel = document.getElementById(`adm-p-cancel-${id}`);
                if(cancel) cancel.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        }
    };

    window.clearAdmPhoto = (id) => {
        const input = document.getElementById(`h-file-${id}`);
        if (input) input.value = '';
        const img = document.getElementById(`adm-p-prev-${id}`);
        if(img) { img.src = ''; img.style.display = 'none'; }
        const plus = document.getElementById(`adm-p-plus-${id}`);
        if(plus) plus.style.display = 'flex';
        const cancel = document.getElementById(`adm-p-cancel-${id}`);
        if(cancel) cancel.style.display = 'none';
    };

    window.viewProof = (url) => {
        document.getElementById('proof-img-adm').src = url;
        document.getElementById('proof-modal-adm').style.display = 'flex';
    };

    window.admUpdateRooms = async (propertyId, totalRooms) => {
        const input = document.getElementById(`adm-rooms-${propertyId}`);
        if (!input) return;
        let newVal = parseInt(input.value);
        if (isNaN(newVal) || newVal < 0) newVal = 0;
        if (newVal > totalRooms) newVal = totalRooms;
        await window.db.updateProperty(propertyId, { availableRooms: newVal });
        window.showToast(`✅ Available rooms set to ${newVal}`);
        window.syncData();
    };

    window.checkRankAvailability = (val) => {
        const info = document.getElementById('adm-rank-info');
        if (!info) return;
        const rank = parseInt(val);
        if (!rank || rank === 0) { info.innerHTML = ''; return; }
        const existing = cachedProperties.find(prop => prop.displaySequence == rank && prop.id !== editPropertyId);
        if (existing) {
            info.innerHTML = `<span style="color:#c5221f; font-weight:700;">⚠️ Taken by "${existing.title}"</span>`;
        } else {
            info.innerHTML = `<span style="color:#1e7e34; font-weight:700;">✅ Available</span>`;
        }
    };

    window.adminSaveProperty = async () => {
        const btn = document.getElementById('adm-publish-btn');
        const statusEl = document.getElementById('adm-up-status');
        if (!btn) return;

        try {
            const getVal = (id) => document.getElementById(id)?.value?.trim() || '';
            const getNum = (id) => {
                const val = document.getElementById(id)?.value || '';
                return Number(String(val).replace(/[^\d.-]/g, '')) || 0;
            };

            const title = getVal('h-title');
            const address = getVal('h-address');
            const price = getNum('h-price');
            const discountP = getNum('h-discount');
            
            if (!title || !address || !price) {
                window.showToast("⚠️ Missing required fields (Title, Address, Price)");
                return;
            }

            btn.disabled = true;
            statusEl.innerText = "Processing...";

            const existing = editPropertyId ? cachedProperties.find(p => p.id === editPropertyId) : null;
            const urls = [];

            // Image Upload Loop
            for (let i = 1; i <= 10; i++) {
                const input = document.getElementById(`h-file-${i}`);
                const prev = document.getElementById(`adm-p-prev-${i}`);
                const isCleared = prev && prev.style.display === 'none';

                if (isCleared) {
                    urls[i-1] = '';
                } else if (input?.files[0]) {
                    if (uploadSkipped) {
                        urls[i-1] = (existing?.images || [])[i-1] || '';
                    } else {
                        statusEl.innerText = `Uploading Photo ${i}...`;
                        urls[i-1] = await window.db.uploadFile(input.files[0], 'properties/photos');
                    }
                } else {
                    urls[i-1] = (existing?.images || [])[i-1] || '';
                }
            }

            const amenities = Array.from(document.querySelectorAll('.adm-amenity:checked')).map(el => el.value);
            
            // Video Handling
            let videoUrl = existing?.videoTour || '';
            const vInput = document.getElementById('h-video');
            const vCancel = document.getElementById('h-video-cancel');
            
            if (vCancel && vCancel.style.display === 'none' && (!vInput || !vInput.files[0])) {
                videoUrl = '';
            } else if (vInput?.files[0] && !uploadSkipped) {
                statusEl.innerText = "Processing Video...";
                videoUrl = await window.db.uploadFile(vInput.files[0], 'properties/videos');
            }

            const filteredImages = urls.filter(Boolean);
            const originalPrice = discountP > 0 ? Math.round(price / (1 - (discountP / 100))) : 0;

            const packagesArr = Array.from(document.querySelectorAll('.adm-package-row')).map(row => ({
                title: row.querySelector('.adm-pkg-title')?.value || '',
                nights: parseInt(row.querySelector('.adm-pkg-nights')?.value) || 0,
                discount: parseInt(row.querySelector('.adm-pkg-discount')?.value) || 0,
                services: row.querySelector('.adm-pkg-services')?.value || ''
            })).filter(p => p.nights > 0);

            // Extract roomTypes
            const roomRows = Array.from(document.querySelectorAll('.adm-room-row'));
            const roomTypesArr = [];
            for (let idx = 0; idx < roomRows.length; idx++) {
                const row = roomRows[idx];
                const fileInput = row.querySelector('.adm-room-img-input');
                let imgUrl = row.querySelector('.adm-room-img-url')?.value || '';
                if (fileInput && fileInput.files[0] && !uploadSkipped) {
                    statusEl.innerText = `Uploading photo for room ${idx+1}...`;
                    imgUrl = await window.db.uploadFile(fileInput.files[0], 'properties/rooms');
                }
                
                const totalRooms = parseInt(row.querySelector('.adm-room-total-rooms').value) || 1;
                let avail = row.querySelector('.adm-room-avail')?.value;
                avail = avail !== '' && avail !== undefined ? parseInt(avail) : totalRooms;
                if (avail > totalRooms) avail = totalRooms;
                
                roomTypesArr.push({
                    id: row.getAttribute('data-id') || `room_${idx}_${Date.now()}`,
                    name: row.querySelector('.adm-room-name').value.trim(),
                    description: row.querySelector('.adm-room-desc').value.trim(),
                    price: parseInt(row.querySelector('.adm-room-price').value) || 0,
                    capacity: parseInt(row.querySelector('.adm-room-capacity').value) || 2,
                    beds: row.querySelector('.adm-room-beds').value.trim(),
                    totalRooms: totalRooms,
                    availableRooms: avail,
                    isActive: row.querySelector('.adm-room-active')?.checked !== false, // Default to true if not found
                    image: imgUrl
                });
            }
            
            const filteredRoomTypesArr = roomTypesArr.filter(r => r.name && r.price);

            let finalPrice = price;
            let finalAvail = getNum('h-avail-rooms');
            let finalTotal = getNum('h-total-rooms');

            if (filteredRoomTypesArr.length > 0) {
                const activeRooms = filteredRoomTypesArr.filter(r => r.isActive !== false);
                if (activeRooms.length > 0) {
                    finalPrice = Math.min(...activeRooms.map(r => r.price));
                }
                finalTotal = filteredRoomTypesArr.reduce((sum, r) => sum + r.totalRooms, 0);
                finalAvail = activeRooms.reduce((sum, r) => sum + r.availableRooms, 0);
            }

            const payload = {
                title,
                type: getVal('h-type'),
                price: finalPrice,
                discountPercent: discountP,
                discount: discountP, // Redundant for compatibility
                originalPrice: discountP > 0 ? Math.round(finalPrice / (1 - (discountP / 100))) : 0,
                totalRooms: finalTotal,
                availableRooms: finalAvail,
                address,
                mapQuery: getVal('h-map-query'),
                phone: getVal('h-phone'),
                cbeAccount: getVal('h-cbe-acc'),
                cbeName: getVal('h-cbe-name'),
                telebirrNumber: getVal('h-tele-num'),
                telebirrName: getVal('h-tele-name'),
                description: getVal('h-desc'),
                distanceFromCenter: getNum('h-distance'),
                displaySequence: getNum('h-display-seq'),
                image: filteredImages[0] || '',
                images: filteredImages,
                videoTour: videoUrl,
                amenities,
                badgeText: getVal('h-badge-text'),
                eventMode: document.getElementById('h-event-mode')?.checked || false,
                packages: packagesArr,
                roomTypes: filteredRoomTypesArr,
                updatedAt: Date.now(),
                managerId: existing?.managerId || '',
                isActive: true
            };

            if (editPropertyId) {
                // Media Cleanup: Remove files that are no longer used
                try {
                    const oldUrls = [
                        ...(existing.images || []),
                        existing.videoTour,
                        ...(existing.roomTypes || []).map(r => r.image)
                    ].filter(url => url && typeof url === 'string');
                    
                    const newUrls = [
                        ...(payload.images || []),
                        payload.videoTour,
                        ...(payload.roomTypes || []).map(r => r.image)
                    ].filter(url => url && typeof url === 'string');
                    
                    const urlsToDelete = oldUrls.filter(url => !newUrls.includes(url));
                    for (const url of urlsToDelete) {
                        await window.db.deleteFile(url);
                    }
                } catch(e) {
                    console.warn("Media cleanup error:", e);
                }

                await window.db.updateProperty(editPropertyId, payload);
                window.showToast("✅ Property Changes Saved!");
            } else {
                await window.db.addProperty({ ...payload, rating: 5.0 });
                window.showToast("✅ New Property Published!");
            }

            editPropertyId = null;
            activeTab = 'hotels';
            renderAdmin();
        } catch (e) {
            console.error("Save Error:", e);
            window.showToast("❌ Save Failed: " + (e.message || "Unknown error"));
        } finally {
            if (btn) btn.disabled = false;
            if (statusEl) statusEl.innerText = "";
        }
    };

    window.previewAdmPic = (input) => {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('adm-pic-box').innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
                window.newAdmPic = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    window.admSaveProfile = async () => {
        const btn = document.getElementById('adm-save-acc-btn');
        btn.disabled = true; btn.innerText = "Saving...";
        try {
            const up = { fullName: document.getElementById('adm-name').value, phone: document.getElementById('adm-phone').value, profilePic: window.newAdmPic || window.auth.userData.profilePic };
            await firestore.collection('users').doc(window.auth.currentUser.uid).update(up);
            window.auth.userData = { ...window.auth.userData, ...up };
            window.auth.renderNav(); window.showToast("✅ Profile updated!"); window.syncData();
        } catch(e) { window.showToast("❌ Update failed: " + e.message); btn.disabled = false; btn.innerText = "Update Profile"; }
    };
    
    window.adminCreateManager = async () => {
        const e = document.getElementById('adm-new-mgr-email').value;
        const p = document.getElementById('adm-new-mgr-pass').value;
        const h = document.getElementById('adm-new-mgr-hotel').value;
        const ph = document.getElementById('adm-new-mgr-phone')?.value?.trim() || '';
        if (!e || p.length < 6) return window.showToast("⚠️ Email and 6+ character password required.");
        const uid = await window.auth.createManagerAccount(e, p, h);
        // Save phone number to the manager's user doc
        if (ph && uid) {
            await firestore.collection('users').doc(uid).update({ phone: ph });
        }
        window.showToast("✅ Manager account created!"); window.syncData();
    };

    window.admEditManagerPhone = async (managerId) => {
        const input = document.getElementById(`mgr-phone-${managerId}`);
        if (!input) return;
        const newPhone = input.value.trim();
        try {
            await firestore.collection('users').doc(managerId).update({ phone: newPhone });
            window.showToast('✅ Phone number updated!');
        } catch(e) {
            window.showToast('❌ Failed to update phone: ' + e.message);
        }
    };

    window.addAdmPackage = () => {
        const container = document.getElementById('adm-packages-container');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'adm-package-row';
        div.style.cssText = `background:white; padding:1rem; border-radius:14px; border:1px solid #e0eaff; margin-bottom:0.5rem;`;
        div.innerHTML = `
            <input type="text" placeholder="Package Title (e.g. Weekend Special)" class="adm-pkg-title" style="padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
            <div>
                <input type="number" placeholder="Nights" class="adm-pkg-nights" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <input type="number" placeholder="Disc %" class="adm-pkg-discount" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
            </div>
            <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#ff385c; cursor:pointer; font-size:1.1rem; font-weight:800;">✕</button>
            <div style="grid-column: 1 / -1;">
                <input type="text" placeholder="Included Services (e.g. Free Massage, Airport Shuttle)" class="adm-pkg-services" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.8rem; background:#fcfcfc;">
            </div>
        `;
        container.appendChild(div);
    };

    window.addAdmRoomType = () => {
        const container = document.getElementById('adm-rooms-container');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'adm-room-row';
        div.style.cssText = `background:white; padding:1.2rem; border-radius:18px; border:1px solid #cbd5e1; display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; position:relative; margin-top:0.8rem;`;
        div.innerHTML = `
            <div style="position:absolute; top:0.8rem; right:0.8rem; display:flex; gap:0.5rem; z-index:10;">
                <label style="display:flex; align-items:center; gap:0.3rem; font-size:0.75rem; font-weight:800; cursor:pointer; background:#f1f5f9; padding:0.3rem 0.6rem; border-radius:6px; color:#475569;">
                    <input type="checkbox" class="adm-room-active" checked style="accent-color:var(--color-primary);"> Active
                </label>
                <button type="button" onclick="this.closest('.adm-room-row').remove()" style="background:none; border:none; color:#ff385c; cursor:pointer; font-size:1.1rem; font-weight:800;">✕</button>
            </div>
            
            <div style="grid-column: 1 / -1; display:flex; gap:1rem; align-items:center; margin-bottom: 0.5rem; margin-top: 1.5rem;">
                <div class="adm-room-img-preview" style="width:60px; height:60px; border-radius:10px; background:#f1f5f9; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <span style="color:#94a3b8; font-size:1.2rem;">📷</span>
                </div>
                <div style="flex:1;">
                    <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Room Photo</label>
                    <input type="file" accept="image/*" class="adm-room-img-input" style="font-size:0.75rem; width:100%;" onchange="
                        const file = this.files[0];
                        if(file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const preview = this.closest('.adm-room-row').querySelector('.adm-room-img-preview');
                                preview.style.background = 'url(' + e.target.result + ') center/cover';
                                preview.innerHTML = '';
                            };
                            reader.readAsDataURL(file);
                        }
                    ">
                    <input type="hidden" class="adm-room-img-url" value="">
                </div>
            </div>
            
            <div style="grid-column: 1 / -1; margin-right: 2rem;">
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Room Type Name</label>
                <input type="text" placeholder="e.g. Deluxe Double Room" class="adm-room-name" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
            </div>
            <div style="grid-column: 1 / -1;">
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Description</label>
                <input type="text" placeholder="Description" class="adm-room-desc" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Price per Night (Birr)</label>
                <input type="number" placeholder="Price" class="adm-room-price" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700; color:var(--color-primary);">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Max Guests Capacity</label>
                <input type="number" placeholder="Capacity" value="2" class="adm-room-capacity" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Bed Configurations</label>
                <input type="text" placeholder="Beds" class="adm-room-beds" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Quantity (Total Rooms)</label>
                <input type="number" placeholder="Total Rooms" value="5" class="adm-room-total-rooms" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Available Rooms</label>
                <input type="number" placeholder="Available" value="5" class="adm-room-avail" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
            </div>
        `;
        container.appendChild(div);
    };

    window.enableAdminPush = async (btn) => {
        try {
            const userData = window.auth.userData || {};
            const isEnabled = userData.fcmTokens && userData.fcmTokens.length > 0;
            
            if (isEnabled) {
                btn.innerText = "Disabling...";
                await window.db.removePushPermission(window.auth.currentUser.uid);
                window.showToast("🔕 Push notifications disabled.");
                btn.innerText = "🔔 Enable Push Alerts";
                btn.style.borderColor = "#f59e0b";
                btn.style.color = "#d97706";
            } else {
                btn.innerText = "Registering...";
                const token = await window.db.requestPushPermission(window.auth.currentUser.uid);
                window.showToast("✅ Push notifications enabled!");
                btn.innerText = "✅ Push Enabled";
                btn.style.borderColor = "green";
                btn.style.color = "green";
                console.log("Admin FCM Token:", token);
            }
        } catch (error) {
            window.showToast("❌ Could not update notifications: " + error.message);
            const userData = window.auth.userData || {};
            if (userData.fcmTokens && userData.fcmTokens.length > 0) {
                btn.innerText = "✅ Push Enabled";
            } else {
                btn.innerText = "🔔 Enable Push Alerts";
            }
        }
    };



    // --- Rendering Logic ---
    const renderAdminUI = () => {
        if (isSyncing) return '';
        const managers = cachedUsers.filter(u => u.role === 'manager');
        const userData = window.auth.userData || {};

        const tabStyle = (tab) => `
            padding:0.7rem 1.4rem; border-radius:99px; font-weight:700; cursor:pointer; font-size:0.85rem; border:none;
            background:${activeTab===tab?'var(--color-primary)':'transparent'};
            color:${activeTab===tab?'white':'#666'};
            transition: 0.2s;
            box-shadow:${activeTab==='account'?'0 4px 12px rgba(0,0,0,0.05)':'none'};
        `;

        return `
                <style>
                    .adm-package-row { display: grid; grid-template-columns: 1fr 100px 100px 40px; gap: 0.8rem; align-items: center; }
                    @media (max-width: 600px) {
                        .adm-package-row { grid-template-columns: 1fr 1fr 45px !important; gap: 0.6rem !important; }
                        .adm-package-row > *:first-child { grid-column: 1 / span 3; }
                    }
                </style>
                <div style="padding-top:1rem;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;">
                    <h2 style="color:var(--color-primary);margin:0;font-weight:800;">Admin Console</h2>
                    <div style="display:flex; gap:0.5rem;">
                        ${(userData.fcmTokens && userData.fcmTokens.length > 0) 
                            ? `<button class="btn-outline" style="border-radius:12px; border-color:green; color:green; font-weight:700; cursor:pointer;" onclick="window.enableAdminPush(this)">✅ Push Enabled</button>`
                            : `<button class="btn-outline" style="border-radius:12px; border-color:#f59e0b; color:#d97706; font-weight:700; cursor:pointer;" onclick="window.enableAdminPush(this)">🔔 Enable Push Alerts</button>`
                        }
                        <button class="btn-outline" style="border-radius:12px;" onclick="window.syncData()">🔄 Sync Data</button>
                    </div>
                </div>

                <div style="background:#eee; border-radius:99px; padding:0.3rem; display:inline-flex; gap:0.2rem; margin-bottom:2.5rem; flex-wrap:wrap;">
                    <button style="${tabStyle('analytics')}" onclick="window.fastTab('analytics')">📊 Analytics</button>
                    <button style="${tabStyle('hotels')}" onclick="window.fastTab('hotels')">Properties</button>
                    <button style="${tabStyle('bookings')}" onclick="window.fastTab('bookings')">Bookings</button>
                    <button style="${tabStyle('managers')}" onclick="window.fastTab('managers')">Managers</button>
                    <button style="${tabStyle('announcements')}" onclick="window.fastTab('announcements')">Announcements</button>
                    <button style="${tabStyle('add-hotel')}" onclick="window.fastTab('add-hotel')">Add Stay</button>
                    <button style="${tabStyle('account')}" onclick="window.fastTab('account')">My Account</button>
                </div>

                <!-- ANALYTICS TAB -->
                <div id="adm-tab-analytics" style="display:${activeTab==='analytics'?'block':'none'}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem; background:#f9f9f9; padding:1.2rem; border-radius:20px; border:1px solid #eee; flex-wrap:wrap; gap:1rem;">
                        <div style="display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;">
                            <h4 style="margin:0; font-size:0.85rem; font-weight:800; text-transform:uppercase; color:#666;">Filter Range:</h4>
                            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                                <input type="date" id="ana-start" value="${analyticsStart}" style="padding:0.6rem; border-radius:10px; border:1.5px solid #eee; font-size:0.85rem; font-weight:700;">
                                <span>to</span>
                                <input type="date" id="ana-end" value="${analyticsEnd}" style="padding:0.6rem; border-radius:10px; border:1.5px solid #eee; font-size:0.85rem; font-weight:700;">
                                <button class="btn-primary" style="padding:0.6rem 1.2rem; border-radius:10px; font-size:0.8rem;" onclick="window.applyAnaFilter()">Filter</button>
                            </div>
                        </div>
                        <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                            <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setAnaPreset('daily')">Daily</button>
                            <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setAnaPreset('weekly')">Weekly</button>
                            <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setAnaPreset('monthly')">Monthly</button>
                            <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem; margin-left:0.5rem; border-color:#e2e8f0; color:#64748b;" onclick="window.resetAnaFilter()">Reset</button>
                        </div>
                    </div>

                    ${(() => {
                        const start = analyticsStart ? new Date(analyticsStart) : null;
                        const end = analyticsEnd ? new Date(analyticsEnd) : null;
                        const filtered = cachedBookings.filter(b => {
                            const d = new Date(b.createdAt);
                            if (start && d < start) return false;
                            if (end && d > end) return false;
                            return true;
                        });

                        const totalRev = filtered.reduce((s, b) => s + (b.totalAmount || 0), 0);
                        const avgValue = Math.round(totalRev / (filtered.length || 1));
                        
                        return `
                        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:1.2rem; margin-bottom:2rem;">
                            <div style="background:white; padding:1.2rem; border-radius:16px; box-shadow:var(--shadow-sm); border-left:5px solid var(--color-primary);">
                                <p style="color:#888; font-size:0.65rem; font-weight:800; text-transform:uppercase; margin:0 0 0.4rem;">Total Revenue</p>
                                <h3 style="margin:0; font-size:1.4rem; color:var(--color-primary);">${totalRev.toLocaleString()} Birr</h3>
                            </div>
                            <div style="background:white; padding:1.2rem; border-radius:16px; box-shadow:var(--shadow-sm); border-left:5px solid #d4af37;">
                                <p style="color:#888; font-size:0.65rem; font-weight:800; text-transform:uppercase; margin:0 0 0.4rem;">Avg. Booking Value</p>
                                <h3 style="margin:0; font-size:1.4rem; color:#d97706;">${avgValue.toLocaleString()} Birr</h3>
                            </div>
                            <div style="background:white; padding:1.2rem; border-radius:16px; box-shadow:var(--shadow-sm); border-left:5px solid #1c2e4a;">
                                <p style="color:#888; font-size:0.65rem; font-weight:800; text-transform:uppercase; margin:0 0 0.4rem;">Bookings Count</p>
                                <h3 style="margin:0; font-size:1.4rem; color:#1c2e4a;">${filtered.length}</h3>
                            </div>
                            <div style="background:white; padding:1.2rem; border-radius:16px; box-shadow:var(--shadow-sm); border-left:5px solid #8b5e3c;">
                                <p style="color:#888; font-size:0.65rem; font-weight:800; text-transform:uppercase; margin:0 0 0.4rem;">Occupancy (Est.)</p>
                                <h3 style="margin:0; font-size:1.4rem; color:#8b5e3c;">${Math.min(100, Math.round((filtered.length / (cachedProperties.length * 30 || 1)) * 100))}%</h3>
                            </div>
                        </div>`;
                    })()}

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:2rem; margin-bottom:2.5rem;">
                        <div style="background:white; padding:2rem; border-radius:24px; box-shadow:var(--shadow-sm); border:1px solid #eee;">
                            <h4 style="margin-top:0; margin-bottom:1.5rem; font-size:1rem; font-weight:800;">📈 Revenue Trends</h4>
                            <canvas id="chart-revenue" height="250"></canvas>
                        </div>
                        <div style="background:white; padding:2rem; border-radius:24px; box-shadow:var(--shadow-sm); border:1px solid #eee;">
                            <h4 style="margin-top:0; margin-bottom:1.5rem; font-size:1rem; font-weight:800;">🔥 Performance Leaderboard</h4>
                            <canvas id="chart-popular" height="250"></canvas>
                        </div>
                    </div>

                    <div style="background:white; padding:2rem; border-radius:24px; box-shadow:var(--shadow-sm); border:1px solid #eee;">
                        <h4 style="margin-top:0; margin-bottom:1.5rem; font-size:1rem; font-weight:800;">🛤️ Volume Timeline (New Bookings)</h4>
                        <canvas id="chart-trends" height="120"></canvas>
                    </div>
                </div>

                <!-- HOTELS TAB -->
                <div id="adm-tab-hotels" style="display:${activeTab==='hotels'?'block':'none'}">
                    <div style="background:white; border-radius:20px; box-shadow:var(--shadow-sm); overflow-x:auto;">
                        <table class="manager-table" style="min-width: 800px;">
                            <thead><tr><th>No.</th><th>Name</th><th>Type</th><th>Price</th><th>Action</th></tr></thead>
                            <tbody>
                                ${(() => {
                                    totalHotelsPages = Math.max(1, Math.ceil(cachedProperties.length / 15));
                                    if (hotelsPage > totalHotelsPages) hotelsPage = totalHotelsPages;
                                    const paginated = cachedProperties.slice((hotelsPage - 1) * 15, hotelsPage * 15);
                                    
                                    return paginated.map((p, index) => {
                                        const rowNum = (hotelsPage - 1) * 15 + index + 1;
                                        const avail = p.availableRooms ?? 0;
                                        const total = p.totalRooms ?? 0;
                                        const color = avail > 0 ? '#1e7e34' : '#c5221f';
                                        return `
                                        <tr>
                                            <td data-label="No." style="font-weight:800; color:#888;">${rowNum}</td>
                                            <td data-label="Name" style="font-weight:700;">
                                                ${p.title}
                                                ${p.displaySequence > 0 ? `<span style="background:#fff8e1; color:#f57f17; border:1px solid #ffe082; padding:0.1rem 0.4rem; border-radius:6px; font-size:0.65rem; margin-left:8px; vertical-align:middle; font-weight:800; box-shadow:0 2px 4px rgba(245,127,23,0.1);">📍 #${p.displaySequence}</span>` : ''}
                                            </td>
                                            <td data-label="Type">${p.type || 'Stay'}</td>
                                            <td data-label="Price">${p.price} Birr</td>
                                            <td data-label="Action" style="display:flex; gap:0.5rem; justify-content:flex-end;">
                                                <button class="btn-outline" style="padding:0.3rem 0.6rem; font-size:0.75rem; color:var(--color-primary);" onclick="window.admEditProperty('${p.id}')">Edit</button>
                                                <button onclick="window.admDelete('${p.id}','${p.title.replace(/'/g, "\\'")}')" style="color:red;border:none;background:none;cursor:pointer;font-weight:700;font-size:0.75rem;">Delete</button>
                                            </td>
                                        </tr>`;
                                    }).join('');
                                })()}
                            </tbody>
                        </table>
                    </div>
                    ${(() => {
                        if (totalHotelsPages <= 1) return '';
                        let btns = '';
                        for (let i = 1; i <= totalHotelsPages; i++) {
                            btns += `<button onclick="window.setHotelPage(${i})" style="width:36px; height:36px; border-radius:10px; border:1px solid ${hotelsPage===i?'var(--color-primary)':'#ddd'}; background:${hotelsPage===i?'var(--color-primary)':'white'}; color:${hotelsPage===i?'white':'#666'}; font-weight:700; cursor:pointer; transition:all 0.2s;">${i}</button>`;
                        }
                        return `
                        <div style="display:flex; justify-content:center; gap:0.5rem; margin-top:2rem;">
                            <button onclick="window.setHotelPage(${hotelsPage - 1})" ${hotelsPage === 1 ? 'disabled' : ''} style="padding:0 0.8rem; height:36px; border-radius:10px; border:1px solid #ddd; background:white; color:#666; font-weight:700; cursor:pointer; opacity:${hotelsPage===1?0.5:1}">‹ Previous</button>
                            ${btns}
                            <button onclick="window.setHotelPage(${hotelsPage + 1})" ${hotelsPage === totalHotelsPages ? 'disabled' : ''} style="padding:0 0.8rem; height:36px; border-radius:10px; border:1px solid #ddd; background:white; color:#666; font-weight:700; cursor:pointer; opacity:${hotelsPage===totalHotelsPages?0.5:1}">Next ›</button>
                        </div>`;
                    })()}
                </div>

                <!-- BOOKINGS TAB -->
                <div id="adm-tab-bookings" style="display:${activeTab==='bookings'?'block':'none'}">
                    <details class="premium-filter-collapse" style="background:white; padding:1.5rem; border-radius:24px; box-shadow:var(--shadow-sm); margin-bottom:1.5rem; border:1px solid #eee;">
                        <summary style="cursor:pointer; font-weight:700; color:var(--color-primary); outline:none;">
                            <div style="display:inline-flex; align-items:center; gap:0.5rem;">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                Filter & Search Bookings
                            </div>
                        </summary>
                        <div class="filter-content" style="margin-top:1.5rem;">
                            <div style="display:flex; align-items:flex-end; gap:0.8rem; flex-wrap:wrap; margin-bottom:0.8rem;">
                                <div>
                                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#888; margin-bottom:0.3rem; text-transform:uppercase;">Hotel/Property</label>
                                    <select id="adm-book-hotel" style="padding:0.6rem; border-radius:10px; border:1.5px solid #e0e0e0; font-size:0.85rem; font-weight:700; background:white; cursor:pointer;" onchange="window.setAdmFilter()">
                                        <option value="">All Properties</option>
                                        ${Array.from(new Set(cachedBookings.map(b => b.propertyTitle))).sort().map(title => `<option value="${title}" ${filterHotel === title ? 'selected' : ''}>${title}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#888; margin-bottom:0.3rem; text-transform:uppercase;">From Date</label>
                                    <input type="date" id="adm-book-from" value="${filterFrom}" style="padding:0.6rem; border-radius:10px; border:1.5px solid #e0e0e0; font-size:0.85rem; font-weight:600;" onchange="window.setAdmFilter()">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#888; margin-bottom:0.3rem; text-transform:uppercase;">To Date</label>
                                    <input type="date" id="adm-book-to" value="${filterTo}" style="padding:0.6rem; border-radius:10px; border:1.5px solid #e0e0e0; font-size:0.85rem; font-weight:600;" onchange="window.setAdmFilter()">
                                </div>
                                <div>
                                    <label style="display:block; font-size:0.7rem; font-weight:800; color:#888; margin-bottom:0.3rem; text-transform:uppercase;">Status</label>
                                    <select id="adm-book-status" style="padding:0.6rem; border-radius:10px; border:1.5px solid #e0e0e0; font-size:0.85rem; font-weight:700; background:white; cursor:pointer;" onchange="window.setAdmFilter()">
                                        <option value="">All Statuses</option>
                                        <option value="Awaiting Confirmation" ${filterStatus === 'Awaiting Confirmation' ? 'selected' : ''}>Awaiting Confirmation</option>
                                        <option value="Confirmed" ${filterStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                        <option value="Denied" ${filterStatus === 'Denied' ? 'selected' : ''}>Denied</option>
                                    </select>
                                </div>
                                <button class="btn-outline" style="padding:0.6rem 1rem; border-radius:10px; font-size:0.8rem;" onclick="filterHotel=''; filterFrom=''; filterTo=''; filterStatus=''; window.setAdmFilter()">✕ Reset Filters</button>
                            </div>
                            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                                <div style="display:flex; align-items:center; gap:0.5rem; background:#f8f9fa; padding:0.5rem 0.8rem; border-radius:10px; border:1.5px solid #e0e0e0; flex:1; min-width:200px; max-width:350px;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    <input id="adm-ref-search" type="text" placeholder="Search by Reference Code..." style="border:none; background:transparent; outline:none; font-size:0.85rem; font-weight:600; font-family:inherit; width:100%;" oninput="window.admSearchRef()">
                                </div>
                            </div>
                            ${(filterFrom || filterTo || filterHotel || filterStatus) ? `<div style="margin-top:0.8rem; padding:0.6rem 1rem; background:#f8f9fa; border-radius:10px; font-size:0.8rem; color:#666; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">🔍 Filtering: ${filterHotel ? '<strong>' + filterHotel + '</strong>' : ''} ${filterFrom ? 'from <strong>' + filterFrom + '</strong>' : ''} ${filterTo ? 'to <strong>' + filterTo + '</strong>' : ''} ${filterStatus ? 'status: <strong>' + filterStatus + '</strong>' : ''}</div>` : ''}
                        </div>
                    </details>

                    <div class="premium-table-wrap">
                    <div style="overflow-x:auto;">
                        <table class="manager-table" style="width:100%; min-width:900px;">
                            <thead><tr><th>No.</th><th>Ref</th><th>Stay</th><th>Guest</th><th>Amount</th><th>Status</th><th>Date & Time</th><th>Proof</th><th>Actions</th></tr></thead>
                            <tbody>
                                ${(() => {
                                    const filtered = cachedBookings.filter(b => {
                                        if(filterStatus && b.status !== filterStatus) return false;
                                        if(filterHotel && b.propertyTitle !== filterHotel) return false;
                                        if(!b.createdAt) return true;
                                        const bDate = new Date(b.createdAt);
                                        if(filterFrom) {
                                            const fDate = new Date(filterFrom);
                                            fDate.setHours(0,0,0,0);
                                            if(bDate < fDate) return false;
                                        }
                                        if(filterTo) {
                                            const tDate = new Date(filterTo);
                                            tDate.setHours(23,59,59,999);
                                            if(bDate > tDate) return false;
                                        }
                                        return true;
                                    }).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));

                                    totalBookingsPages = Math.max(1, Math.ceil(filtered.length / 20));
                                    if(bookingsPage > totalBookingsPages) bookingsPage = totalBookingsPages;
                                    
                                    const paginated = filtered.slice((bookingsPage - 1) * 20, bookingsPage * 20);

                                    return paginated.map((b, index) => {
                                        let rowNum = (bookingsPage - 1) * 20 + index + 1;
                                        let nights = 0;
                                        if (b.checkIn && b.checkOut) {
                                            const diffTime = Math.abs(new Date(b.checkOut) - new Date(b.checkIn));
                                            nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        }
                                        return `
                                        <tr>
                                            <td data-label="No."><span class="premium-row-num">${rowNum}</span></td>
                                            <td data-label="Ref"><span class="premium-ref">${b.referenceCode}</span></td>
                                            <td data-label="Stay">
                                                <div style="font-weight:700;color:#1e293b;">${b.propertyTitle}</div>
                                                <div class="premium-stay-dates">
                                                    ${b.checkIn} → ${b.checkOut} <span class="premium-nights-badge">(${nights} night${nights !== 1 ? 's' : ''})</span>
                                                </div>
                                            </td>
                                            <td data-label="Guest">
                                                <div class="premium-guest-name">${b.customerName || b.customerEmail}</div>
                                                ${b.customerName ? `<div class="premium-guest-email"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> ${b.customerEmail}</div>` : ''}
                                                ${b.customerPhone ? `<div class="premium-guest-phone"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${b.customerPhone}</div>` : ''}
                                                ${b.packageInfo ? `<div class="premium-tag premium-tag--package"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg> PKG: ${b.packageInfo.title}</div>` : ''}
                                                ${b.roomTypeName ? `<div class="premium-tag premium-tag--room"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg> ROOM: ${b.roomTypeName}</div>` : ''}
                                            </td>
                                            <td data-label="Amount"><span class="premium-amount">${b.totalAmount}<span class="premium-amount-currency">Birr</span></span></td>
                                            <td data-label="Status"><span class="premium-status ${b.status==='Confirmed'?'premium-status--confirmed':(b.status==='Denied'?'premium-status--denied':'premium-status--awaiting')}">${b.status}</span></td>
                                            <td data-label="Date & Time">
                                                <div class="premium-date">${b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                                                ${b.createdAt ? `<div class="premium-date-time">${new Date(b.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
                                            </td>
                                            <td data-label="Proof">${b.paymentProofUrl ? `<button class="premium-action-btn" onclick="window.viewProof('${b.paymentProofUrl}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Proof</button>` : '<span style="color:#cbd5e1;">—</span>'}</td>
                                            <td data-label="Actions">
                                                ${b.status === 'Confirmed' ? `
                                                    <button class="premium-action-btn premium-action-btn--primary" onclick="window.admResendEmail('${b.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg> Resend</button>
                                                ` : '<span style="color:#cbd5e1;">—</span>'}
                                            </td>
                                        </tr>`;
                                    }).join('');
                                })()}
                            </tbody>
                        </table>
                    </div>
                    </div>
                    ${(() => {
                        if (totalBookingsPages <= 1) return '';
                        let btns = '';
                        for (let i = 1; i <= totalBookingsPages; i++) {
                            btns += `<button onclick="window.setBookingPage(${i})" class="${bookingsPage===i?'active':''}" style="width:36px; height:36px;">${i}</button>`;
                        }
                        return `
                        <div class="premium-pagination">
                            <button onclick="window.setBookingPage(${bookingsPage - 1})" ${bookingsPage === 1 ? 'disabled' : ''} style="padding:0 0.8rem; height:36px;">‹ Previous</button>
                            ${btns}
                            <button onclick="window.setBookingPage(${bookingsPage + 1})" ${bookingsPage === totalBookingsPages ? 'disabled' : ''} style="padding:0 0.8rem; height:36px;">Next ›</button>
                        </div>`;
                    })()}
                </div>

                <!-- MANAGERS TAB -->
                <div id="adm-tab-managers" style="display:${activeTab==='managers'?'block':'none'}">
                    <div style="background:white; border-radius:20px; box-shadow:var(--shadow-sm); padding:1rem; margin-bottom:2rem; overflow-x:auto;">
                        <table class="manager-table" style="width:100%; min-width:900px;">
                            <thead><tr><th>No.</th><th>Email</th><th>Phone</th><th>Assigned Stay / Hotel</th><th>Action</th></tr></thead>
                            <tbody>${(() => {
                                totalManagersPages = Math.max(1, Math.ceil(managers.length / 15));
                                if (managersPage > totalManagersPages) managersPage = totalManagersPages;
                                const paginated = managers.slice((managersPage - 1) * 15, managersPage * 15);

                                return paginated.map((m, index) => {
                                    const rowNum = (managersPage - 1) * 15 + index + 1;
                                    const hotel = cachedProperties.find(p => p.id === m.hotelId);
                                    return `
                                    <tr>
                                        <td style="font-weight:800; color:#888;">${rowNum}</td>
                                        <td>${m.email}</td>
                                        <td>
                                            <div style="display:flex; align-items:center; gap:0.4rem;">
                                                <input id="mgr-phone-${m.id}" type="text" value="${m.phone || ''}" placeholder="+251..." style="width:130px; padding:0.4rem 0.6rem; border:1px solid #e2e8f0; border-radius:8px; font-size:0.8rem; font-weight:600;">
                                                <button onclick="window.admEditManagerPhone('${m.id}')" style="background:none; border:1px solid var(--color-primary); color:var(--color-primary); border-radius:6px; padding:0.3rem 0.5rem; font-size:0.65rem; font-weight:700; cursor:pointer;">Save</button>
                                            </div>
                                        </td>
                                        <td>
                                            <div style="font-weight:700; color:var(--color-primary);">${hotel ? hotel.title : '—'}</div>
                                            <div style="font-size:0.65rem; color:#aaa; font-family:monospace;">${m.hotelId || ''}</div>
                                        </td>
                                        <td><button class="btn-outline" style="font-size:0.7rem; color:red; border-color:#ffcccc;" onclick="window.admRemoveUser('${m.id}')">Remove</button></td>
                                    </tr>`;
                                }).join('');
                            })()}</tbody>
                        </table>
                    </div>
                    ${(() => {
                        if (totalManagersPages <= 1) return '';
                        let btns = '';
                        for (let i = 1; i <= totalManagersPages; i++) {
                            btns += `<button onclick="window.setManagerPage(${i})" style="width:36px; height:36px; border-radius:10px; border:1px solid ${managersPage===i?'var(--color-primary)':'#ddd'}; background:${managersPage===i?'var(--color-primary)':'white'}; color:${managersPage===i?'white':'#666'}; font-weight:700; cursor:pointer; transition:all 0.2s;">${i}</button>`;
                        }
                        return `
                        <div style="display:flex; justify-content:center; gap:0.5rem; margin-top:2rem; margin-bottom:2rem;">
                            <button onclick="window.setManagerPage(${managersPage - 1})" ${managersPage === 1 ? 'disabled' : ''} style="padding:0 0.8rem; height:36px; border-radius:10px; border:1px solid #ddd; background:white; color:#666; font-weight:700; cursor:pointer; opacity:${managersPage===1?0.5:1}">‹ Previous</button>
                            ${btns}
                            <button onclick="window.setManagerPage(${managersPage + 1})" ${managersPage === totalManagersPages ? 'disabled' : ''} style="padding:0 0.8rem; height:36px; border-radius:10px; border:1px solid #ddd; background:white; color:#666; font-weight:700; cursor:pointer; opacity:${managersPage===totalManagersPages?0.5:1}">Next ›</button>
                        </div>`;
                    })()}
                    <div style="background:white; padding:2rem; border-radius:20px; border:2px dashed #eee;">
                        <h4 style="margin-top:0;">Create Manager</h4>
                        <div class="responsive-grid-2" style="margin-bottom:1rem;">
                            <input type="email" id="adm-new-mgr-email" placeholder="Email" style="width:100%; padding:0.8rem; border:1px solid #ddd; border-radius:12px;">
                            <input type="text" id="adm-new-mgr-pass" placeholder="Initial Password" style="width:100%; padding:0.8rem; border:1px solid #ddd; border-radius:12px;">
                        </div>
                        <div class="responsive-grid-2" style="margin-bottom:1rem;">
                            <input type="tel" id="adm-new-mgr-phone" placeholder="Phone Number (+251...)" style="width:100%; padding:0.8rem; border:1px solid #ddd; border-radius:12px;">
                            <select id="adm-new-mgr-hotel" style="width:100%; padding:0.8rem; border:1px solid #ddd; border-radius:12px;">
                                <option value="">-- No Hotel Assigned --</option>
                                ${cachedProperties.map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
                            </select>
                        </div>
                        <button class="btn-primary" onclick="window.adminCreateManager()">Create Account</button>
                    </div>
                </div>

                <!-- ADD/EDIT LISTING TAB -->
                <div id="adm-tab-add-hotel" style="display:${activeTab==='add-hotel'?'block':'none'}">
                    ${(() => {
                        const p = editPropertyId ? cachedProperties.find(prop => prop.id === editPropertyId) : {};
                        return `
                        <div style="background:white; padding:2.5rem; border-radius:24px; box-shadow:var(--shadow-md); max-width:850px; margin:0 auto; border:1px solid #eee;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                                <h3 style="margin:0; color:var(--color-primary);">${editPropertyId ? 'Edit Stay: ' + p.title : 'Launch New Stay'}</h3>
                                ${editPropertyId ? `<button class="btn-outline" style="border-radius:10px; font-size:0.8rem;" onclick="window.cancelEdit()">Cancel Edit</button>` : ''}
                            </div>
                            
                            <div style="display:flex; flex-direction:column; gap:1.5rem;">
                                <div class="responsive-grid-2" style="gap:1rem;">
                                    <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Stay Name</label><input id="h-title" type="text" value="${p.title||''}" style="width:100%; padding:0.8rem; border:1.5px solid #eee; border-radius:12px;"></div>
                                    <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Type</label>
                                        <select id="h-type" style="width:100%; padding:0.85rem; border:1.5px solid #eee; border-radius:12px; background:white;">
                                            <option value="Hotel" ${p.type==='Hotel'?'selected':''}>Hotel</option>
                                            <option value="Guesthouse" ${p.type==='Guesthouse'?'selected':''}>Guesthouse</option>
                                            <option value="Apartment" ${p.type==='Apartment'?'selected':''}>Apartment</option>
                                            <option value="Traditional Home" ${p.type==='Traditional Home'?'selected':''}>Traditional Home</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="responsive-grid-2" style="gap:1rem;">
                                    <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Price (Birr)</label><input id="h-price" type="number" value="${p.price||''}" style="width:100%; padding:0.8rem; border:1.5px solid #eee; border-radius:12px;"></div>
                                    <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Total Rooms</label><input id="h-total-rooms" type="number" value="${p.totalRooms||10}" style="width:100%; padding:0.8rem; border:1.5px solid #eee; border-radius:12px;"></div>
                                </div>
                                <div class="responsive-grid-2" style="gap:1rem;">
                                    <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Available Rooms</label><input id="h-avail-rooms" type="number" value="${p.availableRooms ?? p.totalRooms ?? 10}" style="width:100%; padding:0.8rem; border:2px solid var(--color-primary); border-radius:12px; font-weight:800; color:var(--color-primary);"></div>
                                    <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Physical Address</label><input id="h-address" type="text" value="${p.address||''}" placeholder="e.g. Churchill Ave" style="width:100%; padding:0.8rem; border:1.5px solid #eee; border-radius:12px;"></div>
                                </div>
                                <div class="responsive-grid-2" style="gap:1rem;">
                                    <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Map Search (GPS/Name)</label><input id="h-map-query" type="text" value="${p.mapQuery||''}" placeholder="Exact Google Maps name" style="width:100%; padding:0.8rem; border:1.5px solid #eee; border-radius:12px;"></div>
                                    <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Phone Number</label><input id="h-phone" type="text" value="${p.phone||''}" placeholder="+251 9..." style="width:100%; padding:0.8rem; border:1.5px solid #eee; border-radius:12px;"></div>
                                </div>
                                <div style="background:#fef3f2; padding:1.2rem; border-radius:16px; border:1px solid #fecaca;">
                                    <h4 style="margin:0 0 0.8rem; font-size:0.85rem; color:#c5221f;">🏷️ Discount & Distance</h4>
                                    <div class="responsive-grid-2" style="gap:1rem;">
                                        <div><label style="font-weight:700; font-size:0.75rem; display:block; margin-bottom:0.4rem; color:#666;">DISCOUNT (%)</label><input id="h-discount" type="number" min="0" max="90" value="${p.discountPercent || p.discount || 0}" placeholder="0" style="width:100%; padding:0.8rem; border:1px solid #ddd; border-radius:10px; font-weight:700;"></div>
                                        <div><label style="font-weight:700; font-size:0.75rem; display:block; margin-bottom:0.4rem; color:#666;">DISTANCE FROM CENTRE (KM)</label><input id="h-distance" type="number" step="0.1" min="0" value="${p.distanceFromCenter||''}" placeholder="e.g. 2.7" style="width:100%; padding:0.8rem; border:1px solid #ddd; border-radius:10px; font-weight:700;"></div>
                                    </div>
                                    <p style="margin:0.6rem 0 0; font-size:0.7rem; color:#999; font-style:italic;">Set discount to 0 for no discount. Original price is auto-calculated.</p>
                                </div>
                                
                                <div style="background:#fff8e1; padding:1.2rem; border-radius:16px; border:1px solid #ffe082;">
                                    <h4 style="margin:0 0 0.8rem; font-size:0.85rem; color:#f57f17;">👑 Absolute Admin Override</h4>
                                    <div style="display:grid; grid-template-columns:1fr; gap:1rem;">
                                        <div>
                                            <label style="font-weight:700; font-size:0.75rem; display:block; margin-bottom:0.4rem; color:#666;">DISPLAY SEQUENCE (PIN RANK)</label>
                                            <div style="display:flex; align-items:center; gap:1rem;">
                                                <input id="h-display-seq" type="number" min="0" value="${p.displaySequence||''}" placeholder="e.g. 1" style="flex:1; padding:0.8rem; border:1px solid #ddd; border-radius:10px; font-weight:700;" oninput="window.checkRankAvailability(this.value)">
                                                <div id="adm-rank-info" style="font-size:0.75rem;"></div>
                                            </div>
                                            ${(() => {
                                                const taken = cachedProperties
                                                    .filter(prop => prop.displaySequence > 0 && prop.id !== editPropertyId)
                                                    .map(prop => prop.displaySequence)
                                                    .sort((a,b) => a-b);
                                                return taken.length > 0 ? `<p style="margin-top:0.6rem; font-size:0.7rem; color:#d97706; font-weight:600;">⚠️ Currently Taken ranks: ${taken.join(', ')}</p>` : '';
                                            })()}
                                        </div>
                                    </div>
                                    <p style="margin:0.6rem 0 0; font-size:0.7rem; color:#888; font-style:italic;">Enter a number (1, 2, 3...) to lock this hotel to the top of the listings, overriding user sorting filters. Leave empty or 0 to unpin.</p>
                                </div>
                                
                                <div style="background:#f9f9f9; padding:1.5rem; border-radius:20px;">
                                    <h4 style="margin:0 0 1rem; font-size:0.9rem;">💳 Payment Options</h4>
                                    <div class="responsive-grid-2" style="gap:1rem; margin-bottom:1rem;">
                                        <input id="h-cbe-acc" placeholder="CBE Account #" value="${p.cbeAccount||''}" style="padding:0.7rem; border-radius:10px; border:1px solid #ddd;">
                                        <input id="h-cbe-name" placeholder="CBE Name" value="${p.cbeName||''}" style="padding:0.7rem; border-radius:10px; border:1px solid #ddd;">
                                    </div>
                                    <div class="responsive-grid-2" style="gap:1rem; margin-bottom:1rem;">
                                        <input id="h-tele-num" placeholder="telebirr #" value="${p.telebirrNumber||''}" style="padding:0.7rem; border-radius:10px; border:1px solid #ddd;">
                                        <input id="h-tele-name" placeholder="telebirr Name" value="${p.telebirrName||''}" style="padding:0.7rem; border-radius:10px; border:1px solid #ddd;">
                                    </div>
                                    <input id="h-phone" placeholder="Reception Phone" value="${p.phone||''}" style="width:100%; padding:0.7rem; border-radius:10px; border:1px solid #ddd;">
                                </div>

                                <div>
                                    <label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:1rem; color:var(--color-primary);">📸 PHOTO GALLERY (SELECT 10)</label>
                                    <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:0.6rem;">
                                        ${(() => {
                                            const images = p.images || [p.image, ...(p.extraImages || [])].filter(Boolean);
                                            return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
                                                const img = images[i-1];
                                                return `
                                            <div style="text-align:center;">
                                                <div style="aspect-ratio:1/1; border:2px dashed #ddd; border-radius:12px; position:relative; overflow:hidden; background:${img?`url('${img}') center/cover`:'#f8f9fa'}; cursor:pointer;" onclick="document.getElementById('h-file-${i}').click()">
                                                    <span id="adm-p-plus-${i}" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#ccc; display:${img?'none':'flex'};">+</span>
                                                    <input type="file" id="h-file-${i}" accept="image/*" style="display:none;" onchange="window.previewNewPhoto(${i}, this)">
                                                    <img id="adm-p-prev-${i}" src="${img||''}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:${img?'block':'none'};">
                                                    <button id="adm-p-cancel-${i}" style="position:absolute; top:0.3rem; right:0.3rem; width:22px; height:22px; border-radius:50%; background:rgba(0,0,0,0.6); color:white; display:${img?'flex':'none'}; align-items:center; justify-content:center; border:none; font-size:0.7rem; font-weight:800; cursor:pointer; z-index:10;" onclick="event.stopPropagation(); window.clearAdmPhoto(${i})">✕</button>
                                                </div>
                                            </div>`;
                                            }).join('');
                                        })()}
                                    </div>
                                </div>

                                <div>
                                    <label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem; color:var(--color-primary);">🎥 VIDEO TOUR (MP4)</label>
                                    <div style="display:flex; gap:1rem; align-items:center; background:#f0f7f4; padding:1rem; border-radius:14px; border:1px solid #d4e8e0;">
                                        <input type="file" id="h-video" accept="video/mp4" style="flex:1; padding:0.5rem; border-radius:8px; border:1.5px solid #ccc; background:white;">
                                        <button id="h-video-cancel" style="display:${p.videoTour?'block':'none'}; color:#d9534f; font-weight:800; font-size:0.8rem; background:none; border:none; cursor:pointer;" onclick="document.getElementById('h-video').value=''; this.style.display='none'; const s=document.getElementById('h-video-status'); if(s) s.style.display='none'">✕ CLEAR</button>
                                        <span id="h-video-status" style="display:${p.videoTour?'block':'none'}; color:#28a745; font-size:0.7rem; font-weight:800;">(PREVIOUS VIDEO KEPT)</span>
                                    </div>
                                </div>

                                <div>
                                    <label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:1rem; color:var(--color-primary);">✨ Amenities</label>
                                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap:0.8rem; background:#f9f9f9; padding:1.2rem; border-radius:16px;">
                                        ${['WiFi', 'Pool', 'Spa', 'Breakfast', 'Parking', 'Gym', 'AC', 'Bar', 'TV', 'Kitchen', 'Workspace', 'Balcony'].map(a => `
                                            <label style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.85rem; font-weight:600;">
                                                <input type="checkbox" class="adm-amenity" value="${a}" ${(p.amenities||[]).includes(a)?'checked':''} style="width:18px; height:18px; accent-color:var(--color-primary);"> ${a}
                                            </label>
                                        `).join('')}
                                    </div>
                                </div>
                                
                                <textarea id="h-desc" placeholder="Stay description..." style="width:100%; padding:1rem; border:1.5px solid #eee; border-radius:12px; min-height:100px;">${p.description||''}</textarea>

                                 <!-- Stay Packages Section for Admin -->
                                 <div style="background:#f0f7ff; padding:1.5rem; border-radius:24px; border:1px solid #c9e2ff; margin-bottom:1.5rem;">
                                    <h4 style="margin:0 0 1rem; font-size:0.9rem; color:#0056b3; display:flex; align-items:center; gap:0.5rem;">
                                        <span style="font-size:1.4rem;">🎁</span> STAY PACKAGES & DEALS
                                    </h4>
                                    
                                    <div style="margin-bottom:1rem; background:white; padding:1rem; border-radius:12px; border:1px solid #c9e2ff;">
                                        <label style="display:block; font-weight:800; font-size:0.7rem; color:#888; margin-bottom:0.5rem; text-transform:uppercase;">Custom Badge Text</label>
                                        <input id="h-badge-text" type="text" value="${p.badgeText || ''}" placeholder="e.g. SPECIAL OFFERS INSIDE" style="width:100%; padding:0.8rem; border:1px solid #eee; border-radius:10px; font-weight:700; color:#0b6646;">
                                    </div>

                                    <div style="margin-bottom:1.5rem; background:#fff4e5; padding:1.2rem; border-radius:18px; border:1px solid #ffe0b2; display:flex; align-items:center; justify-content:space-between; gap:1rem;">
                                        <div>
                                            <h5 style="margin:0; font-size:0.85rem; color:#e65100;">🎉 Event Mode (Packages Only)</h5>
                                            <p style="margin:0.3rem 0 0; font-size:0.7rem; color:#666; line-height:1.4;">Force guests to book from stay packages. Use for festivals/holidays.</p>
                                        </div>
                                        <label class="switch">
                                            <input type="checkbox" id="h-event-mode" ${p.eventMode ? 'checked' : ''}>
                                            <span class="slider round"></span>
                                        </label>
                                    </div>

                                    <div id="adm-packages-container" style="display:grid; gap:0.8rem;">
                                        ${(p.packages || []).map((pkg, idx) => `
                                            <div class="adm-package-row" style="background:white; padding:1rem; border-radius:14px; border:1px solid #e0eaff;">
                                                <input type="text" placeholder="Package Title" value="${pkg.title||''}" class="adm-pkg-title" style="padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
                                                <div>
                                                    <input type="number" placeholder="Nights" value="${pkg.nights||''}" class="adm-pkg-nights" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
                                                </div>
                                                <div>
                                                    <input type="number" placeholder="Disc %" value="${pkg.discount||''}" class="adm-pkg-discount" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
                                                </div>
                                                <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#ff385c; cursor:pointer; font-size:1.1rem; font-weight:800;">✕</button>
                                                <div style="grid-column: 1 / -1;">
                                                    <input type="text" placeholder="Included Services" value="${pkg.services||''}" class="adm-pkg-services" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.8rem; background:#fcfcfc;">
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <button onclick="window.addAdmPackage()" style="width:100%; margin-top:1rem; padding:0.8rem; border-radius:12px; border:1.5px dashed #0056b3; background:none; color:#0056b3; font-weight:700; cursor:pointer;">+ Add Package Option</button>
                                 </div>

                                 <!-- Room Types Section for Admin -->
                                 <div style="background:#eafaf1; padding:1.5rem; border-radius:24px; border:1px solid #a7f3d0; margin-bottom:1.5rem;">
                                     <h4 style="margin:0 0 1rem; font-size:0.9rem; color:#0b6646; display:flex; align-items:center; gap:0.5rem;">
                                         <span style="font-size:1.4rem;">🔑</span> ROOM TYPES & BED CONFIGURATIONS
                                     </h4>
                                     
                                     <div id="adm-rooms-container" style="display:grid; gap:1.2rem;">
                                         ${(p.roomTypes || []).map((room, idx) => `
                                             <div class="adm-room-row" data-id="${room.id || `room_${idx}`}" style="background:white; padding:1.2rem; border-radius:18px; border:1px solid #cbd5e1; display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; position:relative;">
                                                 <div style="position:absolute; top:0.8rem; right:0.8rem; display:flex; gap:0.5rem; z-index:10;">
                                                     <label style="display:flex; align-items:center; gap:0.3rem; font-size:0.75rem; font-weight:800; cursor:pointer; background:#f1f5f9; padding:0.3rem 0.6rem; border-radius:6px; color:#475569;">
                                                         <input type="checkbox" class="adm-room-active" ${room.isActive !== false ? 'checked' : ''} style="accent-color:var(--color-primary);"> Active
                                                     </label>
                                                     <button type="button" onclick="this.closest('.adm-room-row').remove()" style="background:none; border:none; color:#ff385c; cursor:pointer; font-size:1.1rem; font-weight:800;">✕</button>
                                                 </div>
                                                 
                                                 <div style="grid-column: 1 / -1; display:flex; gap:1rem; align-items:center; margin-bottom: 0.5rem; margin-top: 1.5rem;">
                                                     <div class="adm-room-img-preview" style="width:60px; height:60px; border-radius:10px; background:${room.image ? `url('${room.image}') center/cover` : '#f1f5f9'}; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                                         ${room.image ? '' : '<span style="color:#94a3b8; font-size:1.2rem;">📷</span>'}
                                                     </div>
                                                     <div style="flex:1;">
                                                         <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Room Photo</label>
                                                         <input type="file" accept="image/*" class="adm-room-img-input" style="font-size:0.75rem; width:100%;" onchange="
                                                             const file = this.files[0];
                                                             if(file) {
                                                                 const reader = new FileReader();
                                                                 reader.onload = (e) => {
                                                                     const preview = this.closest('.adm-room-row').querySelector('.adm-room-img-preview');
                                                                     preview.style.background = 'url(' + e.target.result + ') center/cover';
                                                                     preview.innerHTML = '';
                                                                 };
                                                                 reader.readAsDataURL(file);
                                                             }
                                                         ">
                                                         <input type="hidden" class="adm-room-img-url" value="${room.image || ''}">
                                                     </div>
                                                 </div>
                                                 
                                                 <div style="grid-column: 1 / -1; margin-right: 2rem;">
                                                     <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Room Type Name</label>
                                                     <input type="text" placeholder="e.g. Deluxe Double Room" value="${room.name||''}" class="adm-room-name" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
                                                 </div>
                                                 <div style="grid-column: 1 / -1;">
                                                     <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Description</label>
                                                     <input type="text" placeholder="Description" value="${room.description||''}" class="adm-room-desc" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
                                                 </div>
                                                 <div>
                                                     <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Price per Night (Birr)</label>
                                                     <input type="number" placeholder="Price" value="${room.price||''}" class="adm-room-price" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700; color:var(--color-primary);">
                                                 </div>
                                                 <div>
                                                     <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Max Guests Capacity</label>
                                                     <input type="number" placeholder="Capacity" value="${room.capacity||''}" class="adm-room-capacity" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
                                                 </div>
                                                 <div>
                                                     <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Bed Configurations</label>
                                                     <input type="text" placeholder="Beds" value="${room.beds||''}" class="adm-room-beds" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
                                                 </div>
                                                 <div>
                                                     <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Quantity (Total Rooms)</label>
                                                     <input type="number" placeholder="Total Rooms" value="${room.totalRooms||''}" class="adm-room-total-rooms" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
                                                 </div>
                                                 <div>
                                                     <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Available Rooms</label>
                                                     <input type="number" placeholder="Available" value="${room.availableRooms !== undefined ? room.availableRooms : (room.totalRooms || '')}" class="adm-room-avail" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
                                                 </div>
                                             </div>
                                         `).join('')}
                                     </div>
                                     <button type="button" onclick="window.addAdmRoomType()" style="width:100%; margin-top:1rem; padding:0.8rem; border-radius:12px; border:1.5px dashed #0b6646; background:none; color:#0b6646; font-weight:700; cursor:pointer;">+ Add Room Type</button>
                                 </div>

                                <p id="adm-up-status" style="text-align:center; font-weight:700; color:var(--color-primary);"></p>
                                <button id="adm-publish-btn" class="btn-primary" onclick="window.adminSaveProperty()" style="padding:1rem;">${editPropertyId ? '💾 Save Changes' : '🚀 Publish Property'}</button>
                            </div>
                        </div>`;
                    })()}
                </div>

                <!-- ANNOUNCEMENTS TAB -->
                <div id="adm-tab-announcements" style="display:${activeTab==='announcements'?'block':'none'};">
                    <div style="background:white; padding:2rem; border-radius:24px; box-shadow:var(--shadow-sm); margin-bottom:2rem;">
                        <h3 style="margin-top:0; color:var(--color-primary);">📢 Manage Announcements</h3>
                        <p style="color:#666; font-size:0.85rem; margin-bottom:1.5rem;">Create dynamic banners that appear on the Michu Stays home screen for all users.</p>
                        
                        <div style="display:grid; gap:1.2rem; background:#f9f9f9; padding:1.5rem; border-radius:16px; border:1px solid #eee;">
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                                <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Internal Title (Optional)</label><input type="text" id="ann-title" placeholder="e.g., Summer Sale" style="width:100%; padding:0.8rem; border-radius:12px; border:1.5px solid #ddd;"></div>
                                <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Badge Text (Optional)</label><input type="text" id="ann-badge" placeholder="e.g., 📢 Special Offer" style="width:100%; padding:0.8rem; border-radius:12px; border:1.5px solid #ddd;"></div>
                            </div>
                            
                            <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Message Body (Optional)</label><textarea id="ann-body" placeholder="Announcement details..." rows="3" style="width:100%; padding:0.8rem; border-radius:12px; border:1.5px solid #ddd;"></textarea></div>
                            
                            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
                                <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Visual Type</label><select id="ann-type" style="width:100%; padding:0.8rem; border-radius:12px; border:1.5px solid #ddd;"><option value="promo">Promo (Green/Gold)</option><option value="dark">Dark (Deep Green)</option><option value="gold">Gold (Premium)</option><option value="light">Light (Clean)</option></select></div>
                                <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">CTA Button (Optional)</label><input type="text" id="ann-cta" placeholder="Learn More" style="width:100%; padding:0.8rem; border-radius:12px; border:1.5px solid #ddd;"></div>
                                <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">CTA Link (Route)</label><input type="text" id="ann-link" placeholder="home" style="width:100%; padding:0.8rem; border-radius:12px; border:1.5px solid #ddd;"></div>
                            </div>
                            
                            <div style="display:flex; gap:1rem; align-items:center; background:white; padding:1rem; border-radius:12px; border:1px dashed #ccc;">
                                <div style="flex:1;">
                                    <label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Media Upload (Image/Video)</label>
                                    <input type="file" id="ann-media" accept="image/*,video/mp4" style="width:100%;">
                                </div>
                                <div style="display:flex; align-items:center; gap:0.5rem; font-weight:700; font-size:0.85rem;">
                                    <input type="checkbox" id="ann-active" checked style="width:20px; height:20px; accent-color:var(--color-primary);"> Active (Live)
                                </div>
                            </div>
                            
                            <div style="display:flex; gap:0.8rem; align-items:center;">
                                <button id="ann-save-btn" class="btn-primary" onclick="window.admSaveAnnouncement()" style="padding:1rem; border-radius:12px; flex:1;">📢 Publish Announcement</button>
                                <button id="ann-cancel-edit-btn" class="btn-outline" onclick="window.admCancelEditAnnouncement()" style="padding:1rem; border-radius:12px; display:none; border-color:#ef4444; color:#ef4444;">Cancel Edit</button>
                            </div>
                        </div>
                        
                        <div id="adm-ann-list" style="margin-top:2rem; display:grid; gap:1rem;">
                            ${(window.cachedAnnouncements || []).map(a => `
                                <div style="display:flex; justify-content:space-between; align-items:center; background:white; padding:1.2rem; border-radius:16px; border:1px solid #eee; opacity:${a.active?1:0.6};">
                                    <div style="display:flex; align-items:center; gap:1rem;">
                                        ${a.mediaUrl ? `<img src="${a.mediaUrl}" style="width:60px; height:60px; border-radius:8px; object-fit:cover;">` : `<div style="width:60px; height:60px; border-radius:8px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">📢</div>`}
                                        <div>
                                            <h4 style="margin:0; font-size:1rem;">${a.title}</h4>
                                            <div style="font-size:0.75rem; color:#666; margin-top:0.2rem;">${a.badge} • ${a.type}</div>
                                        </div>
                                    </div>
                                    <div style="display:flex; gap:0.5rem;">
                                        <button class="btn-outline" onclick="window.admEditAnnouncement('${a.id}')" style="padding:0.5rem 1rem; border-radius:8px; font-size:0.8rem; border-color:var(--color-primary); color:var(--color-primary);">Edit</button>
                                        <button class="btn-outline" onclick="window.admToggleAnnouncement('${a.id}', ${a.active})" style="padding:0.5rem 1rem; border-radius:8px; font-size:0.8rem; border-color:${a.active?'#f59e0b':'#10b981'}; color:${a.active?'#d97706':'#059669'};">${a.active?'Pause':'Activate'}</button>
                                        <button class="btn-outline" onclick="window.admDeleteAnnouncement('${a.id}')" style="padding:0.5rem 1rem; border-radius:8px; font-size:0.8rem; border-color:#ef4444; color:#dc2626;">Delete</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- ACCOUNT TAB -->
                <div id="adm-tab-account" style="display:${activeTab==='account'?'block':'none'}">
                    <div style="max-width:500px; margin:0 auto; background:white; border-radius:24px; padding:2.5rem; box-shadow:var(--shadow-sm);">
                        <div style="text-align:center; margin-bottom:2rem;">
                            <div id="adm-pic-box" style="width:120px; height:120px; border-radius:50%; margin:0 auto 1.2rem; border:4px solid var(--color-primary); position:relative; cursor:pointer; overflow:hidden;" onclick="document.getElementById('adm-pic-input').click()">
                                ${userData.profilePic ? `<img src="${userData.profilePic}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:3.5rem;">👑</span>`}
                            </div>
                            <input type="file" id="adm-pic-input" accept="image/*" style="display:none;" onchange="window.previewAdmPic(this)">
                            <h3 style="margin:0;">Admin Profile</h3>
                        </div>
                        <div style="display:grid; gap:1.2rem;">
                            <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Full Name</label><input id="adm-name" type="text" value="${userData.fullName||''}" style="width:100%; padding:0.8rem; border:1.5px solid #eee; border-radius:12px;"></div>
                            <div><label style="font-weight:700; font-size:0.8rem; display:block; margin-bottom:0.4rem;">Phone</label><input id="adm-phone" type="text" value="${userData.phone||''}" style="width:100%; padding:0.8rem; border:1.5px solid #eee; border-radius:12px;"></div>
                            <button id="adm-save-acc-btn" class="btn-primary" style="padding:1rem; border-radius:12px; font-weight:700;" onclick="window.admSaveProfile()">Update Profile</button>
                            <button class="btn-outline" style="padding:1rem; border-radius:12px; font-weight:700; border-color:#e74c3c; color:#e74c3c; margin-top:0.5rem;" onclick="window.auth.logout()">🚪 Log out</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const initAnalyticsCharts = () => {
        if (activeTab !== 'analytics') return;
        const ctxRev = document.getElementById('chart-revenue')?.getContext('2d');
        const ctxPop = document.getElementById('chart-popular')?.getContext('2d');
        const ctxTrd = document.getElementById('chart-trends')?.getContext('2d');
        if (!ctxRev || !ctxPop || !ctxTrd) return;

        // --- Filter Data ---
        const start = analyticsStart ? new Date(analyticsStart) : null;
        const end = analyticsEnd ? new Date(analyticsEnd) : null;
        const filteredBookings = cachedBookings.filter(b => {
            const d = new Date(b.createdAt);
            if (start && d < start) return false;
            if (end && d > end) return false;
            return true;
        });

        // --- Process Data ---
        // Revenue Trends (Flexible labels based on range)
        const revMap = {};
        filteredBookings.forEach(b => {
            const date = new Date(b.createdAt);
            const key = filteredBookings.length > 50 
                ? date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear()
                : date.toLocaleDateString();
            revMap[key] = (revMap[key] || 0) + (b.totalAmount || 0);
        });
        const revLabels = Object.keys(revMap);
        const revData = Object.values(revMap);

        // Popularity (Leaderboard)
        const popMap = {};
        filteredBookings.forEach(b => {
            const hotel = cachedProperties.find(p => p.id === b.propertyId)?.title || 'Unknown';
            popMap[hotel] = (popMap[hotel] || 0) + 1;
        });
        const popItems = Object.entries(popMap).sort((a,b) => b[1] - a[1]).slice(0, 8);
        const popLabels = popItems.map(i => i[0]);
        const popData = popItems.map(i => i[1]);

        // Volume Timeline
        const trdMap = {};
        if (start && end) {
           let curr = new Date(start);
           while (curr <= end) {
               trdMap[curr.toLocaleDateString()] = 0;
               curr.setDate(curr.getDate() + 1);
           }
        } else {
            for (let i = 14; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                trdMap[d.toLocaleDateString()] = 0;
            }
        }
        filteredBookings.forEach(b => {
            const localeDate = new Date(b.createdAt).toLocaleDateString();
            if (trdMap[localeDate] !== undefined) trdMap[localeDate]++;
        });
        const trdLabels = Object.keys(trdMap);
        const trdData = Object.values(trdMap);

        // --- Render Charts ---
        new Chart(ctxRev, {
            type: 'line',
            data: { labels: revLabels, datasets: [{ label: 'Revenue (Birr)', data: revData, borderColor: '#1a6032', backgroundColor: 'rgba(26,96,50,0.2)', fill: true, tension: 0.4, pointRadius: 4 }] },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });

        new Chart(ctxPop, {
            type: 'bar',
            data: { labels: popLabels, datasets: [{ label: 'Bookings', data: popData, backgroundColor: '#1a6032', borderRadius: 8 }] },
            options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } }
        });

        new Chart(ctxTrd, {
            type: 'bar',
            data: { labels: trdLabels, datasets: [{ label: 'Bookings', data: trdData, backgroundColor: '#d4af37', borderRadius: 4 }] },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    };

    window.setAnaPreset = (preset) => {
        const today = new Date();
        const end = today.toISOString().split('T')[0];
        let start = new Date(today);
        if (preset === 'daily') {
            start.setDate(today.getDate() - 1);
        } else if (preset === 'weekly') {
            start.setDate(today.getDate() - 7);
        } else if (preset === 'monthly') {
            start.setMonth(today.getMonth() - 1);
        }
        analyticsStart = start.toISOString().split('T')[0];
        analyticsEnd = end;
        document.getElementById('ana-start').value = analyticsStart;
        document.getElementById('ana-end').value = analyticsEnd;
        renderAdmin();
    };

    window.applyAnaFilter = () => {
        analyticsStart = document.getElementById('ana-start').value;
        analyticsEnd = document.getElementById('ana-end').value;
        renderAdmin();
    };
    window.resetAnaFilter = () => {
        analyticsStart = ''; analyticsEnd = '';
        renderAdmin();
    };

    const renderAdmin = () => {
        container.innerHTML = `
            <div class="container" style="padding-top:2rem; padding-bottom:2rem;">
                ${renderAdminUI()}
            </div>
            <!-- Admin Proof Modal -->
            <div id="proof-modal-adm" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;align-items:center;justify-content:center;" onclick="this.style.display='none'">
                <div style="background:white;border-radius:24px;padding:2rem;max-width:500px;width:90%;text-align:center; position:relative;" onclick="event.stopPropagation()">
                    <button style="position:absolute; top:1rem; right:1rem; border:none; background:none; font-size:1.5rem; cursor:pointer;" onclick="document.getElementById('proof-modal-adm').style.display='none'">&times;</button>
                    <h4 style="margin-top:0;">Payment Verification (Admin)</h4>
                    <img id="proof-img-adm" src="" style="max-width:100%;max-height:450px;border-radius:16px; box-shadow:var(--shadow-md);">
                </div>
            </div>
        `;
        // Post-render init
        setTimeout(initAnalyticsCharts, 100);
    };

    await window.syncData();
});