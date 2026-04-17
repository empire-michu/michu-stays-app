window.router.addRoute('hotel_detail_view', async (container, params) => {
    const id = params.id;
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading Michu Stays...</div>`;
    
    // 1. THE ULTIMATE NAVIGATION ENGINE
    window.michuFinalNav = (pId, binVal, boutVal) => {
        if (!binVal || !boutVal) {
            window.showToast("Please select dates first!");
            return;
        }
        const target = `booking_payment?propertyId=${pId}&checkIn=${binVal}&checkOut=${boutVal}`;
        console.log("NAVIGATING TO:", target);
        // Force Browser to move
        window.location.assign("#" + target);
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
    let discountPercentage = Number(hotel.discountPercent || hotel.discount || 0);
    let originalPrice = hotel.originalPrice ? Number(String(hotel.originalPrice).replace(/[^\d.-]/g, '')) : 0;
    if (discountPercentage > 0 && (!originalPrice || originalPrice <= currentPrice)) {
        originalPrice = Math.round(currentPrice / (1 - (discountPercentage / 100)));
    }

    const amenitiesIcons = { 'WiFi': '📶', 'Pool': '🏊', 'Spa': '🧖', 'Breakfast': '🍳', 'Parking': '🚗', 'Gym': '💪', 'AC': '❄️', 'Bar': '🍸' };

    container.innerHTML = `
        <div class="container" style="padding-top:1.5rem; padding-bottom:5rem;">
            <!-- Header -->
            <div style="margin-bottom:1.5rem; color:#64748b; font-size:0.9rem;">
                <span style="cursor:pointer;" onclick="router.navigate('home')">Home</span> / <strong>${hotel.title}</strong>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:2rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <h1 style="margin:0; font-size:2.4rem; color:var(--color-primary); letter-spacing:-0.8px;">${hotel.title}</h1>
                    <p style="margin:0.5rem 0 0; color:#64748b; font-weight:600; font-size:1.1rem;">📍 ${hotel.address}</p>
                </div>
            </div>

            <!-- Gallery -->
            <style>
                .detail-gallery-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.8rem; height: 480px; margin-bottom: 2.5rem; border-radius:32px; overflow:hidden; }
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
                    ${allImages.length > 3 ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:white; font-size:2.2rem; font-weight:800; backdrop-filter:blur(4px);">+${allImages.length-3}</div>` : ''}
                </div>
            </div>

            <div class="detail-content-grid">
                <!-- Left Hand Details -->
                <div id="hotel-main-info">
                    ${videoUrl ? `<video controls style="width:100%; border-radius:28px; margin-bottom:2.5rem; background:#000; box-shadow:0 15px 40px rgba(0,0,0,0.12);"><source src="${videoUrl}" type="video/mp4"></video>` : ''}
                    
                    <section style="margin-bottom:3rem; padding-bottom:3rem; border-bottom:1.5px solid #f1f5f9;">
                        <h2 style="margin-bottom:1.5rem; font-size:1.8rem; letter-spacing:-0.5px;">About this Hotel</h2>
                        <p style="line-height:1.8; color:#334155; white-space:pre-wrap; font-size:1.15rem;">${hotel.description}</p>
                    </section>

                    <!-- SPECIAL PACKAGES (Restored & Verified) -->
                    ${hotel.packages && hotel.packages.length > 0 ? `
                    <section style="margin-bottom:3.5rem; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding:2.5rem; border-radius:32px; border:1px solid #e2e8f0;">
                         <h2 style="margin-bottom:1.8rem; display:flex; align-items:center; gap:0.8rem; color:#d97706; font-size:1.6rem; letter-spacing:-0.4px;">🎁 Special Stay Packages</h2>
                         <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.8rem;">
                            ${hotel.packages.map((pkg, idx) => `
                                <div class="pkg-card" onclick="window.selectPkgByForce(${idx})" style="background:white; border:2px solid #fff; border-radius:24px; padding:1.8rem; cursor:pointer; box-shadow:0 10px 20px rgba(0,0,0,0.03); transition:all 0.2s ease;">
                                    <div style="background:#fff7ed; color:#ea580c; font-weight:950; font-size:0.75rem; padding:0.5rem 1rem; border-radius:99px; display:inline-block; margin-bottom:1.2rem; text-transform:uppercase; letter-spacing:0.5px;">⭐ ${pkg.nights} Nights Deal</div>
                                    <h3 style="margin:0 0 0.6rem; font-size:1.3rem; font-weight:900; color:#1e293b;">${pkg.title}</h3>
                                    <p style="font-size:0.95rem; color:#64748b; margin-bottom:1.8rem; line-height:1.6;">${pkg.services || 'Inclusive of premium property benefits.'}</p>
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1.5rem; border-top:2px dashed #f1f5f9;">
                                        <span style="color:#d97706; font-weight:950; font-size:1.4rem;">${pkg.discount}% OFF</span>
                                        <span class="btn-primary" style="padding:0.7rem 1.4rem; border-radius:14px; font-weight:800; font-size:0.95rem;">Select</span>
                                    </div>
                                </div>`).join('')}
                         </div>
                    </section>` : ''}

                    <section style="margin-bottom:3rem;">
                         <h2 style="margin-bottom:1.8rem; font-size:1.7rem; color:#1a202c;">What this place offers</h2>
                         <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:1.5rem;">
                            ${amenities.map(a => `<div style="display:flex; align-items:center; gap:1.1rem; font-size:1.15rem; background:#fff; padding:1.4rem; border-radius:20px; border:1.8px solid #f1f5f9; box-shadow:0 6px 10px rgba(0,0,0,0.02);">
                                <span style="font-size:1.7rem;">${amenitiesIcons[a] || '✨'}</span>
                                <span style="font-weight:700; color:#475569;">${a}</span>
                            </div>`).join('')}
                         </div>
                    </section>
                </div>

                <!-- Right Hand Sidebar (Booking Widget) -->
                <div style="position: sticky; top: 2rem;">
                    <div style="background:white; padding:2.5rem; border:2px solid #f1f5f9; border-radius:36px; box-shadow:0 25px 55px rgba(0,0,0,0.1); border:1px solid rgba(0,0,0,0.03);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
                             <div>
                                <span style="font-size:2.3rem; font-weight:950; color:#d97706; letter-spacing:-1.5px;">${currentPrice.toLocaleString()} Birr</span>
                                <span style="color:#64748b; font-weight:700; font-size:1rem;"> / night</span>
                             </div>
                             <div style="background:#fff7ed; color:#ea580c; padding:0.6rem 1.1rem; border-radius:16px; font-weight:950; border:1px solid #ffedd5;">
                                ★ ${avgRating || 'New'}
                             </div>
                        </div>

                        <div style="border:2.2px solid #f1f5f9; border-radius:24px; overflow:hidden; margin-bottom:2rem; background:#fafafa;">
                             <div style="display:grid; grid-template-columns:1fr 1fr;">
                                <div style="padding:1.4rem; border-right:2px solid #f1f5f9;">
                                    <label style="display:block; font-size:0.75rem; font-weight:950; color:#94a3b8; text-transform:uppercase; margin-bottom:0.4rem; letter-spacing:0.5px;">Check-in</label>
                                    <input type="date" id="book-in" style="border:none; width:100%; font-weight:800; font-size:1.1rem; background:transparent; outline:none; color:#1e293b;">
                                </div>
                                <div style="padding:1.4rem;">
                                    <label style="display:block; font-size:0.75rem; font-weight:950; color:#94a3b8; text-transform:uppercase; margin-bottom:0.4rem; letter-spacing:0.5px;">Check-out</label>
                                    <input type="date" id="book-out" style="border:none; width:100%; font-weight:800; font-size:1.1rem; background:transparent; outline:none; color:#1e293b;">
                                </div>
                             </div>
                        </div>

                        <!-- THE ULTIMATE RESERVE BUTTON -->
                        <button id="final-reserve-trigger" class="btn-primary" 
                                style="width:100%; padding:1.6rem; font-size:1.5rem; border-radius:24px; font-weight:950; cursor:pointer; background:linear-gradient(135deg, var(--color-primary), #1e7e34); box-shadow:0 18px 36px rgba(11,102,70,0.3); z-index:10000; position:relative;"
                                onclick="window.michuFinalNav('${id}', document.getElementById('book-in').value, document.getElementById('book-out').value)">
                           Reserve Now
                        </button>
                        
                        <div id="booking-math-display" style="margin-top:2.5rem;"></div>
                    </div>
                </div>
            </div>

            <!-- MAP SECTION -->
            <section style="margin-top:5rem; padding-top:4.5rem; border-top:2px solid #f1f5f9;">
                 <h2 style="margin-bottom:1.8rem; font-size:1.9rem; letter-spacing:-0.5px;">Where you'll be staying</h2>
                 <div style="width:100%; height:480px; border-radius:36px; overflow:hidden; border:2px solid #f1f5f9; box-shadow:0 20px 40px rgba(0,0,0,0.05);">
                    <iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${encodeURIComponent(hotel.mapQuery || hotel.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed" allowfullscreen></iframe>
                 </div>
            </section>

            <!-- REVIEWS SECTION -->
            <section style="margin-top:5rem; padding-top:4.5rem; border-top:2px solid #f1f5f9;">
                 <h2 style="margin-bottom:2.5rem; font-size:1.9rem; font-weight:950; display:flex; align-items:center; gap:1rem;">
                    <span style="color:#f59e0b; font-size:2.2rem;">★</span> Guest Reviews (${reviewCount})
                 </h2>
                 <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap:2.8rem;">
                    ${reviews.length > 0 ? reviews.map(r => `
                        <div style="background:#f8fafc; padding:2.8rem; border-radius:32px; border:1px solid #f1f5f9; box-shadow:0 8px 12px rgba(0,0,0,0.01);">
                            <div style="display:flex; justify-content:space-between; margin-bottom:1.2rem; align-items:center;">
                                <strong style="font-size:1.25rem; color:#1e293b;">${r.userName || 'Verified Guest'}</strong>
                                <div style="color:#f59e0b; font-size:1.1rem;">${'★'.repeat(r.rating)}</div>
                            </div>
                            <p style="font-style:italic; line-height:1.7; color:#475569; margin:0; font-size:1.1rem;">"${r.text || 'Exceeded our expectations in every way!'}"</p>
                        </div>`).join('') : '<p style="color:#94a3b8; font-size:1.25rem; font-weight:600;">Be the first to share your experience!</p>'}
                 </div>
            </section>
        </div>

        <!-- GALLERY MODAL -->
        <div id="gallery-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.98); z-index:99999; align-items:center; justify-content:center; flex-direction:column; backdrop-filter:blur(20px);">
             <button style="position:absolute; top:2.5rem; right:2.5rem; background:white; border:none; border-radius:50%; width:60px; height:60px; font-size:2.2rem; cursor:pointer; font-weight:950; box-shadow:0 10px 20px rgba(0,0,0,0.2);" onclick="document.getElementById('gallery-modal').style.display='none'">✕</button>
             <div id="gallery-container" style="max-width:94%; max-height:80vh;">
                <img id="gallery-main-img" src="" style="max-width:100%; max-height:80vh; border-radius:24px; object-fit:contain; display:none;">
                <video id="gallery-main-video" controls style="max-width:100%; max-height:80vh; border-radius:24px; display:none;"><source src="" type="video/mp4"></video>
             </div>
             <div id="gallery-thumbnails" style="margin-top:3rem; display:flex; gap:1.5rem; overflow-x:auto; padding:1.5rem; width:85%;"></div>
        </div>
    `;

    // --- LOGIC SYNC ---
    const bin = document.getElementById('book-in');
    const bout = document.getElementById('book-out');
    const mathBox = document.getElementById('booking-math-display');
    const mainBtn = document.getElementById('final-reserve-trigger');

    window.refreshMath = () => {
        const d1 = new Date(bin.value);
        const d2 = new Date(bout.value);
        const nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)) || 0;
        
        let dPct = discountPercentage;
        let pName = '';
        const curPkg = (hotel.packages || []).find(p => parseInt(p.nights) === nights);
        if (curPkg) { dPct = curPkg.discount; pName = curPkg.title; }

        if (nights > 0) {
            const base = (originalPrice || currentPrice) * nights;
            const savings = Math.round(base * (dPct / 100));
            const totalFinal = base - savings;
            
            mainBtn.innerText = pName ? 'Reserve Package' : 'Reserve Now';
            mathBox.innerHTML = `
                <div style="background:#f8fafc; padding:1.8rem; border-radius:24px; border:2.5px solid #fff; box-shadow:0 15px 30px rgba(0,0,0,0.02);">
                    ${pName ? `<div style="color:#d97706; font-weight:950; font-size:0.8rem; margin-bottom:1rem; text-transform:uppercase; letter-spacing:1px;">✨ ${pName} Applied</div>` : ''}
                    <div style="display:flex; justify-content:space-between; color:#64748b; margin-bottom:0.8rem; font-weight:600;">
                        <span>${currentPrice.toLocaleString()} x ${nights} nights</span>
                        <span>${base.toLocaleString()} Birr</span>
                    </div>
                    ${dPct > 0 ? `<div style="display:flex; justify-content:space-between; color:#d97706; font-weight:900; margin-bottom:1.5rem; font-size:1.1rem;"><span>Discount (${dPct}%)</span><span>-${savings.toLocaleString()} Birr</span></div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-weight:950; font-size:1.7rem; border-top:2.5px solid #fff; padding-top:1.5rem; color:var(--color-primary); letter-spacing:-1px;">
                        <span>Total</span>
                        <span>${totalFinal.toLocaleString()} Birr</span>
                    </div>
                    <p style="text-align:right; font-size:0.75rem; color:#94a3b8; margin:1rem 0 0; font-weight:700;">Price includes all taxes & fees</p>
                </div>`;
        } else {
             mainBtn.innerText = 'Select Arrival Date';
             mathBox.innerHTML = `<p style="text-align:center; color:#94a3b8; font-weight:800;">Please pick stay dates to proceed</p>`;
        }
    };

    bin.onchange = window.refreshMath;
    bout.onchange = window.refreshMath;

    window.selectPkgByForce = (idx) => {
        const pkg = hotel.packages[idx];
        const start = new Date(bin.value);
        const end = new Date(start); 
        end.setDate(start.getDate() + parseInt(pkg.nights));
        bout.value = end.toISOString().split('T')[0];
        window.refreshMath();
        window.showToast(`✅ ${pkg.title} Activated! Check the total below.`);
    };

    // Gallery Logic
    const galleryItems = [...allImages.map(url => ({ type: 'image', url })), ...(videoUrl ? [{ type: 'video', url: videoUrl }] : [])];
    window.viewFullGallery = (idx) => {
        const modal = document.getElementById('gallery-modal');
        const thumbs = document.getElementById('gallery-thumbnails');
        modal.style.display = 'flex';
        thumbs.innerHTML = galleryItems.map((item, i) => `<div onclick="updateGallerySelection(${i})" style="flex:0 0 120px; height:85px; border-radius:18px; overflow:hidden; cursor:pointer; border:3px solid #fff;">${item.type==='image'?`<img src='${item.url}' style='width:100%;height:100%;object-fit:cover;'>`:'📽️'}</div>`).join('');
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
    window.refreshMath();
});
