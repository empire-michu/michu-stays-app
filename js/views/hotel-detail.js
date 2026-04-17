window.router.addRoute('hotel_detail_view', async (container, params) => {
    const id = params.id;
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading Full Details...</div>`;
    
    const hotel = await window.db.getPropertyById(id, true);
    if (!hotel) {
        container.innerHTML = `<div class="container" style="padding:4rem;text-align:center;">Hotel not found.</div>`;
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
    let discountPercentage = Number(hotel.discountPercent || hotel.discount || 0);
    let originalPrice = hotel.originalPrice ? Number(String(hotel.originalPrice).replace(/[^\d.-]/g, '')) : 0;
    if (discountPercentage > 0 && (!originalPrice || originalPrice <= currentPrice)) {
        originalPrice = Math.round(currentPrice / (1 - (discountPercentage / 100)));
    }

    const amenitiesIcons = { 'WiFi': '📶', 'Pool': '🏊', 'Spa': '🧖', 'Breakfast': '🍳', 'Parking': '🚗', 'Gym': '💪', 'AC': '❄️', 'Bar': '🍸' };

    container.innerHTML = `
        <div class="container" style="padding-top:1.5rem; padding-bottom:5rem;">
            <!-- 1. Header & Title -->
            <div style="margin-bottom:1.5rem; color:#64748b; font-size:0.9rem;">
                <span style="cursor:pointer;" onclick="router.navigate('home')">Home</span> / <strong>${hotel.title}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="margin:0; font-size:2.4rem; color:var(--color-primary); letter-spacing:-0.8px;">${hotel.title}</h1>
                    <p style="margin:0.5rem 0 0; color:#64748b; font-weight:600; font-size:1.1rem;">📍 ${hotel.address}</p>
                </div>
            </div>

            <!-- 2. Gallery -->
            <style>
                .detail-gallery-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.8rem; height: 480px; margin-bottom: 2.5rem; border-radius:28px; overflow:hidden; }
                .detail-content-grid { display: grid; grid-template-columns: 1.8fr 1fr; gap: 3.5rem; align-items: start; }
                @media(max-width: 768px) {
                    .detail-gallery-grid { grid-template-columns: 1fr; height: 280px; }
                    .detail-gallery-grid > div:not(:first-child) { display: none; }
                    .detail-content-grid { grid-template-columns: 1fr; gap: 2rem; }
                }
            </style>
            <div class="detail-gallery-grid">
                <div style="background:url('${allImages[0]}') center/cover; cursor:pointer;" onclick="viewFullGallery(0)"></div>
                <div style="background:url('${allImages[1] || allImages[0]}') center/cover; cursor:pointer;" onclick="viewFullGallery(1)"></div>
                <div style="background:url('${allImages[2] || allImages[0]}') center/cover; cursor:pointer; position:relative;" onclick="viewFullGallery(2)">
                    ${allImages.length > 3 ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:white; font-size:2rem; font-weight:800; backdrop-filter:blur(3px);">+${allImages.length-3}</div>` : ''}
                </div>
            </div>

            <div class="detail-content-grid">
                <!-- Left Column -->
                <div>
                    ${videoUrl ? `<video controls style="width:100%; border-radius:24px; margin-bottom:2.5rem; background:#000; box-shadow:0 12px 35px rgba(0,0,0,0.1);"><source src="${videoUrl}" type="video/mp4"></video>` : ''}
                    
                    <section style="margin-bottom:2.5rem; padding-bottom:2.5rem; border-bottom:1px solid #f1f5f9;">
                        <h2 style="margin-bottom:1.2rem; font-size:1.6rem; color:#1a1a1a;">The Experience</h2>
                        <p style="line-height:1.8; color:#334155; white-space:pre-wrap; font-size:1.1rem;">${hotel.description}</p>
                    </section>

                    <!-- RESTORED: Special Packages Section -->
                    ${hotel.packages && hotel.packages.length > 0 ? `
                    <section style="margin-bottom:3rem; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding:2rem; border-radius:28px; border:1px solid #e2e8f0;">
                         <h2 style="margin-bottom:1.5rem; display:flex; align-items:center; gap:0.8rem; color:#d97706; font-size:1.5rem;">🎁 Exclusive Stay Packages</h2>
                         <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:1.5rem;">
                            ${hotel.packages.map((pkg, idx) => `
                                <div class="pkg-card" onclick="window.selectPkg(${idx})" style="background:white; border:2px solid #fff; border-radius:22px; padding:1.5rem; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.03); transition:transform 0.2s;">
                                    <div style="background:#fff7ed; color:#ea580c; font-weight:900; font-size:0.7rem; padding:0.4rem 0.8rem; border-radius:99px; display:inline-block; margin-bottom:1rem; text-transform:uppercase;">🌙 ${pkg.nights} Night Bundle</div>
                                    <h3 style="margin:0 0 0.5rem; font-size:1.2rem; font-weight:800;">${pkg.title}</h3>
                                    <p style="font-size:0.9rem; color:#64748b; margin-bottom:1.5rem; line-height:1.5;">${pkg.services || 'Premium services included.'}</p>
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1.2rem; border-top:2px dashed #f1f5f9;">
                                        <span style="color:#d97706; font-weight:950; font-size:1.3rem;">${pkg.discount}% OFF</span>
                                        <span class="btn-primary" style="padding:0.6rem 1.2rem; border-radius:12px; font-size:0.9rem;">Select</span>
                                    </div>
                                </div>`).join('')}
                         </div>
                    </section>` : ''}

                    <section style="margin-bottom:2.5rem;">
                         <h2 style="margin-bottom:1.5rem; font-size:1.6rem; color:#1a1a1a;">Popular Amenities</h2>
                         <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:1.2rem;">
                            ${amenities.map(a => `<div style="display:flex; align-items:center; gap:1rem; font-size:1.1rem; background:#fff; padding:1.2rem; border-radius:18px; border:1.5px solid #f1f5f9; box-shadow:0 4px 6px rgba(0,0,0,0.02);">
                                <span style="font-size:1.5rem;">${amenitiesIcons[a] || '✨'}</span>
                                <span style="font-weight:700; color:#334155;">${a}</span>
                            </div>`).join('')}
                         </div>
                    </section>
                </div>

                <!-- Right Column (Sidebar) -->
                <div style="position: sticky; top: 2rem;">
                    <div style="background:white; padding:2.5rem; border:1.5px solid #f1f5f9; border-radius:32px; box-shadow:0 25px 50px rgba(0,0,0,0.08);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                             <div>
                                <span style="font-size:2.2rem; font-weight:950; color:#d97706; letter-spacing:-1.2px;">${currentPrice.toLocaleString()} Birr</span>
                                <span style="color:#64748b; font-weight:600; font-size:1rem;"> / night</span>
                             </div>
                             <div style="background:#fff7ed; color:#ea580c; padding:0.6rem 1rem; border-radius:14px; font-weight:900; border:1px solid #ffedd5;">
                                ★ ${avgRating || 'New'}
                             </div>
                        </div>

                        <div style="border:2px solid #f1f5f9; border-radius:20px; overflow:hidden; margin-bottom:2rem; background:#fdfdfd;">
                             <div style="display:grid; grid-template-columns:1fr 1fr;">
                                <div style="padding:1.2rem; border-right:1px solid #f1f5f9;">
                                    <label style="display:block; font-size:0.75rem; font-weight:900; color:#94a3b8; text-transform:uppercase; margin-bottom:0.4rem;">Check-in</label>
                                    <input type="date" id="book-in" style="border:none; width:100%; font-weight:800; font-size:1.05rem; background:transparent; outline:none;">
                                </div>
                                <div style="padding:1.2rem;">
                                    <label style="display:block; font-size:0.75rem; font-weight:900; color:#94a3b8; text-transform:uppercase; margin-bottom:0.4rem;">Check-out</label>
                                    <input type="date" id="book-out" style="border:none; width:100%; font-weight:800; font-size:1.05rem; background:transparent; outline:none;">
                                </div>
                             </div>
                        </div>

                        <!-- ULTIMATE FIX: The Reserve Button as a REAL LINK -->
                        <a id="reserve-navigator-link" href="#" class="btn-primary" 
                           style="display:block; text-align:center; width:100%; padding:1.6rem; font-size:1.4rem; border-radius:22px; font-weight:900; text-decoration:none; background:linear-gradient(135deg, var(--color-primary), #1e7e34); box-shadow:0 15px 30px rgba(11,102,70,0.25);">
                           Reserve Now
                        </a>
                        
                        <div id="booking-price-summary" style="margin-top:2rem;"></div>
                    </div>
                </div>
            </div>

            <!-- Maps & Reviews (Keeping them safe) -->
            <section style="margin-top:5rem; padding-top:4rem; border-top:1.5px solid #f1f5f9;">
                 <h2 style="margin-bottom:1.5rem; font-size:1.8rem;">Location Map</h2>
                 <div style="width:100%; height:450px; border-radius:32px; overflow:hidden; border:2px solid #f1f5f9; box-shadow:0 15px 30px rgba(0,0,0,0.04);">
                    <iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${encodeURIComponent(hotel.mapQuery || hotel.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed" allowfullscreen></iframe>
                 </div>
            </section>

            <section style="margin-top:5rem; padding-top:4rem; border-top:1.5px solid #f1f5f9;">
                 <h2 style="margin-bottom:2.5rem; font-size:1.8rem;">Guest Stories (${reviewCount})</h2>
                 <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap:2.5rem;">
                    ${reviews.length > 0 ? reviews.map(r => `
                        <div style="background:#f8fafc; padding:2.5rem; border-radius:28px; border:1px solid #f1f5f9;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                                <strong style="font-size:1.2rem;">${r.userName || 'Michu Guest'}</strong>
                                <div style="color:#f59e0b;">${'★'.repeat(r.rating)}</div>
                            </div>
                            <p style="font-style:italic; line-height:1.7; color:#475569; margin:0; font-size:1.05rem;">"${r.text || 'A wonderful stay!'}"</p>
                        </div>`).join('') : '<p style="color:#94a3b8; font-size:1.2rem;">No reviews yet. Be the first!</p>'}
                 </div>
            </section>
        </div>

        <!-- Fullscreen Gallery Modal -->
        <div id="gallery-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.98); z-index:10000; align-items:center; justify-content:center; flex-direction:column; backdrop-filter:blur(12px);">
             <button style="position:absolute; top:2rem; right:2rem; background:white; border:none; border-radius:50%; width:54px; height:54px; font-size:2rem; cursor:pointer;" onclick="document.getElementById('gallery-modal').style.display='none'">✕</button>
             <div id="gallery-container" style="max-width:92%; max-height:82vh;">
                <img id="gallery-main-img" src="" style="max-width:100%; max-height:82vh; border-radius:20px; object-fit:contain; display:none;">
                <video id="gallery-main-video" controls style="max-width:100%; max-height:82vh; border-radius:20px; display:none;"><source src="" type="video/mp4"></video>
             </div>
             <div id="gallery-thumbnails" style="margin-top:2.5rem; display:flex; gap:1.2rem; overflow-x:auto; padding:1.2rem; width:85%;"></div>
        </div>
    `;

    // --- LOGIC BINDING ---
    const bin = document.getElementById('book-in');
    const bout = document.getElementById('book-out');
    const summary = document.getElementById('booking-price-summary');
    const reserveLink = document.getElementById('reserve-navigator-link');

    // Function to update the REAL LINK href and the price summary
    window.syncBookingState = () => {
        const d1 = new Date(bin.value);
        const d2 = new Date(bout.value);
        const nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) || 0;
        
        let disc = discountPercentage;
        let pTitle = '';
        const matchingPkg = (hotel.packages || []).find(p => parseInt(p.nights) === nights);
        if (matchingPkg) { disc = matchingPkg.discount; pTitle = matchingPkg.title; }

        // Update the REAL LINK Href
        const targetHash = `booking_payment?propertyId=${id}&checkIn=${bin.value}&checkOut=${bout.value}`;
        reserveLink.href = `#${targetHash}`;

        if (nights > 0) {
            const sub = (originalPrice || currentPrice) * nights;
            const dAmt = Math.round(sub * (disc / 100));
            const total = sub - dAmt;
            
            reserveLink.innerText = pTitle ? 'Reserve Package' : 'Reserve Now';
            summary.innerHTML = `
                <div style="background:#f8fafc; padding:1.6rem; border-radius:22px; border:1px solid #f1f5f9;">
                    ${pTitle ? `<div style="color:#d97706; font-weight:900; font-size:0.75rem; margin-bottom:0.8rem; text-transform:uppercase;">✨ ${pTitle} Applied</div>` : ''}
                    <div style="display:flex; justify-content:space-between; color:#64748b; margin-bottom:0.8rem;">
                        <span>${currentPrice.toLocaleString()} x ${nights} nights</span>
                        <span>${sub.toLocaleString()} Birr</span>
                    </div>
                    ${disc > 0 ? `<div style="display:flex; justify-content:space-between; color:#d97706; font-weight:800; margin-bottom:1.2rem;"><span>Discount (${disc}%)</span><span>-${dAmt.toLocaleString()} Birr</span></div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-weight:950; font-size:1.6rem; border-top:2px solid #e2e8f0; padding-top:1.2rem; color:var(--color-primary);"><span>Total</span><span>${total.toLocaleString()} Birr</span></div>
                </div>`;
        } else {
             reserveLink.innerText = 'Select Stay Dates';
             summary.innerHTML = `<p style="text-align:center; color:#94a3b8; font-weight:700; font-size:0.9rem;">Please select check-in and check-out dates</p>`;
        }
    };

    bin.onchange = window.syncBookingState;
    bout.onchange = window.syncBookingState;

    window.selectPkg = (idx) => {
        const pkg = hotel.packages[idx];
        const start = new Date(bin.value);
        const end = new Date(start); end.setDate(start.getDate() + parseInt(pkg.nights));
        bout.value = end.toISOString().split('T')[0];
        window.syncBookingState();
        window.showToast(`✅ ${pkg.title} Selected! Scroll down to confirm.`);
    };

    // Initialize Dates
    const d1 = new Date(); const d2 = new Date(); d2.setDate(d1.getDate() + 1);
    bin.value = d1.toISOString().split('T')[0];
    bout.value = d2.toISOString().split('T')[0];
    window.syncBookingState();

    // Gallery Logic
    const galleryItems = [...allImages.map(url => ({ type: 'image', url })), ...(videoUrl ? [{ type: 'video', url: videoUrl }] : [])];
    window.viewFullGallery = (idx) => {
        const modal = document.getElementById('gallery-modal');
        const thumbs = document.getElementById('gallery-thumbnails');
        modal.style.display = 'flex';
        thumbs.innerHTML = galleryItems.map((item, i) => `<div onclick="updateGallerySelection(${i})" style="flex:0 0 110px; height:80px; border-radius:14px; overflow:hidden; cursor:pointer; border:2px solid #fff;">${item.type==='image'?`<img src='${item.url}' style='width:100%;height:100%;object-fit:cover;'>`:'📽️'}</div>`).join('');
        updateGallerySelection(idx);
    };
    window.updateGallerySelection = (idx) => {
        const img = document.getElementById('gallery-main-img');
        const vid = document.getElementById('gallery-main-video');
        const item = galleryItems[idx];
        img.style.display = 'none'; vid.style.display = 'none';
        if (item.type === 'image') { img.src = item.url; img.style.display = 'block'; }
        else { vid.querySelector('source').src = item.url; vid.load(); vid.style.display = 'block'; vid.play(); }
    };
});
