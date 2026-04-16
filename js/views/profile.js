window.router.addRoute('profile', async (container, params) => {
    if (!window.auth?.currentUser) {
        window.router.navigate('login'); return;
    }

    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading your profile...</div>`;

    const uid = window.auth.currentUser.uid;
    const userEmail = window.auth.currentUser.email || '';

    let userData = {}, allBookings = [], bookingReviews = {};
    let bookingsPage = 1;
    let totalBookingsPages = 1;
    try {
        const doc = await firestore.collection('users').doc(uid).get();
        userData = doc.exists ? doc.data() : {};
    } catch(e) { console.warn('User doc load:', e); }

    // ─── BACKGROUND REVIEW LOADING (non-blocking) ─────────────────
    // Load reviews AFTER the page is already visible. Timeout at 3s per query.
    const loadReviewsInBackground = async () => {
        let changed = false;
        const confirmedBookings = allBookings.filter(b => b.status === 'Confirmed');
        for (const b of confirmedBookings) {
            if (bookingReviews[b.id]) continue; // Skip if already loaded
            try {
                const review = await Promise.race([
                    window.db.getUserReviewForBooking(b.id),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
                ]);
                if (review) { bookingReviews[b.id] = review; changed = true; }
            } catch (e) {
                // Timeout or permission error — just skip silently
                break; // If one fails, don't bother trying the rest
            }
        }
        if (changed) renderBookings(); // Re-render with stars
    };

    // ─── LIVE BOOKING LISTENER ───────────────────────────────────
    // This makes the UI reactive - confirmation appears instantly!
    if (window.profileUnsub) window.profileUnsub(); // Cleanup
    window.profileUnsub = window.db.listenToBookings((data) => {
        allBookings = data;
        renderBookings();
        loadReviewsInBackground(); // Trigger/Update reviews when bookings change
    }, null, uid);

    // NOTE: Reviews are loaded AFTER the page renders (see bottom of this route)

    window.filterFrom = ''; window.filterTo = ''; window.filterHotel = 'all';

    const applyFilter = () => {
        let filtered = [...allBookings];
        if (window.filterFrom) filtered = filtered.filter(b => b.createdAt && new Date(b.createdAt) >= new Date(window.filterFrom));
        if (window.filterTo)   filtered = filtered.filter(b => b.createdAt && new Date(b.createdAt) <= new Date(window.filterTo + 'T23:59:59'));
        if (window.filterHotel && window.filterHotel !== 'all') filtered = filtered.filter(b => b.propertyTitle === window.filterHotel);
        return filtered;
    };

    const statusStyle = (status) => {
        if (status === 'Confirmed') return 'background:#e8f5e2;color:var(--color-primary)';
        if (status === 'Denied')    return 'background:#fce8e6;color:#c5221f';
        return 'background:#fff8e1;color:#e37400';
    };
    const statusIcon = (status) => status === 'Confirmed' ? '✅' : status === 'Denied' ? '✗' : '⏳';

    const renderBookings = () => {
        const fullList = applyFilter();
        const hotelNames = [...new Set(allBookings.map(b => b.propertyTitle))].filter(Boolean).sort();

        // Update dropdown if exists
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

        countEl.innerText = `${fullList.length} booking${fullList.length !== 1 ? 's' : ''}`;

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:var(--color-text-light);">No bookings found.</td></tr>`;
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
                <td data-label="No." style="font-weight:800; color:#888;">${rowNum}</td>
                <td data-label="Ref" style="font-family:monospace;font-size:0.8rem;font-weight:600;color:var(--color-primary);">${b.referenceCode}</td>
                <td data-label="Hotel">
                    <div style="font-weight:600;font-size:0.9rem;">${b.propertyTitle}</div>
                    <div style="font-size:0.75rem;color:var(--color-text-light);">${b.checkIn} → ${b.checkOut} <span style="font-weight:700;color:#d4af37;margin-left:4px;">(${nights} night${nights !== 1 ? 's' : ''})</span></div>
                </td>
                <td data-label="Total" style="font-weight:600;">${b.totalAmount} Birr</td>
                <td data-label="Status"><span style="padding:0.25rem 0.7rem;border-radius:99px;font-size:0.75rem;font-weight:700;${statusStyle(b.status)}">
                    ${statusIcon(b.status)} ${b.status}
                </span></td>
                <td data-label="Date" style="font-size:0.8rem;color:#555;font-weight:600;">
                    ${b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '<br><small style="color:#aaa;">' + new Date(b.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + '</small>' : '—'}
                </td>
                <td data-label="Rating">
                    ${b.status === 'Confirmed' ? (
                        review 
                        ? `<div style="display:flex;flex-direction:column;gap:0.2rem;">
                             <div style="display:flex;align-items:center;gap:0.3rem;">${starDisplay(stars)}</div>
                             <button onclick="window.openRatingModal('${b.id}','${b.propertyId}','${b.propertyTitle.replace(/'/g, "\\\'")}', true)" style="border:none; background:none; color:var(--color-primary); font-size:0.7rem; font-weight:700; cursor:pointer; padding:0; text-align:left; text-decoration:underline;">Edit Review</button>
                           </div>` 
                        : `<button onclick="window.openRatingModal('${b.id}','${b.propertyId}','${b.propertyTitle.replace(/'/g, "\\\'")}')" style="padding:0.3rem 0.7rem;border-radius:8px;border:1.5px solid #f59e0b;background:#fffbeb;color:#b45309;font-weight:700;font-size:0.75rem;cursor:pointer;white-space:nowrap;">⭐ Rate Stay</button>`
                    ) : '—'}
                </td>
                <td data-label="Proof">
                    ${b.paymentProofUrl ? `<button onclick="showGuestProof('${b.id}')" class="btn-outline" style="padding:0.2rem 0.6rem;font-size:0.75rem;">🖼 Proof</button>` : '—'}
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
                    btns += `<button onclick="window.setProfileBookingPage(${i})" style="width:32px; height:32px; border-radius:8px; border:1px solid ${bookingsPage===i?'var(--color-primary)':'#ddd'}; background:${bookingsPage===i?'var(--color-primary)':'white'}; color:${bookingsPage===i?'white':'#666'}; font-weight:700; cursor:pointer;">${i}</button>`;
                }
                paginationEl.innerHTML = `
                    <div style="display:flex; justify-content:center; gap:0.4rem; padding:1.5rem 0;">
                        <button onclick="window.setProfileBookingPage(${bookingsPage - 1})" ${bookingsPage === 1 ? 'disabled' : ''} style="padding:0 0.7rem; height:32px; border-radius:8px; border:1px solid #ddd; background:white; color:#666; font-weight:700; cursor:pointer; opacity:${bookingsPage===1?0.5:1}">‹</button>
                        ${btns}
                        <button onclick="window.setProfileBookingPage(${bookingsPage + 1})" ${bookingsPage === totalBookingsPages ? 'disabled' : ''} style="padding:0 0.7rem; height:32px; border-radius:8px; border:1px solid #ddd; background:white; color:#666; font-weight:700; cursor:pointer; opacity:${bookingsPage===totalBookingsPages?0.5:1}">›</button>
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
        <div class="container" style="padding-top:2.5rem;padding-bottom:4rem;max-width:1200px;">
            <div style="margin-bottom:1.5rem;"><button onclick="window.router.navigate('home')" class="btn-outline" style="border:none;padding:0;">← Back to Home</button></div>

            <style>
                @media (max-width: 768px) {
                    .profile-grid { grid-template-columns: 1fr !important; }
                    .profile-header { flex-direction: column; text-align: center; padding: 2rem 1.5rem !important; gap: 1rem !important; }
                    .booking-history-header { flex-direction: column; align-items: flex-start !important; gap: 1rem; }
                }
            </style>

            <div class="profile-header" style="background:var(--color-primary);border-radius:24px;padding:2.5rem;margin-bottom:2rem;display:flex;align-items:center;gap:2rem;color:white;">
                <div style="position:relative;width:110px;height:110px;flex-shrink:0;">
                    <div id="profile-pic-container" style="width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:2.5rem;overflow:hidden;border:4px solid white;cursor:pointer;" onclick="document.getElementById('input-profile-pic').click()">
                        ${userData.profilePic ? `<img src="${userData.profilePic}" style="width:100%;height:100%;object-fit:cover;">` : `<img src="images/logo.png" style="width:80%;height:80%;object-fit:contain;filter:brightness(0) invert(1);">`}
                    </div>
                </div>
                <div style="flex:1;">
                    <h2 style="margin:0 0 0.5rem;font-size:1.8rem;">${userData.fullName || 'Welcome Traveler'}</h2>
                    <p style="margin:0;opacity:0.9;">${userEmail}</p>
                </div>
                <div>
                    <button class="btn-outline" style="border-color:white; color:white; padding:0.6rem 1.2rem; border-radius:12px; font-weight:700; font-size:0.85rem;" onclick="window.auth.logout()">Log out</button>
                </div>
            </div>

            <div class="profile-grid" style="display:grid;grid-template-columns:1.5fr 1fr;gap:2rem;margin-bottom:2rem;">
                <div style="background:white;border-radius:20px;padding:2rem;box-shadow:var(--shadow-sm);">
                    <h3 style="margin-bottom:1.5rem;">✏ Profile Details</h3>
                    <div style="display:grid;gap:1.2rem;">
                        <div><label style="font-weight:700;font-size:0.8rem;display:block;margin-bottom:0.4rem;">Full Name</label><input id="p-fullname" type="text" value="${userData.fullName||''}" style="width:100%;padding:0.8rem;border:1.5px solid #eee;border-radius:12px;"></div>
                        <div><label style="font-weight:700;font-size:0.8rem;display:block;margin-bottom:0.4rem;">Phone</label><input id="p-phone" type="text" value="${userData.phone||''}" style="width:100%;padding:0.8rem;border:1.5px solid #eee;border-radius:12px;"></div>
                        <div><label style="font-weight:700;font-size:0.8rem;display:block;margin-bottom:0.4rem;">City</label><input id="p-city" type="text" value="${userData.city||''}" style="width:100%;padding:0.8rem;border:1.5px solid #eee;border-radius:12px;"></div>
                        <button class="btn-primary" onclick="saveGuestProfile()" style="padding:1rem;">Save Profile Settings</button>
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:2rem;">
                    ${userData.role !== 'manager' ? `
                    <div style="background:white;border-radius:20px;padding:2rem;box-shadow:var(--shadow-sm);">
                        <h3 style="margin-bottom:1.5rem;">📊 Account Status</h3>
                        <div style="display:grid;gap:0.8rem;">
                            <div style="padding:1rem;background:#f8f9fa;border-radius:12px;display:flex;justify-content:space-between;">
                                <span>Bookings</span><strong>${allBookings.length}</strong>
                            </div>
                            <div style="padding:1rem;background:#f0f7f2;border-radius:12px;display:flex;justify-content:space-between;color:var(--color-primary);">
                                <span>Confirmed</span><strong>${allBookings.filter(b=>b.status==='Confirmed').length}</strong>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="background:white;border-radius:20px;padding:2rem;box-shadow:var(--shadow-sm);">
                        <h3 style="margin-bottom:1.5rem;">🔐 Change Password</h3>
                        <div style="display:grid;gap:1.2rem;">
                            <div><label style="font-weight:700;font-size:0.8rem;display:block;margin-bottom:0.4rem;">Current Password</label><input id="p-currpass" type="password" style="width:100%;padding:0.8rem;border:1.5px solid #eee;border-radius:12px;"></div>
                            <div><label style="font-weight:700;font-size:0.8rem;display:block;margin-bottom:0.4rem;">New Password</label><input id="p-newpass" type="password" style="width:100%;padding:0.8rem;border:1.5px solid #eee;border-radius:12px;"></div>
                            <div><label style="font-weight:700;font-size:0.8rem;display:block;margin-bottom:0.4rem;">Confirm New Password</label><input id="p-confirmpass" type="password" style="width:100%;padding:0.8rem;border:1.5px solid #eee;border-radius:12px;"></div>
                            <button id="btn-changepass" class="btn-outline" onclick="window.processPasswordChange()" style="padding:1rem;font-weight:700;">Update Password</button>
                        </div>
                    </div>
                </div>
            </div>

            ${userData.role !== 'manager' ? `
            <div style="background:white;border-radius:20px;padding:2rem;box-shadow:var(--shadow-sm);margin-bottom:2rem;">
                <div class="booking-history-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem;">
                    <h3 style="margin:0;">📜 Booking History <span id="booking-count" style="font-size:0.8rem;font-weight:400;color:#888;"></span></h3>
                    <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                         <select id="filter-hotel" style="padding:0.4rem 0.8rem;border:1px solid #ddd;border-radius:8px;font-size:0.85rem;font-family:inherit;background:white;" onchange="window.filterHotel=this.value; window.renderBookings()">
                             <option value="all">All Hotels</option>
                         </select>
                         <input id="filter-from" type="date" value="${window.filterFrom}" style="padding:0.4rem;border:1px solid #ddd;border-radius:8px;" onchange="window.filterFrom=this.value; window.renderBookings()">
                         <input id="filter-to" type="date" value="${window.filterTo}" style="padding:0.4rem;border:1px solid #ddd;border-radius:8px;" onchange="window.filterTo=this.value; window.renderBookings()">
                    </div>
                </div>
                <div style="overflow-x:auto;">
                    <table class="manager-table" style="width: 100%; min-width: 900px;">
                        <thead><tr><th>No.</th><th>Ref</th><th>Hotel</th><th>Total</th><th>Status</th><th>Date</th><th>Rating</th><th>Proof</th></tr></thead>
                        <tbody id="booking-table-body"></tbody>
                    </table>
                </div>
                <div id="bookings-pagination"></div>
            </div>
            ` : ''}

            <!-- Danger Zone -->
            <div style="background:#fff5f5;border-radius:20px;padding:2rem;border:1px solid #ffcfcf;text-align:center;">
                <h3 style="color:#c53030;margin:0 0 0.5rem;">🔒 Private Zone</h3>
                <p style="color:#822727;font-size:0.9rem;margin-bottom:1.5rem;">Deleting your account will remove all booking history and personal data permanently.</p>
                <button class="btn-outline" style="border-color:#feb2b2;color:#c53030;background:white;padding:0.8rem 2rem;font-weight:700;" onclick="confirmDeleteAccount()">Delete My Account Forever</button>
            </div>
        </div>

        <!-- Star Rating Modal -->
        <div id="rating-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(8px);">
            <div style="background:white;border-radius:28px;padding:2.5rem;max-width:500px;width:95%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.3);max-height:90vh;overflow-y:auto;">
                <h3 id="rate-hotel-name-header" style="margin:0 0 0.5rem; font-size:1.6rem;">Rate Your Stay</h3>
                <p id="rate-hotel-name" style="color:#666;margin:0 0 1.5rem;font-size:0.95rem;font-weight:600;"></p>
                
                <div id="rating-stars" class="star-rating-input" style="display:flex;justify-content:center;gap:0.7rem;margin-bottom:1.5rem;">
                    ${[1,2,3,4,5].map(i => `<span data-value="${i}" style="font-size:2.8rem; cursor:pointer; color:#eee; transition:all 0.2s;" onclick="window.pickStar(${i})">★</span>`).join('')}
                </div>

                <div style="text-align:left; margin-bottom:1.5rem;">
                    <label style="display:block; font-weight:800; font-size:0.8rem; text-transform:uppercase; color:#888; margin-bottom:0.6rem;">Written Review</label>
                    <textarea id="rate-comment" placeholder="Tell us about the service, the rooms, and your overall experience..." rows="4" style="width:100%; padding:1rem; border-radius:16px; border:1.5px solid #eee; font-family:inherit; resize:none; font-size:0.95rem; line-height:1.5;"></textarea>
                </div>

                <div style="text-align:left; margin-bottom:2rem;">
                    <label style="display:block; font-weight:800; font-size:0.8rem; text-transform:uppercase; color:#888; margin-bottom:0.6rem;">Share Photos (Optional)</label>
                    <div id="review-photo-list" style="display:flex; gap:0.8rem; flex-wrap:wrap; margin-bottom:1rem;">
                        <div onclick="document.getElementById('input-review-photos').click()" style="width:80px; height:80px; border-radius:14px; border:2px dashed #ddd; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; color:#aaa; font-size:0.7rem; gap:4px; hover:background:#f9f9f9;">
                            <span style="font-size:1.5rem;">📸</span>
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

        <input type="file" id="input-profile-pic" accept="image/*" style="display:none;" onchange="handleProfilePicSelect(this)">

        <!-- Modals -->
        <div id="del-acc-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
            <div style="background:white;border-radius:24px;padding:2.5rem;max-width:400px;width:90%;text-align:center;">
                <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
                <h3 style="margin-bottom:1rem;">Are you sure?</h3>
                <p style="color:#666;line-height:1.6;margin-bottom:2rem;">Your account and booking history will be gone forever. There is no coming back from this.</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <button class="btn-outline" style="padding:0.8rem;" onclick="document.getElementById('del-acc-modal').style.display='none'">Keep Account</button>
                    <button class="btn-primary" style="background:#c53030;padding:0.8rem;" onclick="processAccountDeletion()">Delete Forever</button>
                </div>
            </div>
        </div>
    `;

    // --- Profile Scripts ---
    let selectedProfilePic = userData.profilePic || null;

    window.handleProfilePicSelect = (input) => {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedProfilePic = e.target.result;
                document.getElementById('profile-pic-container').innerHTML = `<img src="${selectedProfilePic}" style="width:100%;height:100%;object-fit:cover;">`;
            };
            reader.readAsDataURL(file);
        }
    };

    window.saveGuestProfile = async () => {
        const fullName = document.getElementById('p-fullname').value;
        const phone = document.getElementById('p-phone').value;
        const city = document.getElementById('p-city').value;
        await firestore.collection('users').doc(uid).update({ fullName, phone, city, profilePic: selectedProfilePic });
        window.showToast("✅ Profile updated successfully!");
        window.auth.userData = { ...window.auth.userData, fullName, profilePic: selectedProfilePic };
        window.auth.renderNav();
    };

    window.confirmDeleteAccount = () => document.getElementById('del-acc-modal').style.display = 'flex';
    window.processAccountDeletion = () => window.auth.deleteCurrentUserAccount();

    window.processPasswordChange = async () => {
        const curr = document.getElementById('p-currpass').value;
        const newPass = document.getElementById('p-newpass').value;
        const confirmPass = document.getElementById('p-confirmpass').value;

        if (!curr || !newPass || !confirmPass) {
            return window.showToast('ℹ️ Please fill in all password fields.');
        }
        if (newPass !== confirmPass) {
            return window.showToast('❌ New passwords do not match!');
        }

        const btn = document.getElementById('btn-changepass');
        btn.disabled = true;
        btn.innerText = 'Updating...';

        try {
            await window.auth.changePassword(curr, newPass);
            document.getElementById('p-currpass').value = '';
            document.getElementById('p-newpass').value = '';
            document.getElementById('p-confirmpass').value = '';
        } catch (e) {
            // Error alert handled in auth.js
        } finally {
            btn.disabled = false;
            btn.innerText = 'Update Password';
        }
    };

    // --- Rating System ---
    let ratingBookingId = '', ratingPropertyId = '', selectedRating = 0, reviewPhotos = [];

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
    };

    window.pickStar = (n) => {
        selectedRating = n;
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
            const userName = userData.fullName || userEmail;
            const imageUrls = [];
            
            // Upload photos sequentially
            for(let i=0; i < reviewPhotos.length; i++) {
                status.innerText = `Preparing photo ${i+1} of ${reviewPhotos.length}...`;
                const url = await window.db.uploadFile(reviewPhotos[i].file, 'guest_reviews');
                imageUrls.push(url);
            }

            status.innerText = 'Saving review...';
            await window.db.addReview(ratingPropertyId, uid, userName, selectedRating, ratingBookingId, textVal, imageUrls);
            
            bookingReviews[ratingBookingId] = { rating: selectedRating, text: textVal, images: imageUrls };
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

    // Scroll to bookings section if requested via params
    if (params?.section === 'bookings') {
        setTimeout(() => {
            const bookingsHeader = document.querySelector('.booking-history-header');
            if (bookingsHeader) {
                bookingsHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300); // Slight delay ensures DOM is fully painted
    }
});
