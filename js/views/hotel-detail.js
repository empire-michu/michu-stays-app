window.router.addRoute('hotel_detail_view', async (container, params) => {
    const id = params.id;
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading Hotel Details...</div>`;
    
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

    // Support both old 'extraImages' and new 'images' array
    const allImages = hotel.images || [hotel.image, ...(hotel.extraImages || [])].filter(Boolean);
    const amenities = hotel.amenities || [];
    const videoUrl = hotel.videoTour || '';

    // Load reviews
    let reviews = [], avgRating = 0, reviewCount = 0;
    try {
        reviews = await window.db.getReviews(id);
        if (reviews.length > 0) {
            avgRating = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
            reviewCount = reviews.length;
        }
    } catch(e) { console.warn('Reviews load error:', e); }

    // --- ROBUST DISCOUNT DATA ---
    const currentPrice = Number(String(hotel.price || 0).replace(/[^\d.-]/g, ''));
    let discountPercentage = 0;
    if (hotel.discountPercent !== undefined && hotel.discountPercent !== null) {
        discountPercentage = Number(hotel.discountPercent) || 0;
    } else if (hotel.discount !== undefined && hotel.discount !== null) {
        discountPercentage = Number(hotel.discount) || 0;
    }
    
    let originalPrice = hotel.originalPrice ? Number(String(hotel.originalPrice).replace(/[^\d.-]/g, '')) : 0;
    
    // Always ensure original price is calculated if discount exists
    if (discountPercentage > 0) {
        const calculatedOriginal = Math.round(currentPrice / (1 - (discountPercentage / 100)));
        if (!originalPrice || originalPrice <= currentPrice) {
            originalPrice = calculatedOriginal;
        }
    }

    const hasDiscount = discountPercentage > 0 && originalPrice > currentPrice;
    const distance = hotel.distanceFromCenter ? parseFloat(hotel.distanceFromCenter) : 0;

    const amenitiesIcons = { 'WiFi': '📶', 'Pool': '🏊', 'Spa': '🧖', 'Breakfast': '🍳', 'Parking': '🚗', 'Gym': '💪', 'AC': '❄️', 'Bar': '🍸' };

    container.innerHTML = `
        <style>
            .detail-gallery-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 0.8rem; height: 450px; margin-bottom: 2rem; }
            .detail-content-grid { display: grid; grid-template-columns: 1.8fr 1fr; gap: 3rem; }
            @media(max-width: 768px) {
                .detail-gallery-grid { grid-template-columns: 1fr; grid-template-rows: 250px 100px; height: auto; }
                .detail-gallery-grid > div:nth-child(2), .detail-gallery-grid > div:nth-child(3) { display: none; /* Hide extra photos on mobile */ }
                .detail-content-grid { grid-template-columns: 1fr; gap: 2rem; }
            }
            @keyframes pulse-glow {
                from { box-shadow: 0 0 10px rgba(11,102,70,0.3); transform: scale(1); }
                to { box-shadow: 0 0 20px rgba(197,157,63,0.5); transform: scale(1.02); }
            }
        </style>
        <div class="container" style="padding-top:2rem; padding-bottom:2rem;">
            <div style="margin-bottom:1.5rem; color:var(--color-text-light); font-size:0.9rem;">
                <span style="cursor:pointer;" onclick="router.navigate('home')">Home</span> / 
                <span style="color:var(--color-text-dark); font-weight:600;">${hotel.title}</span>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
                <div>
                    <div style="display:flex; align-items:center; gap:0.8rem; flex-wrap:wrap; margin-bottom:0.4rem;">
                        <h1 style="margin:0; font-size:1.8rem; color:var(--color-primary);">${hotel.title}</h1>
                        ${hasDiscount ? `<span style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:white;padding:0.3rem 0.8rem;border-radius:8px;font-size:0.8rem;font-weight:800;box-shadow:0 4px 10px rgba(245,158,11,0.3); border:1px solid rgba(255,255,255,0.2); animation: pulse 2s infinite;">-${discountPercentage}% OFF</span>` : ''}
                    </div>
                    <p style="margin:0.3rem 0 0; color:var(--color-text-light); display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                        <span style="font-weight:600;">📍 ${hotel.address}</span>
                        ${distance > 0 ? `<span style="background:#f0f0f0;padding:0.2rem 0.6rem;border-radius:6px;font-size:0.8rem;color:#555;font-weight:600;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" style="vertical-align:-1px;"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                            ${distance} km from centre
                        </span>` : ''}
                    </p>
                    ${hotel.packages && hotel.packages.length > 0 ? `
                    <div style="margin-top:1rem; display:flex;">
                        <div style="background:#0b6646; color:#e0b246; font-size:0.65rem; font-weight:900; padding:0.4rem 1rem; border-radius:10px; border:1.5px solid #c59d3f; display:inline-flex; align-items:center; gap:0.5rem; box-shadow:0 0 15px rgba(11,102,70,0.25); text-transform:uppercase; letter-spacing:0.08em; animation: pulse-glow 2.5s infinite alternate;">
                            <span style="font-size:0.9rem;">🎁</span> ${hotel.badgeText || 'SPECIAL OFFERS INSIDE'}
                        </div>
                    </div>` : ''}
                </div>
                <div style="display:flex; gap:0.8rem; flex-wrap:wrap;">
                    <button class="btn-outline" style="padding:0.4rem 0.8rem;" onclick="window.print()">🖨 Print</button>
                    ${videoUrl ? `<button class="btn-primary" style="padding:0.4rem 1.2rem; border-radius:99px;" onclick="window.viewFullGallery(${allImages.length})">📽 Watch Tour</button>` : ''}
                    ${(window.auth?.userData?.role === 'admin' || hotel.managerId === window.auth?.currentUser?.uid) ? `
                        <button class="btn-outline" style="padding:0.4rem 1.2rem; border-radius:99px; border-color:var(--color-primary); color:var(--color-primary); font-weight:700;" onclick="router.navigate('manager')">⚙️ Manage Property</button>
                    ` : ''}
                </div>
            </div>

            <!-- Enhanced Gallery Grid (Handles up to 5 photos) -->
            <div class="detail-gallery-grid">
                <div style="background:url('${allImages[0] || ''}') center/cover; border-radius:16px; cursor:pointer; min-height: 250px;" onclick="viewFullGallery(0)"></div>
                <div style="display:grid; grid-template-rows: 1fr 1fr; gap:0.8rem;">
                    <div style="background:url('${allImages[1] || allImages[0]}') center/cover; cursor:pointer;" onclick="viewFullGallery(1)"></div>
                    <div style="background:url('${allImages[2] || allImages[0]}') center/cover; cursor:pointer;" onclick="viewFullGallery(2)"></div>
                </div>
                <div style="display:grid; grid-template-rows: 1fr 1fr; gap:0.8rem;">
                    <div style="background:url('${allImages[3] || allImages[0]}') center/cover; border-radius:0 16px 0 0; cursor:pointer;" onclick="viewFullGallery(3)"></div>
                    <div style="position:relative; background:url('${allImages[4] || allImages[0]}') center/cover; border-radius:0 0 16px 0; cursor:pointer;" onclick="viewFullGallery(4)">
                        ${(allImages.length + (videoUrl ? 1 : 0)) > 5 ? `<div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; color:white; font-size:1.2rem; font-weight:800; border-radius:0 0 16px 0; backdrop-filter:blur(3px);">+${(allImages.length + (videoUrl ? 1 : 0)) - 5} Media</div>` : ''}
                    </div>
                </div>
            </div>

            <div class="detail-content-grid">
                <div style="min-width: 0; overflow-wrap: break-word;">
                    ${videoUrl ? `
                    <div style="margin-bottom:2rem; width:100%; max-width:450px; border-radius:18px; overflow:hidden; box-shadow:0 10px 25px rgba(0,0,0,0.1); border:1px solid #f0f0f0; background:#000;">
                        <video controls style="width:100%; display:block; aspect-ratio:16/9;">
                            <source src="${videoUrl}" type="video/mp4">
                        </video>
                    </div>` : ''}

                    <section style="border-bottom:1px solid var(--color-border); padding-bottom:2rem; margin-bottom:2rem;">
                        <h2 style="margin-bottom:1rem;">About this ${hotel.type || 'Property'}</h2>
                        <p style="line-height:1.7; color:var(--color-text-dark); white-space:pre-wrap; margin-bottom: 2rem;">${hotel.description || 'Experience comfort and style in the heart of the city.'}</p>
                        
                        <!-- Mobile Quick Reserve Button -->
                        <div class="mobile-only-reserve" style="display:none;">
                            ${(hotel.availableRooms ?? hotel.totalRooms ?? 0) > 0
                                ? `<button class="btn-primary" style="width:100%; padding:1.2rem; font-size:1.1rem; border-radius:14px; font-weight:700; background:linear-gradient(135deg, var(--color-primary), #2a8146);" onclick="goToBooking()">Reserve Now</button>`
                                : `<button disabled style="width:100%; padding:1.2rem; font-size:1.1rem; border-radius:14px; font-weight:700; background:#ccc; color:white; border:none; cursor:not-allowed;">Fully Booked</button>`
                            }
                            <p style="text-align:center; font-size:0.85rem; color:#666; margin-top:0.8rem; font-weight:500;">✓ Instant confirmation & Secure payment</p>
                        </div>
                    </section>
                    <style>
                        @media(max-width: 768px) {
                            .mobile-only-reserve { display: block !important; }
                        }
                    </style>

                    ${hotel.packages && hotel.packages.length > 0 ? `
                    <section style="margin-bottom:3.5rem; background:#f8fafc; padding:2rem; border-radius:24px; border:1px solid #e2e8f0;">
                        <h2 style="margin-bottom:1.5rem; display:flex; align-items:center; gap:0.8rem; color:var(--color-primary); font-size:1.6rem; letter-spacing:-0.5px;">
                            <span style="font-size:1.8rem;">🎁</span> Special Stay Packages
                        </h2>
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem;">
                            ${hotel.packages.map((pkg, idx) => {
                                const pkgNights = parseInt(pkg.nights) || 1;
                                const base = (originalPrice || currentPrice) * pkgNights;
                                const savings = Math.round(base * (parseInt(pkg.discount) / 100));
                                
                                return `
                                <div class="pkg-card" onclick="window.selectPkg(${idx})" style="background:white; border:2px solid #edf2f7; border-radius:24px; padding:1.5rem; cursor:pointer; transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); position:relative; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 4px 6px rgba(0,0,0,0.02);">
                                    <style>
                                        .pkg-card:hover { border-color:var(--color-primary); transform:translateY(-8px); box-shadow:0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
                                        .pkg-card:active { transform:scale(0.98); }
                                        .pkg-discount-badge { position:absolute; top:0; right:0; background:linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%); color:#911; font-weight:900; padding:0.4rem 1rem; border-bottom-left-radius:18px; font-size:0.85rem; box-shadow: -2px 2px 5px rgba(0,0,0,0.05); }
                                    </style>
                                    
                                    <div class="pkg-discount-badge">Save ${savings.toLocaleString()} Birr</div>
                                    
                                    <div style="background:#e0f2fe; color:#0369a1; font-weight:900; font-size:0.75rem; padding:0.4rem 0.8rem; border-radius:99px; display:inline-block; align-self:flex-start; margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.05em;">🌙 ${pkgNights} Nights Bundle</div>
                                    
                                    <h3 style="margin:0 0 0.5rem; font-size:1.25rem; font-weight:800; color:var(--color-text-dark);">${pkg.title}</h3>
                                    
                                    <div style="font-size:0.9rem; color:#64748b; line-height:1.6; margin-bottom:1.5rem; flex-grow:1;">
                                        ${pkg.services ? pkg.services.split(',').map(s => `<div style="display:flex; align-items:center; gap:0.4rem; margin-bottom:0.3rem;">✨ ${s.trim()}</div>`).join('') : 'Includes all standard amenities and exclusive stay perks.'}
                                    </div>
                                    
                                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:1.2rem; border-top:1.5px dashed #f1f5f9;">
                                        <div>
                                            <div style="color:#ef4444; font-weight:950; font-size:1.3rem; letter-spacing:-1px;">${pkg.discount}% OFF</div>
                                            <div style="font-size:0.7rem; color:#94a3b8; font-weight:700; text-transform:uppercase;">Limited Time Offer</div>
                                        </div>
                                        <div class="btn-primary" style="padding:0.6rem 1.2rem; border-radius:14px; font-size:0.85rem; font-weight:800; background:linear-gradient(135deg, var(--color-primary), #1e7e34); box-shadow:0 10px 15px -3px rgba(11, 102, 70, 0.3);">Select Deal</div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    </section>
                    ` : ''}

                    <section style="margin-bottom:2rem;">
                        <h2 style="margin-bottom:1.5rem;">What this place offers</h2>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.2rem;">
                            ${amenities.length > 0 ? amenities.map(a => `
                                <div style="display:flex; align-items:center; gap:0.8rem; font-size:1.1rem;">
                                    <span style="font-size:1.4rem;">${amenitiesIcons[a] || '✨'}</span>
                                    <span>${a}</span>
                                </div>
                            `).join('') : '<p style="color:var(--color-text-light)">Premium amenities included.</p>'}
                        </div>
                    </section>

                    <!-- Google Maps Section -->
                    <section style="margin-top:2.5rem; padding-top:2rem; border-top:1px solid var(--color-border);">
                        <h2 style="margin-bottom:1.2rem;">Where you'll be</h2>
                        <div style="width:100%; height:350px; border-radius:20px; overflow:hidden; border:1px solid var(--color-border);">
                            <iframe width="100%" height="100%" frameborder="0" style="border:0" src="https://maps.google.com/maps?q=${encodeURIComponent(hotel.mapQuery || hotel.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed" allowfullscreen></iframe>
                        </div>
                    </section>

                    <!-- Guest Reviews Section -->
                    <section style="margin-top:2.5rem; padding-top:2rem; border-top:1px solid var(--color-border);">
                        <h2 style="margin-bottom:1.5rem; display:flex; align-items:center; gap:0.5rem;">
                            <span style="color:#f59e0b;">★</span> ${avgRating > 0 ? `${avgRating} · ${reviewCount} review${reviewCount > 1 ? 's' : ''}` : 'No reviews yet'}
                        </h2>
                        <div style="display:grid; gap:1.5rem;">
                            ${reviews.length > 0 ? reviews.slice(0, 10).map(r => {
                                let stars = '';
                                for (let i = 1; i <= 5; i++) stars += `<span style="color:${i <= r.rating ? '#f59e0b' : '#ddd'};">★</span>`;
                                
                                const reviewImgs = (r.images || []).map((img, idx) => `
                                    <div onclick="window.viewRevImg('${img}', '${(r.userName||'Guest').replace(/'/g, "\\\'")}')" style="width:70px; height:70px; border-radius:10px; background:url('${img}') center/cover; cursor:pointer; border:1.5px solid #eee; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"></div>
                                `).join('');

                                return `
                                <div style="background:#f9fafb; padding:1.5rem; border-radius:20px; border:1px solid #f0f0f0; display:flex; flex-direction:column; gap:0.8rem;">
                                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                                        <div>
                                            <strong style="font-size:1rem; display:block;">${r.userName || 'Guest'}</strong>
                                            <span style="font-size:0.8rem; color:#888;">${r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                                        </div>
                                        <div style="font-size:1rem;">${stars}</div>
                                    </div>
                                    ${r.text ? `<p style="font-size:0.95rem; color:#444; line-height:1.5; margin:0; font-style:italic;">"${r.text}"</p>` : ''}
                                    ${reviewImgs ? `<div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-top:0.4rem;">${reviewImgs}</div>` : ''}
                                    ${r.userId === window.auth?.currentUser?.uid ? `
                                        <button onclick="window.router.navigate('profile')" style="align-self:flex-start; margin-top:0.5rem; border:none; background:none; color:var(--color-primary); font-size:0.8rem; font-weight:700; cursor:pointer; padding:0; text-decoration:underline;">✎ Edit My Review</button>
                                    ` : ''}
                                </div>`;
                            }).join('') : '<p style="color:var(--color-text-light);">Be the first to rate this property after your stay!</p>'}
                        </div>
                    </section>
                </div>

                <!-- Right Sidebar: Booking Card -->
                <div>
                    <div style="position:sticky; top:2rem; background:white; padding:2rem; border:1px solid var(--color-border); border-radius:24px; box-shadow:0 12px 32px rgba(0,0,0,0.08);">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                            <div>
                                <span style="font-size:1.75rem; font-weight:900; color: ${hasDiscount ? 'var(--color-secondary)' : 'var(--color-primary)'}; letter-spacing: -0.02em;">${currentPrice} Birr</span>
                                <span style="color:var(--color-text-light); font-size:0.9rem;"> / night</span>
                                ${hotel.eventMode ? `<div style="font-size:0.65rem; color:#d97706; font-weight:800; text-transform:uppercase; margin-top:0.2rem; letter-spacing:0.02em;">✨ Event Special Rate</div>` : ''}
                            </div>
                            <div style="font-size:0.95rem; font-weight:700; background:#fff8e1; color:#e37400; padding:0.2rem 0.6rem; border-radius:8px; display:flex; align-items:center; gap:0.3rem;">
                                <span style="color:#f59e0b;">★</span> ${avgRating > 0 ? avgRating : 'New'}
                                ${reviewCount > 0 ? `<span style="font-size:0.75rem;font-weight:500;color:#999;">(${reviewCount})</span>` : ''}
                            </div>
                        </div>

                        <!-- Room Availability -->
                        ${(() => {
                            const avail = hotel.availableRooms ?? hotel.totalRooms ?? 0;
                            if (avail > 0) {
                                return `<div style="background:#e6f4ea; padding:0.6rem 1rem; border-radius:10px; margin-bottom:1.2rem; display:flex; align-items:center; gap:0.5rem;">
                                    <span style="font-size:1.1rem;">🏨</span>
                                    <span style="font-weight:700; color:#1e7e34; font-size:0.9rem;">${avail} room${avail>1?'s':''} available</span>
                                </div>`;
                            } else {
                                return `<div style="background:#fce8e6; padding:0.6rem 1rem; border-radius:10px; margin-bottom:1.2rem; display:flex; align-items:center; gap:0.5rem;">
                                    <span style="font-size:1.1rem;">🚫</span>
                                    <span style="font-weight:700; color:#c5221f; font-size:0.9rem;">Fully booked — check back soon</span>
                                </div>`;
                            }
                        })()}

                        <div style="border:1.5px solid #eee; border-radius:12px; overflow:hidden; margin-bottom:1.5rem;">
                            <div style="display:grid; grid-template-columns:1fr 1fr;">
                                <div style="padding:0.8rem; border-right:1.5px solid #eee;">
                                    <div style="font-weight:800; font-size:0.65rem; text-transform:uppercase; color:#888;">Check-in</div>
                                    <input type="date" id="book-in" style="border:none; width:100%; font-size:0.9rem; padding-top:0.2rem; outline:none; background:transparent;">
                                </div>
                                <div style="padding:0.8rem;">
                                    <div style="font-weight:800; font-size:0.65rem; text-transform:uppercase; color:#888;">Check-out</div>
                                    <input type="date" id="book-out" style="border:none; width:100%; font-size:0.9rem; padding-top:0.2rem; outline:none; background:transparent;">
                                </div>
                            </div>
                        </div>

                        ${hotel.eventMode ? `
                            <div style="background:#fffcf5; padding:1.2rem; border-radius:18px; border:1.5px dashed #ffe0b2; margin-bottom:1.5rem; text-align:center;">
                                <div style="font-size:1.4rem; margin-bottom:0.5rem;">🎉</div>
                                <div style="font-weight:900; font-size:0.85rem; color:#e65100; text-transform:uppercase; margin-bottom:0.4rem;">Event Booking Only</div>
                                <div style="font-size:0.75rem; color:#666; line-height:1.5;">This property is currently in <b>Event Mode</b>. Please choose one of the special packages below to confirm your stay.</div>
                            </div>
                        ` : `
                            ${(hotel.availableRooms ?? hotel.totalRooms ?? 0) > 0
                                ? `<button class="btn-primary" style="width:100%; padding:1.2rem; font-size:1.1rem; border-radius:14px; font-weight:700; background:linear-gradient(135deg, var(--color-primary), #2a8146);" onclick="goToBooking()">Reserve Now</button>`
                                : `<button disabled style="width:100%; padding:1.2rem; font-size:1.1rem; border-radius:14px; font-weight:700; background:#ccc; color:white; border:none; cursor:not-allowed;">Fully Booked</button>`
                            }
                        `}
                        
                        <div id="price-summary" style="margin-top:2rem; padding-top:1.5rem; border-top:1.5px solid #f4f4f4;">
                            <!-- Dynamic Content -->
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Fullscreen Gallery Modal -->
        <div id="gallery-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.98); z-index:10000; align-items:center; justify-content:center; flex-direction:column;">
             <button style="position:absolute; top:2rem; right:2rem; background:white; border:none; border-radius:50%; width:44px; height:44px; font-size:1.5rem; cursor:pointer;" onclick="document.getElementById('gallery-modal').style.display='none'">✕</button>
             
             <div id="gallery-container" style="max-width:90%; max-height:80vh; display:flex; align-items:center; justify-content:center;">
                <img id="gallery-main-img" src="" style="max-width:100%; max-height:80vh; border-radius:12px; object-fit:contain; display:none;">
                <video id="gallery-main-video" controls style="max-width:100%; max-height:80vh; border-radius:12px; object-fit:contain; display:none;">
                    <source src="" type="video/mp4">
                    Your browser does not support video.
                </video>
             </div>

             <div id="gallery-thumbnails" style="margin-top:2rem; display:flex; gap:0.8rem; overflow-x:auto; padding-bottom:1rem; width:80%;"></div>
        </div>
    `;

    // Review Image Lightbox
    window.viewRevImg = (url, name) => {
        const modal = document.getElementById('gallery-modal');
        const img = document.getElementById('gallery-main-img');
        const video = document.getElementById('gallery-main-video');
        const thumbs = document.getElementById('gallery-thumbnails');
        
        modal.style.display = 'flex';
        [img, video].forEach(el => el.style.display = 'none');
        img.src = url;
        img.style.display = 'block';
        thumbs.innerHTML = `<div style="color:white; font-weight:700; padding:1rem; font-size:1.1rem;">Guest Photo by ${name}</div>`;
    };

    // Support both images and video in a unified gallery
    const galleryItems = [
        ...allImages.map(url => ({ type: 'image', url })),
        ...(videoUrl ? [{ type: 'video', url: videoUrl }] : [])
    ];

    const updateGallerySelection = (idx) => {
        const modal = document.getElementById('gallery-modal');
        const img = document.getElementById('gallery-main-img');
        const video = document.getElementById('gallery-main-video');
        const thumbs = document.getElementById('gallery-thumbnails');
        
        const item = galleryItems[idx];
        [img, video].forEach(el => el.style.display = 'none');
        
        if (item.type === 'image') {
            img.src = item.url;
            img.style.display = 'block';
            video.pause();
        } else {
            video.src = item.url;
            video.style.display = 'block';
            video.load();
            video.play();
        }
        
        // Highlight thumbnail
        Array.from(thumbs.children).forEach((t, i) => {
            t.style.border = i === idx ? '3px solid var(--color-primary)' : '2px solid rgba(255,255,255,0.2)';
            t.style.opacity = i === idx ? '1' : '0.5';
        });
    };
    window.updateGallerySelection = updateGallerySelection;

    window.viewFullGallery = (index) => {
        const modal = document.getElementById('gallery-modal');
        const thumbs = document.getElementById('gallery-thumbnails');
        
        modal.style.display = 'flex';
        
        thumbs.innerHTML = galleryItems.map((item, i) => `
            <div onclick="window.updateGallerySelection(${i})" style="flex:0 0 80px; height:60px; border-radius:8px; overflow:hidden; cursor:pointer; position:relative; background:#222; border:2px solid transparent; transition:all 0.2s;">
                ${item.type === 'image' 
                    ? `<img src="${item.url}" style="width:100%; height:100%; object-fit:cover;">` 
                    : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:white; font-size:1.5rem;">📽️</div>`
                }
            </div>
        `).join('');

        updateGallerySelection(index);
    };

    // --- Interaction Hooks ---
    const bin = document.getElementById('book-in');
    const bout = document.getElementById('book-out');
    const summary = document.getElementById('price-summary');

    window.activePackage = null;

    window.selectPkg = (idx) => {
        const pkg = hotel.packages[idx];
        if (!pkg) return;
        
        if (!bin.value) {
            const todayDate = new Date();
            bin.value = todayDate.toISOString().split('T')[0];
        }
        
        const startDate = new Date(bin.value);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + parseInt(pkg.nights));
        
        bout.value = endDate.toISOString().split('T')[0];
        window.activePackage = pkg;
        updatePrice();
        
        window.showToast(`✅ ${pkg.title} Selected! ${pkg.nights} nights with ${pkg.discount}% discount.`);
        summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const updatePrice = () => {
        const checkInDate = new Date(bin.value);
        const checkOutDate = new Date(bout.value);
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) || 0;
        
        if (nights <= 0) {
            summary.innerHTML = `<p style="color:#d9534f; font-size:0.85rem; text-align:center;">Check-out must be after check-in</p>`;
            return;
        }

        let discountToUse = discountPercentage;
        let isPkg = false;
        let pkgInfo = null;

        // Auto-detect package if nights match
        const matchingPkg = (hotel.packages || []).find(p => parseInt(p.nights) === nights);
        if (matchingPkg) {
            discountToUse = matchingPkg.discount;
            isPkg = true;
            pkgInfo = matchingPkg;
        } else if (window.activePackage && window.activePackage.nights === nights) {
            discountToUse = window.activePackage.discount;
            isPkg = true;
            pkgInfo = window.activePackage;
        }

        const calculationBase = originalPrice || currentPrice;
        const baseTotal = calculationBase * nights;
        const discAmt = Math.round(baseTotal * (discountToUse / 100));
        const finalTotal = baseTotal - discAmt;

        summary.innerHTML = `
            <div style="display:grid; gap:0.6rem; font-size:0.95rem;">
                ${isPkg ? `
                    <div style="background:#f0f7ff; padding:0.8rem; border-radius:12px; border:1px solid #c9e2ff; margin-bottom:0.5rem; animation: slideIn 0.3s ease;">
                        <div style="font-weight:800; color:#0056b3; font-size:0.75rem; text-transform:uppercase; margin-bottom:0.2rem;">🎁 Package Applied</div>
                        <div style="font-weight:700; color:var(--color-primary);">${pkgInfo.title}</div>
                        <div style="font-size:0.7rem; color:#666;">${pkgInfo.services || ''}</div>
                    </div>
                ` : ''}
                <div style="display:flex; justify-content:space-between; color:#444;">
                    <span>${calculationBase} Birr x ${nights} night${nights>1?'s':''}</span>
                    <span style="font-weight:600;">${baseTotal} Birr</span>
                </div>
                ${discountToUse > 0 ? `
                <div style="display:flex; justify-content:space-between; color:#d9534f; font-weight:700;">
                    <span>Discount (${discountToUse}%)</span>
                    <span>-${discAmt} Birr</span>
                </div>` : ''}
                <div style="display:flex; justify-content:space-between; margin-top:0.8rem; padding-top:0.8rem; border-top:1.5px solid #f4f4f4; font-size:1.3rem; font-weight:900; color:var(--color-primary);">
                    <span>Total</span>
                    <span>${finalTotal} Birr</span>
                </div>
                ${(hotel.eventMode && isPkg) ? `
                    <button class="btn-primary" style="width:100%; padding:1rem; font-size:1.1rem; border-radius:14px; font-weight:700; background:linear-gradient(135deg, var(--color-primary), #2a8146); margin-top:1rem;" onclick="goToBooking()">Reserve Package</button>
                ` : ''}
                <p style="text-align:center; font-size:0.7rem; color:#999; margin-top:0.5rem;">Prices include 15% VAT & Service Fees</p>
            </div>
        `;
        window.searchState = { checkIn: bin.value, checkOut: bout.value };
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(new Date().getTime() + 86400000).toISOString().split('T')[0];
    bin.value = window.searchState?.checkIn || todayStr;
    bout.value = window.searchState?.checkOut || tomorrowStr;
    
    [bin, bout].forEach(el => el.addEventListener('change', () => {
        // Robust Date calculation for mobile
        const parseD = (s) => new Date(s.replace(/-/g, '/'));
        const d_in = parseD(bin.value);
        const d_out = parseD(bout.value);
        const nights = Math.ceil((d_out - d_in) / (1000 * 60 * 60 * 24)) || 0;

        // If nights changed, reset package if it doesn't match
        if (window.activePackage) {
            if (nights !== window.activePackage.nights) window.activePackage = null;
        }
        updatePrice();
    }));
    updatePrice();

    window.goToBooking = () => {
        const d_in = new Date(bin.value.replace(/-/g, '/'));
        const d_out = new Date(bout.value.replace(/-/g, '/'));
        const nights = Math.ceil((d_out - d_in) / (1000 * 60 * 60 * 24)) || 0;

        if (nights <= 0) return window.showToast("📅 Please select valid dates.");

        let discountToUse = discountPercentage;
        let pkgData = null;

        // Auto-detect package match
        const matchingPkg = (hotel.packages || []).find(p => parseInt(p.nights) === nights);
        if (matchingPkg) {
            discountToUse = matchingPkg.discount;
            pkgData = { title: matchingPkg.title, services: matchingPkg.services };
        } else if (window.activePackage && window.activePackage.nights === nights) {
            discountToUse = window.activePackage.discount;
            pkgData = { title: window.activePackage.title, services: window.activePackage.services };
        }

        const totalAmount = (currentPrice * nights) - Math.round((currentPrice * nights) * (discountToUse / 100));

        router.navigate('booking', { 
            id: id, 
            checkIn: bin.value, 
            checkOut: bout.value, 
            guests: 1, 
            totalAmount,
            packageInfo: pkgData 
        });
    };
});
