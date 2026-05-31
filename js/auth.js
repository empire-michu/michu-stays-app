class AuthEngine {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.hasInitialized = false;

        firebase.auth().onAuthStateChanged(async (user) => {
            this.currentUser = user;
            if (user) {
                // Check localStorage cache first for instant load
                const cachedRole = localStorage.getItem(`ms_role_${user.uid}`);
                if (cachedRole) {
                    this.userData = { role: cachedRole, uid: user.uid, email: user.email };
                    this.renderNav();
                }
                // Always fetch fresh from Firestore to stay in sync
                try {
                    const doc = await firestore.collection('users').doc(user.uid).get();
                    if (doc && doc.exists) {
                        const newData = doc.data();
                        const oldRole = this.userData?.role;
                        
                        this.userData = { 
                            email: user.email, 
                            fullName: user.displayName || '',
                            ...newData, 
                            uid: user.uid 
                        };
                        
                        localStorage.setItem(`ms_role_${user.uid}`, newData.role || 'customer');
                        
                        // If role officially changed from cache, re-route to correct dashboard
                        if (oldRole && oldRole !== newData.role) {
                            console.log("Role updated from cache:", oldRole, "->", newData.role);
                            this._redirectByRole();
                        }
                        this.renderNav();
                    } else if (!this.userData) {
                        this.userData = { role: 'customer', uid: user.uid, email: user.email };
                        this.renderNav();
                    }
                } catch(e) {
                    console.warn('Auth state sync error:', e);
                    if (!this.userData) {
                        this.userData = { role: 'customer', uid: user.uid };
                        this.renderNav();
                    }
                }
            } else {
                this.userData = null;
                // Clear cache on logout
                if (this.currentUser) localStorage.removeItem(`ms_role_${this.currentUser.uid}`);
            }
            this.renderNav();
            
            // Notification Listener Lifecycle
            if (user) {
                if (window.startNotifications) window.startNotifications();
                
                // AUTO-REGISTER PUSH NOTIFICATIONS for every logged-in user
                // This ensures FCM tokens are always saved so they can receive push alerts
                setTimeout(async () => {
                    try {
                        if (window.db && window.db.requestPushPermission) {
                            console.log("🔔 Auto-registering push notifications for user:", user.uid);
                            await window.db.requestPushPermission(user.uid);
                            console.log("✅ Push notification auto-registration complete.");
                        }
                    } catch (e) {
                        console.warn("⚠️ Push auto-registration skipped:", e.message);
                    }
                }, 2000); // Delay 2s to let the app fully load
            } else {
                if (window.stopNotifications) window.stopNotifications();
            }

            if (!this.hasInitialized) {
                this.hasInitialized = true;
                const hash = window.location.hash.replace('#', '') || '';

                // Support direct server pathname routing for receipt verification
                if (window.location.pathname.startsWith('/verify')) {
                    // Bypass all dashboard/home redirects, let verify page load
                    const params = {};
                    const searchParams = new URLSearchParams(window.location.search);
                    searchParams.forEach((v, k) => {
                        params[k] = v;
                    });
                    window.router.navigate('verify', params, false);
                    return;
                }

                // Protect admin-only routes
                if (hash === 'admin' && this.userData?.role !== 'admin') {
                    window.router.navigate('home'); return;
                }
                // Protect manager routes
                if (hash === 'manager' && !['admin','manager'].includes(this.userData?.role)) {
                    window.router.navigate('login'); return;
                }
                // Auto-redirect by role if landing on root
                if (!hash) {
                    this._redirectByRole(); return;
                }
                // If authenticated user is on login/signup, redirect to their dashboard
                if (['login', 'signup'].includes(hash)) {
                    this._redirectByRole(); return;
                }
                window.router.navigate(hash || 'home');
            } else {
                // Auth state changed (login/logout)
                const currentHash = window.location.hash.replace('#', '') || '';
                if (window.location.pathname.startsWith('/verify')) {
                    return; // Ignore redirects on verification page
                }
                if (!user) {
                    if (!currentHash.startsWith('verify')) {
                        window.router.navigate('home');
                    }
                } else {
                    this._redirectByRole();
                }
            }
        });

        setTimeout(() => { this.setupRecaptcha(); }, 500);
    }

    _redirectByRole() {
        const hash = window.location.hash.replace('#', '') || '';
        if (hash.startsWith('verify')) return; // Leave user on receipt verification page
        if (window.location.pathname.startsWith('/verify')) return; // Also ignore if pathname is verify
        
        const role = this.userData?.role;
        if (role === 'admin') window.router.navigate('admin');
        else if (role === 'manager') window.router.navigate('manager');
        else window.router.navigate('home');
    }

    renderNav() {
        const container = document.getElementById('auth-nav-container');
        const notifBtn = document.getElementById('header-notif-btn');
        if (!container) return;
        const role = this.userData?.role;

        if (this.currentUser) {
            if (notifBtn) notifBtn.style.display = 'flex';
            
            let dashBtn = '';
            if (role === 'admin') {
                dashBtn = `<button class="btn-primary" style="padding:0.4rem 0.8rem;font-size:0.75rem;background:var(--color-secondary);border-radius:12px;" onclick="window.router.navigate('admin')">⚙ Admin Panel</button>`;
            } else if (role === 'manager') {
                dashBtn = `<button class="btn-primary" style="padding:0.4rem 0.8rem;font-size:0.75rem;border-radius:12px;" onclick="window.router.navigate('manager')">Dashboard</button>`;
            } else {
                // Guest: show profile picture and formatted name (e.g. ABEBE G.)
                let displayName = 'GUEST';
                if (this.userData?.fullName) {
                    const parts = this.userData.fullName.trim().split(/\s+/);
                    if (parts.length > 1) {
                        displayName = `${parts[0]} ${parts[parts.length - 1][0]}.`.toUpperCase();
                    } else {
                        displayName = parts[0].toUpperCase();
                    }
                }

                const avatarImg = this.userData?.profilePic 
                    ? `<img src="${this.userData.profilePic}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,0.3);">`
                    : `<img src="images/logo.png" style="width:24px;height:24px;border-radius:50%;object-fit:contain;background:white;padding:2px;">`;

                dashBtn = `
                <div class="desktop-user-dropdown" style="position:relative; display:inline-block;">
                    <style>
                        .desktop-user-dropdown:hover .user-dropdown-menu { display: block; animation: dropFade 0.2s ease-out; }
                        .desktop-user-dropdown::after { content: ''; position: absolute; top: 100%; left: 0; right: 0; height: 15px; }
                        .user-dropdown-menu { display: none; position: absolute; top: calc(100% + 8px); right: 0; min-width: 180px; background: white; border-radius: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #f1f5f9; padding: 0.5rem; z-index: 9999; }
                        .user-dropdown-menu a { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 1rem; color: #475569; font-weight: 600; font-size: 0.85rem; border-radius: 10px; cursor: pointer; transition: 0.2s; text-decoration: none; }
                        .user-dropdown-menu a:hover { background: #f8fafc; color: #0F5A3F; }
                        .user-dropdown-menu a svg { width: 16px; height: 16px; opacity: 0.8; }
                        @keyframes dropFade { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
                        @media(max-width: 768px) {
                            .desktop-user-dropdown:hover .user-dropdown-menu { display: none !important; }
                        }
                    </style>
                    <button class="btn-outline" onclick="if(window.innerWidth <= 768) window.router.navigate('profile')" style="padding:0.3rem 0.7rem;font-size:0.75rem;display:flex;align-items:center;gap:0.4rem;font-weight:700;border-radius:12px;cursor:pointer;">
                        ${avatarImg} ${displayName}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <div class="user-dropdown-menu">
                        <a onclick="window.router.navigate('profile')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${window.t ? window.t('My Profile') : 'My Profile'}</a>
                        <a onclick="window.router.navigate('bookings')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg> ${window.t ? window.t('My Bookings') : 'My Bookings'}</a>
                        <div style="border-top:1px solid #e2e8f0;margin:0.3rem 0;"></div>
                        <a onclick="window.auth.logout()" style="color:#dc2626;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> ${window.t ? window.t('Log out') : 'Log out'}</a>
                    </div>
                </div>`;
            }
            container.innerHTML = `
                <div style="display:flex;align-items:center;">
                    ${dashBtn}
                </div>
            `;
            
            // Mobile Nav Role Handling
            const mobileSaved = document.getElementById('mobile-nav-saved');
            const mobileManage = document.getElementById('mobile-nav-manage');
            if (mobileSaved && mobileManage) {
                if (role === 'admin' || role === 'manager') {
                    mobileSaved.style.display = 'none';
                    mobileManage.style.display = 'flex';
                } else {
                    mobileSaved.style.display = 'flex';
                    mobileManage.style.display = 'none';
                }
            }
        } else {
            if (notifBtn) notifBtn.style.display = 'none';
            
            container.innerHTML = `
                <div style="display:flex;align-items:center;gap:0.4rem;">
                    <button class="btn-outline" style="padding:0.35rem 0.6rem;border:none;font-size:0.8rem;font-weight:600;" onclick="window.router.navigate('login')">${__('Log In')}</button>
                    <button class="btn-primary" style="padding:0.35rem 0.8rem;font-size:0.8rem;border-radius:12px;" onclick="window.router.navigate('signup')">${__('Sign Up')}</button>
                </div>
            `;
            
            // Default to Guest view when not logged in
            const mobileSaved = document.getElementById('mobile-nav-saved');
            const mobileManage = document.getElementById('mobile-nav-manage');
            if (mobileSaved && mobileManage) {
                mobileSaved.style.display = 'flex';
                mobileManage.style.display = 'none';
            }
        }
    }

    async signup(email, password, role = 'customer', fullName = '') {
        try {
            const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
            // Save profile to Firestore
            await firestore.collection('users').doc(cred.user.uid).set({
                email, role, fullName: fullName || '', phone: '', city: ''
            });
            window.showToast('✅ Account created! Check your inbox to verify your email.');
        } catch (e) {
            console.error("Test Email Fail:", e);
            window.showToast("❌ Email Failed: " + (e.message || "Unknown Error. Check Console."));
            throw e;
        }
    }

    async sendPasswordReset(email) {
        if (!email) return showAlert("Please enter your email first.");
        try {
            window.showToast("⏳ Sending secure recovery email...");
            
            // Call our new professional Bridge (hosted on Render to stay on Free plan)
            const response = await fetch('https://michu-push-server.onrender.com/request-password-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            
            if (result.success) {
                window.showToast("✅ Secure reset link sent! Please check your Primary & Spam folders.");
            } else {
                throw new Error(result.error || "Failed to send email.");
            }
            return true;
        } catch (e) {
            console.error("Recovery Fail:", e);
            showAlert("Failed to send reset link: " + (e.message || "Unknown error"));
        }
    }

    async changePassword(currentPassword, newPassword) {
        if (!this.currentUser) throw new Error("No user is currently signed in.");
        try {
            // Re-authenticate first
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                currentPassword
            );
            await this.currentUser.reauthenticateWithCredential(credential);
            
            // Update password
            await this.currentUser.updatePassword(newPassword);
            window.showToast("✅ Password updated successfully.");
        } catch (e) {
            console.error(e);
            let msg = e.message;
            if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') msg = "Incorrect current password.";
            if (e.code === 'auth/weak-password') msg = "New password is too weak (min 6 characters).";
            showAlert("Error updating password: " + msg);
            throw e;
        }
    }

    // Helper for structured EmailJS calls
    async _triggerEmail(templateId, params) {
        if (!window.emailjs) {
            const msg = "EmailJS library is not loaded. Check your internet or ad-blocker.";
            console.error(msg);
            throw new Error(msg);
        }
        try {
            console.log(`Attempting to send email via ${templateId}...`);
            // Explicitly passing the Public Key for maximum reliability
            const res = await emailjs.send('service_michustays', templateId, params, "OQ-6hZ4MFw_jIL6LJ");
            console.log('EmailJS Success:', res.status, res.text);
            return res;
        } catch (err) {
            console.error('EmailJS Error Details:', err);
            let errMsg = err.text || err.message || JSON.stringify(err);
            if (err.status === 404) {
                errMsg = "Service ID 'service_michustays' not found in your account.";
            }
            throw new Error(errMsg);
        }
    }

    // Admin-only: create a manager account without logging out the admin
    // Uses Firebase Auth REST API instead of SDK (SDK auto-signs-in the new user)
    async createManagerAccount(email, password, hotelId = '') {
        const apiKey = "AIzaSyAvX4GF0ZTaW9O0rTNiugGH_aKYpVROq4Y";
        let managerUid = null;

        // Step 1: Try to create user via REST API
        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, returnSecureToken: true })
            }
        );
        const data = await response.json();

        if (data.error) {
            if (data.error.message === 'EMAIL_EXISTS') {
                // User exists in Auth but Firestore doc was deleted — look up existing UID
                const lookupResp = await fetch(
                    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ idToken: (await firebase.auth().currentUser.getIdToken()) })
                    }
                );
                // Use a different approach: sign in with email/pass won't work.
                // Instead list users — but REST API needs admin SDK.
                // Best fallback: use the signInWithPassword to get their UID
                const signInResp = await fetch(
                    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, returnSecureToken: false })
                    }
                );
                const signInData = await signInResp.json();
                if (signInData.error) {
                    // Password changed or unknown — still re-create with a known approach:
                    // Try to fetch the UID from existing Firestore record
                    const snapshot = await firestore.collection('users').where('email', '==', email).get();
                    if (!snapshot.empty) {
                        managerUid = snapshot.docs[0].id;
                    } else {
                        throw new Error('Account exists but password is wrong. Reset their password first, or use a different email.');
                    }
                } else {
                    managerUid = signInData.localId;
                }
            } else {
                throw new Error(data.error.message);
            }
        } else {
            managerUid = data.localId;
        }

        // Step 2: Write/overwrite manager Firestore document
        await firestore.collection('users').doc(managerUid).set({
            email, role: 'manager', hotelId: hotelId || ''
        });

        // Step 3: Link manager to hotel
        if (hotelId) {
            await firestore.collection('properties').doc(hotelId).update({
                managerId: managerUid
            });
        }

        window.showToast('✅ Manager account created!');
        return managerUid;
    }

    async login(email, password) {
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            window.showToast("Logged in successfully!");
        } catch (e) {
            let userMsg = "Error logging in: " + e.message;
            if (e.code === 'auth/user-not-found') userMsg = "No account found with this email address.";
            else if (e.code === 'auth/wrong-password') userMsg = "Incorrect password. Please try again or reset it.";
            else if (e.code === 'auth/invalid-credential' || e.code === 'auth/invalid-login-credentials') userMsg = "Invalid email or password. Please check and try again.";
            else if (e.code === 'auth/too-many-requests') userMsg = "Too many failed attempts. Please wait a few minutes before trying again.";
            else if (e.code === 'auth/network-request-failed') userMsg = "Network error. Check your internet connection.";
            else if (e.code === 'auth/user-disabled') userMsg = "This account has been disabled. Contact support.";
            
            showAlert(userMsg);
            throw e;
        }
    }

    async logout() {
        const uid = this.currentUser?.uid;
        await firebase.auth().signOut();
        if (uid) localStorage.removeItem(`ms_role_${uid}`);
        this.userData = null;
        window.showToast('Logged out successfully.');
    }

    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const docRef = firestore.collection('users').doc(result.user.uid);
            const doc = await docRef.get();
            if (!doc.exists) {
                const fullName = result.user.displayName || '';
                await docRef.set({ email: result.user.email, role: 'customer', fullName, phone: '', city: '' });
                // Send welcome email for new Google sign-ups
                if (window.emailjs && result.user.email) {
                    emailjs.send('service_michustays', 'template_welcome', {
                        to_email: result.user.email,
                        to_name: fullName || result.user.email.split('@')[0],
                    }).catch(err => console.warn('Welcome email failed:', err));
                }
            }
            window.showToast('Signed in with Google successfully!');
        } catch (error) {
            console.error(error);
            showAlert('Error signing in with Google: ' + error.message);
        }
    }

    setupRecaptcha() {
        try {
            if (!this.recaptchaVerifier) {
                this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('global-recaptcha-container', {
                    'size': 'invisible',
                    'callback': () => {}
                });
                this.recaptchaVerifier.render().catch(console.error);
            }
        } catch (e) {
            console.error("Failed to setup recaptcha.", e);
        }
    }

    async initiatePhoneLogin(phoneNumber) {
        try {
            this.confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, this.recaptchaVerifier);
            window.showToast("SMS Code Sent!");
            return true;
        } catch (error) {
            showAlert("Error sending SMS: " + error.message);
            if (this.recaptchaVerifier) {
                this.recaptchaVerifier.render().then(widgetId => { grecaptcha.reset(widgetId); });
            }
            return false;
        }
    }

    async verifyPhoneCode(code) {
        if (!this.confirmationResult) return;
        try {
            const result = await this.confirmationResult.confirm(code);
            const docRef = firestore.collection('users').doc(result.user.uid);
            const doc = await docRef.get();
            if (!doc.exists) {
                await docRef.set({ email: result.user.phoneNumber, role: 'customer' });
            }
            window.showToast("Phone verified successfully!");
        } catch (error) {
            showAlert("Invalid Code: " + error.message);
        }
    }

    async deleteCurrentUserAccount(password = null) {
        const user = this.currentUser;
        if (!user) return;
        
        try {
            // If a password was provided, re-authenticate first (required if session is old)
            if (password) {
                const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
                await user.reauthenticateWithCredential(credential);
            }

            // Delete Firestore user data first
            await firestore.collection('users').doc(user.uid).delete();
            // Delete Auth account
            await user.delete();
            localStorage.removeItem(`ms_role_${user.uid}`);
            this.currentUser = null;
            this.userData = null;
            window.showToast(window.t("👋 Your account has been deleted. We're sorry to see you go."));
            window.router.navigate('home');
        } catch (e) {
            console.error(e);
            if (e.code === 'auth/requires-recent-login' || e.code === 'auth/user-token-expired') {
                // Show re-auth modal — prompt user for their password to proceed
                window.showReauthModal && window.showReauthModal();
            } else if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
                showAlert(window.t("❌ Incorrect password. Please try again."));
            } else {
                showAlert("Error deleting account: " + e.message);
            }
        }
    }
}

window.auth = new AuthEngine();
