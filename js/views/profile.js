window.router.addRoute('profile', async (container, params) => {
    if (!window.auth?.currentUser) {
        window.router.navigate('login'); return;
    }

    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading your profile...</div>`;

    const uid = window.auth.currentUser.uid;
    const userEmail = window.auth.currentUser.email || '';

    let userData = {};
    let allBookings = [];
    try {
        const doc = await firestore.collection('users').doc(uid).get();
        userData = doc.exists ? doc.data() : {};
    } catch(e) { console.warn('User doc load:', e); }

    try {
        const snaps = await firestore.collection('bookings').where('customerId', '==', uid).get();
        allBookings = snaps.docs.map(d => ({id: d.id, ...d.data()}));
    } catch(e) { console.warn('Bookings load for stats:', e); }

    const isManagerOrAdmin = ['manager', 'admin'].includes(userData.role);
    const confirmedCount = allBookings.filter(b => b.status === 'Confirmed').length;

    container.innerHTML = `
        <div class="container" style="padding-top:2.5rem;padding-bottom:6rem;max-width:800px;">
            <style>
                .stitch-profile-header {
                    background: linear-gradient(135deg, #0F5A3F 0%, #0a402d 100%);
                    border-radius: 24px;
                    padding: 2.5rem 2rem;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                    box-shadow: 0 10px 25px rgba(15, 90, 63, 0.2);
                    position: relative;
                    overflow: hidden;
                }
                .stitch-profile-header::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: url('data:image/svg+xml;utf8,<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="0" r="100" fill="rgba(255,255,255,0.05)"/></svg>') no-repeat top right;
                    pointer-events: none;
                }
                .stitch-pic-wrap {
                    position: relative;
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    border: 4px solid rgba(255,255,255,0.2);
                    background: #fff;
                    flex-shrink: 0;
                    overflow: hidden;
                    cursor: pointer;
                    z-index: 1;
                }
                .stitch-pic-wrap img {
                    width: 100%; height: 100%; object-fit: cover;
                }
                .stitch-pic-wrap .camera-icon {
                    position: absolute; bottom: 0; left: 0; right: 0;
                    background: rgba(0,0,0,0.5); color: white;
                    text-align: center; font-size: 0.7rem; padding: 4px 0;
                    opacity: 0; transition: 0.2s;
                }
                .stitch-pic-wrap:hover .camera-icon { opacity: 1; }
                
                .stitch-card {
                    background: white;
                    border-radius: 20px;
                    padding: 2rem;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                    border: 1px solid #f1f5f9;
                    margin-bottom: 1.5rem;
                }
                .stitch-card-title {
                    font-size: 1.1rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin: 0 0 1.5rem 0;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .stitch-input-group { margin-bottom: 1.2rem; }
                .stitch-input-group label {
                    display: block; font-size: 0.8rem; font-weight: 700;
                    color: #64748b; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;
                }
                .stitch-input {
                    width: 100%; padding: 0.9rem 1rem; border: 1.5px solid #e2e8f0;
                    border-radius: 12px; font-family: 'Plus Jakarta Sans', sans-serif;
                    font-size: 0.95rem; color: #1e293b; transition: all 0.2s;
                }
                .stitch-input:focus { border-color: #0F5A3F; outline: none; box-shadow: 0 0 0 3px rgba(15, 90, 63, 0.1); }
                
                .stitch-btn {
                    background: #0F5A3F; color: white; border: none;
                    padding: 0.9rem 1.5rem; border-radius: 12px; font-weight: 700;
                    font-size: 0.95rem; cursor: pointer; transition: all 0.2s;
                    display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
                    width: 100%; font-family: inherit;
                }
                .stitch-btn:hover { background: #0a402d; transform: translateY(-1px); }
                
                .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem; }
                .stat-box { background: white; padding: 1.5rem; border-radius: 20px; border: 1px solid #f1f5f9; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 0.5rem; }
                .stat-label { font-size: 0.85rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
                .stat-val { font-size: 2rem; font-weight: 800; color: #0F5A3F; line-height: 1; }

                .danger-zone-title { color: #dc2626; display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem; font-weight: 800; margin-bottom: 1.5rem; }
                .danger-tile {
                    background: #fff5f5; border: 1px solid #fecaca; border-radius: 16px; padding: 1.5rem;
                    display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;
                }
                .danger-tile h4 { margin: 0 0 0.2rem; color: #991b1b; font-size: 0.95rem; }
                .danger-tile p { margin: 0; color: #b91c1c; font-size: 0.8rem; }
                .btn-danger {
                    background: white; border: 1.5px solid #fca5a5; color: #dc2626; padding: 0.6rem 1.2rem;
                    border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: 0.2s; white-space: nowrap;
                }
                .btn-danger:hover { background: #fee2e2; }

                @media (max-width: 600px) {
                    .stitch-profile-header { flex-direction: column; text-align: center; padding: 2rem 1.5rem; gap: 1rem; }
                    .danger-tile { flex-direction: column; align-items: stretch; }
                    .btn-danger { width: 100%; text-align: center; }
                }
            </style>

            <div class="stitch-profile-header" style="margin-bottom: 2rem;">
                <div class="stitch-pic-wrap" onclick="document.getElementById('input-profile-pic').click()">
                    ${userData.profilePic ? `<img src="${userData.profilePic}">` : `<img src="images/logo.png" style="object-fit:contain; padding: 1rem; filter:brightness(0) invert(1) brightness(0.2);">`}
                    <div class="camera-icon">📷 Edit</div>
                </div>
                <div style="flex:1; z-index:1;">
                    <h2 style="margin:0 0 0.3rem; font-size:1.8rem; font-family:'Hanken Grotesk', sans-serif;">${userData.fullName || 'Welcome Traveler'}</h2>
                    <p style="margin:0; opacity:0.85; font-size: 0.95rem;">${userEmail}</p>
                </div>
                <div style="z-index:1;">
                    <button class="btn-outline" style="border-color:rgba(255,255,255,0.4); color:white; padding:0.6rem 1.2rem; border-radius:12px; font-weight:700; font-size:0.85rem; background:rgba(255,255,255,0.1); backdrop-filter:blur(4px);" onclick="window.auth.logout()">Log out</button>
                </div>
            </div>

            ${!isManagerOrAdmin ? `
            <div class="stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Total Bookings</span>
                    <span class="stat-val">${allBookings.length}</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Confirmed</span>
                    <span class="stat-val" style="color:#059669;">${confirmedCount}</span>
                </div>
            </div>
            ` : ''}

            <div class="stitch-card">
                <h3 class="stitch-card-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#0F5A3F;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> Profile Details</h3>
                <div class="stitch-input-group">
                    <label>Full Name</label>
                    <input id="p-fullname" class="stitch-input" type="text" value="${userData.fullName||''}">
                </div>
                <div class="stitch-input-group">
                    <label>Phone Number</label>
                    <input id="p-phone" class="stitch-input" type="tel" value="${userData.phone||''}">
                </div>
                <div class="stitch-input-group">
                    <label>City</label>
                    <input id="p-city" class="stitch-input" type="text" value="${userData.city||''}">
                </div>
                <button class="stitch-btn" onclick="saveGuestProfile()" style="margin-top:0.5rem;">Save Changes</button>
            </div>

            <div class="stitch-card">
                <h3 class="stitch-card-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#0F5A3F;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> Change Password</h3>
                <div class="stitch-input-group">
                    <label>Current Password</label>
                    <input id="p-currpass" class="stitch-input" type="password">
                </div>
                <div class="stitch-input-group">
                    <label>New Password</label>
                    <input id="p-newpass" class="stitch-input" type="password">
                </div>
                <div class="stitch-input-group">
                    <label>Confirm New Password</label>
                    <input id="p-confirmpass" class="stitch-input" type="password">
                </div>
                <button id="btn-changepass" class="stitch-btn" style="background:white; color:#0F5A3F; border:2px solid #0F5A3F; margin-top:0.5rem;" onclick="window.processPasswordChange()">Update Password</button>
            </div>

            <!-- Danger Zone -->
            <div style="margin-top: 3rem;">
                <h3 class="danger-zone-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Private Zone</h3>
                
                <div class="danger-tile">
                    <div>
                        <h4>Reset Profile Details</h4>
                        <p>Clears your name, phone, city, and profile photo.</p>
                    </div>
                    <button class="btn-danger" style="color:#975a16; border-color:#fbd38d;" onclick="window.confirmResetProfile()">Reset Profile</button>
                </div>

                ${!isManagerOrAdmin ? `
                <div class="danger-tile">
                    <div>
                        <h4>Clear Booking History</h4>
                        <p>Permanently removes all your booking records.</p>
                    </div>
                    <button class="btn-danger" onclick="window.confirmClearBookings()">Clear History</button>
                </div>
                ` : ''}

                <div class="danger-tile" style="border-color:#fca5a5; border-width: 2px;">
                    <div>
                        <h4 style="color:#dc2626;">Delete Account</h4>
                        <p>Permanently delete your account and all associated data.</p>
                    </div>
                    <button class="btn-danger" style="background:#dc2626; color:white; border-color:#dc2626;" onclick="confirmDeleteAccount()">Delete Forever</button>
                </div>
            </div>
        </div>

        <input type="file" id="input-profile-pic" accept="image/*" style="display:none;" onchange="handleProfilePicSelect(this)">

        <!-- Delete Account Modal -->
        <div id="del-acc-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
            <div style="background:white;border-radius:24px;padding:2.5rem;max-width:400px;width:90%;text-align:center;">
                <div style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
                <h3 style="margin-bottom:1rem;">${window.t('Are you sure?')}</h3>
                <p style="color:#666;line-height:1.6;margin-bottom:2rem;">${window.t('Your account and booking history will be gone forever. There is no coming back from this.')}</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <button class="stitch-btn" style="background:#f1f5f9; color:#475569;" onclick="document.getElementById('del-acc-modal').style.display='none'">${window.t('Keep Account')}</button>
                    <button class="stitch-btn" style="background:#dc2626;" onclick="processAccountDeletion()">${window.t('Delete Forever')}</button>
                </div>
            </div>
        </div>

        <!-- Re-Auth Modal -->
        <div id="reauth-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10001;align-items:center;justify-content:center;backdrop-filter:blur(6px);">
            <div style="background:white;border-radius:24px;padding:2.5rem;max-width:420px;width:92%;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.3);">
                <div style="font-size:3rem;margin-bottom:1rem;">🔐</div>
                <h3 style="margin-bottom:0.5rem;">Confirm Your Identity</h3>
                <p style="color:#666;font-size:0.9rem;line-height:1.6;margin-bottom:1.5rem;">For your security, please enter your password to confirm account deletion.</p>
                <input type="password" id="reauth-password" class="stitch-input" placeholder="Your current password" style="margin-bottom:1.2rem;">
                <p id="reauth-error" style="color:#dc2626;font-size:0.85rem;margin-bottom:1rem;display:none;"></p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <button class="stitch-btn" style="background:#f1f5f9; color:#475569;" onclick="document.getElementById('reauth-modal').style.display='none'">Cancel</button>
                    <button class="stitch-btn" id="reauth-confirm-btn" style="background:#dc2626;" onclick="window.processReauth()">Confirm</button>
                </div>
            </div>
        </div>
    `;

    // --- Profile Scripts ---
    let selectedProfilePic = userData.profilePic || null;

    window.handleProfilePicSelect = async (input) => {
        const file = input.files[0];
        if (file) {
            try {
                const croppedDataUrl = await window.cropImage(file);
                if (croppedDataUrl) {
                    selectedProfilePic = croppedDataUrl;
                    const container = document.querySelector('.stitch-pic-wrap');
                    if (container) {
                        container.innerHTML = `<img src="${selectedProfilePic}"><div class="camera-icon">📷 Edit</div>`;
                    }
                }
            } catch(e) {
                console.log('Crop cancelled or failed:', e);
            }
        }
    };

    window.saveGuestProfile = async () => {
        const fullName = document.getElementById('p-fullname').value;
        const phone = document.getElementById('p-phone').value;
        const city = document.getElementById('p-city').value;
        await firestore.collection('users').doc(uid).update({ fullName, phone, city, profilePic: selectedProfilePic });
        
        try {
            const threadsSnapshot = await firestore.collection('chatThreads').where('guestId', '==', uid).get();
            if (!threadsSnapshot.empty) {
                const batch = firestore.batch();
                threadsSnapshot.forEach(doc => {
                    batch.update(doc.ref, { guestName: fullName, updatedAt: new Date().toISOString() });
                });
                await batch.commit();
            }
        } catch (e) {
            console.warn('Batch updating guestName in chatThreads failed:', e);
        }

        window.showToast(window.t("✅ Profile updated successfully!"));
        window.auth.userData = { ...window.auth.userData, fullName, profilePic: selectedProfilePic };
        window.auth.renderNav();
    };

    window.confirmDeleteAccount = () => document.getElementById('del-acc-modal').style.display = 'flex';
    window.processAccountDeletion = () => window.auth.deleteCurrentUserAccount();

    window.showReauthModal = () => {
        const modal = document.getElementById('reauth-modal');
        const passInput = document.getElementById('reauth-password');
        const errEl = document.getElementById('reauth-error');
        if (errEl) errEl.style.display = 'none';
        if (passInput) passInput.value = '';
        if (modal) modal.style.display = 'flex';
        setTimeout(() => passInput && passInput.focus(), 200);
    };

    window.processReauth = async () => {
        const passInput = document.getElementById('reauth-password');
        const errEl = document.getElementById('reauth-error');
        const btn = document.getElementById('reauth-confirm-btn');
        const password = passInput?.value?.trim();
        if (!password) {
            if (errEl) { errEl.innerText = 'Please enter your password.'; errEl.style.display = 'block'; }
            return;
        }
        btn.disabled = true;
        btn.innerText = 'Verifying...';
        try {
            await window.auth.deleteCurrentUserAccount(password);
            document.getElementById('reauth-modal').style.display = 'none';
        } catch(e) {
        } finally {
            btn.disabled = false;
            btn.innerText = 'Confirm';
        }
    };

    window.confirmResetProfile = async () => {
        const confirmed = await window.showConfirm({
            title: '🧹 Reset Profile?',
            message: 'This will clear your name, phone, city, and profile photo. Your account and booking history will remain.',
            confirmText: 'Reset',
            cancelText: 'Cancel',
            type: 'warning'
        });
        if (!confirmed) return;
        try {
            await firestore.collection('users').doc(uid).update({
                fullName: '', phone: '', city: '', profilePic: ''
            });
            if (window.auth.userData) {
                window.auth.userData.fullName = '';
                window.auth.userData.profilePic = '';
            }
            window.auth.renderNav();
            window.showToast(window.t('✅ Profile data cleared successfully.'));
            window.router.navigate('profile');
        } catch(e) {
            console.error(e);
            showAlert('Error resetting profile: ' + e.message);
        }
    };

    window.confirmClearBookings = async () => {
        if (allBookings.length === 0) {
            window.showToast(window.t('ℹ️ You have no booking history to delete.'));
            return;
        }
        const confirmed = await window.showConfirm({
            title: '📋 Delete All Bookings?',
            message: `This will permanently delete all ${allBookings.length} booking record(s). This cannot be undone.`,
            confirmText: 'Delete All',
            cancelText: 'Cancel',
            type: 'danger'
        });
        if (!confirmed) return;

        try {
            const batch = firestore.batch();
            allBookings.forEach(b => {
                batch.delete(firestore.collection('bookings').doc(b.id));
            });
            await batch.commit();
            allBookings = [];
            window.showToast(window.t('✅ All booking history deleted successfully.'));
            window.router.navigate('profile');
        } catch(e) {
            console.error(e);
            showAlert('Error deleting bookings: ' + e.message);
        }
    };

    window.processPasswordChange = async () => {
        const curr = document.getElementById('p-currpass').value;
        const newPass = document.getElementById('p-newpass').value;
        const confirmPass = document.getElementById('p-confirmpass').value;

        if (!curr || !newPass || !confirmPass) {
            return window.showToast(window.t('ℹ️ Please fill in all password fields.'));
        }
        if (newPass !== confirmPass) {
            return window.showToast(window.t('❌ New passwords do not match!'));
        }

        const btn = document.getElementById('btn-changepass');
        btn.disabled = true;
        btn.innerText = window.t('Updating...');

        try {
            await window.auth.changePassword(curr, newPass);
            document.getElementById('p-currpass').value = '';
            document.getElementById('p-newpass').value = '';
            document.getElementById('p-confirmpass').value = '';
        } catch (e) {
        } finally {
            btn.disabled = false;
            btn.innerText = window.t('Update Password');
        }
    };
});
