window.router.addRoute('hotel_detail_view', async (container, params) => {
    const id = params.id;
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading Hotel Details...</div>`;
    
    // 1. Definition move to top for immediate availability
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
        description: hotel.description ? hotel.description.substring(0, 160).replace(/\n/g, ' ') + '...' : `Book your stay at ${hotel.title} in Dire Dawa on Michu Stays. Best prices for hotels in Ethiopia.`,
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
        <div class="container" style="padding-top:1rem; padding-bottom:2rem;">
            <div style="margin-bottom:1.5rem; color:var(--color-text-light); font-size:0.9rem;">
                <span style="cursor:pointer;" onclick="router.navigate('home')">Home</span> / 
                <span style="color:var(--color-text-dark); font-weight:600;">${hotel.title}</span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <div style="display:flex; align-items:center; gap:0.8rem; flex-wrap:wrap; margin-bottom:0.4rem;">
                        <h1 style="margin:0; font-size:1.8rem; color:var(--color-primary);">${hotel.title}</h1>
                        ${hasDiscount ? `<span style="background:linear-gradient(135deg, #f59e0b 0%, #d4af37 100%);color:white;padding:0.3rem 0.8rem;border-radius:8px;font-size:0.8rem;font-weight:800;animation: pulse 2s infinite;">-${discountPercentage}% OFF</span>` : ''}
                    </div>
                    <p style="margin:0.3rem 0 0; color:var(--color-text-light); display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                        <span style="font-weight:600;">📍 ${hotel.address}</span>
                        ${distance > 0 ? `<span style="background:#f0f0f0;padding:0.2rem 0.6rem;border-radius:6px;font-size:0.8rem;color:#555;font-weight:600;">${distance} km from centre</span>` : ''}
                    </p>
                </div>
                <div style="display:flex; gap:0.8rem; flex-wrap:wrap;">
                    <button class="btn-outline" style="padding:0.4rem 0.8rem;" onclick="window.print()">🖨 Print</button>
                    ${videoUrl ? `<button class="btn-primary" style="padding:0.4rem 1.2rem; border-radius:99px;" onclick="window.viewFullGallery(${allImages.length})">📽 Watch Tour</button>` : ''}
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
                        ${(allImages.length + (videoUrl ? 1 : 0)) > 5 ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; color:white; font-weight:800; border-radius:0 0 16px 0; backdrop-filter:blur(3px);">+${(allImages.length + (videoUrl ? 1 : 0)) - 5} Media</div>` : ''}
                    </div>
                </div>
            </div>

            <div class="detail-content-grid">
                <div style="min-width: 0; overflow-wrap: break-word;">
                    ${videoUrl ? `<div style="margin-bottom:2rem; width:100%; max-width:450px; border-radius:18px; overflow:hidden; border:1px solid #f0f0f0; background:#000;"><video controls style="width:100%; display:block; aspect-ratio:16/9;"><source src="${videoUrl}" type="video/mp4"></video></div>` : ''}

                    <section style="border-bottom:1px solid var(--color-border); padding-bottom:1.5rem; margin-bottom:1.5rem;">
                        <h2 style="margin-bottom:1rem;">About this ${hotel.type || 'Property'}</h2>
                        <p style="line-height:1.7; color:var(--color-text-dark); white-space:pre-wrap; margin-bottom: 1.5rem;">${hotel.description || 'Experience comfort and style in the heart of the city.'}</p>
                    </section>

                    ${hotel.packages && hotel.packages.length > 0 ? `
                    <section style="margin-bottom:2rem; background:#f8fafc; padding:1.2rem; border-radius:20px; border:1px solid #e2e8f0;">
                        <h2 style="margin-bottom:1rem; display:flex; align-items:center; gap:0.6rem; color:var(--color-primary); font-size:1.2rem;">🎁 Special Stay Packages</h2>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
                            ${hotel.packages.map((pkg, idx) => `
                                <div class="pkg-card" onclick="window.selectPkg(${idx})" style="background:white; border:2px solid #edf2f7; border-radius:20px; padding:1.2rem; cursor:pointer; position:relative; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 4px 6px rgba(0,0,0,0.02);">
                                    <div style="position:absolute; top:0; right:0; background:linear-gradient(135deg, #f59e0b 0%, #d4af37 100%); color:white; font-weight:900; padding:0.3rem 0.8rem; border-bottom-left-radius:15px; font-size:0.75rem;">Save Deal</div>
                                    <div style="background:#e0f2fe; color:#0369a1; font-weight:900; font-size:0.65rem; padding:0.3rem 0.6rem; border-radius:99px; display:inline-block; align-self:flex-start; margin-bottom:0.8rem; text-transform:uppercase;">🌙 ${pkg.nights} Nights Bundle</div>
                                    <h3 style="margin:0 0 0.4rem; font-size:1.1rem; font-weight:800; color:var(--color-text-dark);">${pkg.title}</h3>
                                    <div style="font-size:0.85rem; color:#64748b; line-height:1.5; margin-bottom:1rem; flex-grow:1;">${pkg.services || 'Premium stay inclusives.'}</div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1rem; border-top:1.5px dashed #f1f5f9;">
                                        <div style="color:#d97706; font-weight:950; font-size:1.1rem;">${pkg.discount}% OFF</div>
                                        <div class="btn-primary" style="padding:0.5rem 1rem; border-radius:12px; font-size:0.8rem; font-weight:800; background:linear-gradient(135deg, var(--color-primary), #1e7e34);">Select</div>
                                    </div>
                                </div>`).join('')}
                        </div>
                    </section>` : ''}

                    <section style="margin-bottom:2rem;">
                        <h2 style="margin-bottom:1.5rem;">What this place offers</h2>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.2rem;">
                            ${amenities.length > 0 ? amenities.map(a => `<div style="display:flex; align-items:center; gap:0.8rem; font-size:1.1rem;"><span style="font-size:1.4rem;">${amenitiesIcons[a] || '✨'}</span><span>${a}</span></div>`).join('') : '<p>All standard amenities included.</p>'}
                        </div>
                    </section>
                </div>

                <div class="desktop-sidebar" style="position: sticky; top: 2rem; height: fit-content;">
                    <div id="booking-widget-main" style="background:white; padding:2rem; border:1.5px solid #eee; border-radius:28px; box-shadow:0 15px 35px rgba(0,0,0,0.06);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                            <div>
                                <span id="headline-price-val" style="font-size:1.85rem; font-weight:950; color:#d97706; letter-spacing: -0.04em;">${hotel.eventMode ? minEffectiveRate.toLocaleString() : currentPrice.toLocaleString()} Birr</span>
                                <span style="color:var(--color-text-light); font-size:0.95rem; font-weight:600;"> / night</span>
                                <div id="headline-price-label" style="font-size:0.7rem; color:#d97706; font-weight:900; text-transform:uppercase; margin-top:0.3rem;">${hotel.eventMode ? '✨ Event Special Rate' : ''}</div>
                            </div>
                            <div style="font-size:1rem; font-weight:800; background:#fff8e1; color:#e37400; padding:0.4rem 0.8rem; border-radius:12px; display:flex; align-items:center; gap:0.4rem; border:1px solid #ffecb3;">
                                <span style="color:#f59e0b; font-size:1.2rem;">★</span> ${avgRating > 0 ? avgRating : 'New'}
                                ${reviewCount > 0 ? `<span style="font-size:0.8rem;font-weight:600;color:#999;">(${reviewCount})</span>` : ''}
                            </div>
                        </div>

                        ${(() => {
                            const avail = hotel.availableRooms ?? hotel.totalRooms ?? 0;
                            return `<div style="background:${avail > 0 ? '#e6f4ea' : '#fce8e6'}; padding:0.8rem 1.2rem; border-radius:12px; margin-bottom:1.5rem; display:flex; align-items:center; gap:0.6rem; border:1px solid ${avail > 0 ? '#cce8d5' : '#f8d7da'};">
                                <span style="font-size:1.2rem;">${avail > 0 ? '🏨' : '🚫'}</span>
                                <span style="font-weight:800; color:${avail > 0 ? '#1e7e34' : '#c5221f'}; font-size:0.95rem;">${avail > 0 ? `${avail} rooms available` : 'Fully booked'}</span>
                            </div>`;
                        })()}

                        <div style="border:1.8px solid #f1f5f9; border-radius:16px; overflow:hidden; margin-bottom:1.5rem; background:#f8fafc;">
                            <div style="display:grid; grid-template-columns:1fr 1fr;">
                                <div style="padding:1rem; border-right:1.8px solid #f1f5f9;">
                                    <div style="font-weight:900; font-size:0.75rem; text-transform:uppercase; color:#64748b; margin-bottom:0.4rem;">Check-in</div>
                                    <input type="date" id="book-in" style="border:none; width:100%; font-size:1rem; font-weight:700; outline:none; background:transparent;">
                                </div>
                                <div style="padding:1rem;">
                                    <div style="font-weight:900; font-size:0.75rem; text-transform:uppercase; color:#64748b; margin-bottom:0.4rem;">Check-out</div>
                                    <input type="date" id="book-out" style="border:none; width:100%; font-size:1rem; font-weight:700; outline:none; background:transparent;">
                                </div>
                            </div>
                        </div>

                        <div id="standard-reserve-btn-box">
                            ${(hotel.availableRooms ?? hotel.totalRooms ?? 0) > 0 
                                ? `<button id="standard-reserve-btn" class="btn-primary" style="width:100%; padding:1.4rem; font-size:1.2rem; border-radius:18px; font-weight:800; background:linear-gradient(135deg, var(--color-primary), #1e7e34); box-shadow:0 10px 20px rgba(11,102,70,0.2);">Reserve Now</button>`
                                : `<button disabled style="width:100%; padding:1.4rem; font-size:1.2rem; border-radius:18px; font-weight:800; background:#cbd5e1; color:white; border:none; cursor:not-allowed;">Fully Booked</button>`}
                        </div>
                        
                        <div id="price-summary" style="margin-top:2rem;"></div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Gallery etc ... -->
    `;

    // 3. Robust Event Listeners
    const btn = document.getElementById('standard-reserve-btn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.goToBooking();
        });
    }

    const bin = document.getElementById('book-in');
    const bout = document.getElementById('book-out');
    const summary = document.getElementById('price-summary');

    window.updatePrice = () => {
        const nights = Math.ceil((new Date(bout.value) - new Date(bin.value)) / (1000 * 60 * 60 * 24)) || 0;
        if (nights <= 0) { 
            if (summary) summary.innerHTML = '<p style="color:#d9534f;font-size:0.8rem;text-align:center;">Select stay dates</p>';
            return; 
        }

        let disc = discountPercentage;
        let pTitle = '', isPkg = false;
        const matchingPkg = (hotel.packages || []).find(p => parseInt(p.nights) === nights);
        if (matchingPkg) { disc = matchingPkg.discount; isPkg = true; pTitle = matchingPkg.title; }

        const sub = (originalPrice || currentPrice) * nights;
        const dAmt = Math.round(sub * (disc / 100));
        const total = sub - dAmt;

        if (btn) btn.innerText = isPkg ? 'Reserve Package' : 'Reserve Now';

        summary.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.8rem;">
                ${isPkg ? `<div style="background:#fff9eb; border:1px solid #ffeeba; border-radius:12px; padding:0.8rem; border-left:4px solid #f59e0b;"><div style="font-weight:900; color:#b45309; font-size:0.75rem; text-transform:uppercase;">🎁 Package Active</div><div style="font-weight:700;">${pTitle}</div></div>` : ''}
                <div style="display:flex; justify-content:space-between; color:#64748b; font-size:0.9rem;"><span>${(originalPrice || currentPrice).toLocaleString()} Birr x ${nights} nights</span><span>${sub.toLocaleString()} Birr</span></div>
                ${disc > 0 ? `<div style="display:flex; justify-content:space-between; color:#d97706; font-weight:800;"><span>Discount (${disc}%)</span><span>-${dAmt.toLocaleString()} Birr</span></div>` : ''}
                <div style="display:flex; justify-content:space-between; font-weight:950; font-size:1.4rem; border-top:1.5px solid #f1f5f9; padding-top:1rem; color:var(--color-primary);"><span>Total</span><span>${total.toLocaleString()} Birr</span></div>
                <p style="text-align:center; font-size:0.8rem; color:#64748b; margin-top:1rem;">✓ Instant confirmation & Secure payment</p>
            </div>`;
    };

    bin.onchange = window.updatePrice;
    bout.onchange = window.updatePrice;
    
    // Initial dates
    const d1 = new Date(); const d2 = new Date(); d2.setDate(d1.getDate() + 1);
    bin.value = d1.toISOString().split('T')[0]; bout.value = d2.toISOString().split('T')[0];
    window.updatePrice();

    window.selectPkg = (idx) => {
        const pkg = hotel.packages[idx];
        const start = new Date(bin.value || new Date());
        const end = new Date(start); end.setDate(start.getDate() + parseInt(pkg.nights));
        bin.value = start.toISOString().split('T')[0];
        bout.value = end.toISOString().split('T')[0];
        window.updatePrice();
        window.showToast(`✅ ${pkg.title} Applied!`);
    };
});
