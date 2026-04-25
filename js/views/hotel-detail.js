// --- GLOBAL NAVIGATION HELPER (STABLE) ---
window.michuFinalNav = (pId, binVal, boutVal, totalStr) => {
    if (!binVal || !boutVal) {
        window.showToast("Please select stay dates!");
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
    
    // Strategy: Native Hash Change (Captured by the new hashchange listener in app.js)
    const query = `id=${pId}&checkIn=${binVal}&checkOut=${boutVal}${tAmt ? `&totalAmount=${tAmt}` : ''}`;
    window.location.hash = `#booking?${query}`;
    
    // Safety Fallback: if nothing happens in 800ms, try direct navigate
    setTimeout(() => {
        if (document.getElementById('final-reserve-trigger')) {
            window.router.navigate('booking', { id: pId, checkIn: binVal, checkOut: boutVal, totalAmount: tAmt });
        }
    }, 800);
};

window.router.addRoute('hotel_detail_view', async (container, params) => {
    const id = params.id;
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading...</div>`;
    
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

    const isManager = window.auth.currentUser && window.auth.currentUser.uid === hotel.managerId;

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
                    .detail-content-grid { display: flex; flex-direction: column; gap: 2rem; }
                    #main-side { display: contents; }
                    .desktop-sidebar { position: static !important; width: 100%; box-sizing: border-box; }
                    .mobile-order-1 { order: 1; }
                    .mobile-order-2 { order: 2; }
                    .mobile-order-3 { order: 3; } /* Sidebar comes 3rd, right after the description */
                    .mobile-order-4 { order: 4; }
                    .mobile-order-5 { order: 5; }
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
                    
                    <section class="mobile-order-2" style="margin-bottom:2.5rem; padding-bottom:2rem; border-bottom:1px solid #f1f5f9;">
                         <h2 style="margin-bottom:1rem; font-size:1.5rem;">The Experience</h2>
                         <p style="line-height:1.7; color:#334155; white-space:pre-wrap; font-size:1.05rem;">${hotel.description}</p>
                    </section>

                    <!-- SPECIAL PACKAGES (Premium Revamp) -->
                    ${hotel.packages && hotel.packages.length > 0 ? `
                    <section class="mobile-order-4" style="margin-bottom:3.5rem; background: linear-gradient(135deg, #ffffff 0%, #fffbf2 100%); padding:2.5rem; border-radius:32px; border:2px solid rgba(217,119,6,0.15); box-shadow: 0 20px 50px rgba(217,119,6,0.08); position:relative; overflow:hidden;">
                        <div style="position:absolute; top:-50px; right:-50px; width:150px; height:150px; background:rgba(217,119,6,0.03); border-radius:50%;"></div>
                        <h2 style="margin-bottom:2rem; display:flex; align-items:center; gap:0.8rem; color:#d97706; font-size:1.6rem; font-weight:950; text-transform:uppercase; letter-spacing:0.5px;">
                            <span style="background:#d97706; color:white; width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(217,119,6,0.3);">🎁</span> 
                            Special Stay Packages
                        </h2>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:2rem;">
                            ${hotel.packages.map((pkg, idx) => `
                                <div class="pkg-card" onclick="window.applyMichuPkg(${idx})" 
                                     style="background:white; border:1px solid rgba(217,119,6,0.1); border-radius:26px; padding:1.8rem; cursor:pointer; position:relative; transition:all 0.4s ease; box-shadow:0 10px 20px rgba(0,0,0,0.03);">
                                    <div style="background:linear-gradient(90deg, #fff7ed 0%, #ffedd5 100%); color:#ea580c; font-weight:950; font-size:0.7rem; padding:0.5rem 1rem; border-radius:99px; display:inline-flex; align-items:center; gap:0.4rem; margin-bottom:1.2rem; text-transform:uppercase; border:1px solid rgba(234,88,12,0.1); box-shadow:0 2px 8px rgba(234,88,12,0.05);">
                                        <span style="font-size:0.9rem;">🌙</span> ${pkg.nights} Night Bundle
                                    </div>
                                    <h3 style="margin:0 0 0.6rem; font-size:1.35rem; font-weight:900; color:#1e293b;">${pkg.title}</h3>
                                    <p style="font-size:0.95rem; line-height:1.6; color:#64748b; margin-bottom:1.8rem; height:45px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${pkg.services || 'Inclusive premium amenities.'}</p>
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1.5rem; border-top:1.5px solid #f1f5f9;">
                                        <div style="display:flex; flex-direction:column;">
                                            <span style="color:#d97706; font-weight:950; font-size:1.6rem; line-height:1;">${pkg.discount}% OFF</span>
                                            <span style="font-size:0.65rem; color:#94a3b8; font-weight:700; margin-top:0.3rem;">LIMITED TIME DEAL</span>
                                        </div>
                                        <span class="btn-primary" style="padding:0.8rem 1.8rem; border-radius:16px; font-size:0.9rem; font-weight:800; background:linear-gradient(135deg, #0b6646 0%, #15803d 100%); box-shadow:0 6px 15px rgba(11,102,70,0.25);">Select Bundle</span>
                                    </div>
                                    <!-- Decorative glow -->
                                    <div style="position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:60%; height:2px; background:linear-gradient(90deg, transparent, rgba(217,119,6,0.3), transparent); opacity:0.5;"></div>
                                </div>`).join('')}
                        </div>
                    </section>` : ''}

                    <section class="mobile-order-5">
                         <h2 style="margin-bottom:1.5rem; font-size:1.5rem;">Property Amenities</h2>
                         <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:0.8rem;">
                            ${amenities.map(a => `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; background:white; padding:1.2rem 0.5rem; border-radius:16px; border:1px solid #f1f5f9;">
                                <span style="font-size:1.8rem; margin-bottom:0.5rem;">${amenitiesIcons[a] || '✨'}</span>
                                <span style="font-weight:700; font-size:0.85rem; color:#334155; word-wrap:break-word;">${a}</span>
                            </div>`).join('')}
                         </div>
                    </section>
                </div>

                <div class="desktop-sidebar mobile-order-3" style="position: sticky; top: 2rem;">
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
                                onclick="const tEl=document.getElementById('final-total-val'); window.michuFinalNav('${id}', document.getElementById('book-in').value, document.getElementById('book-out').value, tEl?tEl.innerText:'')">
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
                 <div style="display:flex; overflow-x:auto; gap:1.5rem; padding-bottom:1rem; padding-top:0.5rem; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;">
                    ${reviews.length > 0 ? reviews.map(r => {
                        const rDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently';
                        const isOwner = window.auth.currentUser && window.auth.currentUser.uid === r.userId;
                        
                        return `
                        <div style="min-width: 280px; max-width: 320px; flex-shrink: 0; scroll-snap-align: start; background:#f8fafc; padding:1.5rem; border-radius:24px; border:1px solid #f1f5f9; position:relative; display:flex; flex-direction:column; min-height:220px;">
                            ${isOwner ? `
                                <button onclick="event.stopPropagation(); window.michuDeleteReviewGlobal('${r.id}', '${hotel.id}')" 
                                        title="Delete My Review"
                                        style="position:absolute; top:0.6rem; right:0.6rem; background:#fee2e2; color:#ef4444; border:none; width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 15px rgba(239,68,68,0.25); z-index:1000; transition:all 0.2s; -webkit-tap-highlight-color: transparent; pointer-events: auto !important;">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                </button>
                            ` : ''}

                            <div style="flex:1;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem; padding-right:${isOwner ? '40px' : '0'};">
                                    <strong style="font-size:1.1rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${r.userName || 'Guest'}</strong>
                                    <div style="color:#f59e0b; flex-shrink:0;">${'★'.repeat(r.rating)}</div>
                                </div>
                                <div style="font-size:0.75rem; color:#94a3b8; font-weight:700; margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.5px;">${rDate}</div>
                                
                                <p style="font-style:italic; line-height:1.6; color:#475569; margin:0; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden;">"${r.text || 'Enjoyed the stay!'}"</p>
                            </div>

                            ${(() => {
                                if (r.managerReply && r.managerReply.text) {
                                    const replyDate = r.managerReply.createdAt ? new Date(r.managerReply.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                                    return `
                                    <div style="margin-top:1.5rem; padding:1rem; background:#fff; border-radius:18px; border-left:4px solid #f59e0b; font-size:0.85rem; box-shadow:0 4px 12px rgba(0,0,0,0.04); position:relative;">
                                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
                                            <strong style="color:#1e293b; font-size:0.8rem;">↳ Manager Response:</strong>
                                            ${(replyDate && replyDate !== 'Invalid Date') ? `<span style="font-size:0.65rem; color:#94a3b8; font-weight:700;">${replyDate}</span>` : ''}
                                        </div>
                                        <p style="color:#64748b; font-style:italic; margin:0; line-height:1.5;">"${r.managerReply.text}"</p>
                                        
                                        ${isManager ? `
                                            <div style="margin-top:1rem; border-top:1px dashed #e2e8f0; padding-top:1rem; text-align:right;">
                                                <button onclick="event.stopPropagation(); window.michuDeleteReplyGlobal('${r.id}', '${hotel.id}')" 
                                                        style="background:#fff1f2; border:none; color:#ef4444; font-size:0.8rem; font-weight:800; cursor:pointer; padding:10px 20px; border-radius:12px; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 12px rgba(239,68,68,0.12); z-index:1000; -webkit-tap-highlight-color: transparent; pointer-events: auto !important;">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                    Remove Reply
                                                </button>
                                            </div>
                                        ` : ''}
                                    </div>`;
                                } else if (isManager) {
                                    return `
                                    <div style="margin-top:1.2rem;">
                                        <button onclick="window.replyToReview('${r.id}')" style="width:100%; background:#f1f5f9; border:1px dashed #cbd5e1; color:#475569; padding:0.7rem; border-radius:14px; font-size:0.8rem; cursor:pointer; font-weight:700; transition:all 0.2s;">↩ Reply to Guest</button>
                                    </div>`;
                                }
                                return '';
                            })()}
                        </div>`;
                    }).join('') : '<p style="color:#94a3b8;">No reviews yet.</p>'}
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

        <div id="reply-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(5px); z-index:9999; align-items:center; justify-content:center;">
             <div style="background:#fff; width:90%; max-width:400px; padding:2rem; border-radius:24px; box-shadow:0 20px 40px rgba(0,0,0,0.15); animation:fadeUp 0.3s ease;">
                 <h3 style="margin-bottom:1rem; font-size:1.3rem; color:#0f172a;">Reply to Guest</h3>
                 <p style="font-size:0.85rem; color:#64748b; margin-bottom:1.5rem;">Respond professionally to this review. Your reply will be visible to everyone.</p>
                 <textarea id="reply-text-area" rows="4" placeholder="Thank you for your stay..." style="width:100%; padding:1rem; border:2px solid #e2e8f0; border-radius:14px; resize:none; font-family:inherit; outline:none; transition:border 0.2s;" onfocus="this.style.borderColor='var(--color-primary)'" onblur="this.style.borderColor='#e2e8f0'"></textarea>
                 <div style="display:flex; gap:1rem; margin-top:1.5rem;">
                     <button onclick="document.getElementById('reply-modal').style.display='none'" style="flex:1; padding:1rem; background:#f1f5f9; color:#475569; border:none; border-radius:12px; font-weight:700; cursor:pointer;">Cancel</button>
                     <button id="reply-submit-btn" style="flex:1; padding:1rem; background:var(--color-primary); color:white; border:none; border-radius:12px; font-weight:700; cursor:pointer;">Post Reply</button>
                 </div>
             </div>
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
                        <span>${(origPrice || currentPrice).toLocaleString()} x ${nights} nights</span>
                        <span>${sub.toLocaleString()} Birr</span>
                    </div>
                    ${disc > 0 ? `<div style="display:flex; justify-content:space-between; color:#d97706; font-weight:800; margin-bottom:1rem;"><span>Discount (${disc}%)</span><span>-${savings.toLocaleString()} Birr</span></div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-weight:950; font-size:1.5rem; border-top:1.5px solid #e2e8f0; padding-top:1rem; color:var(--color-primary);"><span>Total</span><span><span id="final-total-val">${total.toLocaleString()}</span> Birr</span></div>
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
                // Re-render to show the new reply
                window.router.navigate('hotel_detail_view', { id: hotel.id });
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

    // Logic for deletions now handled globally via michuDeleteReviewGlobal and michuDeleteReplyGlobal in app.js


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
