window.router.addRoute('hotel_detail_view', async (container, params) => {
    const id = params.id;
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading...</div>`;
    
    // --- 1. THE TRIPLE-REDUNDANT NAVIGATOR (FIXED NAMES) ---
    window.michuFinalNav = (pId, binVal, boutVal) => {
        if (!binVal || !boutVal) {
            window.showToast("Please select stay dates!");
            return;
        }

        // CORRECT ROUTE NAME IS 'booking', NOT 'booking_payment'
        const navParams = { id: pId, checkIn: binVal, checkOut: boutVal };
        const reserveBtn = document.getElementById('final-reserve-trigger');
        
        if (reserveBtn) {
            reserveBtn.innerText = "⏳ Redirecting...";
            reserveBtn.style.opacity = "0.7";
        }

        console.log("CRITICAL NAV TO 'booking' WITH ID:", pId);
        
        // Strategy A: Standard Router (Targeting 'booking')
        try {
            window.router.navigate('booking', navParams);
        } catch(e) {
            // Strategy B: Native Hash Change
            const hash = `#booking?id=${pId}&checkIn=${binVal}&checkOut=${boutVal}`;
            window.location.hash = hash;
        }
    };

    const hotel = await window.db.getPropertyById(id, true);
    if (!hotel) {
        container.innerHTML = `<div class="container" style="padding:4rem;text-align:center;">Property not found.</div>`;
        return;
    }

    const allImages = hotel.images || [hotel.image, ...(hotel.extraImages || [])].filter(Boolean);
    const amenities = hotel.amenities || [];
    const videoUrl = hotel.videoTour || '';
    let reviews = [], avgRating = 0, reviewCount = 0;
    try {
        reviews = await window.db.getReviews(id).catch(() => []);
        if (reviews.length > 0) {
            avgRating = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
            reviewCount = reviews.length;
        }
    } catch(e) {}

    const currentPrice = Number(String(hotel.price || 0).replace(/[^\d.-]/g, ''));
    let dPct = Number(hotel.discountPercent || hotel.discount || 0);
    let origPrice = hotel.originalPrice ? Number(String(hotel.originalPrice).replace(/[^\d.-]/g, '')) : 0;
    if (dPct > 0 && (!origPrice || origPrice <= currentPrice)) {
        origPrice = Math.round(currentPrice / (1 - (dPct / 100)));
    }

    const amenitiesIcons = { 'WiFi': '📶', 'Pool': '🏊', 'Spa': '🧖', 'Breakfast': '🍳', 'Parking': '🚗', 'Gym': '💪', 'AC': '❄️', 'Bar': '🍸' };

    container.innerHTML = `
        <div class="container" style="padding-top:1.5rem; padding-bottom:5rem;">
            <!-- Header -->
            <div style="margin-bottom:1.5rem; color:#64748b; font-size:0.9rem;">
                <span style="cursor:pointer;" onclick="router.navigate('home')">Home</span> / <strong>${hotel.title}</strong>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.5rem;">
                <div>
                   <h1 style="margin:0; font-size:2.2rem; color:var(--color-primary); letter-spacing:-0.5px;">${hotel.title}</h1>
                   <p style="margin:0.2rem 0 0; color:#64748b; font-weight:600;">📍 ${hotel.address}</p>
                </div>
            </div>

            <style>
                .detail-gallery-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.8rem; height: 450px; margin-bottom: 2.5rem; border-radius:24px; overflow:hidden; }
                .detail-content-grid { display: grid; grid-template-columns: 1.8fr 1fr; gap: 3rem; align-items: start; }
                @media(max-width: 768px) {
                    .detail-gallery-grid { grid-template-columns: 1fr; height: 260px; }
                    .detail-gallery-grid > div:not(:first-child) { display: none; }
                    .detail-content-grid { grid-template-columns: 1fr; gap: 2rem; }
                    .desktop-sidebar { position: static !important; }
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
                    ${videoUrl ? `<video controls style="width:100%; border-radius:20px; margin-bottom:2rem; box-shadow:0 10px 30px rgba(0,0,0,0.1);"><source src="${videoUrl}" type="video/mp4"></video>` : ''}
                    
                    <section style="margin-bottom:2.5rem; padding-bottom:2rem; border-bottom:1px solid #f1f5f9;">
                         <h2 style="margin-bottom:1rem; font-size:1.5rem;">The Experience</h2>
                         <p style="line-height:1.7; color:#334155; white-space:pre-wrap; font-size:1.05rem;">${hotel.description}</p>
                    </section>

                    <!-- SPECIAL PACKAGES (Stable) -->
                    ${hotel.packages && hotel.packages.length > 0 ? `
                    <section style="margin-bottom:3rem; background:#f8fafc; padding:2rem; border-radius:28px; border:1.5px solid #e2e8f0;">
                        <h2 style="margin-bottom:1.5rem; display:flex; align-items:center; gap:0.6rem; color:#d97706; font-size:1.4rem;">🎁 Special Stay Packages</h2>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:1.5rem;">
                            ${hotel.packages.map((pkg, idx) => `
                                <div class="pkg-card" onclick="window.applyMichuPkg(${idx})" style="background:white; border:2px solid #fff; border-radius:24px; padding:1.5rem; cursor:pointer; box-shadow:0 8px 12px rgba(0,0,0,0.02);">
                                    <div style="background:#fff7ed; color:#ea580c; font-weight:900; font-size:0.65rem; padding:0.4rem 0.8rem; border-radius:99px; display:inline-block; margin-bottom:1rem; text-transform:uppercase;">🌙 ${pkg.nights} Night Bundle</div>
                                    <h3 style="margin:0 0 0.4rem; font-size:1.2rem; font-weight:800;">${pkg.title}</h3>
                                    <p style="font-size:0.85rem; color:#64748b; margin-bottom:1.5rem;">${pkg.services || 'Inclusive amenities.'}</p>
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1.2rem; border-top:1.5px dashed #f1f5f9;">
                                        <span style="color:#d97706; font-weight:950; font-size:1.3rem;">${pkg.discount}% OFF</span>
                                        <span class="btn-primary" style="padding:0.6rem 1.2rem; border-radius:12px; font-size:0.8rem;">Select</span>
                                    </div>
                                </div>`).join('')}
                        </div>
                    </section>` : ''}

                    <section>
                         <h2 style="margin-bottom:1.5rem; font-size:1.5rem;">Property Amenities</h2>
                         <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:1.2rem;">
                            ${amenities.map(a => `<div style="display:flex; align-items:center; gap:0.8rem; font-size:1.1rem; background:white; padding:1.2rem; border-radius:16px; border:1px solid #f1f5f9;">
                                <span>${amenitiesIcons[a] || '✨'}</span>
                                <span style="font-weight:700; color:#334155;">${a}</span>
                            </div>`).join('')}
                         </div>
                    </section>
                </div>

                <div class="desktop-sidebar" style="position: sticky; top: 2rem;">
                    <div style="background:white; padding:2rem; border:1px solid #eee; border-radius:32px; box-shadow:0 20px 40px rgba(0,0,0,0.06);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                             <div>
                                <span style="font-size:1.9rem; font-weight:950; color:#d97706;">${currentPrice.toLocaleString()} Birr</span>
                                <span style="color:#64748b; font-weight:600;">/ night</span>
                             </div>
                             <div style="background:#fff7ed; color:#ea580c; padding:0.5rem 0.9rem; border-radius:14px; font-weight:900;">★ ${avgRating || 'New'}</div>
                        </div>

                        <div style="border:2px solid #f1f5f9; border-radius:18px; overflow:hidden; margin-bottom:1.8rem;">
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

                        <button id="final-reserve-trigger" class="btn-primary" 
                                style="width:100%; padding:1.5rem; font-size:1.3rem; border-radius:20px; font-weight:950; background:linear-gradient(135deg, var(--color-primary), #1e7e34); box-shadow:0 12px 24px rgba(11,102,70,0.25);"
                                onclick="window.michuFinalNav('${id}', document.getElementById('book-in').value, document.getElementById('book-out').value)">
                           Reserve Now
                        </button>
                        
                        <div id="price-summary-area" style="margin-top:1.8rem;"></div>
                    </div>
                </div>
            </div>

            <!-- MAP SECTION -->
            <section style="margin-top:4rem; padding-top:3rem; border-top:1px solid #f1f5f9;">
                 <h2 style="margin-bottom:1.5rem; font-size:1.6rem;">Location Map</h2>
                 <div style="width:100%; height:420px; border-radius:28px; overflow:hidden; border:2px solid #f1f5f9;">
                    <iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${encodeURIComponent(hotel.mapQuery || hotel.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed" allowfullscreen></iframe>
                 </div>
            </section>

            <!-- REVIEWS SECTION -->
            <section style="margin-top:4rem; padding-top:3rem; border-top:1px solid #f1f5f9;">
                 <h2 style="margin-bottom:2rem; font-size:1.6rem; display:flex; align-items:center; gap:0.8rem;">
                    <span style="color:#f59e0b;">★</span> Guest Reviews (${reviewCount})
                 </h2>
                 <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:2rem;">
                    ${reviews.length > 0 ? reviews.map(r => `
                        <div style="background:#f8fafc; padding:2rem; border-radius:24px; border:1px solid #f1f5f9;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.8rem;">
                                <strong style="font-size:1.1rem;">${r.userName || 'Guest'}</strong>
                                <div style="color:#f59e0b;">${'★'.repeat(r.rating)}</div>
                            </div>
                            <p style="font-style:italic; line-height:1.6; color:#475569; margin:0;">"${r.text || 'Enjoyed the stay!'}"</p>
                        </div>`).join('') : '<p style="color:#94a3b8;">No reviews yet.</p>'}
                 </div>
            </section>
        </div>

        <div id="gallery-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.96); z-index:10000; align-items:center; justify-content:center; flex-direction:column;">
             <button style="position:absolute; top:2rem; right:2rem; background:white; border:none; border-radius:50%; width:44px; height:44px; font-size:1.5rem; cursor:pointer;" onclick="document.getElementById('gallery-modal').style.display='none'">✕</button>
             <div id="gallery-container" style="max-width:90%; max-height:80vh;">
                <img id="gallery-main-img" src="" style="max-width:100%; max-height:80vh; border-radius:18px; object-fit:contain; display:none;">
                <video id="gallery-main-video" controls style="max-width:100%; max-height:80vh; border-radius:18px; display:none;"><source src="" type="video/mp4"></video>
             </div>
             <div id="gallery-thumbnails" style="margin-top:2.5rem; display:flex; gap:1rem; overflow-x:auto; padding:1rem; width:85%;"></div>
        </div>
    `;

    // --- LOGIC INITIALIZATION ---
    const bin = document.getElementById('book-in');
    const bout = document.getElementById('book-out');
    const summary = document.getElementById('price-summary-area');
    const mainBtn = document.getElementById('final-reserve-trigger');

    window.refreshMichuPricing = () => {
        const d1 = new Date(bin.value);
        const d2 = new Date(bout.value);
        const nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) || 0;
        
        let packageActive = false, disc = dPct, pName = '';
        const curPkg = (hotel.packages || []).find(p => parseInt(p.nights) === nights);
        if (curPkg) { disc = curPkg.discount; packageActive = true; pName = curPkg.title; }

        if (nights > 0) {
            const sub = (origPrice || currentPrice) * nights;
            const savings = Math.round(sub * (disc / 100));
            const total = sub - savings;
            
            mainBtn.innerText = packageActive ? 'Reserve Package' : 'Reserve Now';
            summary.innerHTML = `
                <div style="background:#f8fafc; padding:1.5rem; border-radius:22px; border:1px solid #f1f5f9;">
                    ${packageActive ? `<div style="color:#d97706; font-weight:950; font-size:0.7rem; margin-bottom:0.8rem; text-transform:uppercase;">✨ ${pName} APPLIED</div>` : ''}
                    <div style="display:flex; justify-content:space-between; color:#64748b; margin-bottom:0.6rem;">
                        <span>${currentPrice.toLocaleString()} x ${nights} nights</span>
                        <span>${sub.toLocaleString()} Birr</span>
                    </div>
                    ${disc > 0 ? `<div style="display:flex; justify-content:space-between; color:#d97706; font-weight:800; margin-bottom:1rem;"><span>Discount (${disc}%)</span><span>-${savings.toLocaleString()} Birr</span></div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-weight:950; font-size:1.5rem; border-top:1.5px solid #e2e8f0; padding-top:1rem; color:var(--color-primary);"><span>Total</span><span>${total.toLocaleString()} Birr</span></div>
                    <p style="text-align:right; font-size:0.65rem; color:#94a3b8; font-weight:700; margin-top:0.8rem;">Price includes all taxes & fees</p>
                </div>`;
        } else {
             mainBtn.innerText = 'Select Dates';
             summary.innerHTML = `<p style="text-align:center; color:#94a3b8; font-weight:700; font-size:0.85rem;">Select check-in/out to book</p>`;
        }
    };

    bin.onchange = window.refreshMichuPricing;
    bout.onchange = window.refreshMichuPricing;

    window.applyMichuPkg = (idx) => {
        const pkg = hotel.packages[idx];
        const start = new Date(bin.value);
        const end = new Date(start); 
        end.setDate(start.getDate() + parseInt(pkg.nights));
        bout.value = end.toISOString().split('T')[0];
        window.refreshMichuPricing();
        window.showToast(`✅ ${pkg.title} Activated! Check the total below.`);
    };

    // Initialize Dates
    const d1 = new Date(); const d2 = new Date(); d2.setDate(d1.getDate() + 1);
    bin.value = d1.toISOString().split('T')[0];
    bout.value = d2.toISOString().split('T')[0];
    window.refreshMichuPricing();

    // Gallery Logic
    const galleryItems = [...allImages.map(url => ({ type: 'image', url })), ...(videoUrl ? [{ type: 'video', url: videoUrl }] : [])];
    window.viewFullGallery = (idx) => {
        const modal = document.getElementById('gallery-modal');
        const thumbs = document.getElementById('gallery-thumbnails');
        modal.style.display = 'flex';
        thumbs.innerHTML = galleryItems.map((item, i) => `<div onclick="updateSelection(${i})" style="flex:0 0 100px; height:75px; border-radius:14px; overflow:hidden; cursor:pointer; border:2px solid #fff;">${item.type==='image'?`<img src='${item.url}' style='width:100%;height:100%;object-fit:cover;'>`:'📽️'}</div>`).join('');
        updateSelection(idx);
    };
    window.updateSelection = (idx) => {
        const img = document.getElementById('gallery-main-img');
        const vid = document.getElementById('gallery-main-video');
        const item = galleryItems[idx];
        img.style.display = 'none'; vid.style.display = 'none';
        if (item.type === 'image') { img.src = item.url; img.style.display = 'block'; }
        else { vid.querySelector('source').src = item.url; vid.load(); vid.style.display = 'block'; vid.play(); }
    };
});
