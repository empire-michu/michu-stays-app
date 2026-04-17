window.router.addRoute('hotel_detail_view', async (container, params) => {
    const id = params.id;
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading Property Details...</div>`;
    
    // --- 1. THE ULTIMATE BOOKING HANDLER ---
    window.michuReserveFinal = (pId) => {
        const bin = document.getElementById('book-in');
        const bout = document.getElementById('book-out');
        
        if (!bin || !bout || !bin.value || !bout.value) {
            window.showToast('Please select dates first');
            return;
        }

        const nights = Math.ceil((new Date(bout.value) - new Date(bin.value)) / (1000 * 60 * 60 * 24));
        if (nights <= 0) {
            window.showToast('Invalid stay duration');
            return;
        }

        const path = `booking_payment?propertyId=${pId}&checkIn=${bin.value}&checkOut=${bout.value}`;
        
        // Triple-Redundant Navigation
        try {
            console.log("Attempting Navigate:", path);
            window.router.navigate('booking_payment', { propertyId: pId, checkIn: bin.value, checkOut: bout.value });
        } catch(e) {
            console.warn("Router Navigate Failed, trying Hash:", path);
            window.location.hash = `#${path}`;
        }
    };

    const hotel = await window.db.getPropertyById(id, true);
    if (!hotel) {
        container.innerHTML = `<div class="container" style="padding:4rem;text-align:center;">Property not found. <button class="btn-primary" onclick="router.navigate('home')">Back Home</button></div>`;
        return;
    }

    // Dynamic SEO
    window.router.updateSEO({
        title: `${hotel.title} - Michu Stays`,
        description: hotel.description ? hotel.description.substring(0, 160) : `Book ${hotel.title} on Michu Stays.`,
        image: hotel.image
    });

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
        <div class="container" style="padding-top:1.5rem; padding-bottom:4rem;">
            <!-- Breadcrumbs -->
            <div style="margin-bottom:1.5rem; color:#64748b; font-size:0.9rem;">
                <span style="cursor:pointer;" onclick="router.navigate('home')">Home</span> / <strong>${hotel.title}</strong>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="margin:0; font-size:2rem; color:var(--color-primary); letter-spacing:-0.5px;">${hotel.title}</h1>
                    <p style="margin:0.5rem 0 0; color:#64748b; font-weight:600; font-size:1.1rem;">📍 ${hotel.address}</p>
                </div>
                <button class="btn-outline" onclick="window.print()">🖨 Print Details</button>
            </div>

            <!-- Gallery -->
            <style>
                .detail-gallery-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.8rem; height: 450px; margin-bottom: 2.5rem; border-radius:24px; overflow:hidden; }
                .detail-content-grid { display: grid; grid-template-columns: 1.8fr 1fr; gap: 3.5rem; align-items: start; }
                @media(max-width: 768px) {
                    .detail-gallery-grid { grid-template-columns: 1fr; height: 300px; }
                    .detail-gallery-grid > div:not(:first-child) { display: none; }
                    .detail-content-grid { grid-template-columns: 1fr; gap: 2rem; }
                }
            </style>
            <div class="detail-gallery-grid">
                <div style="background:url('${allImages[0]}') center/cover; cursor:pointer;" onclick="viewFullGallery(0)"></div>
                <div style="background:url('${allImages[1] || allImages[0]}') center/cover; cursor:pointer;" onclick="viewFullGallery(1)"></div>
                <div style="background:url('${allImages[2] || allImages[0]}') center/cover; cursor:pointer; position:relative;" onclick="viewFullGallery(2)">
                    ${allImages.length > 3 ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:white; font-size:1.8rem; font-weight:800; backdrop-filter:blur(2px);">+${allImages.length-3}</div>` : ''}
                </div>
            </div>

            <div class="detail-content-grid">
                <!-- Main Content -->
                <div>
                    ${videoUrl ? `<video id="detail-vid" controls style="width:100%; border-radius:20px; margin-bottom:2.5rem; background:#000; box-shadow:0 10px 30px rgba(0,0,0,0.15);"><source src="${videoUrl}" type="video/mp4"></video>` : ''}
                    
                    <section style="margin-bottom:2.5rem; padding-bottom:2.5rem; border-bottom:1px solid #f1f5f9;">
                         <h2 style="margin-bottom:1.2rem; font-size:1.5rem;">The Experience</h2>
                         <p style="line-height:1.8; color:var(--color-text-dark); white-space:pre-wrap; font-size:1.05rem;">${hotel.description}</p>
                    </section>

                    <section style="margin-bottom:2.5rem;">
                         <h2 style="margin-bottom:1.5rem; font-size:1.5rem;">Top Amenities</h2>
                         <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:1.5rem;">
                            ${amenities.map(a => `<div style="display:flex; align-items:center; gap:1rem; font-size:1.1rem; background:#f8fafc; padding:1rem; border-radius:14px; border:1px solid #f1f5f9;">
                                <span style="font-size:1.4rem;">${amenitiesIcons[a] || '✨'}</span>
                                <span style="font-weight:600; color:#334155;">${a}</span>
                            </div>`).join('')}
                         </div>
                    </section>
                </div>

                <!-- Sidebar (Booking) -->
                <div>
                    <div style="background:white; padding:2.5rem; border:1.5px solid #f1f5f9; border-radius:32px; box-shadow:0 20px 40px rgba(0,0,0,0.06); position:sticky; top:2rem;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                             <div>
                                <span style="font-size:2rem; font-weight:950; color:#d97706; letter-spacing:-1px;">${currentPrice.toLocaleString()} Birr</span>
                                <span style="color:#64748b; font-weight:600;">/ night</span>
                             </div>
                             <div style="background:#fff7ed; color:#ea580c; padding:0.5rem 1rem; border-radius:14px; font-weight:800; border:1px solid #ffedd5;">
                                ★ ${avgRating || 'New'}
                             </div>
                        </div>

                        <div style="border:2px solid #f1f5f9; border-radius:18px; overflow:hidden; margin-bottom:1.8rem;">
                             <div style="display:grid; grid-template-columns:1fr 1fr; background:#fdfdfd;">
                                <div style="padding:1rem; border-right:1px solid #f1f5f9;">
                                    <label style="display:block; font-size:0.7rem; font-weight:900; color:#94a3b8; text-transform:uppercase; margin-bottom:0.2rem;">Check-in</label>
                                    <input type="date" id="book-in" style="border:none; width:100%; font-weight:800; font-size:1rem; background:transparent; outline:none;">
                                </div>
                                <div style="padding:1rem;">
                                    <label style="display:block; font-size:0.7rem; font-weight:900; color:#94a3b8; text-transform:uppercase; margin-bottom:0.2rem;">Check-out</label>
                                    <input type="date" id="book-out" style="border:none; width:100%; font-weight:800; font-size:1rem; background:transparent; outline:none;">
                                </div>
                             </div>
                        </div>

                        <button id="real-reserve-btn" class="btn-primary" 
                                style="width:100%; padding:1.5rem; font-size:1.3rem; border-radius:20px; font-weight:900; background:linear-gradient(135deg, var(--color-primary), #1e7e34); box-shadow:0 12px 24px rgba(11,102,70,0.2);"
                                onclick="window.michuReserveFinal('${id}')">Reserve Now</button>
                        
                        <div id="price-summary-box" style="margin-top:2rem;"></div>
                    </div>
                </div>
            </div>

            <!-- Restored Maps Section -->
            <section style="margin-top:4rem; padding-top:3rem; border-top:1px solid #f1f5f9;">
                 <h2 style="margin-bottom:1.5rem; font-size:1.6rem;">Location Overview</h2>
                 <div style="width:100%; height:400px; border-radius:28px; overflow:hidden; border:2px solid #f1f5f9; box-shadow:0 10px 20px rgba(0,0,0,0.03);">
                    <iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${encodeURIComponent(hotel.mapQuery || hotel.address || hotel.title)}&t=&z=15&ie=UTF8&iwloc=&output=embed" allowfullscreen></iframe>
                 </div>
            </section>

            <!-- Restored Reviews Section -->
            <section style="margin-top:4rem; padding-top:3rem; border-top:1px solid #f1f5f9;">
                 <h2 style="margin-bottom:2rem; font-size:1.6rem; display:flex; align-items:center; gap:0.8rem;">
                    <span style="color:#f59e0b;">★</span> Guest Reviews (${reviewCount})
                 </h2>
                 <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:2rem;">
                    ${reviews.length > 0 ? reviews.map(r => `
                        <div style="background:#f8fafc; padding:2rem; border-radius:24px; border:1px solid #f1f5f9;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.8rem;">
                                <strong style="font-size:1.1rem;">${r.userName || 'Guest'}</strong>
                                <div style="color:#f59e0b;">${'★'.repeat(r.rating)}</div>
                            </div>
                            <p style="font-style:italic; line-height:1.6; color:#475569; margin:0;">"${r.text || 'Excellent property and service!'}"</p>
                        </div>`).join('') : '<p style="color:#94a3b8; font-size:1.1rem;">Be the first to leave a review!</p>'}
                 </div>
            </section>
        </div>

        <!-- Gallery Modal -->
        <div id="gallery-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.95); z-index:10000; align-items:center; justify-content:center; flex-direction:column; backdrop-filter:blur(10px);">
             <button style="position:absolute; top:2rem; right:2rem; background:white; border:none; border-radius:50%; width:50px; height:50px; font-size:1.8rem; cursor:pointer; font-weight:800;" onclick="document.getElementById('gallery-modal').style.display='none'">✕</button>
             <div id="gallery-container" style="max-width:90%; max-height:80vh;">
                <img id="gallery-main-img" src="" style="max-width:100%; max-height:80vh; border-radius:16px; object-fit:contain; display:none;">
                <video id="gallery-main-video" controls style="max-width:100%; max-height:80vh; border-radius:16px; display:none;"><source src="" type="video/mp4"></video>
             </div>
             <div id="gallery-thumbnails" style="margin-top:2.5rem; display:flex; gap:1rem; overflow-x:auto; padding:1rem; width:85%;"></div>
        </div>
    `;

    // --- 2. LOGIC INITIALIZATION ---
    const bin = document.getElementById('book-in');
    const bout = document.getElementById('book-out');
    const summary = document.getElementById('price-summary-box');

    window.updatePrice = () => {
        const d1 = new Date(bin.value);
        const d2 = new Date(bout.value);
        const nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) || 0;
        
        if (nights > 0) {
            const sub = (originalPrice || currentPrice) * nights;
            const dAmt = Math.round(sub * (discountPercentage / 100));
            const total = sub - dAmt;
            
            summary.innerHTML = `
                <div style="background:#f8fafc; padding:1.5rem; border-radius:20px; border:1px solid #f1f5f9;">
                    <div style="display:flex; justify-content:space-between; color:#64748b; margin-bottom:0.6rem;">
                        <span>${currentPrice.toLocaleString()} x ${nights} nights</span>
                        <span>${sub.toLocaleString()} Birr</span>
                    </div>
                    ${discountPercentage > 0 ? `
                    <div style="display:flex; justify-content:space-between; color:#d97706; font-weight:800; margin-bottom:1rem;">
                        <span>Special Discount (${discountPercentage}%)</span>
                        <span>-${dAmt.toLocaleString()} Birr</span>
                    </div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-weight:950; font-size:1.5rem; border-top:1.5px solid #e2e8f0; padding-top:1rem; color:var(--color-primary); letter-spacing:-0.5px;">
                        <span>Total</span>
                        <span>${total.toLocaleString()} Birr</span>
                    </div>
                    <p style="text-align:right; font-size:0.65rem; color:#94a3b8; margin:0.8rem 0 0; font-weight:700;">Prices include 15% VAT & Service Fees</p>
                </div>`;
        } else {
             summary.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:1rem; font-weight:600;">Pick your dates for pricing</div>`;
        }
    };

    bin.onchange = window.updatePrice;
    bout.onchange = window.updatePrice;

    // Gallery Logic
    const galleryItems = [...allImages.map(url => ({ type: 'image', url })), ...(videoUrl ? [{ type: 'video', url: videoUrl }] : [])];
    window.viewFullGallery = (idx) => {
        const modal = document.getElementById('gallery-modal');
        const thumbs = document.getElementById('gallery-thumbnails');
        modal.style.display = 'flex';
        thumbs.innerHTML = galleryItems.map((item, i) => `<div onclick="updateGallerySelection(${i})" style="flex:0 0 100px; height:70px; border-radius:12px; overflow:hidden; border:2px solid white; cursor:pointer;">${item.type==='image'?`<img src='${item.url}' style='width:100%;height:100%;object-fit:cover;'>`:'📽️'}</div>`).join('');
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

    // Defaults
    const d1 = new Date(); const d2 = new Date(); d2.setDate(d1.getDate() + 1);
    bin.value = d1.toISOString().split('T')[0];
    bout.value = d2.toISOString().split('T')[0];
    window.updatePrice();
});
