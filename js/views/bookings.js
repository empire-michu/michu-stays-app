window.router.addRoute('bookings', async (container, params) => {
    if (!window.auth?.currentUser) {
        window.router.navigate('login'); return;
    }

    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading your bookings...</div>`;

    const uid = window.auth.currentUser.uid;
    const userRole = window.auth.userData?.role || 'customer';

    let allBookings = [], bookingReviews = {};
    let bookingsPage = 1;
    let totalBookingsPages = 1;

    // ─── BACKGROUND REVIEW LOADING (non-blocking) ─────────────────
    const loadReviewsInBackground = async () => {
        let changed = false;
        const confirmedBookings = allBookings.filter(b => b.status === 'Confirmed');
        for (const b of confirmedBookings) {
            if (bookingReviews[b.id]) continue; 
            try {
                const review = await Promise.race([
                    window.db.getUserReviewForBooking(b.id),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                ]);
                if (review) { bookingReviews[b.id] = review; changed = true; }
            } catch (e) { break; }
        }
        if (changed) renderBookings(); 
    };

    // ─── LIVE BOOKING LISTENER ───────────────────────────────────
    if (window.bookingsUnsub) window.bookingsUnsub(); 
    window.bookingsUnsub = window.db.listenToBookings((data) => {
        allBookings = data;
        renderBookings();
        loadReviewsInBackground();
    }, null, uid);

    window.filterFrom = ''; window.filterTo = ''; window.filterHotel = 'all'; window.filterStatus = 'all';

    window.setProfileDatePreset = (preset) => {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];
        if (preset === 'today' || preset === 'daily') {
            window.filterFrom = fmt(today);
            window.filterTo = fmt(today);
        } else if (preset === 'week' || preset === 'weekly') {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            window.filterFrom = fmt(weekAgo);
            window.filterTo = fmt(today);
        } else if (preset === 'month' || preset === 'monthly') {
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);
            window.filterFrom = fmt(monthAgo);
            window.filterTo = fmt(today);
        } else {
            window.filterFrom = '';
            window.filterTo = '';
        }
        const fromEl = document.getElementById('filter-from');
        const toEl = document.getElementById('filter-to');
        if (fromEl) fromEl.value = window.filterFrom;
        if (toEl) toEl.value = window.filterTo;
        bookingsPage = 1;
        renderBookings();
    };

    const applyFilter = () => {
        let filtered = [...allBookings];
        if (window.filterFrom) filtered = filtered.filter(b => b.createdAt && new Date(b.createdAt) >= new Date(window.filterFrom));
        if (window.filterTo)   filtered = filtered.filter(b => b.createdAt && new Date(b.createdAt) <= new Date(window.filterTo + 'T23:59:59'));
        if (window.filterHotel && window.filterHotel !== 'all') filtered = filtered.filter(b => b.propertyTitle === window.filterHotel);
        if (window.filterStatus && window.filterStatus !== 'all') filtered = filtered.filter(b => b.status === window.filterStatus);
        return filtered;
    };

    const statusIcon = (status) => {
        if (status === 'Confirmed') return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        if (status === 'Denied') return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
    };

    const renderBookings = () => {
        const fullList = applyFilter();
        const hotelNames = [...new Set(allBookings.map(b => b.propertyTitle))].filter(Boolean).sort();

        const hSelect = document.getElementById('filter-hotel');
        if (hSelect && hSelect.options.length <= 1) {
            hotelNames.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name; opt.innerText = name;
                if (filterHotel === name) opt.selected = true;
                hSelect.appendChild(opt);
            });
        }

        totalBookingsPages = Math.max(1, Math.ceil(fullList.length / 20));
        if (bookingsPage > totalBookingsPages) bookingsPage = totalBookingsPages;
        
        const list = fullList.slice((bookingsPage - 1) * 20, (bookingsPage - 1) * 20 + 20);
        
        const tbody = document.getElementById('booking-table-body');
        const countEl = document.getElementById('booking-count');
        const paginationEl = document.getElementById('bookings-pagination');
        if (!tbody) return;

        if (countEl) countEl.innerText = `${fullList.length} booking${fullList.length !== 1 ? 's' : ''}`;

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:2.5rem;color:var(--color-text-light);">No bookings found.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map((b, index) => {
            let rowNum = (bookingsPage - 1) * 20 + index + 1;
            const review = bookingReviews[b.id];
            const stars = review ? review.rating : 0;
            let nights = 0;
            if (b.checkIn && b.checkOut) {
                const diffTime = Math.abs(new Date(b.checkOut) - new Date(b.checkIn));
                nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
            const starDisplay = (n) => {
                let s = '';
                for (let i = 1; i <= 5; i++) s += `<span style="color:${i<=n?'#f59e0b':'#ddd'}; font-size:1.1rem; cursor:default;">★</span>`;
                return s;
            };
            return `
            <tr>
                <td data-label="No."><span class="premium-row-num">${rowNum}</span></td>
                <td data-label="Ref"><span class="premium-ref">${b.referenceCode}</span></td>
                <td data-label="Hotel">
                    <div style="font-weight:700;font-size:0.9rem;color:#1e293b;">${b.propertyTitle}</div>
                    <div class="premium-stay-dates">${b.checkIn} → ${b.checkOut} <span class="premium-nights-badge">(${nights} ${nights !== 1 ? t('nights') : t('night')})</span></div>
                </td>
                <td data-label="Total"><span class="premium-amount">${b.totalAmount}<span class="premium-amount-currency">Birr</span></span></td>
                <td data-label="Status"><span class="premium-status ${b.status==='Confirmed'?'premium-status--confirmed':(b.status==='Denied'?'premium-status--denied':'premium-status--awaiting')}">
                    ${statusIcon(b.status)} ${b.status}
                </span></td>
                <td data-label="Date">
                    <div class="premium-date">${b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</div>
                    ${b.createdAt ? `<div class="premium-date-time">${new Date(b.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
                </td>
                <td data-label="Rating">
                    ${b.status === 'Confirmed' ? (
                        review 
                        ? `<div style="display:flex;flex-direction:column;gap:0.25rem;">
                             <div class="premium-stars">${starDisplay(stars)}</div>
                             <button onclick="window.openRatingModal('${b.id}','${b.propertyId}','${b.propertyTitle.replace(/'/g, "\\\'")}', true)" style="border:none;background:none;color:#008450;font-size:0.68rem;font-weight:700;cursor:pointer;padding:0;text-align:left;text-decoration:underline;">Edit Review</button>
                           </div>` 
                        : `<button onclick="window.openRatingModal('${b.id}','${b.propertyId}','${b.propertyTitle.replace(/'/g, "\\\'")}')" class="premium-action-btn premium-action-btn--accent"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg> Rate Stay</button>`
                    ) : '<span style="color:#cbd5e1;">—</span>'}
                </td>
                <td data-label="Proof">
                    ${b.paymentProofUrl ? `<button onclick="showGuestProof('${b.id}')" class="premium-action-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg> Proof</button>` : '<span style="color:#cbd5e1;">—</span>'}
                </td>
                <td data-label="Receipt">
                    ${b.status === 'Confirmed' ? `<button onclick='window.openReceipt(${JSON.stringify({id:b.id,referenceCode:b.referenceCode,customerName:b.customerName,customerEmail:b.customerEmail,customerPhone:b.customerPhone,propertyTitle:b.propertyTitle,checkIn:b.checkIn,checkOut:b.checkOut,guests:b.guests,totalAmount:b.totalAmount,paymentMethod:b.paymentMethod,status:b.status,createdAt:b.createdAt,packageInfo:b.packageInfo})})' class="premium-action-btn premium-action-btn--primary"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> Receipt</button>` : '<span style="color:#cbd5e1;">—</span>'}
                </td>
                <td data-label="Chat">
                    <button onclick="window.router.navigate('chat', { bookingId: '${b.id}' })" class="premium-action-btn premium-action-btn--chat"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Message</button>
                </td>
            </tr>
        `;
        }).join('');

        if (paginationEl) {
            if (totalBookingsPages <= 1) {
                paginationEl.innerHTML = '';
            } else {
                let btns = '';
                for (let i = 1; i <= totalBookingsPages; i++) {
                    btns += `<button onclick="window.setProfileBookingPage(${i})" class="${bookingsPage===i?'active':''}" style="width:34px; height:34px;">${i}</button>`;
                }
                paginationEl.innerHTML = `
                    <div class="premium-pagination">
                        <button onclick="window.setProfileBookingPage(${bookingsPage - 1})" ${bookingsPage === 1 ? 'disabled' : ''} style="padding:0 0.8rem; height:34px;">‹</button>
                        ${btns}
                        <button onclick="window.setProfileBookingPage(${bookingsPage + 1})" ${bookingsPage === totalBookingsPages ? 'disabled' : ''} style="padding:0 0.8rem; height:34px;">›</button>
                    </div>
                `;
            }
        }
    };

    window.setProfileBookingPage = (page) => {
        if (page < 1 || page > totalBookingsPages) return;
        bookingsPage = page;
        renderBookings();
    };

    container.innerHTML = `
        <div class="container" style="padding-top:2.5rem;padding-bottom:2rem;max-width:1200px;">
            <div style="margin-bottom:1.5rem;"><button onclick="window.router.navigate('home')" class="btn-outline" style="border:none;padding:0;">← Back to Home</button></div>

            <style>
                @media (max-width: 768px) {
                    .booking-history-header { flex-direction: column; align-items: flex-start !important; gap: 1rem; }
                }
            </style>

            <div style="background:white;border-radius:20px;padding:2rem;box-shadow:var(--shadow-sm);margin-bottom:2rem;">
                <div class="booking-history-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
                    <h3 style="margin:0; width:100%; color:#0F5A3F;">📜 My Bookings <span id="booking-count" style="font-size:0.8rem;font-weight:400;color:#888;"></span></h3>
                    
                    <details class="premium-filter-collapse" style="width:100%; margin-bottom:0; box-shadow:none; border:1px solid #e2e8f0; background:#f8fafc;">
                        <summary style="color:#475569; font-size:0.8rem;">
                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                Filter Bookings
                            </div>
                        </summary>
                        <div class="filter-content" style="display:flex; flex-direction:column; gap:0.8rem; border-top-color:#e2e8f0;">
                            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;">
                                 <select id="filter-status" style="padding:0.4rem 0.8rem;border:1.5px solid #cbd5e1;border-radius:10px;font-size:0.85rem;font-family:inherit;background:white;font-weight:600;" onchange="window.filterStatus=this.value; window.renderBookings()">
                                     <option value="all">All Statuses</option>
                                     <option value="Awaiting Confirmation" ${window.filterStatus === 'Awaiting Confirmation' ? 'selected' : ''}>Awaiting Confirmation</option>
                                     <option value="Confirmed" ${window.filterStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                                     <option value="Denied" ${window.filterStatus === 'Denied' ? 'selected' : ''}>Denied</option>
                                 </select>
                                 <select id="filter-hotel" style="padding:0.4rem 0.8rem;border:1.5px solid #cbd5e1;border-radius:10px;font-size:0.85rem;font-family:inherit;background:white;font-weight:600;" onchange="window.filterHotel=this.value; window.renderBookings()">
                                     <option value="all">All Hotels</option>
                                 </select>
                                 <input id="filter-from" type="date" value="${window.filterFrom}" style="padding:0.4rem;border:1.5px solid #cbd5e1;border-radius:10px;font-weight:600;" onchange="window.filterFrom=this.value; window.renderBookings()">
                                 <input id="filter-to" type="date" value="${window.filterTo}" style="padding:0.4rem;border:1.5px solid #cbd5e1;border-radius:10px;font-weight:600;" onchange="window.filterTo=this.value; window.renderBookings()">
                            </div>
                            <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; width:100%;">
                                  <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setProfileDatePreset('daily')">Daily</button>
                                  <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setProfileDatePreset('weekly')">Weekly</button>
                                  <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem;" onclick="window.setProfileDatePreset('monthly')">Monthly</button>
                                  <button class="btn-outline" style="font-size:0.75rem; border-radius:10px; padding:0.4rem 0.8rem; margin-left:0.5rem; border-color:#cbd5e1; color:#64748b;" onclick="window.setProfileDatePreset('reset')">Reset Filter</button>
                             </div>
                        </div>
                    </details>
                </div>
                <div class="premium-table-wrap">
                <div style="overflow-x:auto;">
                    <table class="manager-table" style="width: 100%; min-width: 800px;">
                        <thead><tr><th>No.</th><th>Ref</th><th>Hotel</th><th>Total</th><th>Status</th><th>Date</th><th>Rating</th><th>Proof</th><th>Receipt</th><th>Chat</th></tr></thead>
                        <tbody id="booking-table-body"></tbody>
                    </table>
                </div>
                </div>
                <div id="bookings-pagination"></div>
            </div>
        </div>

        <!-- Star Rating Modal -->
        <div id="rating-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(8px);">
            <div style="background:white;border-radius:28px;padding:2.5rem;max-width:500px;width:95%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
                <h3 id="rate-hotel-name-header" style="margin:0 0 0.5rem; font-size:1.6rem;">Rate Your Stay</h3>
                <p id="rate-hotel-name" style="color:#666;margin:0 0 1.5rem;font-size:0.95rem;font-weight:600;"></p>
                
                <div style="margin-bottom:0.5rem; font-weight:800; font-size:0.8rem; text-transform:uppercase; color:#888;">Overall Experience</div>
                <div id="rating-stars" class="star-rating-input" style="display:flex;justify-content:center;gap:0.7rem;margin-bottom:1.5rem;">
                    ${[1,2,3,4,5].map(i => `<span data-value="${i}" style="font-size:2.8rem; cursor:pointer; color:#eee; transition:all 0.2s;" onclick="window.pickStar(${i})">★</span>`).join('')}
                </div>

                <div style="margin-bottom:1.5rem; background:#f8f9fa; padding:1.5rem; border-radius:20px; text-align:left;">
                    <div style="font-weight:800; font-size:0.85rem; text-transform:uppercase; color:#888; margin-bottom:1rem; text-align:center;">Detailed Category Ratings</div>
                    <div style="display:grid; gap:1rem;">
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
                            <span style="font-weight:700; font-size:0.95rem; display:inline-flex; align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/><path d="M5.4 5.4h.01"/><path d="M10.2 3h.01"/><path d="M3 10.2h.01"/><path d="m14 14 6-6"/></svg> Cleanliness</span>
                            <div id="sub-stars-cleanliness" style="display:flex; gap:0.4rem;"></div>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
                            <span style="font-weight:700; font-size:0.95rem; display:inline-flex; align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> Location</span>
                            <div id="sub-stars-location" style="display:flex; gap:0.4rem;"></div>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
                            <span style="font-weight:700; font-size:0.95rem; display:inline-flex; align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4 12H2"/><path d="M22 12h-2"/><path d="m19.07 4.93-1.41 1.41"/><path d="m6.34 17.66-1.41 1.41"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M12 6a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6Z"/><path d="M6 16h12"/></svg> Service</span>
                            <div id="sub-stars-service" style="display:flex; gap:0.4rem;"></div>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.5rem;">
                            <span style="font-weight:700; font-size:0.95rem; display:inline-flex; align-items:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--color-primary); margin-right:6px;"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13"/><path d="M13 3l3 6-4 13"/><path d="M2 9h20"/></svg> Value</span>
                            <div id="sub-stars-value" style="display:flex; gap:0.4rem;"></div>
                        </div>
                    </div>
                </div>

                <div style="text-align:left; margin-bottom:1.5rem;">
                    <label style="display:block; font-weight:800; font-size:0.8rem; text-transform:uppercase; color:#888; margin-bottom:0.6rem;">Written Review</label>
                    <textarea id="rate-comment" placeholder="Tell us about the service, the rooms, and your overall experience..." rows="4" style="width:100%; padding:1rem; border-radius:16px; border:1.5px solid #eee; font-family:inherit; resize:none; font-size:0.95rem; line-height:1.5;"></textarea>
                </div>

                <div style="text-align:left; margin-bottom:2rem;">
                    <label style="display:block; font-weight:800; font-size:0.8rem; text-transform:uppercase; color:#888; margin-bottom:0.6rem;">Share Photos (Optional)</label>
                    <div id="review-photo-list" style="display:flex; gap:0.8rem; flex-wrap:wrap; margin-bottom:1rem;">
                        <div onclick="document.getElementById('input-review-photos').click()" style="width:80px; height:80px; border-radius:14px; border:2px dashed #ddd; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; color:#aaa; font-size:0.7rem; gap:4px; hover:background:#f9f9f9;">
                            <span style="display:flex;align-items:center;justify-content:center;margin-bottom:2px;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg></span>
                            <span>Add Photo</span>
                        </div>
                    </div>
                    <input type="file" id="input-review-photos" accept="image/*" multiple style="display:none;" onchange="window.handleReviewPhotos(this)">
                    <p style="font-size:0.7rem; color:#aaa; margin:0;">You can upload up to 5 photos from your stay.</p>
                </div>

                <div id="rate-status" style="margin-bottom:1rem; font-weight:700; color:var(--color-primary); font-size:0.85rem;"></div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;">
                    <button class="btn-outline" style="padding:1rem; border-radius:14px; font-weight:700;" onclick="document.getElementById('rating-modal').style.display='none'">Dismiss</button>
                    <button id="rating-submit-btn" class="btn-primary" style="padding:1rem; border-radius:14px; font-weight:700;" onclick="window.submitRating()">Submit Review</button>
                </div>
            </div>
        </div>
    `;

    // --- Rating System ---
    let ratingBookingId = '', ratingPropertyId = '', selectedRating = 0, reviewPhotos = [];
    let subRatingsState = { cleanliness: 0, location: 0, service: 0, value: 0 };

    window.handleReviewPhotos = (input) => {
        const files = Array.from(input.files);
        if (reviewPhotos.length + files.length > 5) {
            window.showToast("Maximum 5 photos allowed per review.");
            return;
        }
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                reviewPhotos.push({ file, preview: e.target.result });
                renderReviewPhotos();
            };
            reader.readAsDataURL(file);
        });
        input.value = '';
    };

    const renderReviewPhotos = () => {
        const list = document.getElementById('review-photo-list');
        const items = reviewPhotos.map((p, idx) => `
            <div style="position:relative; width:80px; height:80px;">
                <img src="${p.preview}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">
                <button onclick="window.removeRevPhoto(${idx})" style="position:absolute; top:-6px; right:-6px; background:#ff4b2b; color:white; border:none; border-radius:50%; width:22px; height:22px; font-size:12px; cursor:pointer; font-weight:800; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.2);">&times;</button>
            </div>
        `).join('');
        
        list.innerHTML = items + `
            <div onclick="document.getElementById('input-review-photos').click()" style="width:80px; height:80px; border-radius:14px; border:2px dashed #ddd; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; color:#aaa; font-size:0.7rem; gap:4px; hover:background:#f9f9f9;">
                <span style="font-size:1.5rem;">📸</span>
                <span>Add Photo</span>
            </div>
        `;
    };

    window.removeRevPhoto = (idx) => {
        reviewPhotos.splice(idx, 1);
        renderReviewPhotos();
    };

    window.openRatingModal = (bookingId, propertyId, hotelName, isEdit = false) => {
        ratingBookingId = bookingId;
        ratingPropertyId = propertyId;
        reviewPhotos = []; // Reset photos
        
        const existing = bookingReviews[bookingId];
        selectedRating = isEdit && existing ? existing.rating : 0;
        subRatingsState = isEdit && existing && existing.subRatings ? { ...existing.subRatings } : { cleanliness: selectedRating, location: selectedRating, service: selectedRating, value: selectedRating };
        
        document.getElementById('rate-hotel-name-header').innerText = isEdit ? 'Update Your Review' : 'Rate Your Stay';
        document.getElementById('rate-hotel-name').innerText = hotelName;
        document.getElementById('rate-comment').value = isEdit && existing ? (existing.text || '') : '';
        document.getElementById('rate-status').innerText = '';
        
        renderReviewPhotos();
        renderStarPicker();
        document.getElementById('rating-modal').style.display = 'flex';
    };

    const renderStarPicker = () => {
        const container = document.getElementById('rating-stars');
        let html = '';
        for (let i = 1; i <= 5; i++) {
            html += `<span onclick="window.pickStar(${i})" style="font-size:2.8rem; cursor:pointer; color:${i <= selectedRating ? '#f59e0b' : '#eee'}; transition:all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'">★</span>`;
        }
        container.innerHTML = html;

        ['cleanliness', 'location', 'service', 'value'].forEach(cat => {
            const subEl = document.getElementById(`sub-stars-${cat}`);
            if (subEl) {
                let subHtml = '';
                const val = subRatingsState[cat] || 0;
                for (let i = 1; i <= 5; i++) {
                    subHtml += `<span onclick="window.pickSubStar('${cat}', ${i})" style="font-size:1.8rem; cursor:pointer; color:${i <= val ? 'var(--color-primary)' : '#eee'}; transition:all 0.2s;">★</span>`;
                }
                subEl.innerHTML = subHtml;
            }
        });
    };

    window.pickStar = (n) => {
        selectedRating = n;
        subRatingsState = { cleanliness: n, location: n, service: n, value: n };
        renderStarPicker();
    };

    window.pickSubStar = (cat, n) => {
        subRatingsState[cat] = n;
        const vals = Object.values(subRatingsState);
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        selectedRating = avg || 1;
        renderStarPicker();
    };

    window.submitRating = async () => {
        if (selectedRating === 0) { window.showToast('Please select a star rating.'); return; }
        const btn = document.getElementById('rating-submit-btn');
        const status = document.getElementById('rate-status');
        const textVal = document.getElementById('rate-comment').value.trim();
        
        btn.disabled = true; 
        btn.style.opacity = '0.7';
        btn.innerText = 'Uploading...';
        
        try {
            const userName = window.auth.userData?.fullName || window.auth.currentUser.email;
            const imageUrls = [];
            
            for(let i=0; i < reviewPhotos.length; i++) {
                status.innerText = `Preparing photo ${i+1} of ${reviewPhotos.length}...`;
                const url = await window.db.uploadFile(reviewPhotos[i].file, 'guest_reviews');
                imageUrls.push(url);
            }

            status.innerText = 'Saving review...';
            await window.db.addReview(ratingPropertyId, uid, userName, selectedRating, ratingBookingId, textVal, imageUrls, subRatingsState);
            
            bookingReviews[ratingBookingId] = { rating: selectedRating, text: textVal, images: imageUrls, subRatings: subRatingsState };
            window.showToast('⭐ Thank you for your feedback!');
            document.getElementById('rating-modal').style.display = 'none';
            renderBookings();
        } catch(e) {
            console.error(e);
            window.showToast('Error: ' + e.message);
        } finally {
            btn.disabled = false; 
            btn.style.opacity = '1';
            btn.innerText = 'Submit Review';
            status.innerText = '';
        }
    };

    window.showGuestProof = (bookingId) => {
        const b = allBookings.find(x => x.id === bookingId);
        if (b && b.paymentProofUrl) {
            const overlay = document.createElement('div');
            overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:20000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);`;
            overlay.innerHTML = `
                <div style="position:relative; width:90%; max-width:600px; animation: _alertPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);">
                    <button style="position:absolute;top:-45px;right:0;background:none;border:none;color:white;font-size:2.5rem;line-height:1;cursor:pointer;padding:0;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'" onclick="this.parentElement.parentElement.remove()">&times;</button>
                    <img src="${b.paymentProofUrl}" style="width:100%;border-radius:16px;max-height:85vh;object-fit:contain;box-shadow:0 20px 50px rgba(0,0,0,0.5);background:#111;">
                </div>
            `;
            document.body.appendChild(overlay);
        } else {
            window.showToast("Proof of payment not available.");
        }
    };

    window.renderBookings = renderBookings;
    renderBookings();
    loadReviewsInBackground();

});
