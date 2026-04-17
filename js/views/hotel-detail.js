window.router.addRoute('hotel_detail_view', async (container, params) => {
    const id = params.id;
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading Hotel Details...</div>`;
    
    // --- 1. ROBUST BOOKING HANDLER (Global Scope) ---
    window.goToBooking = () => {
        const bin = document.getElementById('book-in');
        const bout = document.getElementById('book-out');
        if (!bin || !bout || !bin.value || !bout.value) {
            window.showToast('Please select check-in and check-out dates');
            return;
        }
        const nights = Math.ceil((new Date(bout.value) - new Date(bin.value)) / (1000 * 60 * 60 * 24));
        if (nights <= 0) {
            window.showToast('Check-out date must be after check-in date');
            return;
        }
        window.showToast('⏳ Initiating your booking...', 2000);
        window.router.navigate('booking_payment', { propertyId: id, checkIn: bin.value, checkOut: bout.value });
    };

    const hotel = await window.db.getPropertyById(id, true);
    if (!hotel) {
        container.innerHTML = `<div class="container" style="padding:4rem;text-align:center;">Hotel not found. <button class="btn-primary" onclick="router.navigate('home')">Back Home</button></div>`;
        return;
    }

    // Dynamic SEO
    window.router.updateSEO({
        title: `${hotel.title} - Hotel in ${hotel.address || 'Dire Dawa'}`,
        description: hotel.description ? hotel.description.substring(0, 160).replace(/\n/g, ' ') + '...' : `Book your stay at ${hotel.title} in Dire Dawa on Michu Stays.`,
        image: hotel.image
    });

    const allImages = hotel.images || [hotel.image, ...(hotel.extraImages || [])].filter(Boolean);
    const amenities = hotel.amenities || [];
    const videoUrl = hotel.videoTour || '';

    let reviews = [], avgRating = 0, reviewCount = 0;
    try {
        reviews = await window.db.getReviews(id);
        if (reviews.length > 0) {
            avgRating = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
            reviewCount = reviews.length;
        }
    } catch(e) { console.warn('Reviews load error:', e); }

    const currentPrice = Number(String(hotel.price || 0).replace(/[^\d.-]/g, ''));
    let discountPercentage = 0;
    if (hotel.discountPercent !== undefined && hotel.discountPercent !== null) {
        discountPercentage = Number(hotel.discountPercent) || 0;
    } else if (hotel.discount !== undefined && hotel.discount !== null) {
        discountPercentage = Number(hotel.discount) || 0;
    }
    
    let originalPrice = hotel.originalPrice ? Number(String(hotel.originalPrice).replace(/[^\d.-]/g, '')) : 0;
    if (discountPercentage > 0) {
        const calculatedOriginal = Math.round(currentPrice / (1 - (discountPercentage / 100)));
        if (!originalPrice || originalPrice <= currentPrice) originalPrice = calculatedOriginal;
    }

    const hasDiscount = discountPercentage > 0 && originalPrice > currentPrice;
    const distance = hotel.distanceFromCenter ? parseFloat(hotel.distanceFromCenter) : 0;

    let minEffectiveRate = currentPrice;
    if (hotel.packages && hotel.packages.length > 0) {
        const calcBase = originalPrice || currentPrice;
        hotel.packages.forEach(pkg => {
            const n = parseInt(pkg.nights) || 1;
            const d = parseInt(pkg.discount) || 0;
            const total = (calcBase * n) - Math.round((calcBase * n) * (d / 100));
            const eff = Math.round(total / n);
            if (minEffectiveRate === currentPrice || eff < minEffectiveRate) minEffectiveRate = eff;
        });
    }

    const amenitiesIcons = { 'WiFi': '📶', 'Pool': '🏊', 'Spa': '🧖', 'Breakfast': '🍳', 'Parking': '🚗', 'Gym': '💪', 'AC': '❄️', 'Bar': '🍸' };

    container.innerHTML = `
        <style>
            .detail-gallery-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.8rem; height: 450px; margin-bottom: 2rem; }
            .detail-content-grid { display: grid; grid-template-columns: 1.8fr 1fr; gap: 3rem; align-items: start; }
            @media(max-width: 768px) {
                .detail-gallery-grid { grid-template-columns: 1fr; grid-template-rows: 250px 100px; height: auto; }
                .detail-gallery-grid > div:nth-child(2), .detail-gallery-grid > div:nth-child(3) { display: none; }
                .detail-content-grid { grid-template-columns: 1fr; gap: 1rem; }
            }
            @keyframes pulse-glow {
                from { box-shadow: 0 0 10px rgba(11,102,70,0.3); transform: scale(1); }
                to { box-shadow: 0 0 20px rgba(197,157,63,0.5); transform: scale(1.02); }
            }
        </style>
        <div class="container" style="padding-top:1.5rem; padding-bottom:3rem;">
            <div style="margin-bottom:1.5rem; color:var(--color-text-light); font-size:0.9rem;">
                <span style="cursor:pointer;" onclick="router.navigate('home')">Home</span> / 
                <span style="color:var(--color-text-dark); font-weight:600;">${hotel.title}</span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="margin:0; font-size:1.8rem; color:var(--color-primary);">${hotel.title}</h1>
                    <p style="margin:0.3rem 0 0; color:var(--color-text-light); font-weight:600;">📍 ${hotel.address} ${distance > 0 ? `· ${distance} km from centre` : ''}</p>
                </div>
                <div style="display:flex; gap:0.8rem;">
                    <button class="btn-outline" style="padding:0.4rem 1rem;" onclick="window.print()">🖨 Print</button>
                </div>
            </div>

            <div class="detail-gallery-grid">
                <div style="background:url('${allImages[0] || ''}') center/cover; border-radius:16px; cursor:pointer;" onclick="viewFullGallery(0)"></div>
                <div style="display:grid; grid-template-rows: 1fr 1fr; gap:0.8rem;">
                    <div style="background:url('${allImages[1] || allImages[0]}') center/cover; cursor:pointer;" onclick="viewFullGallery(1)"></div>
                    <div style="background:url('${allImages[2] || allImages[0]}') center/cover; cursor:pointer;" onclick="viewFullGallery(2)"></div>
                </div>
                <div style="display:grid; grid-template-rows: 1fr 1fr; gap:0.8rem;">
                    <div style="background:url('${allImages[3] || allImages[0]}') center/cover; border-radius:0 16px 0 0; cursor:pointer;" onclick="viewFullGallery(3)"></div>
                    <div style="position:relative; background:url('${allImages[4] || allImages[0]}') center/cover; border-radius:0 0 16px 0; cursor:pointer;" onclick="viewFullGallery(4)">
                        ${allImages.length > 5 ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:white; font-size:1.2rem; font-weight:800; border-radius:0 0 16px 0;">+${allImages.length - 5} More</div>` : ''}
                    </div>
                </div>
            </div>

            <div class="detail-content-grid">
                <div>
                     ${videoUrl ? `
                    <div style="margin-bottom:2rem; width:100%; border-radius:18px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.1); background:#000;">
                        <video controls style="width:100%; display:block; aspect-ratio:16/9;"><source src="${videoUrl}" type="video/mp4"></video>
                    </div>` : ''}

                    <section style="margin-bottom:2rem; padding-bottom:2rem; border-bottom:1px solid #eee;">
                        <h2 style="margin-bottom:1rem;">About this ${hotel.type || 'Property'}</h2>
                        <p style="line-height:1.7; color:var(--color-text-dark); white-space:pre-wrap;">${hotel.description || 'Experience comfort and style in the heart of the city.'}</p>
                    </section>

                    ${hotel.packages && hotel.packages.length > 0 ? `
                    <section style="margin-bottom:2rem; background:#f8fafc; padding:1.2rem; border-radius:20px; border:1px solid #e2e8f0;">
                         <h2 style="margin-bottom:1rem; display:flex; align-items:center; gap:0.6rem; color:var(--color-primary); font-size:1.2rem;">🎁 Special Stay Packages</h2>
                         <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
                            ${hotel.packages.map((pkg, idx) => `
                                <div class="pkg-card" onclick="window.selectPkg(${idx})" style="background:white; border:2.2px solid #edf2f7; border-radius:20px; padding:1.2rem; cursor:pointer; position:relative; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 4px 6px rgba(0,0,0,0.02); transition:all 0.3s ease;">
                                    <div style="position:absolute; top:0; right:0; background:linear-gradient(135deg, #f59e0b 0%, #d4af37 100%); color:white; font-weight:900; padding:0.3rem 0.8rem; border-bottom-left-radius:15px; font-size:0.75rem;">Save Deal</div>
                                    <div style="background:#e0f2fe; color:#0369a1; font-weight:900; font-size:0.65rem; padding:0.3rem 0.6rem; border-radius:99px; display:inline-block; align-self:flex-start; margin-bottom:0.8rem; text-transform:uppercase;">🌙 ${pkg.nights} Nights Bundle</div>
                                    <h3 style="margin:0 0 0.4rem; font-size:1.1rem; font-weight:800; color:var(--color-text-dark);">${pkg.title}</h3>
                                    <div style="font-size:0.85rem; color:#64748b; margin-bottom:1rem; flex-grow:1;">${pkg.services || 'Premium inclusives.'}</div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1rem; border-top:1.5px dashed #f1f5f9;">
                                        <div style="color:#d97706; font-weight:950; font-size:1.1rem;">${pkg.discount}% OFF</div>
                                        <div class="btn-primary" style="padding:0.5rem 1rem; border-radius:12px; font-size:0.8rem; font-weight:800;">Select</div>
                                    </div>
                                </div>`).join('')}
                         </div>
                    </section>` : ''}

                    <section>
                        <h2 style="margin-bottom:1.5rem;">What this place offers</h2>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.2rem;">
                            ${amenities.length > 0 ? amenities.map(a => `<div style="display:flex; align-items:center; gap:0.8rem; font-size:1.1rem;"><span>${amenitiesIcons[a] || '✨'}</span><span>${a}</span></div>`).join('') : '<p>All standard amenities included.</p>'}
                        </div>
                    </section>
                </div>

                <div class="desktop-sidebar" style="position: sticky; top: 2rem; height: fit-content;">
                    <div id="booking-widget-main" style="background:white; padding:2rem; border:1.5px solid #eee; border-radius:28px; box-shadow:0 15px 35px rgba(0,0,0,0.06);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                            <div>
                                <span style="font-size:1.85rem; font-weight:950; color:#d97706; letter-spacing: -0.04em;">${hotel.eventMode ? minEffectiveRate.toLocaleString() : currentPrice.toLocaleString()} Birr</span>
                                <span style="color:var(--color-text-light); font-size:0.95rem; font-weight:600;"> / night</span>
                            </div>
                            <div style="font-size:1rem; font-weight:800; background:#fff8e1; color:#e37400; padding:0.4rem 0.8rem; border-radius:12px; display:flex; align-items:center; gap:0.4rem; border:1px solid #ffecb3;">
                                <span style="color:#f59e0b; font-size:1.2rem;">★</span> ${avgRating > 0 ? avgRating : 'New'}
                            </div>
                        </div>

                        ${(() => {
                            const avail = hotel.availableRooms ?? hotel.totalRooms ?? 0;
                            return `<div style="background:${avail > 0 ? '#e6f4ea' : '#fce8e6'}; padding:1rem; border-radius:16px; margin-bottom:1.5rem; display:flex; align-items:center; gap:0.8rem; color:${avail > 0 ? '#1e7e34' : '#c5221f'}; font-weight:800;">
                                <span>${avail > 0 ? '🏨' : '🚫'}</span> ${avail > 0 ? `${avail} rooms available` : 'Fully booked'}
                            </div>`;
                        })()}

                        <div style="border:1.8px solid #f1f5f9; border-radius:16px; overflow:hidden; margin-bottom:1.5rem;">
                            <div style="display:grid; grid-template-columns:1fr 1fr;">
                                <div style="padding:1rem; border-right:1.8px solid #f1f5f9;">
                                    <div style="font-weight:900; font-size:0.65rem; text-transform:uppercase; color:#64748b; margin-bottom:0.3rem;">Check-in</div>
                                    <input type="date" id="book-in" style="border:none; width:100%; font-size:0.95rem; font-weight:700; outline:none;">
                                </div>
                                <div style="padding:1rem;">
                                    <div style="font-weight:900; font-size:0.65rem; text-transform:uppercase; color:#64748b; margin-bottom:0.3rem;">Check-out</div>
                                    <input type="date" id="book-out" style="border:none; width:100%; font-size:0.95rem; font-weight:700; outline:none;">
                                </div>
                            </div>
                        </div>

                        <button id="standard-reserve-btn" class="btn-primary" style="width:100%; padding:1.4rem; font-size:1.25rem; border-radius:18px; font-weight:800; background:linear-gradient(135deg, var(--color-primary), #1e7e34);" onclick="window.goToBooking()">Reserve Now</button>
                        
                        <div id="price-summary" style="margin-top:1.5rem;"></div>
                    </div>
                </div>
            </div>

            <!-- Restored Sections -->
            <section style="margin-top:3rem; padding-top:2rem; border-top:1px solid #eee;">
                <h2 style="margin-bottom:1.2rem;">Where you'll be</h2>
                <div style="width:100%; height:380px; border-radius:24px; overflow:hidden; border:1px solid #eee;">
                    <iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${encodeURIComponent(hotel.mapQuery || hotel.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed" allowfullscreen></iframe>
                </div>
            </section>

            <section style="margin-top:3rem; padding-top:2rem; border-top:1px solid #eee;">
                <h2 style="margin-bottom:1.5rem;">Guest Reviews (${reviewCount})</h2>
                <div style="display:grid; gap:1.2rem;">
                    ${reviews.length > 0 ? reviews.map(r => `
                        <div style="background:#f9fafb; padding:1.5rem; border-radius:20px; border:1px solid #f0f0f0;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                                <strong>${r.userName || 'Guest'}</strong>
                                <div style="color:#f59e0b;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
                            </div>
                            <p style="font-style:italic; margin:0;">"${r.text || 'No comments'}"</p>
                        </div>`).join('') : '<p>No reviews yet.</p>'}
                </div>
            </section>
        </div>

        <!-- Fullscreen Gallery Modal -->
        <div id="gallery-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.98); z-index:10000; align-items:center; justify-content:center; flex-direction:column;">
             <button style="position:absolute; top:2rem; right:2rem; background:white; border:none; border-radius:50%; width:44px; height:44px; font-size:1.5rem; cursor:pointer;" onclick="document.getElementById('gallery-modal').style.display='none'">✕</button>
             <div id="gallery-container" style="max-width:90%; max-height:80vh; display:flex; align-items:center; justify-content:center;">
                <img id="gallery-main-img" src="" style="max-width:100%; max-height:80vh; border-radius:12px; object-fit:contain; display:none;">
                <video id="gallery-main-video" controls style="max-width:100%; max-height:80vh; border-radius:12px; object-fit:contain; display:none;"><source src="" type="video/mp4"></video>
             </div>
             <div id="gallery-thumbnails" style="margin-top:2rem; display:flex; gap:0.8rem; overflow-x:auto; padding-bottom:1rem; width:80%;"></div>
        </div>
    `;

    // --- 2. LOGIC BINDING ---
    const bin = document.getElementById('book-in');
    const bout = document.getElementById('book-out');
    const summary = document.getElementById('price-summary');
    const reserveBtn = document.getElementById('standard-reserve-btn');

    window.updatePrice = () => {
        const nights = Math.ceil((new Date(bout.value) - new Date(bin.value)) / (1000 * 60 * 60 * 24)) || 0;
        if (nights <= 0) {
            if (summary) summary.innerHTML = '<p style="color:#d9534f; font-size:0.8rem; text-align:center;">Select stay dates</p>';
            return;
        }

        let disc = discountPercentage;
        let isPkg = false, pTitle = '';
        const matchingPkg = (hotel.packages || []).find(p => parseInt(p.nights) === nights);
        if (matchingPkg) { disc = matchingPkg.discount; isPkg = true; pTitle = matchingPkg.title; }

        const sub = (originalPrice || currentPrice) * nights;
        const dAmt = Math.round(sub * (disc / 100));
        const total = sub - dAmt;

        if (reserveBtn) reserveBtn.innerText = isPkg ? 'Reserve Package' : 'Reserve Now';

        summary.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.8rem;">
                ${isPkg ? `<div style="background:#fff9eb; border:1px solid #ffeeba; border-radius:12px; padding:0.8rem; border-left:4px solid #f59e0b;"><div style="font-weight:900; color:#b45309; font-size:0.7rem; text-transform:uppercase;">🎁 Package Active</div><div style="font-weight:700;">${pTitle}</div></div>` : ''}
                <div style="display:flex; justify-content:space-between; color:#64748b; font-size:0.9rem;"><span>${(originalPrice || currentPrice).toLocaleString()} x ${nights} nights</span><span>${sub.toLocaleString()}</span></div>
                ${disc > 0 ? `<div style="display:flex; justify-content:space-between; color:#d97706; font-weight:800;"><span>Discount (${disc}%)</span><span>-${dAmt.toLocaleString()}</span></div>` : ''}
                <div style="display:flex; justify-content:space-between; font-weight:950; font-size:1.4rem; border-top:1.5px solid #f1f5f9; padding-top:1rem; color:var(--color-primary);"><span>Total</span><span>${total.toLocaleString()} Birr</span></div>
                <p style="text-align:right; font-size:0.65rem; color:#94a3b8; margin:0;">Prices include 15% VAT & Service Fees</p>
            </div>`;
    };

    bin.onchange = window.updatePrice;
    bout.onchange = window.updatePrice;

    // Initial Dates
    const d1 = new Date(); const d2 = new Date(); d2.setDate(d1.getDate() + 1);
    bin.value = d1.toISOString().split('T')[0];
    bout.value = d2.toISOString().split('T')[0];
    window.updatePrice();

    // Gallery Logic
    const galleryItems = [...allImages.map(url => ({ type: 'image', url })), ...(videoUrl ? [{ type: 'video', url: videoUrl }] : [])];
    window.viewFullGallery = (idx) => {
        const modal = document.getElementById('gallery-modal');
        const thumbs = document.getElementById('gallery-thumbnails');
        modal.style.display = 'flex';
        thumbs.innerHTML = galleryItems.map((item, i) => `<div onclick="updateGallerySelection(${i})" style="flex:0 0 80px; height:60px; border-radius:8px; overflow:hidden; cursor:pointer;">${item.type==='image'?`<img src='${item.url}' style='width:100%;height:100%;object-fit:cover;'>`:'📽️'}</div>`).join('');
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

    window.selectPkg = (idx) => {
        const pkg = hotel.packages[idx];
        const start = new Date(bin.value);
        const end = new Date(start); end.setDate(start.getDate() + parseInt(pkg.nights));
        bout.value = end.toISOString().split('T')[0];
        window.updatePrice();
        window.showToast(`✅ ${pkg.title} Package Selected!`);
    };
});
