window.router.addRoute('manager', async (container, params) => {
    const role = window.auth?.role || window.auth?.userData?.role;
    if (!['manager','admin'].includes(role)) {
        window.router.navigate('login'); return;
    }

    const fromManageTab = params?.source === 'manage';
    const fromBookingsTab = params?.source === 'bookings';
    let activeTab = fromBookingsTab ? 'bookings' : (params?.tab || 'analytics');
    let filterFrom = '';
    let filterTo = '';
    let filterStatus = '';
    let analyticsStart = '';
    let analyticsEnd = '';
    const uid = window.auth?.currentUser?.uid;
    let userData = window.auth?.userData || {};
    let myHotel = null;
    let analyticsBookings = [];
    let tableBookings = [];
    let currentManagerLimit = 20;
    window.mgrFiltersOpen = false;

    // --- Tab & Function Globals ---
    window.setMgrTab = (tab) => { activeTab = tab; renderManagerUI(true); };
    window.setMgrFilter = () => {
        filterFrom = document.getElementById('mgr-book-from')?.value || '';
        filterTo = document.getElementById('mgr-book-to')?.value || '';
        filterStatus = document.getElementById('mgr-book-status')?.value || '';
        currentManagerLimit = 20;
        // Preserve filter panel open state before re-render destroys the DOM
        window.mgrFiltersOpen = true;
        window.attachMgrBookingListener();
    };
    window.applyMgrAnaFilter = () => {
        analyticsStart = document.getElementById('mgr-ana-start')?.value || '';
        analyticsEnd = document.getElementById('mgr-ana-end')?.value || '';
        window.attachMgrAnalyticsListener();
    };
    window.resetMgrAnaFilter = () => {
        analyticsStart = ''; analyticsEnd = '';
        window.attachMgrAnalyticsListener();
    };
    window.setMgrAnaPreset = (preset) => {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];
        if (preset === 'today' || preset === 'daily') {
            analyticsStart = fmt(today);
            analyticsEnd = fmt(today);
        } else if (preset === 'week' || preset === 'weekly') {
            const d = new Date(today); d.setDate(d.getDate() - 7);
            analyticsStart = fmt(d);
            analyticsEnd = fmt(today);
        } else if (preset === 'month' || preset === 'monthly') {
            const d = new Date(today); d.setDate(d.getDate() - 30);
            analyticsStart = fmt(d);
            analyticsEnd = fmt(today);
        } else {
            analyticsStart = ''; analyticsEnd = '';
        }
        window.attachMgrAnalyticsListener();
    };
    window.setMgrBookingPreset = (preset) => {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];
        if (preset === 'today' || preset === 'daily') {
            filterFrom = fmt(today);
            filterTo = fmt(today);
        } else if (preset === 'week' || preset === 'weekly') {
            const d = new Date(today); d.setDate(d.getDate() - 7);
            filterFrom = fmt(d);
            filterTo = fmt(today);
        } else if (preset === 'month' || preset === 'monthly') {
            const d = new Date(today); d.setDate(d.getDate() - 30);
            filterFrom = fmt(d);
            filterTo = fmt(today);
        } else {
            filterFrom = ''; filterTo = ''; filterStatus = '';
        }
        currentManagerLimit = 20;
        // Preserve filter panel open state before re-render destroys the DOM
        window.mgrFiltersOpen = true;
        window.attachMgrBookingListener();
    };
    
    window.loadMoreMgrBookings = () => {
        currentManagerLimit += 20;
        window.attachMgrBookingListener();
    };
    window.mgrSearchRef = () => {
        const q = document.getElementById('mgr-ref-search')?.value?.trim().toUpperCase() || '';
        if (!q) { renderManagerUI(); return; }
        const rows = document.querySelectorAll('#mgr-bookings-table tbody tr');
        rows.forEach(r => {
            const refCell = r.querySelector('td:nth-child(2)');
            if (refCell && refCell.textContent.toUpperCase().includes(q)) {
                r.style.display = '';
                r.style.background = '#f0f7f4';
            } else {
                r.style.display = 'none';
            }
        });
    };
    window.setMgrBookingPage = (page) => {
        if (page < 1 || page > totalBookingsPages) return;
        bookingsPage = page;
        renderManagerUI();
        document.getElementById('mgr-bookings-table')?.scrollIntoView({ behavior: 'smooth' });
    };
    window.previewMgrFile = (id, input) => {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const box = input.parentElement;
                box.style.backgroundImage = `url('${e.target.result}')`;
                box.style.backgroundSize = 'cover';
                box.style.backgroundPosition = 'center';
                box.querySelector('span')?.remove();
                const overlay = document.getElementById(`mg-prev-overlay-${id}`);
                if (overlay) overlay.style.display = 'flex';
                const cancel = document.getElementById(`mg-p-cancel-${id}`);
                if (cancel) cancel.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        }
    };

    window.clearMgrPhoto = (id) => {
        const input = document.getElementById(`mg-file-${id}`);
        if (input) input.value = '';
        const box = document.getElementById(`mg-box-${id}`);
        if(box) {
            box.style.backgroundImage = '';
            if(!box.querySelector('span')) {
                const span = document.createElement('span');
                span.style.cssText = "position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.8rem; color:#ccc;";
                span.innerText = "+";
                box.appendChild(span);
            }
        }
        const overlay = document.getElementById(`mg-prev-overlay-${id}`);
        if(overlay) overlay.style.display = 'none';
        const cancel = document.getElementById(`mg-p-cancel-${id}`);
        if(cancel) cancel.style.display = 'none';
    };

    window.previewMgAccPic = async (input) => {
        const file = input.files[0];
        if (file) {
            try {
                const croppedDataUrl = await window.cropImage(file);
                if (croppedDataUrl) {
                    const box = document.getElementById('mg-acc-pic-box');
                    if (box) {
                        box.innerHTML = `<img src="${croppedDataUrl}" style="width:100%; height:100%; object-fit:cover;">`;
                    }
                    window.newMgAccPic = croppedDataUrl;
                }
            } catch (e) {
                console.warn('Crop failed:', e);
            }
        }
    };

    window.addMgPackage = () => {
        const container = document.getElementById('mg-packages-container');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'mg-package-row';
        div.style.cssText = `background:white; padding:1rem; border-radius:14px; border:1px solid #e0eaff; margin-bottom:0.5rem;`;
        div.innerHTML = `
            <input type="text" placeholder="Package Title (e.g. Weekend Special)" class="mg-pkg-title" style="padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
            <div>
                <input type="number" placeholder="Nights" class="mg-pkg-nights" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <input type="number" placeholder="Disc %" class="mg-pkg-discount" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
            </div>
            <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#ff385c; cursor:pointer; font-size:1.1rem; font-weight:800;">✕</button>
            <div style="grid-column: 1 / -1;">
                <input type="text" placeholder="Included Services (e.g. Free Massage, Airport Shuttle)" class="mg-pkg-services" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.8rem; background:#fcfcfc;">
            </div>
        `;
        container.appendChild(div);
    };

    window.addMgRoomType = () => {
        const container = document.getElementById('mg-room-types-container');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'mg-room-row';
        div.style.cssText = `background:white; padding:1.2rem; border-radius:18px; border:1px solid #cbd5e1; display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; position:relative; margin-bottom:0.5rem;`;
        div.innerHTML = `
            <div style="position:absolute; top:0.8rem; right:0.8rem; display:flex; gap:0.5rem; z-index:10;">
                <label style="display:flex; align-items:center; gap:0.3rem; font-size:0.75rem; font-weight:800; cursor:pointer; background:#f1f5f9; padding:0.3rem 0.6rem; border-radius:6px; color:#475569;">
                    <input type="checkbox" class="mg-room-active" checked style="accent-color:var(--color-primary);"> Active
                </label>
                <button type="button" onclick="this.closest('.mg-room-row').remove()" style="background:none; border:none; color:#ff385c; cursor:pointer; font-size:1.1rem; font-weight:800;">✕</button>
            </div>
            
            <div style="grid-column: 1 / -1; display:flex; gap:1rem; align-items:center; margin-bottom: 0.5rem; margin-top: 1.5rem;">
                <div class="mg-room-img-preview" style="width:60px; height:60px; border-radius:10px; background:#f1f5f9; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                    <span style="color:#94a3b8; font-size:1.2rem;">📷</span>
                </div>
                <div style="flex:1;">
                    <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Room Photo</label>
                    <input type="file" accept="image/*" class="mg-room-img-input" style="font-size:0.75rem; width:100%;" onchange="
                        const file = this.files[0];
                        if(file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                const preview = this.closest('.mg-room-row').querySelector('.mg-room-img-preview');
                                preview.style.background = 'url(' + e.target.result + ') center/cover';
                                preview.innerHTML = '';
                            };
                            reader.readAsDataURL(file);
                        }
                    ">
                    <input type="hidden" class="mg-room-img-url" value="">
                </div>
            </div>
            
            <div style="grid-column: 1 / -1; margin-right: 2rem;">
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Room Type Name</label>
                <input type="text" placeholder="e.g. Deluxe Double Room" class="mg-room-name" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
            </div>
            <div style="grid-column: 1 / -1;">
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Description</label>
                <input type="text" placeholder="e.g. Ocean view, mini-bar, balcony" class="mg-room-desc" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Price per Night (Birr)</label>
                <input type="number" placeholder="Price" class="mg-room-price" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700; color:var(--color-primary);">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Max Guests Capacity</label>
                <input type="number" placeholder="Capacity" class="mg-room-capacity" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Bed Configurations</label>
                <input type="text" placeholder="e.g. 1 King Bed or 2 Double Beds" class="mg-room-beds" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Quantity (Total Rooms)</label>
                <input type="number" placeholder="Total Rooms" class="mg-room-total-rooms" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Available Rooms</label>
                <input type="number" placeholder="Available" class="mg-room-avail" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
            </div>
        `;
        container.appendChild(div);
    };

    window.mgSaveHotel = async () => {
        const btn = document.getElementById('mg-save-btn');
        const status = document.getElementById('mg-save-status');
        if (!btn || !myHotel) return;

        try {
            const getVal = (id) => document.getElementById(id)?.value?.trim() || '';
            const getNum = (id) => Number(document.getElementById(id)?.value) || 0;

            const title = getVal('mg-h-title');
            
            // Extract Room Types first so we can use them to override list price/availability
            const roomRows = Array.from(document.querySelectorAll('.mg-room-row'));
            const roomTypesArr = [];
            for (let idx = 0; idx < roomRows.length; idx++) {
                const row = roomRows[idx];
                const fileInput = row.querySelector('.mg-room-img-input');
                let imgUrl = row.querySelector('.mg-room-img-url')?.value || '';
                if (fileInput && fileInput.files[0]) {
                    status.innerText = `Uploading photo for room ${idx+1}...`;
                    imgUrl = await window.db.uploadFile(fileInput.files[0], 'properties/rooms');
                }
                
                const totalRooms = parseInt(row.querySelector('.mg-room-total-rooms').value) || 1;
                let avail = row.querySelector('.mg-room-avail')?.value;
                avail = avail !== '' && avail !== undefined ? parseInt(avail) : totalRooms;
                if (avail > totalRooms) avail = totalRooms;
                
                roomTypesArr.push({
                    id: row.dataset.id || `room_${idx}_${Date.now()}`,
                    name: row.querySelector('.mg-room-name').value.trim(),
                    description: row.querySelector('.mg-room-desc').value.trim(),
                    price: parseInt(row.querySelector('.mg-room-price').value) || 0,
                    capacity: parseInt(row.querySelector('.mg-room-capacity').value) || 2,
                    beds: row.querySelector('.mg-room-beds').value.trim(),
                    totalRooms: totalRooms,
                    availableRooms: avail,
                    isActive: row.querySelector('.mg-room-active')?.checked !== false, // Default to true if not found
                    image: imgUrl
                });
            }
            
            const filteredRoomTypesArr = roomTypesArr.filter(r => r.name && r.price);

            let priceVal = getNum('mg-h-price');
            if (filteredRoomTypesArr.length > 0) {
                const minPrice = Math.min(...filteredRoomTypesArr.filter(r => r.isActive !== false).map(r => r.price));
                if (minPrice !== Infinity && minPrice > 0) {
                    priceVal = minPrice;
                }
            }

            const discountVal = getNum('mg-h-discount');
            
            if (!title || !priceVal) {
                window.showToast("⚠️ Property Title and Price are required.");
                return;
            }

            btn.disabled = true;
            status.innerText = "Processing Changes...";
            status.style.color = "var(--color-primary)";

            const images = [];
            // Handle Photo Slots
            for (let i = 1; i <= 10; i++) {
                const input = document.getElementById(`mg-file-${i}`);
                const cancelBtn = document.getElementById(`mg-p-cancel-${i}`);
                const isCleared = cancelBtn && cancelBtn.style.display === 'none';

                if (isCleared) {
                    images[i-1] = '';
                } else if (input?.files[0]) {
                    status.innerText = `Uploading Photo ${i}...`;
                    images[i-1] = await window.db.uploadFile(input.files[0], 'properties/photos');
                } else {
                    images[i-1] = (myHotel.images || [])[i-1] || '';
                }
            }

            // Video Handling
            let videoUrl = myHotel.videoTour || '';
            const videoInput = document.getElementById('mg-video-file');
            const videoCancel = document.getElementById('mg-video-cancel');
            
            if (videoCancel && videoCancel.style.display === 'none' && (!videoInput || !videoInput.files[0])) {
                videoUrl = ''; 
            } else if (videoInput?.files[0]) {
                status.innerText = "Processing Video Tour...";
                videoUrl = await window.db.uploadFile(videoInput.files[0], 'properties/videos');
            }

            const filteredImages = images.filter(Boolean);
            const originalPrice = discountVal > 0 ? Math.round(priceVal / (1 - (discountVal / 100))) : 0;

            // Extract Packages
            const packagesArr = Array.from(document.querySelectorAll('.mg-package-row')).map(row => ({
                title: row.querySelector('.mg-pkg-title').value.trim(),
                nights: parseInt(row.querySelector('.mg-pkg-nights').value) || 0,
                discount: parseInt(row.querySelector('.mg-pkg-discount').value) || 0,
                services: row.querySelector('.mg-pkg-services').value.trim()
            })).filter(p => p.title && p.nights);

            let availableRoomsVal = getNum('mg-h-avail-rooms');
            if (filteredRoomTypesArr.length > 0) {
                availableRoomsVal = filteredRoomTypesArr.reduce((sum, r) => sum + (r.isActive !== false ? r.availableRooms : 0), 0);
            }

            const updatedData = {
                title,
                type: getVal('mg-h-type'),
                price: priceVal,
                discountPercent: discountVal,
                discount: discountVal, 
                originalPrice,
                address: getVal('mg-h-address'),
                availableRooms: availableRoomsVal,
                mapQuery: getVal('mg-h-map-query'),
                description: getVal('mg-h-desc'),
                cbeAccount: getVal('mg-h-cbe-acc'),
                cbeName: getVal('mg-h-cbe-name'),
                telebirrNumber: getVal('mg-h-tele-num'),
                telebirrName: getVal('mg-h-tele-name'),
                phone: getVal('mg-h-phone'),
                distanceFromCenter: getNum('mg-h-distance'),
                badgeText: getVal('mg-badge-text'),
                eventMode: document.getElementById('mg-event-mode')?.checked || false,
                amenities: Array.from(document.querySelectorAll('.mg-amenity:checked')).map(el => el.value),
                images: filteredImages,
                image: filteredImages[0] || '',
                extraImages: filteredImages.slice(1),
                videoTour: videoUrl,
                packages: packagesArr,
                roomTypes: filteredRoomTypesArr,
                updatedAt: Date.now()
            };

            // Media Cleanup: Remove files that are no longer used
            try {
                const oldUrls = [
                    ...(myHotel.images || []),
                    myHotel.videoTour,
                    ...(myHotel.roomTypes || []).map(r => r.image)
                ].filter(url => url && typeof url === 'string');
                
                const newUrls = [
                    ...(updatedData.images || []),
                    updatedData.videoTour,
                    ...(updatedData.roomTypes || []).map(r => r.image)
                ].filter(url => url && typeof url === 'string');
                
                const urlsToDelete = oldUrls.filter(url => !newUrls.includes(url));
                for (const url of urlsToDelete) {
                    await window.db.deleteFile(url);
                }
            } catch(e) {
                console.warn("Media cleanup error:", e);
            }

            await window.db.updateProperty(myHotel.id, updatedData);
            window.showToast("✅ Property updated successfully!");
            syncManagerData();
        } catch (e) {
            console.error("Manager Save Error:", e);
            window.showToast("❌ Operation failed: " + (e.message || "Unknown error"));
            if (status) {
                status.innerText = "Error saving changes.";
                status.style.color = "red";
            }
        } finally {
            if (btn) btn.disabled = false;
        }
    };
    
    window.mgOpenReply = (reviewId) => {
        const modal = document.getElementById('reply-modal');
        const input = document.getElementById('reply-text-input');
        const idInput = document.getElementById('reply-review-id');
        if (!modal || !input || !idInput) return;
        
        idInput.value = reviewId;
        input.value = '';
        modal.style.display = 'flex';
        input.focus();
    };

    window.mgDeleteReply = async (reviewId) => {
        const confirmed = await window.michuConfirm("Remove Reply?", "Are you sure you want to delete your response to this guest?");
        if (!confirmed) return;
        try {
            await window.db.deleteReviewReply(reviewId);
            window.showToast("✅ Reply removed.");
            loadManagerReviews();
        } catch (e) {
            console.error("Delete Reply Error:", e);
            window.showToast("❌ Failed to delete reply.");
        }
    };

    window.mgSubmitReply = async () => {
        const reviewId = document.getElementById('reply-review-id').value;
        const text = document.getElementById('reply-text-input').value.trim();
        const btn = document.getElementById('reply-submit-btn');
        
        if (!text) { window.showToast("Please enter a reply."); return; }
        
        btn.innerText = "Posting..."; btn.disabled = true;
        try {
            await window.db.addReviewReply(reviewId, text, userData.fullName || myHotel?.title || 'Hotel Manager');
            window.showToast("✅ Reply posted and guest notified!");
            document.getElementById('reply-modal').style.display = 'none';
            window.setMgrTab('reviews');
        } catch (e) {
            console.error("Reply post failed:", e);
            window.showToast("❌ Failed to post reply.");
            btn.innerText = "Post Reply"; btn.disabled = false;
        }
    };



    window.mgSaveAccount = async () => {
        const btn = document.getElementById('mg-acc-save-btn');
        btn.innerText = "Saving..."; btn.disabled = true;
        try {
            const updates = {
                fullName: document.getElementById('mg-acc-name').value,
                phone: document.getElementById('mg-acc-phone').value,
                profilePic: window.newMgAccPic || userData.profilePic
            };
            await firestore.collection('users').doc(uid).update(updates);
            window.auth.userData = { ...window.auth.userData, ...updates };
            window.auth.renderNav();
            window.showToast("✅ Profile Updated!");
            syncManagerData();
        } catch (e) {
            window.showToast("❌ Profile update failed: " + e.message);
            btn.innerText = "Update Profile"; btn.disabled = false;
        }
    };

    window.mgrConfirmBooking = async (id, btn) => {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="premium-spinner"></span> Confirming...';
        }
        try {
            await window.db.updateBookingStatus(id, 'Confirmed');
            
            // Fetch the booking directly from Firestore to ensure we have the most accurate email data
            const bookingDoc = await firestore.collection('bookings').doc(id).get();
            const booking = bookingDoc.exists ? bookingDoc.data() : null;
            
            // New: Trigger Professional Booking Confirmation Email via Brevo (Render Bridge)
            if (booking && booking.customerEmail) {
                try {
                    window.showToast("⏳ Waking up email server...");
                    // Heartbeat ping to wake up Render (Free Tier cold start)
                    await fetch('https://michu-push-server.onrender.com/').catch(() => {});
                    
                    window.showToast("📧 Sending guest confirmation...");
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
                            hotelTitle: booking.propertyTitle || (myHotel?.title || 'Michu Stays'),
                            checkIn: booking.checkIn || 'N/A',
                            checkOut: booking.checkOut || 'N/A',
                            totalAmount: booking.totalAmount || 0,
                            bookingId: id,
                            referenceCode: booking.referenceCode || id,
                            nights: nights
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || "Email server error or quota hit");
                    }
                    
                    const res = await response.json();
                    console.log("Booking Confirmation Email Dispatched:", res);
                    window.showToast("✅ Guest notified via email!");
                } catch (err) {
                    console.error("Email Dispatch Error:", err);
                    window.showToast("⚠️ Booking confirmed, but email notification failed (Server busy).");
                }
            } else {
                console.warn("Skipping email: No guest email found for booking", id);
            }

            // Deduct available room instantly
            if (myHotel && myHotel.id) {
                const current = myHotel.availableRooms ?? myHotel.totalRooms ?? 0;
                const newAvail = Math.max(0, current - 1);
                await window.db.updateProperty(myHotel.id, { availableRooms: newAvail });
            }
            window.showAlert("✅ Booking Confirmed! The guest has been notified and one room has been deducted from your inventory.");
        } catch (e) {
            console.error(e);
            window.showToast("❌ Confirmation failed: " + e.message);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Confirm';
            }
        }
    };

    window.mgrCancelBooking = async (id, btn) => {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="premium-spinner"></span> Canceling...';
        }
        try {
            await window.db.updateBookingStatus(id, 'Denied');
            
            window.showAlert("❌ Booking Denied! The guest has been notified.");
        } catch (e) {
            console.error(e);
            window.showToast("❌ Cancellation failed: " + e.message);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Cancel';
            }
        }
    };

    window.enableManagerPush = async (btn) => {
        try {
            const userData = window.auth.userData || {};
            const isEnabled = userData.fcmTokens && userData.fcmTokens.length > 0;
            
            if (isEnabled) {
                btn.innerText = "Disabling...";
                await window.db.removePushPermission(uid);
                window.showToast("🔕 Push notifications disabled.");
                btn.innerText = "🔔 Enable Push Alerts";
                btn.style.borderColor = "#f59e0b";
                btn.style.color = "#d97706";
            } else {
                btn.innerText = "Registering...";
                const token = await window.db.requestPushPermission(uid);
                window.showToast("✅ Push notifications enabled!");
                btn.innerText = "✅ Push Enabled";
                btn.style.borderColor = "green";
                btn.style.color = "green";
                console.log("Manager FCM Token:", token);
            }
        } catch (error) {
            window.showToast("❌ Could not update notifications: " + error.message);
            // Revert visual state on error
            const userData = window.auth.userData || {};
            if (userData.fcmTokens && userData.fcmTokens.length > 0) {
                btn.innerText = "✅ Push Enabled";
            } else {
                btn.innerText = "🔔 Enable Push Alerts";
            }
        }
    };

    window.viewProof = (url) => {
        document.getElementById('proof-img').src = url;
        document.getElementById('proof-modal').style.display = 'flex';
    };

    let bookingUnsub = null;
    let analyticsUnsub = null;

    window.attachMgrBookingListener = () => {
        if (bookingUnsub) bookingUnsub();
        bookingUnsub = window.db.listenToBookings((data) => {
            tableBookings = data;
            renderManagerUI(true);
        }, uid, null, { from: filterFrom, to: filterTo, status: filterStatus }, currentManagerLimit);
    };

    window.attachMgrAnalyticsListener = () => {
        if (analyticsUnsub) analyticsUnsub();
        analyticsUnsub = window.db.listenToAnalytics((data) => {
            analyticsBookings = data;
            renderManagerUI(true);
        }, uid, { from: analyticsStart, to: analyticsEnd });
    };

    const syncManagerData = async () => {
        try {
            window.attachMgrBookingListener();
            window.attachMgrAnalyticsListener();

            // Fetch property info
            const userData = window.auth.userData || {};
            if (userData?.hotelId) {
                myHotel = await window.db.getPropertyById(userData.hotelId);
            } else {
                const props = await window.db.getProperties(uid);
                myHotel = props[0] || null;
            }
        } catch (err) {
            console.error("Manager Sync Error:", err);
            // Don't throw, just let it render empty/fallback
        } finally {
            renderManagerUI(true);
        }
    };

    const renderManagerUI = (incremental = false) => {
        const userData = window.auth.userData || {};
        
        if (incremental || container.querySelector('.manager-container')) {
            const existingContainer = container.querySelector('.manager-container');
            if (existingContainer) {
                const contentDiv = existingContainer.querySelector('.manager-content');
                if (contentDiv) {
                    contentDiv.innerHTML = renderActiveTab();
                }
                const tabs = existingContainer.querySelectorAll('.mgr-tab-bar button');
                tabs.forEach(btn => {
                    const match = btn.getAttribute('onclick')?.match(/'([^']+)'/);
                    if (match && match[1]) {
                        const t = match[1];
                        if (t === activeTab) {
                            btn.style.background = 'white';
                            btn.style.color = 'var(--color-primary)';
                            btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                        } else {
                            btn.style.background = 'transparent';
                            btn.style.color = '#666';
                            btn.style.boxShadow = 'none';
                        }
                    }
                });
                return;
            }
        }

        const tabStyle = (tab) => `
            padding:0.7rem 1.4rem; border-radius:99px; font-weight:700; cursor:pointer; font-size:0.85rem; border:none;
            background:${activeTab===tab?'var(--color-primary)':'transparent'};
            color:${activeTab===tab?'white':'#666'};
            transition: 0.2s;
        `;

        container.innerHTML = `
            <div class="manager-container" style="max-width:1200px; margin:0 auto; padding:2rem 1rem;">
                <style>
                    .manager-container { animation: fadeIn 0.4s ease; padding-bottom: 20px; }
                    .manager-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:2rem; }
                    .mgr-tab-bar { background:#eee; border-radius:99px; padding:0.3rem; display:inline-flex; gap:0.2rem; margin-bottom:2.5rem; flex-wrap:wrap; }
                    
                    /* manager-table styles are defined in components.css */

                    /* Property Editor Fluid Grid */
                    .mgr-prop-layout { display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; align-items: start; }
                    .mgr-main-card { min-width: 0; }
                    .mgr-two-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
                    .mgr-three-col { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
                    .mgr-inventory-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                    .table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }

                    .mg-package-row { display: grid; grid-template-columns: 1fr 100px 100px 40px; gap: 0.8rem; align-items: center; }
                    @media (max-width: 600px) {
                        .mg-package-row { grid-template-columns: 1fr 1fr 45px !important; gap: 0.6rem !important; }
                        .mg-package-row > *:first-child { grid-column: 1 / span 3; }
                    }

                    @media (max-width: 1024px) {
                        .mgr-prop-layout { grid-template-columns: 1fr; }
                        .mgr-prop-preview { display: none; }
                    }

                    @media (max-width: 768px) {
                        .manager-container { padding: 1rem 0.5rem !important; }
                        .mgr-main-card { padding: 1.5rem !important; border-radius: 20px !important; }
                        .mgr-tab-bar { width: 100%; justify-content: center; }
                    }
                </style>

                ${fromBookingsTab ? '' : `
                <div class="manager-header">
                    <div>
                        <h2 style="color:var(--color-primary); margin:0; font-weight:900; font-size:1.6rem;">Manager Dashboard</h2>
                        <p style="margin:0.2rem 0 0; color:#666; font-size:0.9rem; font-weight:600;">${myHotel ? myHotel.title : 'Welcome'}</p>
                    </div>
                    <div id="mgr-push-status">
                         ${(userData.fcmTokens && userData.fcmTokens.length > 0)
                            ? `<button class="btn-outline" style="padding:0.6rem 1.2rem; border-radius:12px; border-color:green; color:green; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:0.4rem;" onclick="window.enableManagerPush(this)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Alerts On</button>`
                            : `<button class="btn-outline" style="padding:0.6rem 1.2rem; border-radius:12px; border-color:#f59e0b; color:#d97706; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:0.4rem;" onclick="window.enableManagerPush(this)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> Enable Alerts</button>`
                        }
                    </div>
                </div>

                <div class="mgr-tab-bar" style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1.5rem; border-bottom:1px solid #f1f5f9; padding-bottom:1rem;">
                    <button style="${tabStyle('analytics')} display:flex; align-items:center; gap:0.4rem;" onclick="window.setMgrTab('analytics')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                        Analytics
                    </button>
                    <button class="hide-on-mobile" style="${tabStyle('bookings')} display:flex; align-items:center; gap:0.4rem;" onclick="window.setMgrTab('bookings')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        Bookings
                    </button>
                    <button style="${tabStyle('property')} display:flex; align-items:center; gap:0.4rem;" onclick="window.setMgrTab('property')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        My Property
                    </button>
                    <button style="${tabStyle('reviews')} display:flex; align-items:center; gap:0.4rem;" onclick="window.setMgrTab('reviews')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                        Reviews
                    </button>
                    <button style="${tabStyle('account')} display:flex; align-items:center; gap:0.4rem;" onclick="window.setMgrTab('account')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        My Account
                    </button>
                </div>
                `}

                <div class="manager-content">
                    ${renderActiveTab()}
                </div>
            </div>

            <!-- Proof Modal -->
            <div id="proof-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;align-items:center;justify-content:center;" onclick="this.style.display='none'">
                <div style="background:white;border-radius:24px;padding:2rem;max-width:500px;width:90%;text-align:center; position:relative;" onclick="event.stopPropagation()">
                    <button style="position:absolute; top:1rem; right:1rem; border:none; background:none; font-size:1.5rem; cursor:pointer;" onclick="document.getElementById('proof-modal').style.display='none'">&times;</button>
                    <h4 style="margin-top:0;">Payment Verification</h4>
                    <img id="proof-img" src="" style="max-width:100%;max-height:450px;border-radius:16px; box-shadow:var(--shadow-md);">
                </div>
            </div>

            <!-- Reply Modal -->
            <div id="reply-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;align-items:center;justify-content:center;" onclick="this.style.display='none'">
                <div style="background:white;border-radius:24px;padding:2rem;max-width:450px;width:90%;" onclick="event.stopPropagation()">
                    <h3 style="margin-top:0; color:var(--color-primary);">Reply to Guest</h3>
                    <p style="color:#666; font-size:0.85rem; margin-bottom:1.5rem;">Your reply will be visible to the guest and other potential customers. Keep it professional and helpful.</p>
                    <input type="hidden" id="reply-review-id">
                    <textarea id="reply-text-input" placeholder="Type your response here..." style="width:100%; height:120px; padding:1rem; border:2px solid #eee; border-radius:14px; font-family:inherit; font-size:0.95rem; margin-bottom:1.5rem; resize:none;"></textarea>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                        <button class="btn-outline" style="border-radius:12px; padding:0.8rem;" onclick="document.getElementById('reply-modal').style.display='none'">Cancel</button>
                        <button id="reply-submit-btn" class="btn-primary" style="border-radius:12px; padding:0.8rem;" onclick="window.mgSubmitReply()">Post Reply</button>
                    </div>
                </div>
            </div>
        `;
    };

    const tabStyle = (tab) => `
        padding:0.7rem 1.4rem; border:none; border-radius:12px; cursor:pointer; font-weight:700; transition:0.3s;
        background:${activeTab===tab?'white':'transparent'};
        color:${activeTab===tab?'var(--color-primary)':'#666'};
        box-shadow:${activeTab===tab?'0 4px 12px rgba(0,0,0,0.05)':'none'};
    `;

    const renderActiveTab = () => {
        if (activeTab === 'analytics') return renderAnalyticsTab();
        if (activeTab === 'bookings') return renderBookingsTab();
        if (activeTab === 'property') return renderPropertyTab();
        if (activeTab === 'reviews') return renderReviewsTab();
        if (activeTab === 'account') return renderAccountTab();
    };

    const renderAnalyticsTab = () => {
        if (analyticsBookings.length === 0) return `<div style="text-align:center; padding:5rem; background:white; border-radius:24px; box-shadow:var(--shadow-sm);"><h3>No data available</h3><p style="color:#666;">Once guests book your property, analytics will appear here.</p></div>`;

        const filtered = analyticsBookings.filter(b => b.status !== 'Denied');

        const totalRev = filtered.reduce((s, b) => s + (b.totalAmount || 0), 0);
        const avgValue = Math.round(totalRev / (filtered.length || 1));
        const confirmedBookings = filtered.filter(b => b.status === 'Confirmed').length;

        // Trends data processing
        const recentDays = 7;
        const trendsData = new Array(recentDays).fill(0);
        const trendsLabels = [];
        for (let i = recentDays - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            trendsLabels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
        }

        filtered.forEach(b => {
            const bDate = new Date(b.createdAt);
            const now = new Date();
            const diffTime = Math.abs(now - bDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays < recentDays) {
                trendsData[recentDays - 1 - diffDays]++;
            }
        });

        setTimeout(() => {
            const ctxTrends = document.getElementById('mgr-chart-trends')?.getContext('2d');
            if (ctxTrends && window.Chart) {
                new window.Chart(ctxTrends, {
                    type: 'line',
                    data: {
                        labels: trendsLabels,
                        datasets: [{
                            label: 'New Bookings',
                            data: trendsData,
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        }, 100);

        return `
        <div style="animation: fadeIn 0.4s ease;">
            <div style="margin-bottom:2rem; background:#f9f9f9; padding:1.2rem; border-radius:20px; border:1px solid #eee;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:0.8rem;">
                    <div style="display:flex; align-items:center; gap:1.5rem; flex-wrap:wrap;">
                        <h4 style="margin:0; font-size:0.85rem; font-weight:800; text-transform:uppercase; color:#666;">Filter Range:</h4>
                        <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                            <input type="date" id="mgr-ana-start" value="${analyticsStart}" style="padding:0.6rem; border-radius:10px; border:1.5px solid #e0e0e0; font-size:0.85rem; font-weight:700;">
                            <span style="color:#888; font-weight:600;">to</span>
                            <input type="date" id="mgr-ana-end" value="${analyticsEnd}" style="padding:0.6rem; border-radius:10px; border:1.5px solid #e0e0e0; font-size:0.85rem; font-weight:700;">
                            <button class="btn-primary" style="padding:0.6rem 1.2rem; border-radius:10px; font-size:0.8rem;" onclick="window.applyMgrAnaFilter()">Filter</button>
                        </div>
                    </div>
                    <button class="btn-outline" style="font-size:0.75rem; border-radius:10px;" onclick="window.resetMgrAnaFilter()">Reset</button>
                </div>
                <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                    <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setMgrAnaPreset('daily')">Daily</button>
                    <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setMgrAnaPreset('weekly')">Weekly</button>
                    <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setMgrAnaPreset('monthly')">Monthly</button>
                    <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem; margin-left:0.5rem; border-color:#e2e8f0; color:#64748b;" onclick="window.setMgrAnaPreset('reset')">Reset</button>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1.2rem; margin-bottom:2rem;">
                <div style="background:white; padding:1.2rem; border-radius:16px; box-shadow:var(--shadow-sm); border-left:5px solid var(--color-primary);">
                    <p style="color:#888; font-size:0.65rem; font-weight:800; text-transform:uppercase; margin:0 0 0.4rem;">Total Revenue</p>
                    <h3 style="margin:0; font-size:1.4rem; color:var(--color-primary);">${totalRev.toLocaleString()} Birr</h3>
                </div>
                <div style="background:white; padding:1.2rem; border-radius:16px; box-shadow:var(--shadow-sm); border-left:5px solid #d4af37;">
                    <p style="color:#888; font-size:0.65rem; font-weight:800; text-transform:uppercase; margin:0 0 0.4rem;">Avg. Booking Value</p>
                    <h3 style="margin:0; font-size:1.4rem; color:#d97706;">${avgValue.toLocaleString()} Birr</h3>
                </div>
                <div style="background:white; padding:1.2rem; border-radius:16px; box-shadow:var(--shadow-sm); border-left:5px solid #1c2e4a;">
                    <p style="color:#888; font-size:0.65rem; font-weight:800; text-transform:uppercase; margin:0 0 0.4rem;">Total Bookings</p>
                    <h3 style="margin:0; font-size:1.4rem; color:#1c2e4a;">${filtered.length}</h3>
                </div>
                <div style="background:white; padding:1.2rem; border-radius:16px; box-shadow:var(--shadow-sm); border-left:5px solid #27ae60;">
                    <p style="color:#888; font-size:0.65rem; font-weight:800; text-transform:uppercase; margin:0 0 0.4rem;">Confirmed</p>
                    <h3 style="margin:0; font-size:1.4rem; color:#27ae60;">${confirmedBookings}</h3>
                </div>
            </div>

            <div style="background:white; padding:2rem; border-radius:24px; box-shadow:var(--shadow-sm); border:1px solid #eee;">
                <h4 style="margin-top:0; margin-bottom:1.5rem; font-size:1rem; font-weight:800;">🛤️ Volume Timeline (Past 7 Days)</h4>
                <div style="height: 250px; position:relative;">
                    <canvas id="mgr-chart-trends"></canvas>
                </div>
            </div>
        </div>`;
    };

    const renderBookingsTab = () => {
        if (allBookings.length === 0) return `<div style="text-align:center; padding:5rem; background:white; border-radius:24px; box-shadow:var(--shadow-sm);"><h3>No bookings yet</h3><p style="color:#666;">Once guests book your property, they will appear here.</p></div>`;
        
        return `
                <details class="premium-filter-collapse" ${window.mgrFiltersOpen ? 'open' : ''} ontoggle="window.mgrFiltersOpen = this.open">
                    <summary>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                            Filter & Search Bookings
                        </div>
                    </summary>
                    <div class="filter-content">
                        <div style="display:flex; align-items:flex-end; gap:0.8rem; flex-wrap:wrap; margin-bottom:0.8rem;">
                            <div>
                                <label style="display:block; font-size:0.7rem; font-weight:800; color:#888; margin-bottom:0.3rem; text-transform:uppercase;">From Date</label>
                                <input type="date" id="mgr-book-from" value="${filterFrom}" style="padding:0.6rem; border-radius:10px; border:1.5px solid #e0e0e0; font-size:0.85rem; font-weight:600;" onchange="window.setMgrFilter()">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.7rem; font-weight:800; color:#888; margin-bottom:0.3rem; text-transform:uppercase;">To Date</label>
                                <input type="date" id="mgr-book-to" value="${filterTo}" style="padding:0.6rem; border-radius:10px; border:1.5px solid #e0e0e0; font-size:0.85rem; font-weight:600;" onchange="window.setMgrFilter()">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.7rem; font-weight:800; color:#888; margin-bottom:0.3rem; text-transform:uppercase;">Status</label>
                                <select id="mgr-book-status" style="padding:0.6rem; border-radius:10px; border:1.5px solid #e0e0e0; font-size:0.85rem; font-weight:700; background:white; cursor:pointer;" onchange="window.setMgrFilter()">
                                    <option value="">All Statuses</option>
                                    <option value="Awaiting Confirmation" ${filterStatus === 'Awaiting Confirmation' ? 'selected' : ''}>Awaiting Confirmation</option>
                                    <option value="Confirmed" ${filterStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                    <option value="Denied" ${filterStatus === 'Denied' ? 'selected' : ''}>Denied</option>
                                </select>
                            </div>
                            <button class="btn-outline" style="padding:0.6rem 1rem; border-radius:10px; font-size:0.8rem;" onclick="filterFrom=''; filterTo=''; filterStatus=''; window.setMgrFilter()">✕ Reset</button>
                        </div>
                        <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; margin-bottom:0.8rem;">
                            <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setMgrBookingPreset('daily')">Daily</button>
                            <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setMgrBookingPreset('weekly')">Weekly</button>
                            <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setMgrBookingPreset('monthly')">Monthly</button>
                            <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem; margin-left:0.5rem; border-color:#e2e8f0; color:#64748b;" onclick="window.setMgrBookingPreset('reset')">Reset Preset</button>
                        </div>
                        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                            <div style="display:flex; align-items:center; gap:0.5rem; background:#f8f9fa; padding:0.5rem 0.8rem; border-radius:10px; border:1.5px solid #e0e0e0; flex:1; min-width:200px; max-width:350px;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input id="mgr-ref-search" type="text" placeholder="Search by Reference Code..." style="border:none; background:transparent; outline:none; font-size:0.85rem; font-weight:600; font-family:inherit; width:100%;" oninput="window.mgrSearchRef()">
                            </div>
                        </div>
                    </div>
                </details>

                <div class="premium-table-wrap">
                <div class="table-responsive">
                    <table id="mgr-bookings-table" class="manager-table" style="width:100%; border-collapse: collapse; min-width: 800px;">
                        <thead id="mgr-bookings-thead">
                            <tr>
                                <th style="border-top-left-radius:20px;">No.</th>
                                <th>Ref</th>
                                <th>Guest</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Proof</th>
                                <th>Chat</th>
                                <th style="border-top-right-radius:20px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(() => {
                                if (tableBookings.length === 0) return '<tr><td colspan="9" style="text-align:center;padding:2rem;">No bookings found.</td></tr>';
                                return tableBookings.map((b, index) => {
                                    let rowNum = index + 1;
                                    let nights = 0;
                                    if (b.checkIn && b.checkOut) {
                                        const diffTime = Math.abs(new Date(b.checkOut) - new Date(b.checkIn));
                                        nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    }
                                    return `
                                    <tr>
                                        <td data-label="No."><span class="premium-row-num">${rowNum}</span></td>
                                        <td data-label="Ref"><span class="premium-ref">${b.referenceCode}</span></td>
                                        <td data-label="Guest">
                                            <details class="premium-guest-collapse">
                                                <summary>
                                                    <div class="premium-guest-name">${b.customerName || t('Anonymous Guest')}</div>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="chevron"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                </summary>
                                                <div class="guest-details-content">
                                                    <div class="premium-guest-email"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> ${b.customerEmail}</div>
                                                    ${b.customerPhone ? `<div class="premium-guest-phone"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${b.customerPhone}</div>` : ''}
                                                    ${(b.adults !== undefined || b.children !== undefined) ? `<div class="premium-guest-occupants"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> ${b.adults || 0} ${b.adults !== 1 ? t('Adults') : t('Adult')}${b.children ? `, ${b.children} ${b.children !== 1 ? t('Children') : t('Child')}` : ''}</div>` : ''}
                                                    ${b.packageInfo ? `<div class="premium-tag premium-tag--package"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg> ${t('PKG:')} ${b.packageInfo.title}</div>` : ''}
                                                    ${b.roomTypeName ? `<div class="premium-tag premium-tag--room"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path></svg> ${t('ROOM:')} ${b.roomTypeName}</div>` : ''}
                                                    <div class="premium-stay-dates">
                                                        ${t('Stay:')} <strong>${b.checkIn} → ${b.checkOut}</strong> <span class="premium-nights-badge">(${nights} ${nights !== 1 ? t('nights') : t('night')})</span>
                                                    </div>
                                                </div>
                                            </details>
                                        </td>
                                        <td data-label="Amount"><span class="premium-amount">${b.totalAmount}<span class="premium-amount-currency">Birr</span></span></td>
                                        <td data-label="Status">
                                            <span class="premium-status ${b.status==='Confirmed'?'premium-status--confirmed':(b.status==='Denied'?'premium-status--denied':'premium-status--awaiting')}">${b.status}</span>
                                        </td>
                                        <td data-label="Date">
                                            <div class="premium-date">${b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</div>
                                            ${b.createdAt ? `<div class="premium-date-time">${new Date(b.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
                                        </td>
                                        <td data-label="Proof">${b.paymentProofUrl ? `<button class="premium-action-btn" onclick="window.viewProof('${b.paymentProofUrl}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Proof</button>` : '<span style="color:#cbd5e1;">No file</span>'}</td>
                                        <td data-label="Chat"><button onclick="window.router.navigate('chat', { bookingId: '${b.id}' })" class="premium-action-btn premium-action-btn--chat"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Chat</button></td>
                                        <td>
                                            ${b.status === 'Awaiting Verification' 
                                                ? `<div style="display:flex; gap:0.4rem; flex-direction:column;">
                                                        <button class="premium-action-btn premium-action-btn--primary" onclick="window.mgrConfirmBooking('${b.id}', this)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Confirm</button>
                                                        <button class="premium-action-btn premium-action-btn--danger" onclick="window.mgrCancelBooking('${b.id}', this)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> Cancel</button>
                                                    </div>` 
                                                : (b.status === 'Confirmed'
                                                    ? `<div style="display:flex;align-items:center;gap:0.3rem;color:#047857; font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Confirmed</div>`
                                                    : `<div style="display:flex;align-items:center;gap:0.3rem;color:#94a3b8; font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Denied</div>`)}
                                        </td>
                                    </tr>
                                    `;
                                }).join('');
                            })()}
                        </tbody>
                    </table>
                </div>
                </div>
                ${(() => {
                    if (tableBookings.length === currentManagerLimit) {
                        return `
                        <div style="display:flex;justify-content:center;margin-top:1.5rem;">
                            <button onclick="window.loadMoreMgrBookings()" class="premium-action-btn premium-action-btn--primary" style="padding:0.75rem 1.5rem;">Load More</button>
                        </div>`;
                    }
                    return '';
                })()}


        `;
     };

    const loadManagerReviews = async () => {
        try {
            const reviews = await window.db.getReviews(myHotel.id);
            const container = document.getElementById('mgr-reviews-container');
            if (!container) return;
            
            if (reviews.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding:5rem; background:white; border-radius:24px; box-shadow:var(--shadow-sm);"><h3>No reviews yet</h3><p style="color:#666;">Guests will be able to leave reviews after their stay.</p></div>';
                return;
            }

            container.innerHTML = reviews.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).map(r => `
                <div style="background:white; border-radius:20px; padding:1.5rem; margin-bottom:1.5rem; border:1px solid #eee; box-shadow:var(--shadow-sm);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
                        <div>
                            <div style="font-weight:800; font-size:1.1rem; color:#1e293b; text-transform:uppercase;">${r.userName || 'Guest'}</div>
                            <div style="color:#f59e0b; font-size:1.1rem; margin-top:0.2rem;">
                                ${'★'.repeat(r.rating || 0)}${'☆'.repeat(5 - (r.rating || 0))}
                            </div>
                        </div>
                        <div style="font-size:0.8rem; color:#94a3b8; font-weight:600;">
                            ${new Date(r.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                    <p style="color:#475569; line-height:1.6; margin-bottom:1.5rem; font-size:0.95rem;">"${r.text}"</p>
                    
                    ${r.images && r.images.length > 0 ? `
                        <div style="display:flex; gap:0.5rem; margin-bottom:1.5rem; overflow-x:auto; padding-bottom:0.5rem;">
                            ${r.images.map(img => `<img src="${img}" style="width:100px; height:100px; object-fit:cover; border-radius:12px; border:1px solid #eee;">`).join('')}
                        </div>
                    ` : ''}

                    <div id="reply-box-${r.id}" style="background:#f8fafc; border-radius:16px; padding:1.2rem; border:1px solid #f1f5f9;">
                        ${r.managerReply ? `
                            <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.6rem;">
                                <span style="font-size:1.2rem;">💬</span>
                                <strong style="color:#1e293b; font-size:0.9rem;">Your Reply:</strong>
                                <span style="font-size:0.75rem; color:#94a3b8; margin-left:auto;">${new Date(r.managerReply.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p style="color:#64748b; font-size:0.9rem; font-style:italic; margin:0; line-height:1.5;">"${r.managerReply.text}"</p>
                            <div style="display:flex; gap:1rem; margin-top:1rem;">
                                <button onclick="window.mgOpenReply('${r.id}')" style="background:none; border:none; color:var(--color-primary); font-weight:800; font-size:0.8rem; cursor:pointer;">✎ Edit Reply</button>
                                <button onclick="window.mgDeleteReply('${r.id}')" style="background:none; border:none; color:#ef4444; font-weight:800; font-size:0.8rem; cursor:pointer;">🗑️ Delete Reply</button>
                            </div>
                        ` : `
                            <button onclick="window.mgOpenReply('${r.id}')" class="btn-primary" style="padding:0.6rem 1.2rem; font-size:0.85rem; border-radius:10px;">↩ Reply to Guest</button>
                        `}
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error("Error loading reviews:", e);
        }
    };

    const renderReviewsTab = () => {
        if (!myHotel) return `<div style="text-align:center; padding:5rem;"><h3>Property not found</h3><p>Please contact admin.</p></div>`;
        
        setTimeout(() => loadManagerReviews(), 50);

        return `
            <div id="mgr-reviews-container">
                <div style="text-align:center; padding:3rem;">
                    <div class="loader-spinner" style="width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid var(--color-primary); border-radius:50%; margin:0 auto 1rem; animation: spin 1s linear infinite;"></div>
                    <p style="color:#666; font-weight:600;">Fetching guest feedback...</p>
                </div>
            </div>
        `;
    };

    window.mgrResendEmail = async (id) => {
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
                        hotelTitle: booking.propertyTitle || (myHotel?.title || 'Michu Stays'),
                        checkIn: booking.checkIn || 'N/A',
                        checkOut: booking.checkOut || 'N/A',
                        totalAmount: booking.totalAmount || 0,
                        bookingId: id,
                        referenceCode: booking.referenceCode || id,
                        nights: nights
                    })
                });

                if (!response.ok) throw new Error("Email server error");
                window.showToast("✅ Confirmation resent!");
            }
        } catch (e) {
            console.error(e);
            window.showToast("❌ Resend failed: " + e.message);
        }
    };

    const renderPropertyTab = () => {
        if (!myHotel) return `<div style="text-align:center; padding:5rem; background:white; border-radius:24px;"><h3>No property assigned.</h3><p>Contact Admin to link your account to a hotel listing.</p></div>`;
        
        return `
            <div class="mgr-prop-layout">
                <!-- Main Form -->
                <div class="mgr-main-card" style="background:white; border-radius:24px; padding:2.5rem; box-shadow:var(--shadow-sm); border:1px solid #eee;">
                    <h3 style="margin-bottom:1.5rem; color:var(--color-primary);">Property Control Center</h3>
                    
                    <div style="background:white; padding:1.5rem; border-radius:24px; border:1.5px solid #eee; margin-bottom:1.5rem;">
                            <h4 style="margin:0 0 1.2rem; font-size:0.85rem; color:#888; text-transform:uppercase; letter-spacing:0.1em;">🏨 Basic Identity</h4>
                            <div style="margin-bottom:1.5rem;">
                                <label class="mgr-card-label" style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:0.5rem; color:#444;">PROPERTY NAME</label>
                                <input id="mg-h-title" class="mgr-card-input" type="text" value="${myHotel.title}" style="width:100%; padding:1rem; border:1.5px solid #eee; border-radius:14px; font-weight:800; font-size:1.1rem; color:var(--color-primary);">
                            </div>
                            <div class="mgr-two-col">
                                <div>
                                    <label style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:0.5rem; color:#444;">PROPERTY TYPE</label>
                                    <select id="mg-h-type" style="width:100%; padding:1rem; border:1.5px solid #eee; border-radius:14px; background:white; font-weight:600;">
                                        <option value="Hotel" ${myHotel.type==='Hotel'?'selected':''}>Hotel</option>
                                        <option value="Guesthouse" ${myHotel.type==='Guesthouse'?'selected':''}>Guesthouse</option>
                                        <option value="Apartment" ${myHotel.type==='Apartment'?'selected':''}>Apartment</option>
                                        <option value="Traditional Home" ${myHotel.type==='Traditional Home'?'selected':''}>Traditional Home</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="mgr-card-label" style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:0.5rem; color:#444;">BASE PRICE (BIRR)</label>
                                    <input id="mg-h-price" class="mgr-card-input" type="number" value="${myHotel.price}" style="width:100%; padding:1rem; border:1.5px solid #eee; border-radius:14px; font-weight:800; color:var(--color-primary); font-size:1.1rem;">
                                </div>
                            </div>
                        </div>

                        <!-- Inventory Control Section -->
                        <div style="background:#f9f9f9; padding:1.5rem; border-radius:18px; border:2px solid #f0f0f0; margin-bottom:1.5rem;">
                            <h4 style="margin:0 0 1rem; font-size:0.9rem; color:var(--color-primary);">🏨 ROOM INVENTORY</h4>
                            <div class="mgr-inventory-col">
                                <div>
                                    <label style="display:block; font-weight:700; font-size:0.75rem; margin-bottom:0.4rem; color:#666;">DISCOUNT (%)</label>
                                    <input id="mg-h-discount" type="number" min="0" max="90" value="${myHotel.discountPercent || 0}" style="width:100%; padding:0.8rem; border:1px solid #ddd; border-radius:10px; font-weight:700; color:#d9534f;">
                                </div>
                                <div>
                                    <label style="display:block; font-weight:700; font-size:0.75rem; margin-bottom:0.4rem; color:var(--color-primary);">AVAILABLE NOW</label>
                                    <input id="mg-h-avail-rooms" type="number" value="${myHotel.availableRooms || 1}" style="width:100%; padding:0.8rem; border:2px solid var(--color-primary); border-radius:10px; font-weight:800; text-align:center; font-size:1.1rem; color:var(--color-primary);">
                                </div>
                            </div>
                        </div>

                        <!-- Pricing & Location Extras -->
                        <div class="mgr-three-col">
                            <div>
                                <label style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:0.5rem; color:#444;">PHYSICAL ADDRESS / LOCATION</label>
                                <input id="mg-h-address" type="text" value="${myHotel.address || ''}" placeholder="e.g. Churchill Ave" style="width:100%; padding:0.9rem; border:1.5px solid #eee; border-radius:14px;">
                            </div>
                            <div>
                                <label style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:0.5rem; color:#444;">MAP SEARCH QUERY (GPS/NAME)</label>
                                <input id="mg-h-map-query" type="text" value="${myHotel.mapQuery || ''}" placeholder="Exact Google Maps Name" style="width:100%; padding:0.9rem; border:1.5px solid #eee; border-radius:14px;">
                            </div>
                            <div>
                                <label style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:0.5rem; color:#444;">DISTANCE FROM CENTRE (KM)</label>
                                <input id="mg-h-distance" type="number" step="0.1" min="0" value="${myHotel.distanceFromCenter || ''}" placeholder="e.g. 2.7" style="width:100%; padding:0.9rem; border:1.5px solid #eee; border-radius:14px;">
                            </div>
                        </div>

                        <div>
                            <label style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:0.5rem; color:#444;">DESCRIPTION</label>
                            <textarea id="mg-h-desc" style="width:100%; padding:1rem; border:1.5px solid #eee; border-radius:14px; min-height:120px; font-family:inherit; line-height:1.6;">${myHotel.description || ''}</textarea>
                        </div>

                        <!-- Payment & Contact Control -->
                        <div style="background:#fffcf5; padding:1.5rem; border-radius:18px; border:1px solid #fceec5;">
                            <h4 style="margin:0 0 1rem; font-size:0.9rem; color:#856404;">💳 PAYMENT OPTIONS & CONTACT</h4>
                            <div class="mgr-two-col" style="margin-bottom:1rem;">
                                <input id="mg-h-cbe-acc" placeholder="CBE Account #" value="${myHotel.cbeAccount || ''}" style="padding:0.75rem; border-radius:10px; border:1px solid #ddd;">
                                <input id="mg-h-cbe-name" placeholder="CBE Account Name" value="${myHotel.cbeName || ''}" style="padding:0.75rem; border-radius:10px; border:1px solid #ddd;">
                            </div>
                            <div class="mgr-two-col" style="margin-bottom:1rem;">
                                <input id="mg-h-tele-num" placeholder="telebirr Number" value="${myHotel.telebirrNumber || ''}" style="padding:0.75rem; border-radius:10px; border:1px solid #ddd;">
                                <input id="mg-h-tele-name" placeholder="telebirr Name" value="${myHotel.telebirrName || ''}" style="padding:0.75rem; border-radius:10px; border:1px solid #ddd;">
                            </div>
                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                <span style="font-size:1.2rem;">📞</span>
                                <input id="mg-h-phone" placeholder="Reception Phone Number" value="${myHotel.phone || ''}" style="width:100%; padding:0.75rem; border-radius:10px; border:1px solid #ddd; font-weight:600;">
                            </div>
                        </div>
                        
                        <!-- Media Gallery -->
                        <div style="background:white; padding:1.5rem; border-radius:24px; border:1.5px solid #eee;">
                            <label style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:1.2rem; color:var(--color-primary); text-transform:uppercase; letter-spacing:0.1em;">📸 Photo Showcase (1-10)</label>
                            <div class="mgr-photo-grid" style="display:grid; grid-template-columns: repeat(5, 1fr); gap:0.6rem;">
                                ${(() => {
                                    const images = myHotel.images || [myHotel.image, ...(myHotel.extraImages || [])].filter(Boolean);
                                    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
                                        const img = images[i-1] || '';
                                    return `
                                    <div style="text-align:center;">
                                        <div id="mg-box-${i}" style="width:100%; aspect-ratio:1/1; border:2px dashed #ddd; border-radius:12px; position:relative; overflow:hidden; background:${img?`url('${img}') center/cover`:'#f8f9fa'}; cursor:pointer;" onclick="document.getElementById('mg-file-${i}').click()">
                                            ${!img ? `<span style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:#ccc;">+</span>`:''}
                                            <input type="file" id="mg-file-${i}" accept="image/*" style="display:none;" onchange="window.previewMgrFile(${i}, this)">
                                            <div id="mg-prev-overlay-${i}" style="position:absolute; inset:0; background:rgba(44,182,115,0.8); display:none; align-items:center; justify-content:center; color:white; font-size:0.6rem; font-weight:800; text-transform:uppercase;">UPDATE</div>
                                            <button id="mg-p-cancel-${i}" style="position:absolute; top:0.2rem; right:0.2rem; width:18px; height:18px; border-radius:50%; background:rgba(0,0,0,0.6); color:white; display:${img?'flex':'none'}; align-items:center; justify-content:center; border:none; font-size:0.6rem; font-weight:800; cursor:pointer; z-index:10;" onclick="event.stopPropagation(); window.clearMgrPhoto(${i})">✕</button>
                                        </div>
                                    </div>`;
                                }).join('')})()}
                            </div>
                        </div>

                        <!-- Stay Packages Section -->
                        <div style="background:#f0f7ff; padding:1.5rem; border-radius:24px; border:1px solid #c9e2ff; margin-bottom:1.5rem;">
                            <h4 style="margin:0 0 1rem; font-size:0.9rem; color:#0056b3; display:flex; align-items:center; gap:0.5rem;">
                                <span style="font-size:1.4rem;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg></span> STAY PACKAGES & DEALS
                            </h4>
                            <p style="font-size:0.8rem; color:#666; margin-bottom:1.2rem;">Create special offers for longer stays (e.g., 3 nights for 15% off). Guests see these prominentely on your listing.</p>
                            
                            <div style="margin-bottom:1rem; background:white; padding:1rem; border-radius:12px; border:1px solid #c9e2ff;">
                                <label style="display:block; font-weight:800; font-size:0.7rem; color:#888; margin-bottom:0.5rem; text-transform:uppercase;">Custom Badge Text</label>
                                <input id="mg-badge-text" type="text" value="${myHotel.badgeText || ''}" placeholder="e.g. SPECIAL OFFERS INSIDE" style="width:100%; padding:0.8rem; border:1px solid #eee; border-radius:10px; font-weight:700; color:#0b6646;">
                                <p style="font-size:0.65rem; color:#999; margin-top:0.4rem;">This text appears on the emerald green badge in the search results. Leave empty for default.</p>
                            </div>

                            <div style="margin-bottom:1.5rem; background:#fff4e5; padding:1.2rem; border-radius:18px; border:1px solid #ffe0b2; display:flex; align-items:center; justify-content:space-between; gap:1rem;">
                                <div>
                                    <h5 style="margin:0; font-size:0.85rem; color:#e65100;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; margin-bottom:-2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Event Mode (Packages Only)</h5>
                                    <p style="margin:0.3rem 0 0; font-size:0.7rem; color:#666; line-height:1.4;">Enable this during festivals or events to hide normal nightly rates and <b>only</b> allow guests to book your special stay packages.</p>
                                </div>
                                <label class="switch">
                                    <input type="checkbox" id="mg-event-mode" ${myHotel.eventMode ? 'checked' : ''}>
                                    <span class="slider round"></span>
                                </label>
                            </div>

                            <div id="mg-packages-container" style="display:grid; gap:0.8rem;">
                                ${(myHotel.packages || []).map((pkg, idx) => `
                                    <div class="mg-package-row" style="background:white; padding:1rem; border-radius:14px; border:1px solid #e0eaff;">
                                        <input type="text" placeholder="Package Title (e.g. Weekend Special)" value="${pkg.title||''}" class="mg-pkg-title" style="padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
                                        <div>
                                            <input type="number" placeholder="Nights" value="${pkg.nights||''}" class="mg-pkg-nights" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
                                        </div>
                                        <div>
                                            <input type="number" placeholder="Disc %" value="${pkg.discount||''}" class="mg-pkg-discount" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.85rem;">
                                        </div>
                                        <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#ff385c; cursor:pointer; font-size:1.1rem; font-weight:800;">✕</button>
                                        <div style="grid-column: 1 / -1;">
                                            <input type="text" placeholder="Included Services (e.g. Free Massage, Airport Shuttle)" value="${pkg.services||''}" class="mg-pkg-services" style="width:100%; padding:0.6rem; border:1px solid #eee; border-radius:8px; font-size:0.8rem; background:#fcfcfc;">
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <button onclick="window.addMgPackage()" style="width:100%; margin-top:1rem; padding:0.8rem; border-radius:12px; border:1.5px dashed #0056b3; background:none; color:#0056b3; font-weight:700; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#e3efff'">+ Add New Special Offer</button>
                        </div>

                        <!-- Room Types & Configurations Section -->
                        <div style="background:#eafaf1; padding:1.5rem; border-radius:24px; border:1px solid #a7f3d0; margin-bottom:1.5rem;">
                            <h4 style="margin:0 0 1rem; font-size:0.9rem; color:#0b6646; display:flex; align-items:center; gap:0.5rem;">
                                <span style="font-size:1.4rem;">🔑</span> ROOM TYPES & BED CONFIGURATIONS
                            </h4>
                            <p style="font-size:0.8rem; color:#475569; margin-bottom:1.2rem;">Define the types of rooms (e.g. Standard Single, Deluxe Family Suite) and beds your hotel offers. If defined, listing pricing and inventory will automatically align with these configurations.</p>
                            
                            <div id="mg-room-types-container" style="display:grid; gap:1.2rem;">
                                ${(myHotel.roomTypes || []).map((room, idx) => `
                                    <div class="mg-room-row" data-id="${room.id || `room_${idx}`}" style="background:white; padding:1.2rem; border-radius:18px; border:1px solid #cbd5e1; display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; position:relative;">
                                        <div style="position:absolute; top:0.8rem; right:0.8rem; display:flex; gap:0.5rem; z-index:10;">
                                            <label style="display:flex; align-items:center; gap:0.3rem; font-size:0.75rem; font-weight:800; cursor:pointer; background:#f1f5f9; padding:0.3rem 0.6rem; border-radius:6px; color:#475569;">
                                                <input type="checkbox" class="mg-room-active" ${room.isActive !== false ? 'checked' : ''} style="accent-color:var(--color-primary);"> Active
                                            </label>
                                            <button type="button" onclick="this.closest('.mg-room-row').remove()" style="background:none; border:none; color:#ff385c; cursor:pointer; font-size:1.1rem; font-weight:800;">✕</button>
                                        </div>
                                        
                                        <div style="grid-column: 1 / -1; display:flex; gap:1rem; align-items:center; margin-bottom: 0.5rem; margin-top: 1.5rem;">
                                            <div class="mg-room-img-preview" style="width:60px; height:60px; border-radius:10px; background:${room.image ? `url('${room.image}') center/cover` : '#f1f5f9'}; border:1px solid #cbd5e1; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                                                ${room.image ? '' : '<span style="color:#94a3b8; font-size:1.2rem;">📷</span>'}
                                            </div>
                                            <div style="flex:1;">
                                                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Room Photo</label>
                                                <input type="file" accept="image/*" class="mg-room-img-input" style="font-size:0.75rem; width:100%;" onchange="
                                                    const file = this.files[0];
                                                    if(file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => {
                                                            const preview = this.closest('.mg-room-row').querySelector('.mg-room-img-preview');
                                                            preview.style.background = 'url(' + e.target.result + ') center/cover';
                                                            preview.innerHTML = '';
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                ">
                                                <input type="hidden" class="mg-room-img-url" value="${room.image || ''}">
                                            </div>
                                        </div>
                                        
                                        <div style="grid-column: 1 / -1; margin-right: 2rem;">
                                            <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Room Type Name</label>
                                            <input type="text" placeholder="e.g. Deluxe Double Room" value="${room.name||''}" class="mg-room-name" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
                                        </div>
                                        <div style="grid-column: 1 / -1;">
                                            <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Description</label>
                                            <input type="text" placeholder="e.g. Ocean view, mini-bar, balcony" value="${room.description||''}" class="mg-room-desc" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
                                        </div>
                                        <div>
                                            <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Price per Night (Birr)</label>
                                            <input type="number" placeholder="Price" value="${room.price||''}" class="mg-room-price" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700; color:var(--color-primary);">
                                        </div>
                                        <div>
                                            <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Max Guests Capacity</label>
                                            <input type="number" placeholder="Capacity" value="${room.capacity||''}" class="mg-room-capacity" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
                                        </div>
                                        <div>
                                            <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Bed Configurations</label>
                                            <input type="text" placeholder="e.g. 1 King Bed or 2 Double Beds" value="${room.beds||''}" class="mg-room-beds" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
                                        </div>
                                        <div>
                                            <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Quantity (Total Rooms)</label>
                                            <input type="number" placeholder="Total Rooms" value="${room.totalRooms||''}" class="mg-room-total-rooms" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
                                        </div>
                                        <div>
                                            <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Available Rooms</label>
                                            <input type="number" placeholder="Available" value="${room.availableRooms !== undefined ? room.availableRooms : (room.totalRooms || '')}" class="mg-room-avail" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            
                            <button type="button" onclick="window.addMgRoomType()" style="width:100%; margin-top:1rem; padding:0.8rem; border-radius:12px; border:1.5px dashed #0b6646; background:none; color:#0b6646; font-weight:700; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#e6f4ea'">+ Add New Room Type</button>
                        </div>

                        <!-- Amenities -->
                        <div>
                            <label style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:1rem; color:var(--color-primary);">✨ AMENITIES</label>
                            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:1rem; background:#f9f9f9; padding:1.5rem; border-radius:20px;">
                                ${['WiFi', 'Pool', 'Spa', 'Breakfast', 'Parking', 'Gym', 'AC', 'Bar', 'TV', 'Kitchen', 'Workspace', 'Balcony'].map(a => `
                                    <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-weight:600; font-size:0.85rem;">
                                        <input type="checkbox" class="mg-amenity" value="${a}" ${(myHotel.amenities || []).includes(a)?'checked':''} style="width:18px; height:18px; accent-color:var(--color-primary);"> ${a}
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Video Tour -->
                        <div>
                            <label style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:0.5rem; color:var(--color-primary);">🎥 VIDEO TOUR (MP4)</label>
                            <div style="display:flex; gap:1rem; align-items:center; background:#f0f7f4; padding:1rem; border-radius:14px; border:1px solid #d4e8e0;">
                                <input type="file" id="mg-video-file" accept="video/mp4" style="flex:1; padding:0.5rem; border-radius:8px; border:1.5px solid #ccc;" onchange="const c=document.getElementById('mg-video-cancel'); if(c) c.style.display=this.value?'block':'none'">
                                <button id="mg-video-cancel" style="display:${myHotel.videoTour?'block':'none'}; color:#d9534f; font-weight:800; font-size:0.8rem; background:none; border:none; cursor:pointer;" onclick="document.getElementById('mg-video-file').value=''; this.style.display='none'; const s=document.getElementById('mg-video-status'); if(s) s.style.display='none'">✕ CLEAR</button>
                                <span id="mg-video-status" style="display:${myHotel.videoTour?'block':'none'}; color:#28a745; font-weight:800; font-size:0.9rem;">✅ UPLOADED</span>
                            </div>
                        </div>

                        <div id="mg-save-status" style="text-align:center; font-weight:700; min-height:1.5rem; padding:0.5rem; border-radius:10px;"></div>
                        <div class="mobile-sticky-save">
                            <button id="mg-save-btn" class="btn-primary" style="padding:1.2rem; font-size:1.1rem; border-radius:16px; box-shadow:var(--shadow-md); width:100%;" onclick="window.mgSaveHotel()">💾 Save All Property Changes</button>
                        </div>
                    </div>
                </div>

                <!-- Preview Card (hidden on mobile) -->
                <div class="mgr-prop-preview" style="position:sticky; top:2rem;">
                    <h4 style="margin-top:0; color:#666; font-size:0.9rem;">LIVE PREVIEW</h4>
                    <div style="background:white; border-radius:24px; overflow:hidden; box-shadow:var(--shadow-lg); border:1px solid #eee; max-width:400px; margin:0 auto;">
                        <img src="${myHotel.image || ''}" style="width:100%; height:180px; object-fit:cover;">
                        <div style="padding:1.5rem;">
                            <div style="font-weight:800; font-size:1.25rem; color:var(--color-primary); margin-bottom:0.3rem;">${myHotel.title}</div>
                            <div style="font-size:0.85rem; color:#666; margin-bottom:1rem; display:flex; align-items:center; gap:0.4rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> ${myHotel.address || 'Location Pending'}</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                                <div style="font-weight:900; font-size:1.4rem;">${myHotel.price} <span style="font-size:0.8rem; font-weight:500;">BR / night</span></div>
                                <div style="color:${myHotel.availableRooms > 0 ? '#28a745':'#dc3545'}; font-weight:800; font-size:0.85rem;">
                                    ${myHotel.availableRooms > 0 ? `${myHotel.availableRooms} Rooms Left` : 'FULLY BOOKED'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:1.5rem; background:#fff8e1; border-radius:16px; padding:1.2rem; border:1px solid #ffe082; display:flex; align-items:center; gap:0.8rem;">
                         <span style="font-size:1.5rem;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg></span>
                         <p style="margin:0; font-size:0.8rem; color:#856404; font-weight:600; line-height:1.4;">Keep your <b>Available Rooms</b> updated to ensure guests can book successfully.</p>
                    </div>
                </div>
            </div>
        `;
    };

    const renderAccountTab = () => {
        return `
            <div class="mgr-account-card" style="max-width:550px; margin:0 auto; background:white; border-radius:28px; padding:2.5rem; box-shadow:0 20px 50px rgba(0,0,0,0.08); border:1px solid #eee;">
                <style>
                    @media(max-width: 600px) {
                        .mgr-account-card { padding: 1.5rem !important; border-radius:18px !important; }
                    }
                </style>
                <div style="text-align:center; margin-bottom:2.5rem;">
                    <div id="mg-acc-pic-box" style="width:140px; height:140px; border-radius:50%; margin:0 auto 1.5rem; border:5px solid #f0f0f0; box-shadow:0 10px 25px rgba(0,0,0,0.1); position:relative; cursor:pointer; overflow:hidden;" onclick="document.getElementById('mg-acc-pic-input').click()">
                        ${userData.profilePic ? `<img src="${userData.profilePic}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:4rem; display:flex; align-items:center; justify-content:center; height:100%; background:#f8f9fa; color:#ccc;">👤</span>`}
                        <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:white; opacity:0; transition:0.3s;" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0; font-weight:800;">CHANGE</div>
                    </div>
                    <input type="file" id="mg-acc-pic-input" accept="image/*" style="display:none;" onchange="window.previewMgAccPic(this)">
                    <h3 style="margin:0; font-size:1.5rem;">Manager Profile</h3>
                    <p style="margin:0.3rem 0 0; color:#888; font-weight:500;">${userData.email}</p>
                    <p style="margin:0.2rem 0 0; font-family:monospace; font-size:0.75rem; color:#aaa;">ID: ${userData.uid}</p>
                </div>

                <div style="display:grid; gap:1.5rem;">
                    <div>
                        <label style="display:block; font-weight:700; font-size:0.85rem; margin-bottom:0.5rem; color:#555;">FULL NAME</label>
                        <input id="mg-acc-name" type="text" value="${userData.fullName||''}" placeholder="Your Full Name" style="width:100%; padding:1rem; border:1.5px solid #eee; border-radius:14px; font-weight:600;">
                    </div>
                    <div>
                        <label style="display:block; font-weight:700; font-size:0.85rem; margin-bottom:0.5rem; color:#555;">CONTACT PHONE</label>
                        <input id="mg-acc-phone" type="tel" value="${userData.phone||''}" placeholder="+251 91..." style="width:100%; padding:1rem; border:1.5px solid #eee; border-radius:14px; font-weight:600;">
                    </div>
                    <button id="mg-acc-save-btn" class="btn-primary" style="padding:1.2rem; margin-top:1rem; border-radius:16px; font-size:1rem; font-weight:700; box-shadow:var(--shadow-md);" onclick="window.mgSaveAccount()">💾 Update My Account</button>
                    <button class="btn-outline" style="padding:1.2rem; border-radius:16px; font-size:1rem; font-weight:700; border-color:#e74c3c; color:#e74c3c; margin-top:0.5rem;" onclick="window.auth.logout()">🚪 Log out</button>
                </div>
            </div>
        `;
    };

    // Initial Load
    await syncManagerData();
});
