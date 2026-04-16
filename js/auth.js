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
            } else {
                if (window.stopNotifications) window.stopNotifications();
            }

            if (!this.hasInitialized) {
                this.hasInitialized = true;
                const hash = window.location.hash.replace('#', '') || '';

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
                if (!user) {
                    window.router.navigate('home');
                } else {
                    this._redirectByRole();
                }
            }
        });

        setTimeout(() => { this.setupRecaptcha(); }, 500);
    }

    _redirectByRole() {
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

                dashBtn = `<button class="btn-outline" style="padding:0.3rem 0.7rem;font-size:0.75rem;display:flex;align-items:center;gap:0.4rem;font-weight:700;border-radius:12px;" onclick="window.router.navigate('profile')">
                    ${avatarImg} ${displayName}
                </button>`;
            }
            container.innerHTML = `
                <div style="display:flex;align-items:center;">
                    ${dashBtn}
                </div>
            `;
        } else {
            if (notifBtn) notifBtn.style.display = 'none';
            
            container.innerHTML = `
                <div style="display:flex;align-items:center;gap:0.4rem;">
                    <button class="btn-outline" style="padding:0.35rem 0.6rem;border:none;font-size:0.8rem;font-weight:600;" onclick="window.router.navigate('login')">Log In</button>
                    <button class="btn-primary" style="padding:0.35rem 0.8rem;font-size:0.8rem;border-radius:12px;" onclick="window.router.navigate('signup')">Sign Up</button>
                </div>
            `;
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
            
            // Trigger Welcome/Onboarding Email
            this._triggerEmail('temp_welcome', {
                to_name: fullName || email.split('@')[0],
                email: email,
                welcome_message: "We're thrilled to have you join Michu Stays. Start exploring the best hotels in Ethiopia today!",
                subject: "Welcome to Michu Stays! 🏡"
            }).then(() => console.log("Welcome email sent."))
              .catch(e => console.error("Welcome email failed immediately:", e));
        } catch (e) {
            console.error("Test Email Fail:", e);
            window.showToast("❌ Email Failed: " + (e.message || "Unknown Error. Check Console."));
            throw e;
        }
    }

    async sendPasswordReset(email) {
        if (!email) return showAlert("Please enter your email first.");
        try {
            const siteUrl = window.location.origin;
            // 1. Trigger styled confirmation via EmailJS FIRST for speed
            await this._triggerEmail('temp_recovery', {
                to_name: email.split('@')[0],
                email: email,
                to_email: email,
                message: "A password reset request was received. For security, Google is now sending a separate 'Secure Reset Link' to this same email address. Please click the link in that email to create your new password.",
                link: `${siteUrl}/#login`,
                subject: "Reset Your Michu Stays Password 🔐"
            }).catch(e => console.warn("EmailJS Recovery fail-safe:", e));

            // 2. Trigger the actual Firebase password reset link (This sends the SECURE link)
            await firebase.auth().sendPasswordResetEmail(email);
            
            window.showToast("✅ Secure reset link sent! Please check your Primary & Spam folders.");
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

    async deleteCurrentUserAccount() {
        const user = this.currentUser;
        if (!user) return;
        
        try {
            // Delete Firestore user data first
            await firestore.collection('users').doc(user.uid).delete();
            // Delete Auth account
            await user.delete();
            localStorage.removeItem(`ms_role_${user.uid}`);
            this.currentUser = null;
            this.userData = null;
            window.showToast("👋 Your account has been deleted. We're sorry to see you go.");
            window.router.navigate('home');
        } catch (e) {
            console.error(e);
            if (e.code === 'auth/requires-recent-login') {
                showAlert("🔒 For security, please Log Out and Log In again before deleting your account.");
            } else {
                showAlert("Error deleting account: " + e.message);
            }
        }
    }
}

window.auth = new AuthEngine();
