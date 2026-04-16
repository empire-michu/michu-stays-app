window.router.addRoute('manager', async (container, params) => {
    const role = window.auth?.role || window.auth?.userData?.role;
    if (!['manager','admin'].includes(role)) {
        window.router.navigate('login'); return;
    }

    let activeTab = params?.tab || 'bookings'; // bookings, property, account
    let filterFrom = '';
    let filterTo = '';
    const uid = window.auth?.currentUser?.uid;
    let userData = window.auth?.userData || {};
    let myHotel = null;
    let allBookings = [];
    let bookingsPage = 1;
    let totalBookingsPages = 1;

    // --- Tab & Function Globals ---
    window.setMgrTab = (tab) => { activeTab = tab; renderManagerUI(); };
    window.setMgrFilter = () => {
        filterFrom = document.getElementById('mgr-book-from')?.value || '';
        filterTo = document.getElementById('mgr-book-to')?.value || '';
        bookingsPage = 1;
        renderManagerUI();
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

    window.previewMgAccPic = (input) => {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('mg-acc-pic-box').innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
                window.newMgAccPic = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    window.mgSaveHotel = async () => {
        const btn = document.getElementById('mg-save-btn');
        const status = document.getElementById('mg-save-status');
        if (!btn || !myHotel) return;

        try {
            const getVal = (id) => document.getElementById(id)?.value?.trim() || '';
            const getNum = (id) => Number(document.getElementById(id)?.value) || 0;

            const title = getVal('mg-h-title');
            const priceVal = getNum('mg-h-price');
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

            const updatedData = {
                title,
                type: getVal('mg-h-type'),
                price: priceVal,
                discountPercent: discountVal,
                discount: discountVal, 
                originalPrice,
                address: getVal('mg-h-address'),
                availableRooms: getNum('mg-h-avail-rooms'),
                mapQuery: getVal('mg-h-map-query'),
                description: getVal('mg-h-desc'),
                cbeAccount: getVal('mg-h-cbe-acc'),
                cbeName: getVal('mg-h-cbe-name'),
                telebirrNumber: getVal('mg-h-tele-num'),
                telebirrName: getVal('mg-h-tele-name'),
                phone: getVal('mg-h-phone'),
                distanceFromCenter: getNum('mg-h-distance'),
                amenities: Array.from(document.querySelectorAll('.mg-amenity:checked')).map(el => el.value),
                images: filteredImages,
                image: filteredImages[0] || '',
                extraImages: filteredImages.slice(1),
                videoTour: videoUrl,
                updatedAt: Date.now()
            };

            await window.db.updateProperty(myHotel.id, updatedData);
            window.showToast("✅ Property updated successfully!");
            await syncManagerData();
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

    window.mgrConfirmBooking = async (id) => {
        try {
            await window.db.updateBookingStatus(id, 'Confirmed');
            
            // Send global broadcast notification
            const booking = allBookings.find(b => b.id === id);
            await window.db.createNotification({
                type: 'booking_confirmed',
                message: `🎉 Booking Confirmed at ${myHotel?.title || 'a property'}!`,
                details: `Guest ${booking?.customerName || ''} is ready for their stay.`,
                hotelId: myHotel?.id
            });

            // Deduct available room instantly
            if (myHotel && myHotel.id) {
                const current = myHotel.availableRooms ?? myHotel.totalRooms ?? 0;
                const newAvail = Math.max(0, current - 1);
                await window.db.updateProperty(myHotel.id, { availableRooms: newAvail });
            }
            window.showAlert("✅ Booking Confirmed! The guest has been notified and one room has been deducted from your inventory.");
            syncManagerData(); 
        } catch (e) {
            console.error(e);
            window.showToast("❌ Confirmation failed: " + e.message);
        }
    };

    window.mgrCancelBooking = async (id) => {
        try {
            await window.db.updateBookingStatus(id, 'Denied');
            
            // Send global broadcast notification
            const booking = allBookings.find(b => b.id === id);
            await window.db.createNotification({
                type: 'booking_denied',
                message: `❌ Booking Denied at ${myHotel?.title || 'a property'}!`,
                details: `Guest ${booking?.customerName || ''}'s stay request was denied.`,
                hotelId: myHotel?.id
            });

            window.showAlert("❌ Booking Denied! The guest has been notified.");
            syncManagerData(); 
        } catch (e) {
            console.error(e);
            window.showToast("❌ Cancellation failed: " + e.message);
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
    const syncManagerData = async () => {
        if (bookingUnsub) bookingUnsub(); // Cleanup old listener
        
        // Start Live Listener
        bookingUnsub = window.db.listenToBookings((data) => {
            allBookings = data;
            renderManagerUI();
        }, uid);

        // Fetch property info (one-time is fine for now, or we could listen to this too)
        if (userData?.hotelId) {
            myHotel = await window.db.getPropertyById(userData.hotelId);
        } else {
            const props = await window.db.getProperties(uid);
            myHotel = props[0] || null;
        }
        renderManagerUI();
    };

    const renderManagerUI = () => {
        container.innerHTML = `
            <div class="manager-container" style="max-width:1200px; margin:0 auto; padding:2rem 1rem;">
                <style>
                    .manager-container { animation: fadeIn 0.4s ease; padding-bottom: 120px; }
                    .manager-layout { display: grid; grid-template-columns: 280px 1fr; gap: 2rem; }
                    .manager-sidebar { background: white; border-radius: 24px; padding: 1.5rem; height: fit-content; position: sticky; top: 100px; box-shadow: var(--shadow-sm); z-index: 10; }
                    .mgr-nav-btn { width: 100%; padding: 1rem; margin-bottom: 0.5rem; border: none; border-radius: 12px; background: transparent; color: #666; font-weight: 600; text-align: left; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.8rem; }
                    .mgr-nav-btn.active { background: var(--color-primary-light); color: var(--color-primary); }
                    
                    /* Mobile Specific */
                    .mgr-mobile-tabs { display: none; margin-bottom: 1.5rem; background: #eee; padding: 0.35rem; border-radius: 16px; gap: 0.3rem; }
                    .mgr-mobile-tab-btn { flex: 1; padding: 0.7rem; border: none; border-radius: 12px; font-weight: 700; font-size: 0.85rem; background: transparent; color: #777; transition: all 0.2s; }
                    .mgr-mobile-tab-btn.active { background: white; color: var(--color-primary); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

                    .manager-table { width:100%; border-collapse:collapse; background:white; }
                    .manager-table th { background:#f9fafb; padding:1.2rem 1rem; text-align:left; font-size:0.75rem; font-weight:800; color:#666; text-transform:uppercase; border-bottom:2px solid #f0f0f0; }
                    .manager-table td { padding:1.2rem 1rem; border-bottom:1px solid #f0f0f0; vertical-align:middle; }

                    /* Property Editor Desktop Grid Defaults */
                    .mgr-prop-layout { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; }
                    .mgr-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
                    .mgr-three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
                    .mgr-inventory-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }

                    @media (max-width: 768px) {
                        .manager-layout { grid-template-columns: 1fr; }
                        .manager-sidebar { display: none; }
                        .mgr-mobile-tabs { display: flex; }
                        .manager-container { padding: 0.75rem 0.5rem !important; padding-top: 0.5rem; padding-bottom: 140px; }

                        /* Property Editor Mobile Overhaul */
                        .mgr-prop-layout { grid-template-columns: 1fr !important; gap: 0 !important; }
                        .mgr-prop-preview { display: none !important; }
                        .mgr-main-card { padding: 1rem !important; border-radius: 18px !important; margin: 0 !important; }
                        .mgr-main-card h3 { font-size: 1.15rem !important; margin-bottom: 1rem !important; }
                        .mgr-card-input, .mgr-main-card input, .mgr-main-card select, .mgr-main-card textarea {
                            font-size: 16px !important; /* Prevents iOS zoom on focus */
                            padding: 0.75rem !important;
                            border-radius: 12px !important;
                            width: 100% !important;
                            box-sizing: border-box !important;
                        }
                        .mgr-card-label { font-size: 0.72rem !important; }
                        .mgr-two-col, .mgr-three-col, .mgr-inventory-col { grid-template-columns: 1fr !important; gap: 0.8rem !important; }
                        .mgr-photo-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 0.5rem !important; }
                        .mgr-photo-grid > div > div { border-radius: 10px !important; }

                        .mobile-sticky-save {
                            position: fixed;
                            bottom: calc(75px + env(safe-area-inset-bottom, 0px));
                            left: 0.75rem; right: 0.75rem;
                            z-index: 1000;
                            box-shadow: 0 -4px 30px rgba(0,0,0,0.25);
                            border-radius: 16px;
                        }
                    }
                </style>

                <div class="mgr-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
                    <div>
                        <h2 style="color:var(--color-primary); margin:0; font-weight:900; font-size:1.5rem;">Manager Dashboard</h2>
                        <p style="margin:0.2rem 0 0; color:#666; font-size:0.85rem; font-weight:600;">${myHotel ? myHotel.title : 'Welcome'}</p>
                    </div>
                    <div id="mgr-push-status">
                        ${(userData.fcmTokens && userData.fcmTokens.length > 0)
                            ? `<button class="btn-outline" style="padding:0.4rem 1rem; font-size:0.75rem; border-color:green; color:green; border-radius:8px; cursor:pointer;" onclick="window.enableManagerPush(this)">✅ Alerts On</button>`
                            : `<button class="btn-outline" style="padding:0.4rem 1rem; font-size:0.75rem; border-color:#f59e0b; color:#d97706; border-radius:8px; cursor:pointer;" onclick="window.enableManagerPush(this)">🔔 Enable Alerts</button>`
                        }
                    </div>
                </div>

                <div class="manager-layout">
                    <div class="manager-sidebar">
                        <button class="mgr-nav-btn ${activeTab === 'bookings' ? 'active' : ''}" onclick="window.setMgrTab('bookings')">
                            <span style="font-size:1.2rem;">📅</span> Bookings
                        </button>
                        <button class="mgr-nav-btn ${activeTab === 'property' ? 'active' : ''}" onclick="window.setMgrTab('property')">
                            <span style="font-size:1.2rem;">🏨</span> My Property
                        </button>
                        <button class="mgr-nav-btn ${activeTab === 'account' ? 'active' : ''}" onclick="window.setMgrTab('account')">
                            <span style="font-size:1.2rem;">👤</span> My Account
                        </button>
                    </div>

                    <div class="manager-content">
                        <!-- Mobile Tabs -->
                        <div class="mgr-mobile-tabs">
                            <button class="mgr-mobile-tab-btn ${activeTab === 'bookings' ? 'active' : ''}" onclick="window.setMgrTab('bookings')">Bookings</button>
                            <button class="mgr-mobile-tab-btn ${activeTab === 'property' ? 'active' : ''}" onclick="window.setMgrTab('property')">Property</button>
                            <button class="mgr-mobile-tab-btn ${activeTab === 'account' ? 'active' : ''}" onclick="window.setMgrTab('account')">Account</button>
                        </div>
                        ${renderActiveTab()}
                    </div>
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
        `;
    };

    const tabStyle = (tab) => `
        padding:0.7rem 1.4rem; border:none; border-radius:12px; cursor:pointer; font-weight:700; transition:0.3s;
        background:${activeTab===tab?'white':'transparent'};
        color:${activeTab===tab?'var(--color-primary)':'#666'};
        box-shadow:${activeTab===tab?'0 4px 12px rgba(0,0,0,0.05)':'none'};
    `;

    const renderActiveTab = () => {
        if (activeTab === 'bookings') return renderBookingsTab();
        if (activeTab === 'property') return renderPropertyTab();
        if (activeTab === 'account') return renderAccountTab();
    };

    const renderBookingsTab = () => {
        if (allBookings.length === 0) return `<div style="text-align:center; padding:5rem; background:white; border-radius:24px; box-shadow:var(--shadow-sm);"><h3>No bookings yet</h3><p style="color:#666;">Once guests book your property, they will appear here.</p></div>`;
        
        return `
                <div style="background:white; border-radius:18px; padding:1.2rem; box-shadow:var(--shadow-sm); margin-bottom:1.5rem; display:flex; align-items:flex-end; gap:0.8rem; flex-wrap:wrap; border:1px solid #eee;">
                    <div>
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:#888; margin-bottom:0.3rem; text-transform:uppercase;">From Date</label>
                        <input type="date" id="mgr-book-from" value="${filterFrom}" style="padding:0.6rem; border-radius:8px; border:1.5px solid #eee; font-size:0.85rem;" onchange="window.setMgrFilter()">
                    </div>
                    <div>
                        <label style="display:block; font-size:0.7rem; font-weight:800; color:#888; margin-bottom:0.3rem; text-transform:uppercase;">To Date</label>
                        <input type="date" id="mgr-book-to" value="${filterTo}" style="padding:0.6rem; border-radius:8px; border:1.5px solid #eee; font-size:0.85rem;" onchange="window.setMgrFilter()">
                    </div>
                    <button class="btn-outline" style="padding:0.6rem 1rem; border-radius:8px; font-size:0.8rem;" onclick="filterFrom=''; filterTo=''; window.setMgrFilter()">✕ Reset</button>
                </div>

                <div style="background:white; border-radius:24px; box-shadow:var(--shadow-sm); overflow-x:auto; border:1px solid #eee;">
                    <table class="manager-table" style="width:100%; min-width:1000px;">
                        <thead id="mgr-bookings-thead">
                            <tr>
                                <th style="border-top-left-radius:20px;">No.</th>
                                <th>Ref</th>
                                <th>Guest</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Proof</th>
                                <th style="border-top-right-radius:20px;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(() => {
                                const filtered = allBookings.filter(b => {
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
                                        <td data-label="No." style="font-weight:800; color:#888;">${rowNum}</td>
                                        <td data-label="Ref" style="font-family:monospace; font-weight:900; color:var(--color-primary); font-size:1.1rem;">${b.referenceCode}</td>
                                        <td data-label="Guest">
                                            <div style="display:flex; flex-direction:column; gap:0.4rem;">
                                                <div style="font-weight:900; color:#1a1a1a; font-size:1rem; line-height:1.2;">${b.customerName || 'Anonymous Guest'}</div>
                                                <div style="display:flex; align-items:center; gap:0.4rem; color:#555; font-size:0.8rem;">
                                                    <span style="opacity:0.6;">✉️</span> 
                                                    <span style="word-break:break-all; font-weight:600;">${b.customerEmail}</span>
                                                </div>
                                                ${b.customerPhone ? `
                                                <div style="display:flex; align-items:center; gap:0.4rem; color:var(--color-primary); font-size:0.85rem; font-weight:800;">
                                                    <span>📞</span> ${b.customerPhone}
                                                </div>` : ''}
                                                
                                                <div style="margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid #eee; display:flex; gap:0.8rem; align-items:center;">
                                                    <div style="font-size:0.75rem; color:#888;">Stay: <strong style="color:#333;">${b.checkIn} → ${b.checkOut}</strong></div>
                                                    <div style="background:#fff8e1; color:#b05d22; padding:0.2rem 0.5rem; border-radius:6px; font-size:0.7rem; font-weight:900; border:1px solid #ffe082;">${nights} NIGHTS</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Amount"><div style="font-weight:900; font-size:1.1rem; color:#1a1a1a;">${b.totalAmount} <span style="font-size:0.7rem; color:#999;">BIRR</span></div></td>
                                        <td data-label="Status">
                                            <span style="display:inline-block; padding:0.4rem 1rem; border-radius:12px; font-size:0.7rem; font-weight:900; background:${b.status==='Confirmed'?'#e6f4ea':(b.status==='Denied'?'#fce8e6':'#fff8e1')}; color:${b.status==='Confirmed'?'#1e7e34':(b.status==='Denied'?'#c5221f':'#b05d22')}; text-transform:uppercase; letter-spacing:0.05em;">${b.status}</span>
                                        </td>
                                        <td data-label="Date" style="font-size:0.85rem; color:#666; font-weight:600;">
                                            <div>${b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</div>
                                            <div style="font-size:0.7rem; color:#b0b0b0;">${b.createdAt ? new Date(b.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                                        </td>
                                        <td data-label="Proof">${b.paymentProofUrl ? `<button class="btn-outline" style="padding:0.4rem 1rem; font-size:0.75rem; border-radius:10px; font-weight:700; background:white;" onclick="window.viewProof('${b.paymentProofUrl}')">🖼 Browse Proof</button>` : '<span style="color:#ddd; font-style:italic; font-size:0.8rem;">No file</span>'}</td>
                                        <td>${b.status === 'Awaiting Verification' ? `<div style="display:flex; gap:0.5rem; flex-direction:column;"><button class="btn-primary" style="padding:0.8rem; font-size:0.9rem; border-radius:14px; width:100%; box-shadow:0 4px 15px rgba(26,96,50,0.2);" onclick="window.mgrConfirmBooking('${b.id}')">Confirm Booking</button><button class="btn-outline" style="padding:0.8rem; font-size:0.9rem; border-radius:14px; width:100%; border-color:#e74c3c; color:#e74c3c;" onclick="window.mgrCancelBooking('${b.id}')">Cancel Booking</button></div>` : '<div style="color:#bbb; font-size:0.8rem; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; padding:0.5rem;">✅ Processed</div>'}</td>
                                    </tr>
                                    `;
                                }).join('');
                            })()}
                        </tbody>
                    </table>
                </div>
                ${(() => {
                    if (totalBookingsPages <= 1) return '';
                    let btns = '';
                    for (let i = 1; i <= totalBookingsPages; i++) {
                        btns += `<button onclick="window.setMgrBookingPage(${i})" style="width:36px; height:36px; border-radius:10px; border:1px solid ${bookingsPage === i ? 'var(--color-primary)' : '#ddd'}; background:${bookingsPage === i ? 'var(--color-primary)' : 'white'}; color:${bookingsPage === i ? 'white' : '#666'}; font-weight:700; cursor:pointer; transition:all 0.2s;">${i}</button>`;
                    }
                    return `
                    <div style="display:flex; justify-content:center; gap:0.4rem; margin-top:2rem;">
                        <button onclick="window.setMgrBookingPage(${bookingsPage - 1})" ${bookingsPage === 1 ? 'disabled' : ''} style="padding:0 0.7rem; height:32px; border-radius:8px; border:1px solid #ddd; background:white; color:#666; font-weight:700; cursor:pointer; opacity:${bookingsPage === 1 ? 0.5 : 1}">‹</button>
                        ${btns}
                        <button onclick="window.setMgrBookingPage(${bookingsPage + 1})" ${bookingsPage === totalBookingsPages ? 'disabled' : ''} style="padding:0 0.7rem; height:32px; border-radius:8px; border:1px solid #ddd; background:white; color:#666; font-weight:700; cursor:pointer; opacity:${bookingsPage === totalBookingsPages ? 0.5 : 1}">›</button>
                    </div>`;
                })()}

        `;
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

                        <!-- Amenities -->
                        <div>
                            <label style="display:block; font-weight:700; font-size:0.8rem; margin-bottom:1rem; color:var(--color-primary);">✨ AMENITIES</label>
                            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:1rem; background:#f9f9f9; padding:1.5rem; border-radius:20px;">
                                ${['WiFi', 'Pool', 'Spa', 'Breakfast', 'Parking', 'Gym', 'AC', 'Bar'].map(a => `
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
                    <div style="background:white; border-radius:24px; overflow:hidden; box-shadow:var(--shadow-lg); border:1px solid #eee;">
                        <img src="${myHotel.image || ''}" style="width:100%; height:180px; object-fit:cover;">
                        <div style="padding:1.5rem;">
                            <div style="font-weight:800; font-size:1.25rem; color:var(--color-primary); margin-bottom:0.3rem;">${myHotel.title}</div>
                            <div style="font-size:0.85rem; color:#666; margin-bottom:1rem; display:flex; align-items:center; gap:0.4rem;">📍 ${myHotel.address || 'Location Pending'}</div>
                            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                                <div style="font-weight:900; font-size:1.4rem;">${myHotel.price} <span style="font-size:0.8rem; font-weight:500;">BR / night</span></div>
                                <div style="color:${myHotel.availableRooms > 0 ? '#28a745':'#dc3545'}; font-weight:800; font-size:0.85rem;">
                                    ${myHotel.availableRooms > 0 ? `${myHotel.availableRooms} Rooms Left` : 'FULLY BOOKED'}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:1.5rem; background:#fff8e1; border-radius:16px; padding:1.2rem; border:1px solid #ffe082; display:flex; align-items:center; gap:0.8rem;">
                         <span style="font-size:1.5rem;">💡</span>
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
