// --- GLOBAL NAVIGATION HELPER (STABLE) ---
window.michuFinalNav = (pId, binVal, boutVal, totalStr) => {
    if (!binVal || !boutVal) {
        window.showToast("Please select stay dates!");
        return;
    }

    // Guard: Room selection is required if the hotel offers multiple room types
    if (window._michuCurrentHotelHasRooms) {
        const hasSelection = window._selectedRooms && window._selectedRooms.some(r => r.roomCount > 0);
        if (!hasSelection) {
            window.showToast("Please select at least one room first!");
            return;
        }
    }

    // Block booking if hotel is fully booked
    if (window._michuCurrentHotelFullyBooked) {
        const lang = localStorage.getItem('michuLang') || 'en';
        const msgs = {
            en: "🚫 This hotel is currently fully booked. Please check back later or try another property.",
            am: "🚫 ይህ ሆቴል በአሁኑ ጊዜ ሙሉ በሙሉ ተይዟል። እባክዎ ወደፊት ይመልከቱ ወይም ሌላ ንብረት ይሞክሩ።",
            om: "🚫 Hoteelli kun yeroo ammaa guutummaatti qabameera. Maaloo booda deebi'aatii ilaalaa ykn qabeenya biraa yaalaa."
        };
        window.showAlert ? window.showAlert(msgs[lang] || msgs.en) : alert(msgs[lang] || msgs.en);
        return;
    }

    const reserveBtn = document.getElementById('final-reserve-trigger');
    if (reserveBtn) {
        reserveBtn.innerText = "⏳ Redirecting...";
        reserveBtn.style.opacity = "0.7";
    }

    console.log("NAVIGATING TO BOOKING:", pId);

    // Clean total string (remove ' Birr' and commas)
    const tAmt = totalStr ? totalStr.replace(/[^0-9]/g, '') : '';

    // Encode the full multi-room selection as JSON
    const activeRooms = (window._selectedRooms || []).filter(r => r.roomCount > 0);
    const roomsParam = activeRooms.length > 0 ? encodeURIComponent(JSON.stringify(activeRooms)) : '';

    // For backward compatibility also keep a single roomTypeId (first selected room)
    const firstRoom = activeRooms[0];
    const rId = firstRoom ? firstRoom.roomId : '';

    const query = `id=${pId}&checkIn=${binVal}&checkOut=${boutVal}${tAmt ? `&totalAmount=${tAmt}` : ''}${rId ? `&roomTypeId=${rId}` : ''}${roomsParam ? `&selectedRooms=${roomsParam}` : ''}`;
    window.location.hash = `#booking?${query}`;

    // Safety Fallback: if nothing happens in 800ms, try direct navigate
    setTimeout(() => {
        if (document.getElementById('final-reserve-trigger')) {
            window.router.navigate('booking', { id: pId, checkIn: binVal, checkOut: boutVal, totalAmount: tAmt, roomTypeId: rId, selectedRooms: roomsParam });
        }
    }, 800);
};

window.router.addRoute('hotel_detail_view', async (container, params) => {
    const id = params.id;
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading...</div>`;
    
    const hotel = await window.db.getPropertyById(id, false);
    if (!hotel) {
        container.innerHTML = `<div class="container" style="padding:4rem;text-align:center;">Property not found.</div>`;
        return;
    }

    const allImages = hotel.images || [hotel.image, ...(hotel.extraImages || [])].filter(Boolean);
    const amenities = hotel.amenities || [];
    const videoUrl = hotel.videoTour || '';
    let reviews = [], avgRating = 0, reviewCount = 0;
    let cAvg = '—', lAvg = '—', sAvg = '—', vAvg = '—', cSum = 0, lSum = 0, sSum = 0, vSum = 0;
    try {
        if (window.db && window.db.cache && window.db.cache.reviews && window.db.cache.reviews[id]) {
            reviews = window.db.cache.reviews[id].data || [];
        } else {
            const stored = localStorage.getItem('michu_reviews_cache_' + id);
            if (stored) reviews = JSON.parse(stored).data || [];
        }
        if (reviews.length > 0) {
            avgRating = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
            reviewCount = reviews.length;
            reviews.forEach(r => {
                const sub = r.subRatings || { cleanliness: r.rating, location: r.rating, service: r.rating, value: r.rating };
                cSum += Number(sub.cleanliness || r.rating);
                lSum += Number(sub.location || r.rating);
                sSum += Number(sub.service || r.rating);
                vSum += Number(sub.value || r.rating);
            });
            cAvg = (cSum / reviewCount).toFixed(1);
            lAvg = (lSum / reviewCount).toFixed(1);
            sAvg = (sSum / reviewCount).toFixed(1);
            vAvg = (vSum / reviewCount).toFixed(1);
        }
    } catch(e) {}
    window._hotelReviews = reviews;
    window._currentReviewFilter = 'all';

    const currentPrice = Number(String(hotel.price || 0).replace(/[^\d.-]/g, ''));
    let dPct = Number(hotel.discountPercent || hotel.discount || 0);
    let origPrice = hotel.originalPrice ? Number(String(hotel.originalPrice).replace(/[^\d.-]/g, '')) : 0;
    if (dPct > 0 && (!origPrice || origPrice <= currentPrice)) {
        origPrice = Math.round(currentPrice / (1 - (dPct / 100)));
    }

    const amenitiesIcons = {
        'WiFi': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
        'Pool': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6 0 1.2-.2 1.7-.6.9-.8 2.2-.8 3.1 0 .5.4 1.1.6 1.7.6.6 0 1.2-.2 1.7-.6.9-.8 2.2-.8 3.1 0 .5.4 1.1.6 1.7.6.6 0 1.2-.2 1.7-.6.9-.8 2.2-.8 3.1 0 .5.4 1.1.6 1.7.6"/><path d="M2 12c.6 0 1.2-.2 1.7-.6.9-.8 2.2-.8 3.1 0 .5.4 1.1.6 1.7.6.6 0 1.2-.2 1.7-.6.9-.8 2.2-.8 3.1 0 .5.4 1.1.6 1.7.6.6 0 1.2-.2 1.7-.6.9-.8 2.2-.8 3.1 0 .5.4 1.1.6 1.7.6"/><path d="M2 18c.6 0 1.2-.2 1.7-.6.9-.8 2.2-.8 3.1 0 .5.4 1.1.6 1.7.6.6 0 1.2-.2 1.7-.6.9-.8 2.2-.8 3.1 0 .5.4 1.1.6 1.7.6.6 0 1.2-.2 1.7-.6.9-.8 2.2-.8 3.1 0 .5.4 1.1.6 1.7.6"/></svg>',
        'Spa': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
        'Breakfast': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
        'Parking': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>',
        'Gym': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11"></path><path d="M21 21l-1-1"></path><path d="M3 3l1 1"></path><path d="M18 22l4-4"></path><path d="M2 6l4-4"></path><path d="M3 10l7-7"></path><path d="M14 21l7-7"></path></svg>',
        'AC': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><line x1="22" x2="2" y1="12" y2="12"/><line x1="19.07" x2="4.93" y1="4.93" y2="19.07"/><line x1="19.07" x2="4.93" y1="19.07" y2="4.93"/></svg>',
        'Bar': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"></path><path d="M12 15v7"></path><path d="M12 15l-8-8V2h16v5z"></path></svg>',
        'TV': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>',
        'Kitchen': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
        'Workspace': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/></svg>',
        'Balcony': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4h3a2 2 0 0 1 2 2v14"/><path d="M2 20h3"/><path d="M13 20h9"/><path d="M10 12v.01"/><path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z"/></svg>'
    };

    const isManager = window.auth.currentUser && window.auth.currentUser.uid === hotel.managerId;
    
    // Track fully booked status for reserve button blocking
    const isFullyBooked = (hotel.availableRooms !== undefined && hotel.availableRooms !== null && hotel.availableRooms <= 0);
    window._michuCurrentHotelFullyBooked = isFullyBooked;
    window._selectedPackageIndex = null;

    const activeRoomTypes = (hotel.roomTypes || []).filter(r => r.isActive !== false);
    const hasRoomTypes = activeRoomTypes.length > 0;
    window._michuCurrentHotelHasRooms = hasRoomTypes;

    // Multi-room selection state: array of { roomId, roomCount, adults, children }
    window._selectedRooms = [];
    // Keep legacy for any code that reads it
    window._selectedRoomTypeId = null;

    container.innerHTML = `
        <div class="container" style="padding-top:1.5rem; padding-bottom:5rem;">
            <!-- Header -->
            <div style="margin-bottom:1.5rem; color:#64748b; font-size:0.9rem;">
                <span style="cursor:pointer;" onclick="router.navigate('home')">Home</span> / <strong>${hotel.title}</strong>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                   <h1 style="margin:0; font-size:2.2rem; color:var(--color-primary); letter-spacing:-0.5px;">${hotel.title}</h1>
                   <p style="margin:0.2rem 0 0; color:#64748b; font-weight:600;">📍 ${hotel.address}</p>
                </div>
                <button id="header-book-btn" onclick="document.getElementById('book-in').scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('book-in').focus();" class="btn-primary" style="padding:0.9rem 2rem; border-radius:16px; font-weight:800; font-size:1rem; background:linear-gradient(135deg,var(--color-primary),#1e7e34); box-shadow:0 8px 20px rgba(11,102,70,0.25); white-space:nowrap; display:flex; align-items:center; gap:0.5rem; animation:headerBookPulse 2s ease-in-out infinite;">
                    <svg width="18" height="18" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Book Now
                </button>
            </div>

            <style>
                .detail-gallery-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.8rem; height: 450px; margin-bottom: 2.5rem; border-radius:24px; overflow:hidden; }
                .detail-content-grid { display: grid; grid-template-columns: 1.8fr 1fr; gap: 3rem; align-items: start; }
                @keyframes headerBookPulse { 0%,100%{box-shadow:0 8px 20px rgba(11,102,70,0.25)} 50%{box-shadow:0 8px 30px rgba(11,102,70,0.45)} }
                #mobile-book-bar { display:none; }
                .booking-offers-mobile-wrapper { display: none; }
                @media(max-width: 768px) {
                    .detail-gallery-grid { grid-template-columns: 1fr; height: 260px; }
                    .detail-gallery-grid > div:not(:first-child) { display: none; }
                    .detail-content-grid { display: flex; flex-direction: column; gap: 2rem; }
                    #main-side { display: contents; }
                    .desktop-only-sidebar { display: none !important; }
                    .desktop-packages-section { display: none !important; }
                    .booking-offers-mobile-wrapper { display: flex; }
                    .mobile-order-1 { order: 1; }
                    .mobile-order-2 { order: 2; }
                    .mobile-order-3 { order: 3; }
                    .mobile-order-4 { order: 4; }
                    .mobile-order-5 { order: 5; }
                    #header-book-btn { display:none !important; }
                    #mobile-book-bar { 
                        display:none !important; 
                    }
                    @keyframes slideUpIn { from{transform:translateY(100%)} to{transform:translateY(0)} }
                    .mobile-book-pulse { animation: mobilePulse 2s infinite; }
                    @keyframes mobilePulse { 0%{box-shadow:0 0 0 0 rgba(11,110,79,0.4)} 70%{box-shadow:0 0 0 15px rgba(11,110,79,0)} 100%{box-shadow:0 0 0 0 rgba(11,110,79,0)} }
                }
            </style>

            <div class="detail-gallery-grid">
                <div style="background:url('${allImages[0]}') center/cover; cursor:pointer;" onclick="viewFullGallery(0)"></div>
                <div style="background:url('${allImages[1] || allImages[0]}') center/cover;" onclick="viewFullGallery(1)"></div>
                <div style="background:url('${allImages[2] || allImages[0]}') center/cover; position:relative; cursor:pointer;" onclick="viewFullGallery(2)">
                    ${allImages.length > 3 ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:white; font-size:1.8rem; font-weight:800;">+${allImages.length-3}</div>` : ''}
                </div>
            </div>

            <div class="detail-content-grid">
                <div id="main-side">
                    ${videoUrl ? `<video class="mobile-order-1" controls style="width:100%; border-radius:20px; margin-bottom:2rem; box-shadow:0 10px 30px rgba(0,0,0,0.1);"><source src="${videoUrl}" type="video/mp4"></video>` : ''}
                    
                    <section class="mobile-order-2" style="margin-bottom:2.5rem; padding-bottom:1.5rem; border-bottom:1px solid #f1f5f9;">
                         <h2 style="margin-bottom:0.8rem; font-size:1.5rem;">The Experience</h2>
                         <div id="hotel-desc-container" class="collapsible-text">
                            <p style="line-height:1.7; color:#334155; white-space:pre-wrap; font-size:1.05rem; margin:0;">${hotel.description}</p>
                            <div class="collapsible-overlay"></div>
                         </div>
                         <div id="read-more-trigger" class="read-more-btn" onclick="window.toggleMichuDesc()">
                            <span>Read More</span>
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>
                          </div>
                     </section>

                    <!-- ROOM SELECTION SECTION -->
                    ${hasRoomTypes ? `
                    <style>
                        .michu-room-card { background:white; border:2px solid #e2e8f0; border-radius:24px; overflow:hidden; transition:all 0.35s cubic-bezier(0.4,0,0.2,1); box-shadow:0 2px 12px rgba(0,0,0,0.04); }
                        .michu-room-card.selected { border-color:var(--color-primary); box-shadow:0 10px 30px rgba(11,110,79,0.12); }
                        .michu-room-card.fully-booked { opacity:0.62; filter:grayscale(0.35); }
                        .michu-room-card-top { display:flex; flex-wrap:wrap; justify-content:space-between; gap:1rem; align-items:flex-start; padding:1.2rem; cursor:pointer; }
                        .michu-room-card.fully-booked .michu-room-card-top { cursor:not-allowed; }
                        .michu-room-stepper-panel { background:linear-gradient(135deg,#f0fdf6,#f8fafc); border-top:1.5px solid #e2e8f0; padding:1.2rem 1.5rem; display:none; flex-direction:column; gap:1rem; animation:stepperSlideIn 0.3s ease; }
                        .michu-room-card.selected .michu-room-stepper-panel { display:flex; }
                        @keyframes stepperSlideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
                        .michu-stepper-row { display:flex; align-items:center; justify-content:space-between; }
                        .michu-stepper-label { font-size:0.82rem; font-weight:800; color:#334155; display:flex; align-items:center; gap:0.4rem; }
                        .michu-stepper { display:flex; align-items:center; gap:0; background:white; border:1.5px solid #e2e8f0; border-radius:12px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.04); }
                        .michu-stepper-btn { width:34px; height:34px; border:none; background:transparent; font-size:1.2rem; font-weight:900; color:#0b6e4f; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.15s; line-height:1; }
                        .michu-stepper-btn:hover:not(:disabled) { background:#ecfdf5; }
                        .michu-stepper-btn:disabled { color:#cbd5e1; cursor:default; }
                        .michu-stepper-val { min-width:32px; text-align:center; font-size:1rem; font-weight:900; color:#0f172a; padding:0 4px; border-left:1px solid #e2e8f0; border-right:1px solid #e2e8f0; }
                        .michu-room-qty-badge { position:absolute; top:-8px; right:-8px; background:var(--color-primary); color:white; width:22px; height:22px; border-radius:50%; font-size:0.7rem; font-weight:900; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 6px rgba(11,110,79,0.3); animation:popIn 0.25s ease; }
                        @keyframes popIn { from{transform:scale(0)} to{transform:scale(1)} }
                        .michu-add-room-btn { padding:0.55rem 1.3rem; border-radius:12px; font-size:0.82rem; font-weight:800; text-align:center; min-width:110px; border:2px solid var(--color-primary); background:transparent; color:var(--color-primary); cursor:pointer; transition:all 0.2s; white-space:nowrap; }
                        .michu-add-room-btn:hover { background:var(--color-primary); color:white; }
                        .michu-add-room-btn.active { background:var(--color-primary); color:white; }
                        .michu-room-price-subtotal { font-size:0.75rem; color:var(--color-primary); font-weight:800; text-align:right; margin-top:0.3rem; min-height:1.1em; }
                        @media (max-width: 480px) {
                            .michu-room-card-top { flex-direction: column !important; padding: 1.2rem !important; align-items: stretch !important; gap: 1.2rem !important; }
                            .michu-room-card-top > div:first-child { width: 100% !important; gap: 0.8rem !important; }
                            .michu-room-card-top > div:last-child { flex-direction: row !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; border-top: 1px solid #f1f5f9; padding-top: 1rem; }
                            .michu-room-card-top > div:last-child > div { text-align: left !important; }
                            .michu-room-card-top h3 { font-size: 1.1rem !important; }
                            .michu-room-card-top p { font-size: 0.82rem !important; margin-bottom:0.4rem !important; }
                            .michu-add-room-btn { min-width: 100px !important; padding: 0.6rem 1rem !important; font-size: 0.85rem !important; }
                        }
                    </style>
                    <section class="mobile-order-2" style="margin-bottom:2.5rem; padding-bottom:1.5rem; border-bottom:1px solid #f1f5f9;">
                        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1.2rem; flex-wrap:wrap; gap:0.8rem;">
                            <h2 style="margin:0; font-size:1.5rem; display:flex; align-items:center; gap:0.5rem; color:var(--color-primary); font-weight:800;">
                                <span style="display:flex;align-items:center;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg></span>
                                Choose Your Rooms
                            </h2>
                            <div id="michu-selection-summary-pill" style="display:none; background:#ecfdf5; border:1.5px solid #bbf7d0; padding:0.4rem 1rem; border-radius:99px; font-size:0.78rem; font-weight:800; color:#065f46;"></div>
                        </div>
                        <div id="room-selection-container" style="display:flex; flex-direction:column; gap:1.2rem;">
                            ${activeRoomTypes.map((room) => {
                                const roomId = room.id || `room_${hotel.roomTypes.indexOf(room)}`;
                                const basePrice = Number(String(room.price || 0).replace(/[^\d.-]/g, ''));
                                let discPercent = Number(hotel.discountPercent || hotel.discount || 0);
                                let roomOrigPrice = basePrice;
                                let roomCurrentPrice = basePrice;
                                if (discPercent > 0) {
                                    roomCurrentPrice = basePrice - Math.round(basePrice * (discPercent / 100));
                                } else {
                                    roomOrigPrice = 0;
                                }
                                const isRoomFullyBooked = (room.availableRooms !== undefined && room.availableRooms <= 0);
                                const availableCount = room.availableRooms !== undefined ? room.availableRooms : (room.totalRooms || 10);
                                const maxRooms = Math.min(availableCount, 10);

                                const bedSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`;
                                const guestSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
                                const keySvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
                                const childSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:3px;"><circle cx="12" cy="6" r="3"/><path d="M12 10v5"/><path d="M9 17l3 4 3-4"/><path d="M9 13H6"/><path d="M18 13h-3"/></svg>`;

                                return `
                                <div class="michu-room-card ${isRoomFullyBooked ? 'fully-booked' : ''}" id="room-card-${roomId}" data-room-id="${roomId}">
                                    ${isRoomFullyBooked ? `<div style="position:absolute; top:1rem; right:-2rem; background:#c5221f; color:white; font-size:0.72rem; font-weight:800; padding:0.2rem 2.5rem; transform:rotate(45deg); z-index:5; box-shadow:0 2px 4px rgba(0,0,0,0.2); pointer-events:none;">SOLD OUT</div>` : ''}
                                    <div class="michu-room-card-top" onclick="${isRoomFullyBooked ? '' : `window.michuToggleRoom('${roomId}')`}" style="position:relative;">
                                        <div style="display:flex; gap:0.8rem; align-items:flex-start; flex:1; min-width:180px;">
                                            ${room.image ? `<div style="width:70px; height:70px; border-radius:12px; background:url('${room.image}') center/cover; flex-shrink:0; box-shadow:0 4px 12px rgba(0,0,0,0.08);"></div>` : `<div style="width:70px; height:70px; border-radius:12px; background:linear-gradient(135deg,#ecfdf5,#d1fae5); display:flex; align-items:center; justify-content:center; flex-shrink:0;"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0b6e4f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg></div>`}
                                            <div style="flex:1; min-width:0;">
                                                <h3 style="margin:0 0 0.3rem; font-size:1.1rem; font-weight:900; color:#0f172a;">${room.name}</h3>
                                                <p style="margin:0 0 0.7rem; font-size:0.82rem; color:#64748b; line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${room.description || 'Premium room with standard amenities included.'}</p>
                                                <div style="display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.75rem; font-weight:700; color:#475569;">
                                                    <span style="background:#f1f5f9; padding:0.25rem 0.55rem; border-radius:8px; display:inline-flex; align-items:center;">${guestSvg} Up to ${room.capacity || 2} guests</span>
                                                    <span style="background:#f1f5f9; padding:0.25rem 0.55rem; border-radius:8px; display:inline-flex; align-items:center;">${bedSvg} ${room.beds || '1 Double Bed'}</span>
                                                    <span style="background:${isRoomFullyBooked ? '#fee2e2' : '#ecfccb'}; padding:0.25rem 0.55rem; border-radius:8px; display:inline-flex; align-items:center; color:${isRoomFullyBooked ? '#b91c1c' : '#4d7c0f'}; font-weight:800;">${keySvg} ${isRoomFullyBooked ? 'Sold out' : availableCount + ' left'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.4rem; min-width:120px; flex-shrink:0;">
                                            <div style="text-align:right;">
                                                ${roomOrigPrice > roomCurrentPrice ? `<div style="text-decoration:line-through; color:#94a3b8; font-size:0.75rem; font-weight:600; line-height:1;">${roomOrigPrice.toLocaleString()} Birr</div>` : ''}
                                                <div style="font-size:1.25rem; font-weight:900; color:${isRoomFullyBooked ? '#94a3b8' : 'var(--color-primary)'}; line-height:1.1;">${roomCurrentPrice.toLocaleString()}</div>
                                                <div style="font-size:0.7rem; color:#94a3b8; font-weight:700;">Birr / night</div>
                                            </div>
                                            ${isRoomFullyBooked ? `<span style="padding:0.45rem 1rem; border-radius:10px; font-size:0.78rem; font-weight:800; background:#f1f5f9; color:#94a3b8; border:1.5px solid #e2e8f0;">Sold Out</span>` : `<button class="michu-add-room-btn" id="add-btn-${roomId}" onclick="event.stopPropagation(); window.michuToggleRoom('${roomId}')">+ Add Room</button>`}
                                            <div id="room-subtotal-${roomId}" class="michu-room-price-subtotal"></div>
                                        </div>
                                    </div>
                                    <!-- STEPPER PANEL (shown when selected) -->
                                    <div class="michu-room-stepper-panel" id="stepper-panel-${roomId}">
                                        <!-- Row 1: Rooms count -->
                                        <div class="michu-stepper-row">
                                            <div class="michu-stepper-label">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
                                                Rooms
                                            </div>
                                            <div class="michu-stepper">
                                                <button class="michu-stepper-btn" id="rooms-dec-${roomId}" onclick="window.michuStepRooms('${roomId}', -1)" disabled>−</button>
                                                <div class="michu-stepper-val" id="rooms-val-${roomId}">1</div>
                                                <button class="michu-stepper-btn" id="rooms-inc-${roomId}" onclick="window.michuStepRooms('${roomId}', 1)" ${maxRooms <= 1 ? 'disabled' : ''}>+</button>
                                            </div>
                                        </div>
                                        <!-- Row 2: Adults -->
                                        <div class="michu-stepper-row">
                                            <div class="michu-stepper-label">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                                Adults
                                                <span style="font-size:0.7rem; color:#94a3b8; font-weight:600;">(12+ yrs)</span>
                                            </div>
                                            <div class="michu-stepper">
                                                <button class="michu-stepper-btn" id="adults-dec-${roomId}" onclick="window.michuStepAdults('${roomId}', -1)" disabled>−</button>
                                                <div class="michu-stepper-val" id="adults-val-${roomId}">1</div>
                                                <button class="michu-stepper-btn" id="adults-inc-${roomId}" onclick="window.michuStepAdults('${roomId}', 1)">+</button>
                                            </div>
                                        </div>
                                        <!-- Row 3: Children -->
                                        <div class="michu-stepper-row">
                                            <div class="michu-stepper-label">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="3"/><path d="M12 10v5"/><path d="M9 17l3 4 3-4"/><path d="M9 13H6"/><path d="M18 13h-3"/></svg>
                                                Children
                                                <span style="font-size:0.7rem; color:#94a3b8; font-weight:600;">(0–11 yrs)</span>
                                            </div>
                                            <div class="michu-stepper">
                                                <button class="michu-stepper-btn" id="children-dec-${roomId}" onclick="window.michuStepChildren('${roomId}', -1)" disabled>−</button>
                                                <div class="michu-stepper-val" id="children-val-${roomId}">0</div>
                                                <button class="michu-stepper-btn" id="children-inc-${roomId}" onclick="window.michuStepChildren('${roomId}', 1)">+</button>
                                            </div>
                                        </div>
                                        <!-- Remove Room link -->
                                        <div style="text-align:right;">
                                            <button onclick="window.michuToggleRoom('${roomId}')" style="background:none; border:none; color:#ef4444; font-size:0.78rem; font-weight:800; cursor:pointer; display:inline-flex; align-items:center; gap:0.3rem; padding:0.3rem 0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg> Remove this room</button>
                                        </div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </section>
                    ` : ''}

                    <!-- SPECIAL PACKAGES (Desktop View) -->
                    ${hotel.packages && hotel.packages.length > 0 ? `
                    <section class="mobile-order-4 desktop-packages-section" style="margin-bottom:3.5rem; background: linear-gradient(135deg, #ffffff 0%, #fffbf2 100%); padding:2.5rem; border-radius:32px; border:2px solid rgba(217,119,6,0.15); box-shadow: 0 20px 50px rgba(217,119,6,0.08); position:relative; overflow:hidden;">
                        <div style="position:absolute; top:-50px; right:-50px; width:150px; height:150px; background:rgba(217,119,6,0.03); border-radius:50%;"></div>
                        <h2 style="margin-bottom:1.5rem; display:flex; align-items:center; gap:0.8rem; color:#d97706; font-size:1.4rem; font-weight:950; text-transform:uppercase; letter-spacing:0.5px;">
                            <span style="background:#d97706; color:white; width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(217,119,6,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg></span> 
                            Exclusive Offers
                        </h2>
                        <div class="mobile-package-carousel" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:2rem;">
                            ${hotel.packages.map((pkg, idx) => `
                                <div class="pkg-card" onclick="window.applyMichuPkg(${idx})" 
                                     style="background:white; border:1px solid rgba(217,119,6,0.1); border-radius:26px; padding:1.8rem; cursor:pointer; position:relative; transition:all 0.4s ease; box-shadow:0 10px 20px rgba(0,0,0,0.03);">
                                    <div style="background:linear-gradient(90deg, #fff7ed 0%, #ffedd5 100%); color:#ea580c; font-weight:950; font-size:0.7rem; padding:0.5rem 1rem; border-radius:99px; display:inline-flex; align-items:center; gap:0.4rem; margin-bottom:1.2rem; text-transform:uppercase; border:1px solid rgba(234,88,12,0.1); box-shadow:0 2px 8px rgba(234,88,12,0.05);">
                                        <span style="font-size:0.9rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></span> ${pkg.nights} Night Bundle
                                    </div>
                                    <h3 style="margin:0 0 0.6rem; font-size:1.35rem; font-weight:900; color:#1e293b;">${pkg.title}</h3>
                                    <p style="font-size:0.95rem; line-height:1.6; color:#64748b; margin-bottom:1.8rem; height:45px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${pkg.services || 'Inclusive premium amenities.'}</p>
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1.5rem; border-top:1.5px solid #f1f5f9;">
                                        <div style="display:flex; flex-direction:column;">
                                            <span style="color:#d97706; font-weight:950; font-size:1.6rem; line-height:1;">${pkg.discount}% OFF</span>
                                            <span style="font-size:0.65rem; color:#94a3b8; font-weight:700; margin-top:0.3rem;">LIMITED TIME DEAL</span>
                                        </div>
                                        <span class="btn-primary pkg-select-btn" id="desktop-pkg-btn-${idx}" style="padding:0.8rem 1.8rem; border-radius:16px; font-size:0.9rem; font-weight:800; background:linear-gradient(135deg, #0b6646 0%, #15803d 100%); box-shadow:0 6px 15px rgba(11,102,70,0.25);">Select Bundle</span>
                                    </div>
                                    <!-- Decorative glow -->
                                    <div style="position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:60%; height:2px; background:linear-gradient(90deg, transparent, rgba(217,119,6,0.3), transparent); opacity:0.5;"></div>
                                </div>`).join('')}
                        </div>
                    </section>` : ''}

                    <section class="mobile-order-5">
                         <h2 style="margin-bottom:1.5rem; font-size:1.5rem;">Property Amenities</h2>
                         <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:0.5rem;">
                            ${amenities.map(a => `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; background:white; padding:1rem 0.3rem; border-radius:14px; border:1px solid #f1f5f9;">
                                <span style="font-size:1.8rem; margin-bottom:0.5rem;">${amenitiesIcons[a] || '✨'}</span>
                                <span style="font-weight:700; font-size:0.85rem; color:#334155; word-wrap:break-word;">${a}</span>
                            </div>`).join('')}
                         </div>
                    </section>
                </div>

                <div class="desktop-sidebar desktop-only-sidebar mobile-order-3" style="position: sticky; top: 2rem;">
                    <div class="sidebar-card" style="background:white; padding:1.8rem; border:1px solid #eee; border-radius:28px; box-shadow:0 20px 40px rgba(0,0,0,0.06);">
                        <div class="sidebar-price-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                             <div>
                                <span class="sidebar-price-val-desktop" style="font-size:1.9rem; font-weight:950; color:#d97706;">${currentPrice.toLocaleString()} Birr</span>
                                <span style="color:#64748b; font-weight:600;">/ night</span>
                             </div>
                             <div class="sidebar-rating-badge-update" style="background:#fff7ed; color:#ea580c; padding:0.5rem 0.9rem; border-radius:14px; font-weight:900;">★ ${avgRating || 'New'}</div>
                        </div>

                        <div class="sidebar-dates-grid" style="border:2px solid #f1f5f9; border-radius:18px; overflow:hidden; margin-bottom:1.8rem;">
                             <div style="display:grid; grid-template-columns:1fr 1fr;">
                                <div style="padding:1rem; border-right:1px solid #f1f5f9;">
                                    <label style="display:block; font-size:0.65rem; font-weight:900; color:#94a3b8; text-transform:uppercase;">Check-in</label>
                                    <input type="date" id="book-in" style="border:none; width:100%; font-weight:800; background:transparent; outline:none;">
                                </div>
                                <div style="padding:1rem;">
                                    <label style="display:block; font-size:0.65rem; font-weight:900; color:#94a3b8; text-transform:uppercase;">Check-out</label>
                                    <input type="date" id="book-out" style="border:none; width:100%; font-weight:800; background:transparent; outline:none;">
                                </div>
                             </div>
                        </div>

                        ${isFullyBooked ? `
                        <button class="btn-primary final-reserve-trigger" 
                                style="width:100%; padding:1.5rem; font-size:1.3rem; border-radius:20px; font-weight:950; background:#c5221f; box-shadow:0 12px 24px rgba(197,34,31,0.25); cursor:not-allowed; opacity:0.9;"
                                onclick="const tEl=document.querySelector('.final-total-val'); window.michuFinalNav('${id}', document.getElementById('book-in').value || document.getElementById('book-in-mobile').value, document.getElementById('book-out').value || document.getElementById('book-out-mobile').value, tEl?tEl.innerText:'')">
                           Fully Booked
                        </button>
                        ` : `
                        <button class="btn-primary final-reserve-trigger" 
                                style="width:100%; padding:1.5rem; font-size:1.3rem; border-radius:20px; font-weight:950; background:linear-gradient(135deg, var(--color-primary), #1e7e34); box-shadow:0 12px 24px rgba(11,102,70,0.25);"
                                onclick="const tEl=document.querySelector('.final-total-val'); window.michuFinalNav('${id}', document.getElementById('book-in').value || document.getElementById('book-in-mobile').value, document.getElementById('book-out').value || document.getElementById('book-out-mobile').value, tEl?tEl.innerText:'')">
                           Reserve Now
                        </button>
                        `}
                        <div class="price-summary-area" style="margin-top:1.8rem;"></div>
                    </div>
                </div>

                <!-- MOBILE CAROUSEL WRAPPER (Reserve Now Card + Packages Trigger Button) -->
                <div class="booking-offers-mobile-wrapper mobile-order-3">
                    <div class="desktop-sidebar" style="width:100%;">
                        <div class="sidebar-card" style="background:white; padding:1.2rem; border:1px solid rgba(11,110,79,0.15); border-radius:16px; box-shadow:0 10px 25px rgba(11,110,79,0.08); background:linear-gradient(135deg, #ffffff 0%, #f8fdfa 100%);">
                            <div class="sidebar-price-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                                 <div>
                                    <span class="sidebar-price-val-mobile" style="font-size:1.35rem; font-weight:950; color:#d97706;">${currentPrice.toLocaleString()} Birr</span>
                                    <span style="color:#64748b; font-weight:600; font-size:0.85rem;">/ night</span>
                                 </div>
                                 <div class="sidebar-rating-badge-update" style="background:#fff7ed; color:#ea580c; padding:0.4rem 0.8rem; border-radius:12px; font-weight:900; font-size:0.85rem;">★ ${avgRating || 'New'}</div>
                            </div>

                            <div class="sidebar-dates-grid" style="border:1.5px solid #f1f5f9; border-radius:14px; overflow:hidden; margin-bottom:1.2rem;">
                                 <div style="display:grid; grid-template-columns:1fr 1fr;">
                                    <div style="padding:0.6rem 0.8rem; border-right:1px solid #f1f5f9;">
                                        <label style="display:block; font-size:0.65rem; font-weight:900; color:#94a3b8; text-transform:uppercase;">Check-in</label>
                                        <input type="date" id="book-in-mobile" style="border:none; width:100%; font-size:0.85rem; font-weight:800; background:transparent; outline:none;">
                                    </div>
                                    <div style="padding:0.6rem 0.8rem;">
                                        <label style="display:block; font-size:0.65rem; font-weight:900; color:#94a3b8; text-transform:uppercase;">Check-out</label>
                                        <input type="date" id="book-out-mobile" style="border:none; width:100%; font-size:0.85rem; font-weight:800; background:transparent; outline:none;">
                                    </div>
                                 </div>
                            </div>

                            ${isFullyBooked ? `
                            <button class="btn-primary final-reserve-trigger" 
                                    style="width:100%; padding:0.85rem; font-size:1.05rem; border-radius:14px; font-weight:950; background:#c5221f; box-shadow:0 6px 15px rgba(197,34,31,0.25); cursor:not-allowed; opacity:0.9;"
                                    onclick="const tEl=document.querySelector('.final-total-val'); window.michuFinalNav('${id}', document.getElementById('book-in-mobile').value || document.getElementById('book-in').value, document.getElementById('book-out-mobile').value || document.getElementById('book-out').value, tEl?tEl.innerText:'')">
                                Fully Booked
                            </button>
                            ` : `
                            <button class="btn-primary final-reserve-trigger" 
                                    style="width:100%; padding:0.85rem; font-size:1.05rem; border-radius:14px; font-weight:950; background:linear-gradient(135deg, var(--color-primary), #1e7e34); box-shadow:0 6px 15px rgba(11,102,70,0.25);"
                                    onclick="const tEl=document.querySelector('.final-total-val'); window.michuFinalNav('${id}', document.getElementById('book-in-mobile').value || document.getElementById('book-in').value, document.getElementById('book-out-mobile').value || document.getElementById('book-out').value, tEl?tEl.innerText:'')">
                                Reserve Now
                            </button>
                            `}
                            
                            <div class="price-summary-area" style="margin-top:1.2rem;"></div>
                        </div>

                        ${hotel.packages && hotel.packages.length > 0 ? `
                        <div style="margin-top:1rem;">
                            <button onclick="document.getElementById('mobile-packages-modal').classList.add('active')" 
                                    style="width:100%; padding:0.9rem; background:linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border:1px solid rgba(217,119,6,0.3); border-radius:20px; color:#ea580c; font-weight:900; font-size:0.95rem; display:flex; align-items:center; justify-content:center; gap:0.5rem; box-shadow:0 6px 16px rgba(217,119,6,0.15); cursor:pointer;">
                                <span style="display:inline-flex;align-items:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8v12"/><path d="M19 8V5c0-1.1-.9-2-2-2H7C5.9 3 5 3.9 5 5v3"/><path d="M12 3h0a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3Z"/></svg></span> View ${hotel.packages.length} Exclusive Packages
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- MOBILE PACKAGES MODAL SHEET -->
                ${hotel.packages && hotel.packages.length > 0 ? `
                <div id="mobile-packages-modal" class="mobile-packages-sheet" onclick="if(event.target===this) this.classList.remove('active')">
                    <div class="sheet-content">
                        <div class="sheet-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid #f1f5f9;">
                            <div>
                                <h3 style="margin:0; font-size:1.3rem; font-weight:900; color:#1e293b;">Exclusive Packages</h3>
                                <span style="font-size:0.75rem; color:#64748b;">Special bundled offers for your stay</span>
                            </div>
                            <button onclick="document.getElementById('mobile-packages-modal').classList.remove('active')" style="background:#f1f5f9; border:none; width:36px; height:36px; border-radius:50%; font-size:1.2rem; font-weight:bold; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
                        </div>
                        <div class="sheet-body" style="display:flex; flex-direction:column; gap:1rem; max-height:70vh; overflow-y:auto; padding-right:0.5rem;">
                            ${hotel.packages.map((pkg, idx) => `
                                <div class="pkg-card-modal" onclick="document.getElementById('mobile-packages-modal').classList.remove('active'); window.applyMichuPkg(${idx})" 
                                     style="background:linear-gradient(135deg, #ffffff 0%, #fffbf2 100%); border:1px solid rgba(217,119,6,0.2); border-radius:20px; padding:1.2rem; cursor:pointer; position:relative; transition:all 0.3s ease; box-shadow:0 10px 25px rgba(217,119,6,0.08);">
                                    <div style="background:linear-gradient(90deg, #fff7ed 0%, #ffedd5 100%); color:#ea580c; font-weight:950; font-size:0.7rem; padding:0.4rem 0.8rem; border-radius:99px; display:inline-flex; align-items:center; gap:0.4rem; margin-bottom:0.8rem; text-transform:uppercase; border:1px solid rgba(234,88,12,0.1);">
                                        <span style="font-size:0.85rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></span> ${pkg.nights} Night Bundle
                                    </div>
                                    <h4 style="margin:0 0 0.4rem; font-size:1.15rem; font-weight:900; color:#1e293b;">${pkg.title}</h4>
                                    <p style="font-size:0.85rem; line-height:1.4; color:#64748b; margin-bottom:1.2rem;">${pkg.services || 'Inclusive premium amenities.'}</p>
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1.2rem; border-top:1.5px solid #f1f5f9;">
                                        <div style="display:flex; flex-direction:column;">
                                            <span style="color:#d97706; font-weight:950; font-size:1.35rem; line-height:1;">${pkg.discount}% OFF</span>
                                            <span style="font-size:0.65rem; color:#94a3b8; font-weight:700; margin-top:0.3rem;">LIMITED TIME DEAL</span>
                                        </div>
                                        <span class="btn-primary pkg-select-btn" id="mobile-pkg-btn-${idx}" style="padding:0.7rem 1.4rem; border-radius:14px; font-size:0.85rem; font-weight:800; background:linear-gradient(135deg, #0b6646 0%, #15803d 100%); box-shadow:0 6px 15px rgba(11,102,70,0.25);">Select Bundle</span>
                                    </div>
                                </div>`).join('')}
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- MAP SECTION -->
            <section style="margin-top:4rem; padding-top:3rem; border-top:1px solid #f1f5f9;">
                 <h2 style="margin-bottom:1.5rem; font-size:1.6rem;">Location Map</h2>
                 <div style="width:100%; height:420px; border-radius:28px; overflow:hidden; border:2px solid #f1f5f9;">
                    <iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${encodeURIComponent(hotel.mapQuery || hotel.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed" allowfullscreen></iframe>
                 </div>
            </section>

            <!-- REVIEWS SECTION (Vertical Feed) -->
            <section style="margin-top:4rem; padding-top:3rem; border-top:1px solid #f1f5f9;">
                 <div id="reviews-summary-container">
                     <!-- Rating Summary -->
                     <div style="display:flex; align-items:center; gap:1.5rem; margin-bottom:2rem; flex-wrap:wrap;">
                        <div style="text-align:center;">
                            <div style="font-size:3rem; font-weight:950; color:var(--color-primary); line-height:1;">${avgRating || '—'}</div>
                            <div style="color:#f59e0b; font-size:1.2rem; margin:0.3rem 0;">${'★'.repeat(Math.round(avgRating))}${'☆'.repeat(5-Math.round(avgRating))}</div>
                            <div style="font-size:0.8rem; color:#94a3b8; font-weight:700;">${reviewCount} review${reviewCount!==1?'s':''}</div>
                        </div>
                        <div style="flex:1; min-width:200px;">
                            ${[5,4,3,2,1].map(s => {
                                const cnt = reviews.filter(r=>r.rating===s).length;
                                const pct = reviewCount>0 ? Math.round(cnt/reviewCount*100) : 0;
                                return `<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:4px;">
                                    <span style="font-size:0.75rem;font-weight:700;color:#64748b;width:12px;">${s}</span>
                                    <div style="flex:1;height:8px;background:#f1f5f9;border-radius:99px;overflow:hidden;">
                                        <div style="height:100%;width:${pct}%;background:${s>=4?'#f59e0b':s>=3?'#fbbf24':'#fb923c'};border-radius:99px;transition:width 0.6s;"></div>
                                    </div>
                                    <span style="font-size:0.7rem;color:#94a3b8;width:20px;">${cnt}</span>
                                </div>`;
                            }).join('')}
                        </div>
                     </div>

                     <!-- Sub-Category Summary Grid -->
                     <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1.5rem; margin-bottom:2.5rem; background:#f8fafc; padding:1.8rem; border-radius:24px; border:1px solid #e2e8f0;">
                         <div>
                             <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; margin-bottom:0.5rem; color:#1e293b;"><span style="display:inline-flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/><path d="M5.4 5.4h.01"/><path d="M10.2 3h.01"/><path d="M3 10.2h.01"/><path d="m14 14 6-6"/></svg> Cleanliness</span><span style="color:var(--color-primary);">${cAvg}</span></div>
                             <div style="height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden;"><div style="height:100%; width:${reviewCount > 0 ? (Number(cAvg)/5)*100 : 0}%; background:var(--color-primary); border-radius:99px;"></div></div>
                         </div>
                         <div>
                             <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; margin-bottom:0.5rem; color:#1e293b;"><span style="display:inline-flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Location</span><span style="color:var(--color-primary);">${lAvg}</span></div>
                             <div style="height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden;"><div style="height:100%; width:${reviewCount > 0 ? (Number(lAvg)/5)*100 : 0}%; background:var(--color-primary); border-radius:99px;"></div></div>
                         </div>
                         <div>
                             <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; margin-bottom:0.5rem; color:#1e293b;"><span style="display:inline-flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4 12H2"/><path d="M22 12h-2"/><path d="m19.07 4.93-1.41 1.41"/><path d="m6.34 17.66-1.41 1.41"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M12 6a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6Z"/><path d="M6 16h12"/></svg> Service</span><span style="color:var(--color-primary);">${sAvg}</span></div>
                             <div style="height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden;"><div style="height:100%; width:${reviewCount > 0 ? (Number(sAvg)/5)*100 : 0}%; background:var(--color-primary); border-radius:99px;"></div></div>
                         </div>
                         <div>
                             <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; margin-bottom:0.5rem; color:#1e293b;"><span style="display:inline-flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13"/><path d="M13 3l3 6-4 13"/><path d="M2 9h20"/></svg> Value</span><span style="color:var(--color-primary);">${vAvg}</span></div>
                             <div style="height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden;"><div style="height:100%; width:${reviewCount > 0 ? (Number(vAvg)/5)*100 : 0}%; background:var(--color-primary); border-radius:99px;"></div></div>
                         </div>
                     </div>
                 </div>

                 <!-- Sort & Filter Pills -->
                 <div id="reviews-filter-pills" style="display:flex; gap:0.8rem; margin-bottom:1.5rem; overflow-x:auto; padding-bottom:0.5rem;">
                     <button class="review-filter-pill active" onclick="window.filterMichuReviews('all')" style="padding:0.6rem 1.2rem; border-radius:99px; font-weight:700; font-size:0.85rem; border:1px solid var(--color-primary); background:var(--color-primary); color:white; cursor:pointer; transition:all 0.2s; white-space:nowrap;">All Reviews</button>
                     <button class="review-filter-pill" onclick="window.filterMichuReviews('recent')" style="padding:0.6rem 1.2rem; border-radius:99px; font-weight:700; font-size:0.85rem; border:1px solid #cbd5e1; background:white; color:#475569; cursor:pointer; transition:all 0.2s; white-space:nowrap;">Most Recent</button>
                     <button class="review-filter-pill" onclick="window.filterMichuReviews('high')" style="padding:0.6rem 1.2rem; border-radius:99px; font-weight:700; font-size:0.85rem; border:1px solid #cbd5e1; background:white; color:#475569; cursor:pointer; transition:all 0.2s; white-space:nowrap;">Highest Rated</button>
                     <button class="review-filter-pill" onclick="window.filterMichuReviews('low')" style="padding:0.6rem 1.2rem; border-radius:99px; font-weight:700; font-size:0.85rem; border:1px solid #cbd5e1; background:white; color:#475569; cursor:pointer; transition:all 0.2s; white-space:nowrap;">Lowest Rated</button>
                     <button class="review-filter-pill" onclick="window.filterMichuReviews('photos')" style="padding:0.6rem 1.2rem; border-radius:99px; font-weight:700; font-size:0.85rem; border:1px solid #cbd5e1; background:white; color:#475569; cursor:pointer; transition:all 0.2s; white-space:nowrap;">With Photos</button>
                 </div>

                 <!-- Review Cards (Vertical Feed) -->
                 <div id="reviews-feed" style="display:flex; flex-direction:column; gap:1.5rem;">
                     <!-- Dynamically populated by renderMichuReviewsFeed -->
                 </div>
            </section>
        </div>

        <!-- Mobile Sticky Book Now Bar (Upgraded per new UX Plan) -->
        <div id="mobile-sticky-checkout" style="display:none; position:fixed; bottom:0; left:0; right:0; background:rgba(255,255,255,0.95); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); z-index:9000; padding:1rem 1.2rem; border-top:1px solid rgba(0,0,0,0.08); box-shadow:0 -10px 30px rgba(0,0,0,0.05); align-items:center; justify-content:space-between; transform:translateY(100%); transition:transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
            <div>
                <div id="mobile-sticky-total" style="font-size:1.3rem; font-weight:900; color:var(--color-primary); line-height:1.1;">0 Birr</div>
                <div id="mobile-sticky-summary" style="font-size:0.75rem; font-weight:700; color:#64748b; margin-top:0.2rem;">0 Rooms</div>
            </div>
            <button class="final-reserve-trigger" style="background:linear-gradient(135deg, var(--color-primary), #1e7e34); color:white; border:none; padding:0.9rem 1.6rem; border-radius:14px; font-weight:800; font-size:1rem; box-shadow:0 6px 15px rgba(11,102,70,0.25); cursor:pointer;" onclick="const tEl=document.querySelector('.final-total-val'); window.michuFinalNav('${id}', document.getElementById('book-in-mobile').value || document.getElementById('book-in').value, document.getElementById('book-out-mobile').value || document.getElementById('book-out').value, tEl?tEl.innerText:'')">Review & Book</button>
        </div>

        <div id="gallery-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.96); z-index:10000; align-items:center; justify-content:center; flex-direction:column;">
             <button style="position:absolute; top:2rem; right:2rem; background:white; border:none; border-radius:50%; width:44px; height:44px; font-size:1.5rem; cursor:pointer;" onclick="document.getElementById('gallery-modal').style.display='none'">✕</button>
             <div id="gallery-container" style="max-width:90%; max-height:80vh;">
                <img id="gallery-main-img" src="" style="max-width:100%; max-height:80vh; border-radius:18px; object-fit:contain; display:none;">
                <video id="gallery-main-video" controls style="max-width:100%; max-height:80vh; border-radius:18px; display:none;"><source src="" type="video/mp4"></video>
             </div>
             <div id="gallery-thumbnails" style="margin-top:2.5rem; display:flex; gap:1rem; overflow-x:auto; padding:1rem; width:85%;"></div>
        </div>

        <div id="reply-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(5px); z-index:9999; align-items:center; justify-content:center;">
             <div style="background:#fff; width:90%; max-width:400px; padding:2rem; border-radius:24px; box-shadow:0 20px 40px rgba(0,0,0,0.15); animation:fadeUp 0.3s ease;">
                 <h3 id="reply-modal-title" style="margin-bottom:1rem; font-size:1.3rem; color:#0f172a;">Reply to Guest</h3>
                 <p style="font-size:0.85rem; color:#64748b; margin-bottom:1.5rem;">Your reply will be visible to everyone.</p>
                 <textarea id="reply-text-area" rows="4" placeholder="Thank you for your stay..." style="width:100%; padding:1rem; border:2px solid #e2e8f0; border-radius:14px; resize:none; font-family:inherit; outline:none; transition:border 0.2s;" onfocus="this.style.borderColor='var(--color-primary)'" onblur="this.style.borderColor='#e2e8f0'"></textarea>
                 <div style="display:flex; gap:1rem; margin-top:1.5rem;">
                     <button onclick="document.getElementById('reply-modal').style.display='none'" style="flex:1; padding:1rem; background:#f1f5f9; color:#475569; border:none; border-radius:12px; font-weight:700; cursor:pointer;">Cancel</button>
                     <button id="reply-submit-btn" style="flex:1; padding:1rem; background:var(--color-primary); color:white; border:none; border-radius:12px; font-weight:700; cursor:pointer;">Post Reply</button>
                 </div>
             </div>
        </div>

        <!-- Review Edit Modal -->
        <div id="review-edit-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(5px); z-index:9999; align-items:center; justify-content:center;">
             <div style="background:#fff; width:90%; max-width:420px; padding:2rem; border-radius:24px; box-shadow:0 20px 40px rgba(0,0,0,0.15); animation:fadeUp 0.3s ease;">
                 <h3 style="margin-bottom:0.5rem; font-size:1.3rem; color:#0f172a;">Edit Your Review</h3>
                 <p style="font-size:0.82rem; color:#64748b; margin-bottom:1.2rem;">Update your rating and feedback.</p>
                 <div id="edit-rating-stars" style="display:flex;gap:0.4rem;margin-bottom:1rem;font-size:1.6rem;cursor:pointer;"></div>
                 <textarea id="edit-review-text" rows="4" style="width:100%;padding:1rem;border:2px solid #e2e8f0;border-radius:14px;resize:none;font-family:inherit;outline:none;" onfocus="this.style.borderColor='var(--color-primary)'" onblur="this.style.borderColor='#e2e8f0'"></textarea>
                 <div style="display:flex; gap:1rem; margin-top:1.5rem;">
                     <button onclick="document.getElementById('review-edit-modal').style.display='none'" style="flex:1;padding:1rem;background:#f1f5f9;color:#475569;border:none;border-radius:12px;font-weight:700;cursor:pointer;">Cancel</button>
                     <button id="edit-review-submit" style="flex:1;padding:1rem;background:var(--color-primary);color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer;">Save Changes</button>
                 </div>
             </div>
        </div>
    `;

    const bin = document.getElementById('book-in');
    const bout = document.getElementById('book-out');
    const binMobile = document.getElementById('book-in-mobile');
    const boutMobile = document.getElementById('book-out-mobile');
    const summaries = document.querySelectorAll('.price-summary-area');
    const mainBtns = document.querySelectorAll('.final-reserve-trigger');

    window.updateMichuPkgButtons = () => {
        (hotel.packages || []).forEach((pkg, idx) => {
            const dBtn = document.getElementById(`desktop-pkg-btn-${idx}`);
            const mBtn = document.getElementById(`mobile-pkg-btn-${idx}`);
            const isSelected = (window._selectedPackageIndex === idx);
            
            const activeBg = 'linear-gradient(135deg, #d97706 0%, #b45309 100%)';
            const activeText = 'Selected (Tap to Unselect)';
            const normalBg = 'linear-gradient(135deg, #0b6646 0%, #15803d 100%)';
            const normalText = 'Select Bundle';

            if (dBtn) {
                dBtn.innerText = isSelected ? activeText : normalText;
                dBtn.style.background = isSelected ? activeBg : normalBg;
                dBtn.style.boxShadow = isSelected ? '0 6px 15px rgba(217,119,6,0.3)' : '0 6px 15px rgba(11,102,70,0.25)';
            }
            if (mBtn) {
                mBtn.innerText = isSelected ? activeText : normalText;
                mBtn.style.background = isSelected ? activeBg : normalBg;
                mBtn.style.boxShadow = isSelected ? '0 6px 15px rgba(217,119,6,0.3)' : '0 6px 15px rgba(11,102,70,0.25)';
            }
        });
    };

    // ---- MULTI-ROOM SELECTION HELPERS ----

    // Get or create a selection entry for a room
    window._getMichuRoomEntry = (roomId) => {
        let entry = window._selectedRooms.find(r => r.roomId === roomId);
        if (!entry) {
            const roomData = (hotel.roomTypes || []).find(r => (r.id || `room_${hotel.roomTypes.indexOf(r)}`) === roomId);
            entry = { roomId, roomCount: 0, adults: 1, children: 0, roomName: roomData?.name || '', roomPrice: Number(String(roomData?.price || 0).replace(/[^\d.-]/g, '')) };
            window._selectedRooms.push(entry);
        }
        return entry;
    };

    // Toggle room selection on/off
    window.michuToggleRoom = (roomId) => {
        const entry = window._getMichuRoomEntry(roomId);
        if (entry.roomCount > 0) {
            // Deselect
            entry.roomCount = 0;
            entry.adults = 1;
            entry.children = 0;
        } else {
            // Select with default 1 room
            entry.roomCount = 1;
            entry.adults = 1;
            entry.children = 0;
        }
        window._updateMichuRoomCardUI(roomId);
        window._updateMichuSelectionPill();
        window.refreshMichuPricing();
    };

    // Stepper for rooms count
    window.michuStepRooms = (roomId, delta) => {
        const entry = window._getMichuRoomEntry(roomId);
        const roomData = (hotel.roomTypes || []).find(r => (r.id || `room_${hotel.roomTypes.indexOf(r)}`) === roomId);
        const maxAvailable = roomData?.availableRooms !== undefined ? Math.min(roomData.availableRooms, 10) : 10;
        const newVal = Math.max(1, Math.min(maxAvailable, entry.roomCount + delta));
        entry.roomCount = newVal;
        // Update stepper UI
        const valEl = document.getElementById(`rooms-val-${roomId}`);
        const decBtn = document.getElementById(`rooms-dec-${roomId}`);
        const incBtn = document.getElementById(`rooms-inc-${roomId}`);
        if (valEl) valEl.textContent = newVal;
        if (decBtn) decBtn.disabled = newVal <= 1;
        if (incBtn) incBtn.disabled = newVal >= maxAvailable;
        window._updateMichuRoomSubtotal(roomId);
        window._updateMichuSelectionPill();
        window.refreshMichuPricing();
    };

    // Stepper for adults
    window.michuStepAdults = (roomId, delta) => {
        const entry = window._getMichuRoomEntry(roomId);
        const newVal = Math.max(1, Math.min(20, entry.adults + delta));
        entry.adults = newVal;
        const valEl = document.getElementById(`adults-val-${roomId}`);
        const decBtn = document.getElementById(`adults-dec-${roomId}`);
        if (valEl) valEl.textContent = newVal;
        if (decBtn) decBtn.disabled = newVal <= 1;
        window._updateMichuSelectionPill();
        window.refreshMichuPricing();
    };

    // Stepper for children
    window.michuStepChildren = (roomId, delta) => {
        const entry = window._getMichuRoomEntry(roomId);
        const newVal = Math.max(0, Math.min(10, entry.children + delta));
        entry.children = newVal;
        const valEl = document.getElementById(`children-val-${roomId}`);
        const decBtn = document.getElementById(`children-dec-${roomId}`);
        if (valEl) valEl.textContent = newVal;
        if (decBtn) decBtn.disabled = newVal <= 0;
        window._updateMichuSelectionPill();
        window.refreshMichuPricing();
    };

    // Update the visual state of a single room card
    window._updateMichuRoomCardUI = (roomId) => {
        const entry = window._selectedRooms.find(r => r.roomId === roomId);
        const isSelected = entry && entry.roomCount > 0;
        const card = document.getElementById(`room-card-${roomId}`);
        const panel = document.getElementById(`stepper-panel-${roomId}`);
        const addBtn = document.getElementById(`add-btn-${roomId}`);
        const roomsValEl = document.getElementById(`rooms-val-${roomId}`);
        const adultsValEl = document.getElementById(`adults-val-${roomId}`);
        const childrenValEl = document.getElementById(`children-val-${roomId}`);
        const roomsDecBtn = document.getElementById(`rooms-dec-${roomId}`);
        const adultsDecBtn = document.getElementById(`adults-dec-${roomId}`);
        const childrenDecBtn = document.getElementById(`children-dec-${roomId}`);

        if (card) {
            if (isSelected) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        }
        if (addBtn) {
            addBtn.textContent = isSelected ? '✓ Added' : '+ Add Room';
            if (isSelected) addBtn.classList.add('active'); else addBtn.classList.remove('active');
        }
        if (isSelected && entry) {
            if (roomsValEl) roomsValEl.textContent = entry.roomCount;
            if (adultsValEl) adultsValEl.textContent = entry.adults;
            if (childrenValEl) childrenValEl.textContent = entry.children;
            if (roomsDecBtn) roomsDecBtn.disabled = entry.roomCount <= 1;
            if (adultsDecBtn) adultsDecBtn.disabled = entry.adults <= 1;
            if (childrenDecBtn) childrenDecBtn.disabled = entry.children <= 0;
        } else {
            if (roomsValEl) roomsValEl.textContent = 1;
            if (adultsValEl) adultsValEl.textContent = 1;
            if (childrenValEl) childrenValEl.textContent = 0;
            if (roomsDecBtn) roomsDecBtn.disabled = true;
            if (adultsDecBtn) adultsDecBtn.disabled = true;
            if (childrenDecBtn) childrenDecBtn.disabled = true;
        }
        window._updateMichuRoomSubtotal(roomId);
    };

    // Update per-room subtotal label
    window._updateMichuRoomSubtotal = (roomId) => {
        const entry = window._selectedRooms.find(r => r.roomId === roomId);
        const subtotalEl = document.getElementById(`room-subtotal-${roomId}`);
        if (!subtotalEl) return;
        const activeBin = document.getElementById('book-in')?.value || document.getElementById('book-in-mobile')?.value;
        const activeBout = document.getElementById('book-out')?.value || document.getElementById('book-out-mobile')?.value;
        const nights = activeBin && activeBout ? Math.max(0, Math.ceil((new Date(activeBout) - new Date(activeBin)) / 86400000)) : 0;
        if (entry && entry.roomCount > 0 && nights > 0) {
            const roomData = (hotel.roomTypes || []).find(r => (r.id || `room_${hotel.roomTypes.indexOf(r)}`) === roomId);
            let price = Number(String(roomData?.price || 0).replace(/[^\d.-]/g, ''));
            const disc = Number(hotel.discountPercent || hotel.discount || 0);
            if (disc > 0) price = price - Math.round(price * disc / 100);
            const sub = price * entry.roomCount * nights;
            subtotalEl.textContent = `${entry.roomCount} room${entry.roomCount > 1 ? 's' : ''} × ${nights} night${nights > 1 ? 's' : ''} = ${sub.toLocaleString()} Birr`;
        } else {
            subtotalEl.textContent = '';
        }
    };

    // Update the green summary pill at the top of the section
    window._updateMichuSelectionPill = () => {
        const pill = document.getElementById('michu-selection-summary-pill');
        if (!pill) return;
        const active = (window._selectedRooms || []).filter(r => r.roomCount > 0);
        if (active.length === 0) {
            pill.style.display = 'none';
            return;
        }
        const totalRooms = active.reduce((s, r) => s + r.roomCount, 0);
        const totalAdults = active.reduce((s, r) => s + r.adults, 0);
        const totalChildren = active.reduce((s, r) => s + r.children, 0);
        pill.style.display = 'inline-flex';
        pill.innerHTML = `✓ ${totalRooms} Room${totalRooms > 1 ? 's' : ''} · ${totalAdults} Adult${totalAdults > 1 ? 's' : ''}${totalChildren > 0 ? ` · ${totalChildren} Child${totalChildren > 1 ? 'ren' : ''}` : ''} selected`;
    };

    // Legacy alias so any existing code that calls selectMichuRoom still works
    window.selectMichuRoom = (roomId) => window.michuToggleRoom(roomId);


    window.refreshMichuPricing = () => {
        const activeBin = bin?.value || binMobile?.value;
        const activeBout = bout?.value || boutMobile?.value;

        const d1 = new Date(activeBin);
        const d2 = new Date(activeBout);
        const nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) || 0;

        // Update all room subtotal labels
        (hotel.roomTypes || []).forEach(r => {
            const rId = r.id || `room_${hotel.roomTypes.indexOf(r)}`;
            window._updateMichuRoomSubtotal && window._updateMichuRoomSubtotal(rId);
        });

        // Compute totals from multi-room selection
        const activeSelections = (window._selectedRooms || []).filter(r => r.roomCount > 0);
        const hasRoomSelection = activeSelections.length > 0;

        // Update sidebar price label — show base price if nothing selected
        let displayPrice = currentPrice;
        if (hasRoomSelection) {
            const firstSel = activeSelections[0];
            const firstRoomData = (hotel.roomTypes || []).find(r => (r.id || `room_${hotel.roomTypes.indexOf(r)}`) === firstSel.roomId);
            if (firstRoomData) displayPrice = Number(String(firstRoomData.price || 0).replace(/[^\d.-]/g, ''));
        }
        const disc0 = Number(hotel.discountPercent || hotel.discount || 0);
        const displayPriceDisc = disc0 > 0 ? displayPrice - Math.round(displayPrice * disc0 / 100) : displayPrice;
        document.querySelectorAll('.sidebar-price-val-desktop').forEach(el => el.innerText = `${displayPriceDisc.toLocaleString()} Birr`);
        document.querySelectorAll('.sidebar-price-val-mobile').forEach(el => el.innerText = `${displayPriceDisc.toLocaleString()} Birr`);

        // Package check
        let packageActive = false, pkgDisc = dPct, pName = '';
        if (window._selectedPackageIndex !== null && hotel.packages && hotel.packages[window._selectedPackageIndex]) {
            const curPkg = hotel.packages[window._selectedPackageIndex];
            if (nights === parseInt(curPkg.nights)) {
                pkgDisc = curPkg.discount;
                packageActive = true;
                pName = curPkg.title;
            } else {
                window._selectedPackageIndex = null;
            }
        }

        if (nights > 0) {
            if (!hasRoomSelection && window._michuCurrentHotelHasRooms) {
                // No room selected yet
                mainBtns.forEach(btn => {
                    btn.innerText = 'Select a Room';
                    btn.style.opacity = '0.55';
                    btn.style.pointerEvents = 'none';
                });
                summaries.forEach(summary => summary.innerHTML = `
                    <div style="background:#f8fafc; padding:1.5rem; border-radius:22px; border:1px solid #f1f5f9; text-align:center;">
                        <div style="color:#94a3b8; font-size:0.9rem; font-weight:700; display:flex; flex-direction:column; align-items:center; gap:0.5rem;">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>
                            Select a room to see pricing
                        </div>
                    </div>`);
                const stickyBar = document.getElementById('mobile-sticky-checkout');
                if (stickyBar) {
                    stickyBar.style.transform = 'translateY(100%)';
                    setTimeout(() => { stickyBar.style.display = 'none'; }, 400);
                }
                return;
            }

            // Calculate totals from all selected rooms
            let grandSub = 0;
            let lineItemsHtml = '';
            activeSelections.forEach(sel => {
                const roomData = (hotel.roomTypes || []).find(r => (r.id || `room_${hotel.roomTypes.indexOf(r)}`) === sel.roomId);
                if (!roomData) return;
                let price = Number(String(roomData.price || 0).replace(/[^\d.-]/g, ''));
                let origP = price;
                const discPct = Number(hotel.discountPercent || hotel.discount || 0);
                if (discPct > 0) price = price - Math.round(price * discPct / 100);
                const lineTotal = price * sel.roomCount * nights;
                grandSub += lineTotal;
                const totalGuests = sel.adults + sel.children;
                lineItemsHtml += `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:0.6rem 0; border-bottom:1px dashed #f1f5f9; gap:0.5rem;">
                        <div style="flex:1; min-width:0;">
                            <div style="font-weight:800; font-size:0.82rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${roomData.name}</div>
                            <div style="font-size:0.72rem; color:#94a3b8; font-weight:600;">${sel.roomCount} room${sel.roomCount > 1 ? 's' : ''} · ${sel.adults} adult${sel.adults > 1 ? 's' : ''}${sel.children > 0 ? ` · ${sel.children} child${sel.children > 1 ? 'ren' : ''}` : ''}</div>
                        </div>
                        <div style="font-weight:800; font-size:0.85rem; color:var(--color-primary); white-space:nowrap;">${lineTotal.toLocaleString()} Birr</div>
                    </div>`;
            });

            // Apply package discount on top
            const pkgSavings = packageActive ? Math.round(grandSub * (pkgDisc / 100)) : 0;
            const regularDisc = !packageActive && dPct > 0 ? 0 : 0; // already applied per-room
            const grandTotal = grandSub - pkgSavings;

            mainBtns.forEach(btn => {
                btn.innerText = packageActive ? 'Reserve Package' : 'Reserve Now';
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            });

            // Update mobile sticky bar
            const stickyBar = document.getElementById('mobile-sticky-checkout');
            if (stickyBar) {
                const isMobile = window.innerWidth <= 768;
                if (hasRoomSelection && isMobile) {
                    const stickyTotal = document.getElementById('mobile-sticky-total');
                    const stickySummary = document.getElementById('mobile-sticky-summary');
                    const totalRooms = activeSelections.reduce((s, r) => s + r.roomCount, 0);
                    if (stickyTotal) stickyTotal.innerText = `${grandTotal.toLocaleString()} Birr`;
                    if (stickySummary) stickySummary.innerText = `${totalRooms} Room${totalRooms > 1 ? 's' : ''} · ${nights} Night${nights > 1 ? 's' : ''}`;
                    
                    stickyBar.style.display = 'flex';
                    setTimeout(() => { stickyBar.style.transform = 'translateY(0)'; }, 10);
                } else {
                    stickyBar.style.transform = 'translateY(100%)';
                    setTimeout(() => { stickyBar.style.display = 'none'; }, 400);
                }
            }

            summaries.forEach(summary => summary.innerHTML = `
                <div style="background:#f8fafc; padding:1.4rem; border-radius:22px; border:1px solid #f1f5f9;">
                    ${packageActive ? `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#fef3c7; border:1px solid #f59e0b; padding:0.6rem 1rem; border-radius:14px; margin-bottom:1rem;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span style="display:inline-flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#d97706;"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg></span>
                            <div>
                                <div style="color:#d97706; font-weight:950; font-size:0.65rem; text-transform:uppercase;">PACKAGE APPLIED</div>
                                <div style="color:#92400e; font-weight:800; font-size:0.8rem;">${pName}</div>
                            </div>
                        </div>
                        <button onclick="window.applyMichuPkg(${window._selectedPackageIndex})" style="background:#fee2e2; color:#ef4444; border:none; padding:0.35rem 0.7rem; border-radius:10px; font-weight:800; font-size:0.72rem; cursor:pointer;">✕ Remove</button>
                    </div>` : ''}
                    <div style="font-size:0.72rem; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.5rem;">Breakdown (${nights} night${nights > 1 ? 's' : ''})</div>
                    ${lineItemsHtml}
                    ${packageActive && pkgSavings > 0 ? `<div style="display:flex; justify-content:space-between; color:#d97706; font-weight:800; margin-top:0.8rem; padding-top:0.5rem;"><span>Package Discount (${pkgDisc}%)</span><span>−${pkgSavings.toLocaleString()} Birr</span></div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-weight:950; font-size:1.4rem; border-top:1.5px solid #e2e8f0; padding-top:1rem; margin-top:0.8rem; color:var(--color-primary);"><span>Total</span><span><span class="final-total-val">${grandTotal.toLocaleString()}</span> Birr</span></div>
                    <p style="text-align:right; font-size:0.65rem; color:#94a3b8; font-weight:700; margin-top:0.6rem;">Price includes all taxes & fees</p>
                </div>`);
        } else {
            mainBtns.forEach(btn => btn.innerText = 'Select Dates');
            summaries.forEach(summary => summary.innerHTML = `<p style="text-align:center; color:#94a3b8; font-weight:700; font-size:0.85rem; padding:1rem 0;">Select check-in/out to see pricing</p>`);
            
            const stickyBar = document.getElementById('mobile-sticky-checkout');
            if (stickyBar) {
                stickyBar.style.transform = 'translateY(100%)';
                setTimeout(() => { stickyBar.style.display = 'none'; }, 400);
            }
        }

        window.updateMichuPkgButtons();
    };

    if (bin) bin.onchange = (e) => { 
        if(binMobile) {
            binMobile.value = e.target.value;
            if (binMobile._flatpickr) binMobile._flatpickr.setDate(e.target.value, false);
        }
        window.refreshMichuPricing(); 
    };
    if (bout) bout.onchange = (e) => { 
        if(boutMobile) {
            boutMobile.value = e.target.value;
            if (boutMobile._flatpickr) boutMobile._flatpickr.setDate(e.target.value, false);
        }
        window.refreshMichuPricing(); 
    };
    if (binMobile) binMobile.onchange = (e) => { 
        if(bin) {
            bin.value = e.target.value;
            if (bin._flatpickr) bin._flatpickr.setDate(e.target.value, false);
        }
        window.refreshMichuPricing(); 
    };
    if (boutMobile) boutMobile.onchange = (e) => { 
        if(bout) {
            bout.value = e.target.value;
            if (bout._flatpickr) bout._flatpickr.setDate(e.target.value, false);
        }
        window.refreshMichuPricing(); 
    };

    window.applyMichuPkg = (idx) => {
        if (window._selectedPackageIndex === idx) {
            window._selectedPackageIndex = null;
            window.refreshMichuPricing();
            window.showToast("ℹ️ Package unselected. Showing standard rate.");
        } else {
            window._selectedPackageIndex = idx;
            const pkg = hotel.packages[idx];
            const start = new Date(bin?.value || binMobile?.value);
            const end = new Date(start); 
            end.setDate(start.getDate() + parseInt(pkg.nights));
            const endStr = end.toISOString().split('T')[0];
            if (bout) {
                bout.value = endStr;
                if (bout._flatpickr) bout._flatpickr.setDate(endStr, false);
            }
            if (boutMobile) {
                boutMobile.value = endStr;
                if (boutMobile._flatpickr) boutMobile._flatpickr.setDate(endStr, false);
            }
            window.refreshMichuPricing();
            
            // Check if a room is selected
            const hasRoomSelection = window._selectedRooms && window._selectedRooms.some(r => r.roomCount > 0);
            if (window._michuCurrentHotelHasRooms && !hasRoomSelection) {
                window.showToast(`✅ ${pkg.title} Activated! Please select a room below to see your discounted total.`);
                setTimeout(() => {
                    const roomContainer = document.getElementById('room-selection-container');
                    if (roomContainer) {
                        roomContainer.scrollIntoView({behavior: 'smooth', block: 'center'});
                    }
                }, 400);
            } else {
                window.showToast(`✅ ${pkg.title} Activated! Check the total below.`);
            }
        }
    };

    window.refreshMichuReviewsUI = async (hotelId) => {
        try {
            const reviews = await window.db.getReviews(hotelId).catch(() => []);
            window._hotelReviews = reviews;
            
            let avgRating = 0, reviewCount = reviews.length;
            let cAvg = '—', lAvg = '—', sAvg = '—', vAvg = '—';
            if (reviewCount > 0) {
                avgRating = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
                let cSum = 0, lSum = 0, sSum = 0, vSum = 0;
                reviews.forEach(r => {
                    const sub = r.subRatings || { cleanliness: r.rating, location: r.rating, service: r.rating, value: r.rating };
                    cSum += Number(sub.cleanliness || r.rating);
                    lSum += Number(sub.location || r.rating);
                    sSum += Number(sub.service || r.rating);
                    vSum += Number(sub.value || r.rating);
                });
                cAvg = (cSum / reviewCount).toFixed(1);
                lAvg = (lSum / reviewCount).toFixed(1);
                sAvg = (sSum / reviewCount).toFixed(1);
                vAvg = (vSum / reviewCount).toFixed(1);
            }

            // Update Rating Summary Container
            const summaryContainer = document.getElementById('reviews-summary-container');
            if (summaryContainer) {
                summaryContainer.innerHTML = `
                     <!-- Rating Summary -->
                     <div style="display:flex; align-items:center; gap:1.5rem; margin-bottom:2rem; flex-wrap:wrap;">
                        <div style="text-align:center;">
                            <div style="font-size:3rem; font-weight:950; color:var(--color-primary); line-height:1;">${avgRating || '—'}</div>
                            <div style="color:#f59e0b; font-size:1.2rem; margin:0.3rem 0;">${'★'.repeat(Math.round(avgRating))}${'☆'.repeat(5-Math.round(avgRating))}</div>
                            <div style="font-size:0.8rem; color:#94a3b8; font-weight:700;">${reviewCount} review${reviewCount!==1?'s':''}</div>
                        </div>
                        <div style="flex:1; min-width:200px;">
                            ${[5,4,3,2,1].map(s => {
                                const cnt = reviews.filter(r=>r.rating===s).length;
                                const pct = reviewCount>0 ? Math.round(cnt/reviewCount*100) : 0;
                                return `<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:4px;">
                                    <span style="font-size:0.75rem;font-weight:700;color:#64748b;width:12px;">${s}</span>
                                    <div style="flex:1;height:8px;background:#f1f5f9;border-radius:99px;overflow:hidden;">
                                        <div style="height:100%;width:${pct}%;background:${s>=4?'#f59e0b':s>=3?'#fbbf24':'#fb923c'};border-radius:99px;transition:width 0.6s;"></div>
                                    </div>
                                    <span style="font-size:0.7rem;color:#94a3b8;width:20px;">${cnt}</span>
                                </div>`;
                            }).join('')}
                        </div>
                     </div>

                     <!-- Sub-Category Summary Grid -->
                     <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1.5rem; margin-bottom:2.5rem; background:#f8fafc; padding:1.8rem; border-radius:24px; border:1px solid #e2e8f0;">
                         <div>
                             <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; margin-bottom:0.5rem; color:#1e293b;"><span style="display:inline-flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/><path d="M5.4 5.4h.01"/><path d="M10.2 3h.01"/><path d="M3 10.2h.01"/><path d="m14 14 6-6"/></svg> Cleanliness</span><span style="color:var(--color-primary);">${cAvg}</span></div>
                             <div style="height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden;"><div style="height:100%; width:${reviewCount > 0 ? (Number(cAvg)/5)*100 : 0}%; background:var(--color-primary); border-radius:99px;"></div></div>
                         </div>
                         <div>
                             <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; margin-bottom:0.5rem; color:#1e293b;"><span style="display:inline-flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Location</span><span style="color:var(--color-primary);">${lAvg}</span></div>
                             <div style="height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden;"><div style="height:100%; width:${reviewCount > 0 ? (Number(lAvg)/5)*100 : 0}%; background:var(--color-primary); border-radius:99px;"></div></div>
                         </div>
                         <div>
                             <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; margin-bottom:0.5rem; color:#1e293b;"><span style="display:inline-flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4 12H2"/><path d="M22 12h-2"/><path d="m19.07 4.93-1.41 1.41"/><path d="m6.34 17.66-1.41 1.41"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M12 6a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6Z"/><path d="M6 16h12"/></svg> Service</span><span style="color:var(--color-primary);">${sAvg}</span></div>
                             <div style="height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden;"><div style="height:100%; width:${reviewCount > 0 ? (Number(sAvg)/5)*100 : 0}%; background:var(--color-primary); border-radius:99px;"></div></div>
                         </div>
                         <div>
                             <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; margin-bottom:0.5rem; color:#1e293b;"><span style="display:inline-flex;align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13"/><path d="M13 3l3 6-4 13"/><path d="M2 9h20"/></svg> Value</span><span style="color:var(--color-primary);">${vAvg}</span></div>
                             <div style="height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden;"><div style="height:100%; width:${reviewCount > 0 ? (Number(vAvg)/5)*100 : 0}%; background:var(--color-primary); border-radius:99px;"></div></div>
                         </div>
                     </div>
                `;
            }

            // Update Sidebar Rating Badges
            document.querySelectorAll('.sidebar-rating-badge-update').forEach(badge => {
                badge.innerHTML = `★ ${avgRating || 'New'}`;
            });

            // Re-render feed in place
            if (window.renderMichuReviewsFeed) {
                window.renderMichuReviewsFeed();
            }
        } catch (err) {
            console.error("Error refreshing reviews UI:", err);
        }
    };

    window.replyToReview = (reviewId) => {
        const modal = document.getElementById('reply-modal');
        const textArea = document.getElementById('reply-text-area');
        const submitBtn = document.getElementById('reply-submit-btn');
        
        textArea.value = '';
        modal.style.display = 'flex';
        
        submitBtn.onclick = async () => {
            const reply = textArea.value.trim();
            if (!reply) {
                window.showToast("❌ Please enter a reply.");
                return;
            }
            
            submitBtn.innerText = 'Posting...';
            submitBtn.style.opacity = '0.7';
            submitBtn.disabled = true;
            
            try {
                // Ensure managerName is pulled from auth or use default
                const managerName = window.auth?.currentUser?.displayName || hotel.managerName || 'Hotel Manager';
                await window.db.addReviewReply(reviewId, reply, managerName);
                window.showToast("✅ Reply posted successfully!");
                modal.style.display = 'none';
                // Re-render in place
                if (window.refreshMichuReviewsUI) {
                    await window.refreshMichuReviewsUI(hotel.id);
                } else {
                    window.router.navigate('hotel_detail_view', { id: hotel.id });
                }
            } catch (e) {
                console.error("Firestore Review Reply Error:", e);
                window.showToast("❌ Failed to post reply.");
            } finally {
                submitBtn.innerText = 'Post Reply';
                submitBtn.style.opacity = '1';
                submitBtn.disabled = false;
            }
        };
    };

    window._editReview = (reviewId, oldText, oldRating) => {
        const modal = document.getElementById('review-edit-modal');
        const textArea = document.getElementById('edit-review-text');
        const starsContainer = document.getElementById('edit-rating-stars');
        const submitBtn = document.getElementById('edit-review-submit');
        
        textArea.value = oldText;
        let currentRating = oldRating;

        const renderStars = () => {
            starsContainer.innerHTML = [1,2,3,4,5].map(s => 
                `<span onclick="currentRating=${s};renderStars()" style="color:${s<=currentRating?'#f59e0b':'#cbd5e1'}">${s<=currentRating?'★':'☆'}</span>`
            ).join('');
        };
        
        window.renderStars = renderStars;
        renderStars();
        modal.style.display = 'flex';

        submitBtn.onclick = async () => {
            const newText = textArea.value.trim();
            if(!newText) return window.showToast("Please enter some text.");
            
            submitBtn.innerText = 'Saving...';
            submitBtn.disabled = true;

            try {
                await window.db.editReview(reviewId, newText, currentRating);
                window.showToast("✅ Review updated!");
                modal.style.display = 'none';
                if (window.refreshMichuReviewsUI) {
                    await window.refreshMichuReviewsUI(hotel.id);
                } else {
                    window.router.navigate('hotel_detail_view', { id: hotel.id });
                }
            } catch(e) {
                window.showToast("❌ Error: " + e.message);
                submitBtn.innerText = 'Save Changes';
                submitBtn.disabled = false;
            }
        };
    };

    window._editReply = (reviewId, oldReplyText) => {
        const modal = document.getElementById('reply-modal');
        const title = document.getElementById('reply-modal-title');
        const textArea = document.getElementById('reply-text-area');
        const submitBtn = document.getElementById('reply-submit-btn');

        title.innerText = 'Edit Reply';
        textArea.value = oldReplyText;
        modal.style.display = 'flex';

        submitBtn.onclick = async () => {
            const newReply = textArea.value.trim();
            if(!newReply) return window.showToast("Please enter a reply.");

            submitBtn.innerText = 'Saving...';
            submitBtn.disabled = true;

            try {
                await window.db.editReviewReply(reviewId, newReply);
                window.showToast("✅ Reply updated!");
                modal.style.display = 'none';
                if (window.refreshMichuReviewsUI) {
                    await window.refreshMichuReviewsUI(hotel.id);
                } else {
                    window.router.navigate('hotel_detail_view', { id: hotel.id });
                }
            } catch(e) {
                window.showToast("❌ Error: " + e.message);
                submitBtn.innerText = 'Save Changes';
                submitBtn.disabled = false;
            }
        };
    };

    // Logic for deletions now handled globally via michuDeleteReviewGlobal and michuDeleteReplyGlobal in app.js


    // Initialize Dates
    const d1 = new Date(); const d2 = new Date(); d2.setDate(d1.getDate() + 1);
    const d1Str = d1.toISOString().split('T')[0];
    const d2Str = d2.toISOString().split('T')[0];
    
    if (bin) {
        bin.value = d1Str;
        if (bin._flatpickr) bin._flatpickr.setDate(d1Str, false);
    }
    if (bout) {
        bout.value = d2Str;
        if (bout._flatpickr) bout._flatpickr.setDate(d2Str, false);
    }
    if (binMobile) {
        binMobile.value = d1Str;
        if (binMobile._flatpickr) binMobile._flatpickr.setDate(d1Str, false);
    }
    if (boutMobile) {
        boutMobile.value = d2Str;
        if (boutMobile._flatpickr) boutMobile._flatpickr.setDate(d2Str, false);
    }
    window.refreshMichuPricing();

    // Gallery Logic
    window._currentGalleryItems = [...allImages.map(url => ({ type: 'image', url })), ...(videoUrl ? [{ type: 'video', url: videoUrl }] : [])];
    window.viewFullGallery = (idx) => {
        window._currentGalleryItems = [...allImages.map(url => ({ type: 'image', url })), ...(videoUrl ? [{ type: 'video', url: videoUrl }] : [])];
        const modal = document.getElementById('gallery-modal');
        const thumbs = document.getElementById('gallery-thumbnails');
        modal.style.display = 'flex';
        thumbs.innerHTML = window._currentGalleryItems.map((item, i) => `<div onclick="updateSelection(${i})" style="flex:0 0 100px; height:75px; border-radius:14px; overflow:hidden; cursor:pointer; border:2px solid #fff; display:flex; align-items:center; justify-content:center; background:#1e293b;">${item.type==='image'?`<img src='${item.url}' style='width:100%;height:100%;object-fit:cover;'>`:'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:white;"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11v2z"/><rect width="14" height="14" x="2" y="5" rx="2" ry="2"/></svg>'}</div>`).join('');
        updateSelection(idx);
    };
    window.viewReviewGallery = (reviewId, idx) => {
        const r = window._hotelReviews.find(rev => rev.id === reviewId);
        if (!r || !r.images) return;
        window._currentGalleryItems = r.images.map(url => ({ type: 'image', url }));
        const modal = document.getElementById('gallery-modal');
        const thumbs = document.getElementById('gallery-thumbnails');
        modal.style.display = 'flex';
        thumbs.innerHTML = window._currentGalleryItems.map((item, i) => `<div onclick="updateSelection(${i})" style="flex:0 0 100px; height:75px; border-radius:14px; overflow:hidden; cursor:pointer; border:2px solid #fff; display:flex; align-items:center; justify-content:center; background:#1e293b;">${item.type==='image'?`<img src='${item.url}' style='width:100%;height:100%;object-fit:cover;'>`:'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:white;"><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11v2z"/><rect width="14" height="14" x="2" y="5" rx="2" ry="2"/></svg>'}</div>`).join('');
        updateSelection(idx);
    };
    window.updateSelection = (idx) => {
        const img = document.getElementById('gallery-main-img');
        const vid = document.getElementById('gallery-main-video');
        const item = window._currentGalleryItems[idx];
        if (!item) return;
        img.style.display = 'none'; vid.style.display = 'none';
        if (item.type === 'image') { img.src = item.url; img.style.display = 'block'; }
        else { vid.querySelector('source').src = item.url; vid.load(); vid.style.display = 'block'; vid.play(); }
    };

    // Smart Trigger for Mobile Book Now
    window.michuMobileBookTrigger = () => {
        const dIn = document.getElementById('book-in');
        const stickyBar = document.getElementById('mobile-book-bar');
        if (dIn) {
            if (stickyBar) stickyBar.style.transform = 'translateY(100%)'; // Slide out
            dIn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                dIn.focus();
                if (!dIn.value) window.showToast("Please select your stay dates!");
            }, 600);
        }
    };

    // Auto-hide sticky bar when main button is in view
    setTimeout(() => {
        const stickyBar = document.getElementById('mobile-book-bar');
        const mainReserveBtn = document.getElementById('final-reserve-trigger');
        if (stickyBar && mainReserveBtn) {
            const obs = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        stickyBar.style.transform = 'translateY(100%)';
                        stickyBar.style.pointerEvents = 'none';
                    } else {
                        stickyBar.style.transform = 'translateY(0)';
                        stickyBar.style.pointerEvents = 'auto';
                    }
                });
            }, { threshold: 0.1 });
            obs.observe(mainReserveBtn);
        }
    }, 1000);

    window._reviewPage = 1;
    const REVIEWS_PER_PAGE = 10;

    window.renderMichuReviewsFeed = () => {
        const feedEl = document.getElementById('reviews-feed');
        if (!feedEl) return;
        
        let filtered = [...window._hotelReviews];
        if (window._currentReviewFilter === 'recent') {
            filtered.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        } else if (window._currentReviewFilter === 'high') {
            filtered.sort((a,b) => b.rating - a.rating);
        } else if (window._currentReviewFilter === 'low') {
            filtered.sort((a,b) => a.rating - b.rating);
        } else if (window._currentReviewFilter === 'photos') {
            filtered = filtered.filter(r => r.images && r.images.length > 0);
        }

        const totalReviews = filtered.length;
        const totalPages = Math.max(1, Math.ceil(totalReviews / REVIEWS_PER_PAGE));
        if (window._reviewPage > totalPages) window._reviewPage = totalPages;
        const startIdx = (window._reviewPage - 1) * REVIEWS_PER_PAGE;
        const pageReviews = filtered.slice(startIdx, startIdx + REVIEWS_PER_PAGE);

        const isManager = window.auth.currentUser && window.auth.currentUser.uid === hotel.managerId;
        const votedObj = JSON.parse(localStorage.getItem('michu_voted_reviews') || '{}');

        let cardsHtml = pageReviews.length > 0 ? pageReviews.map(r => {
            const rDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : 'Recently';
            const isOwner = window.auth.currentUser && window.auth.currentUser.uid === r.userId;
            
            let rawName = r.userName || 'Guest';
            let cleanName = rawName;
            if (rawName.includes('@')) {
                const part = rawName.split('@')[0].replace(/[0-9]/g, '');
                cleanName = part.charAt(0).toUpperCase() + part.slice(1) + '***';
            }
            const avatar = cleanName.charAt(0).toUpperCase();
            const escapedText = (r.text || 'Enjoyed the stay!').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            return `
            <div id="review-${r.id}" style="background:#f8fafc; padding:1.5rem; border-radius:24px; border:1px solid #f1f5f9; display:flex; flex-direction:column; gap:1rem;">
                <!-- Review Header -->
                <div style="display:flex; align-items:center; gap:0.8rem;">
                    <div style="width:42px;height:42px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:1rem;flex-shrink:0;">${avatar}</div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                            <strong style="font-size:1rem; color:#0f172a;">${cleanName}</strong>
                            <span style="color:#f59e0b;font-size:0.9rem;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
                            <span style="background:#e6f4ea; color:#137333; font-size:0.75rem; font-weight:800; padding:0.2rem 0.6rem; border-radius:10px; display:inline-flex; align-items:center; gap:4px;">✔ Verified stay</span>
                        </div>
                        <div style="font-size:0.7rem;color:#94a3b8;font-weight:700;">${rDate}${r.updatedAt ? ' · <em>Edited</em>' : ''}</div>
                    </div>
                    ${isOwner ? `
                    <div style="display:flex;gap:6px;">
                        <button onclick="window._editReview('${r.id}','${escapedText}',${r.rating})" style="background:#f0fdf4;color:#16a34a;border:none;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.95rem;" title="Edit"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
                        <button class="michu-action-btn" data-action="delete-review" data-review-id="${r.id}" data-hotel-id="${hotel.id}" style="background:#fef2f2;color:#ef4444;border:none;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.95rem;" title="Delete"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                    </div>` : ''}
                </div>

                <!-- Review Text -->
                <p style="line-height:1.7;color:#475569;margin:0;font-size:0.95rem;">"${r.text || 'Enjoyed the stay!'}"</p>

                <!-- Review Images -->
                ${r.images && r.images.length > 0 ? `
                <div style="display:flex; gap:0.6rem; overflow-x:auto; padding-bottom:0.4rem;">
                    ${r.images.map((img, i) => `<img src="${img}" onclick="window.viewReviewGallery('${r.id}', ${i})" style="width:80px; height:80px; object-fit:cover; border-radius:14px; cursor:pointer; border:1px solid #e2e8f0;">`).join('')}
                </div>` : ''}

                <!-- Review Actions & Manager Reply -->
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:0.8rem; flex-wrap:wrap; gap:0.8rem;">
                    <button id="btn-helpful-${r.id}" onclick="window.voteMichuHelpful('${r.id}')" style="background:${votedObj[r.id] ? 'var(--color-primary)' : '#f1f5f9'}; color:${votedObj[r.id] ? 'white' : '#64748b'}; border:none; padding:0.5rem 1rem; border-radius:12px; font-weight:700; font-size:0.8rem; cursor:pointer; transition:all 0.2s; display:inline-flex; align-items:center; gap:0.4rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg> Helpful (${r.helpfulCount || 0})</button>
                    <button onclick="window.reportMichuReview('${r.id}')" style="background:transparent; color:#94a3b8; border:none; font-size:0.8rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:0.3rem;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg> Report</button>
                </div>

                ${(() => {
                    if (r.managerReply && r.managerReply.text) {
                        const replyDate = r.managerReply.createdAt ? new Date(r.managerReply.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '';
                        const replyEscaped = r.managerReply.text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        return `
                        <div style="margin-top:0.5rem;padding:1rem 1.2rem;background:#fff;border-radius:16px;border-left:4px solid #f59e0b;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                                <strong style="color:#1e293b;font-size:0.82rem;display:inline-flex;align-items:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#f59e0b; vertical-align:middle; margin-right:6px;"><path d="m15 10-4 4 4 4"/><path d="M4 4v7a4 4 0 0 0 4 4h11"/></svg> Hotel Response</strong>
                                <div style="display:flex;align-items:center;gap:6px;">
                                    ${(replyDate && replyDate!=='Invalid Date') ? `<span style="font-size:0.65rem;color:#94a3b8;font-weight:700;">${replyDate}${r.managerReply.updatedAt?' · Edited':''}</span>` : ''}
                                    ${isManager ? `
                                        <button onclick="window._editReply('${r.id}','${replyEscaped}')" style="background:#f0fdf4;color:#16a34a;border:none;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.8rem;" title="Edit Reply"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
                                        <button class="michu-action-btn" data-action="delete-reply" data-review-id="${r.id}" data-hotel-id="${hotel.id}" style="background:#fef2f2;color:#ef4444;border:none;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.8rem;" title="Delete Reply"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                                    ` : ''}
                                </div>
                            </div>
                            <p style="color:#64748b;font-style:italic;margin:0;line-height:1.6;font-size:0.88rem;">"${r.managerReply.text}"</p>
                        </div>`;
                    } else if (isManager) {
                        return `<div style="margin-top:0.5rem;">
                            <button onclick="window.replyToReview('${r.id}')" style="width:100%;background:#f1f5f9;border:1px dashed #cbd5e1;color:#475569;padding:0.7rem;border-radius:14px;font-size:0.8rem;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;gap:0.4rem;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;"><path d="m15 10-4 4 4 4"/><path d="M4 4v7a4 4 0 0 0 4 4h11"/></svg> Reply to Guest</button>
                        </div>`;
                    }
                    return '';
                })()}
            </div>`;
        }).join('') : '<p style="color:#94a3b8;text-align:center;padding:2rem;">No reviews yet. Be the first to share your experience!</p>';

        // Pagination bar
        let paginationHtml = '';
        if (totalPages > 1) {
            const endIdx = Math.min(startIdx + REVIEWS_PER_PAGE, totalReviews);
            let pageButtons = '';
            for (let p = 1; p <= totalPages; p++) {
                const isActive = p === window._reviewPage;
                pageButtons += `<button onclick="window.goReviewPage(${p})" style="width:36px;height:36px;border-radius:10px;border:${isActive ? 'none' : '1px solid #e2e8f0'};background:${isActive ? 'var(--color-primary)' : 'white'};color:${isActive ? 'white' : '#475569'};font-weight:800;font-size:0.85rem;cursor:pointer;transition:all 0.2s;">${p}</button>`;
            }
            paginationHtml = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;margin-top:2rem;padding-top:1.5rem;border-top:1px solid #f1f5f9;">
                <div style="font-size:0.8rem;color:#94a3b8;font-weight:700;">Showing ${startIdx+1}–${endIdx} of ${totalReviews} reviews</div>
                <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;justify-content:center;">
                    <button onclick="window.goReviewPage(${window._reviewPage - 1})" ${window._reviewPage <= 1 ? 'disabled' : ''} style="padding:0.5rem 1rem;border-radius:10px;border:1px solid #e2e8f0;background:white;color:${window._reviewPage <= 1 ? '#cbd5e1' : 'var(--color-primary)'};font-weight:700;font-size:0.8rem;cursor:${window._reviewPage <= 1 ? 'default' : 'pointer'};display:flex;align-items:center;gap:0.3rem;">← Prev</button>
                    ${pageButtons}
                    <button onclick="window.goReviewPage(${window._reviewPage + 1})" ${window._reviewPage >= totalPages ? 'disabled' : ''} style="padding:0.5rem 1rem;border-radius:10px;border:1px solid #e2e8f0;background:white;color:${window._reviewPage >= totalPages ? '#cbd5e1' : 'var(--color-primary)'};font-weight:700;font-size:0.8rem;cursor:${window._reviewPage >= totalPages ? 'default' : 'pointer'};display:flex;align-items:center;gap:0.3rem;">Next →</button>
                </div>
            </div>`;
        }

        feedEl.innerHTML = cardsHtml + paginationHtml;
    };

    window.goReviewPage = (page) => {
        if (page < 1) return;
        window._reviewPage = page;
        window.renderMichuReviewsFeed();
        const section = document.getElementById('reviews-feed');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.filterMichuReviews = (type) => {
        window._currentReviewFilter = type;
        window._reviewPage = 1;
        document.querySelectorAll('.review-filter-pill').forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'white';
            btn.style.color = '#475569';
            btn.style.borderColor = '#cbd5e1';
        });
        const activeBtn = document.querySelector(`.review-filter-pill[onclick*="${type}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.background = 'var(--color-primary)';
            activeBtn.style.color = 'white';
            activeBtn.style.borderColor = 'var(--color-primary)';
        }
        window.renderMichuReviewsFeed();
    };

    window.voteMichuHelpful = async (reviewId) => {
        try {
            await window.db.voteReviewHelpful(reviewId);
            const target = window._hotelReviews.find(r => r.id === reviewId);
            if (target) target.helpfulCount = (target.helpfulCount || 0) + 1;
            window.renderMichuReviewsFeed();
            window.showToast("👍 Thank you for your feedback!");
        } catch (e) {
            window.showToast("ℹ️ " + e.message);
        }
    };

    window.reportMichuReview = async (reviewId) => {
        try {
            await window.db.reportReview(reviewId);
            window.showToast("🚩 Review reported to moderators for review.");
        } catch (e) {
            window.showToast("ℹ️ " + e.message);
        }
    };

    window.renderMichuReviewsFeed();
    setTimeout(() => {
        if (window.refreshMichuReviewsUI) window.refreshMichuReviewsUI(id);
    }, 100);

    window.toggleMichuDesc = () => {
        const container = document.getElementById('hotel-desc-container');
        const trigger = document.getElementById('read-more-trigger');
        if (!container || !trigger) return;
        
        container.classList.toggle('expanded');
        const isExpanded = container.classList.contains('expanded');
        trigger.querySelector('span').innerText = isExpanded ? 'Read Less' : 'Read More';
        trigger.querySelector('svg').style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    };
});
