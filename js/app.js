class Router {
    constructor() {
        this.routes = {};
        this.appContainer = document.getElementById('app-container');
        const handleInitialOrPop = () => {
            const fullHash = window.location.hash.replace('#', '') || 'home';
            const [name, queryStr] = fullHash.split('?');
            const params = {};
            if (queryStr) {
                queryStr.split('&').forEach(pair => {
                    const [k, v] = pair.split('=');
                    if (k) params[k] = decodeURIComponent(v || '');
                });
            }
            this.navigate(name, params, false);
        };

        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.name) {
                this.navigate(e.state.name, e.state.params, false);
            } else {
                handleInitialOrPop();
            }
        });

        // Parse initial URL on load
        window.addEventListener('load', handleInitialOrPop);
        window.addEventListener('hashchange', handleInitialOrPop);

        // Setup native mobile hardware back button handler
        document.addEventListener('deviceready', () => {
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
                    const currentHash = window.location.hash.replace('#', '');
                    if (currentHash && currentHash !== 'home') {
                        window.history.back();
                    } else {
                        window.Capacitor.Plugins.App.exitApp();
                    }
                });
            }
        });
        
        // Also fire manually in case deviceready is already passed or not fired on modern Capacitor
        setTimeout(() => {
            if (window.Capacitor && window.Capacitor.Plugins) {
                if (window.Capacitor.Plugins.App) {
                    window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
                        const currentHash = window.location.hash.replace('#', '');
                        if (currentHash && currentHash !== 'home' && currentHash !== 'login') {
                            window.history.back();
                        } else {
                            window.Capacitor.Plugins.App.exitApp();
                        }
                    });
                }
                if (window.db && window.db.setupPushListeners) {
                    window.db.setupPushListeners();
                }
            }
        }, 1500);

        // --- MOBILE CHROME: Ensure mobile nav shows on initial page load ---
        const showMobileNavIfNeeded = () => {
            const nav = document.getElementById('mobile-nav');
            if (!nav) return;
            const hash = window.location.hash.replace('#', '');
            if (hash === 'login' || hash === 'signup') {
                nav.classList.add('nav-hidden');
            } else {
                nav.classList.remove('nav-hidden');
                if (window.innerWidth <= 768) {
                    nav.style.display = 'flex';
                } else {
                    nav.style.display = 'none';
                }
            }
        };
        document.addEventListener('DOMContentLoaded', showMobileNavIfNeeded);
        window.addEventListener('resize', showMobileNavIfNeeded);
        // Fallback for when DOMContentLoaded already fired
        setTimeout(showMobileNavIfNeeded, 500);
    }

    addRoute(name, renderFunction) {
        this.routes[name] = renderFunction;
    }

    updateSEO(seoData = {}) {
        const { title, description, image, url } = seoData;
        const defaultTitle = 'Michu Stays | Best Hotels & Guesthouses in Dire Dawa, Ethiopia';
        const defaultDesc = 'Book premium stays in Dire Dawa, Ethiopia. Find the best hotels, guesthouses, and apartments on Michu Stays.';
        
        document.title = title ? `${title} | Michu Stays` : defaultTitle;
        
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', description || defaultDesc);

        // OpenGraph
        const ogTags = {
            'og:title': title || defaultTitle,
            'og:description': description || defaultDesc,
            'og:image': image || 'https://michustays.com/logo.png',
            'og:url': window.location.href,
            'og:type': 'website'
        };

        Object.keys(ogTags).forEach(prop => {
            let tag = document.querySelector(`meta[property="${prop}"]`);
            if (!tag) {
                tag = document.createElement('meta');
                tag.setAttribute('property', prop);
                document.head.appendChild(tag);
            }
            tag.setAttribute('content', ogTags[prop]);
        });
    }

    navigate(name, params = {}, updateHistory = true) {
        if (this.routes[name]) {
            // CRITICAL: Immediate scroll reset before rendering to prevent "footer-first" jump
            window.scrollTo(0, 0);

            if (updateHistory) {
                let hashPath = `#${name}`;
                const queryParts = [];
                for (const k in params) {
                    if (params[k] !== undefined && params[k] !== null) {
                        queryParts.push(`${k}=${encodeURIComponent(params[k])}`);
                    }
                }
                if (queryParts.length > 0) hashPath += `?${queryParts.join('&')}`;

                if (window.location.hash !== hashPath) {
                    window.history.pushState({ name, params }, '', hashPath);
                }
            }
            
            const isSameRoute = window.location.hash.split('?')[0] === `#${name}`;
            
            // Stabilization: prevent the page from jumping to top by keeping container height
            const oldHeight = this.appContainer.offsetHeight;
            this.appContainer.style.minHeight = oldHeight + 'px';

            this.appContainer.innerHTML = ''; // Clear current view
            this.routes[name](this.appContainer, params); // Render new view
            
            // Reset stabilization
            setTimeout(() => { this.appContainer.style.minHeight = ''; }, 300); // Increased delay for async views

            this.updateSEO(); // Initial reset to default SEO
            this.updateMobileNav(name); // Highlight current menu item
            
            // Second pass scroll reset for slow-loading async content
            setTimeout(() => window.scrollTo(0, 0), 100);
            setTimeout(() => window.scrollTo(0, 0), 500);
        } else {
            console.error(`Route ${name} not found`);
        }
    }

    updateMobileNav(name) {
        const nav = document.getElementById('mobile-nav');
        if (!nav) return;

        // Hide nav on login/signup pages for clean look
        if (name === 'login' || name === 'signup') {
            nav.classList.add('nav-hidden');
        } else {
            nav.classList.remove('nav-hidden');
            if (window.innerWidth <= 768) {
                nav.style.display = 'flex';
            } else {
                nav.style.display = 'none';
            }
        }

        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
            const onclick = item.getAttribute('onclick');
            if (onclick && onclick.includes(`'${name}'`)) {
                item.classList.add('active');
            }
        });
    }
}

const router = new Router();
window.router = router;

// Mobile Search: Navigate to home and focus + scroll to the search bar
window.mobileSearch = function() {
    router.navigate('home');
    setTimeout(() => {
        const searchInput = document.getElementById('home-search-input');
        if (searchInput) {
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => searchInput.focus(), 300);
        }
    }, 400);
};

// Mobile Bookings: Route based on user role
window.mobileBookings = function() {
    const role = window.auth?.userData?.role;
    if (role === 'admin') {
        router.navigate('admin', { tab: 'bookings' });
    } else if (role === 'manager') {
        router.navigate('manager', { tab: 'bookings' });
    } else if (window.auth?.currentUser) {
        router.navigate('profile', { section: 'bookings' });
    } else {
        router.navigate('login');
    }
};

// Global Toast logic for mimicking automations
window.showToast = function(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    // Mobile Chrome: position above mobile nav bar
    if (window.innerWidth <= 768) {
        toast.style.bottom = 'calc(85px + env(safe-area-inset-bottom, 0px))';
        toast.style.right = '1rem';
        toast.style.left = '1rem';
        toast.style.textAlign = 'center';
        toast.style.borderRadius = '14px';
    }
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

// Premium Alert Modal (replaces browser alert)
window.showAlert = function(message, type) {
    // Auto-detect type from message content
    if (!type) {
        const m = message.toLowerCase();
        if (m.includes('error') || m.includes('failed') || m.includes('invalid') || m.includes('already in use') || m.includes('wrong') || m.includes('denied')) type = 'error';
        else if (m.includes('success') || m.includes('✅') || m.includes('welcome') || m.includes('sent')) type = 'success';
        else if (m.includes('please') || m.includes('must') || m.includes('enter') || m.includes('fill')) type = 'warning';
        else type = 'info';
    }

    const config = {
        error:   { icon: '❌', color: '#c5221f', bg: '#fce8e6', title: 'Oops!' },
        success: { icon: '✅', color: '#1e7e34', bg: '#e6f4ea', title: 'Success' },
        warning: { icon: '⚠️', color: '#e37400', bg: '#fff8e1', title: 'Heads Up' },
        info:    { icon: '💡', color: '#1967d2', bg: '#e8f0fe', title: 'Notice' }
    };
    const c = config[type];

    // i18n: translate title and button
    const t = (key) => (window.i18n && window.i18n.t) ? window.i18n.t(key) : key;
    const localTitle = t(c.title);
    const localBtn = t('Got it');

    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.35); backdrop-filter:blur(6px); z-index:10001; display:flex; align-items:center; justify-content:center; animation: _alertFadeIn 0.25s ease;`;
    overlay.innerHTML = `
        <style>
            @keyframes _alertFadeIn { from{opacity:0} to{opacity:1} }
            @keyframes _alertPop { from{transform:scale(0.85) translateY(20px); opacity:0} to{transform:scale(1) translateY(0); opacity:1} }
            @keyframes _alertIconPulse { 0%{transform:scale(1)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
            ._alert-ok:hover { transform:translateY(-1px); box-shadow:0 6px 20px ${c.color}44; }
        </style>
        <div style="background:white; border-radius:28px; padding:2.5rem 2rem 2rem; width:90%; max-width:420px; text-align:center; box-shadow:0 24px 60px rgba(0,0,0,0.18); animation:_alertPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); position:relative; overflow:hidden;">
            <div style="position:absolute; top:0; left:0; right:0; height:4px; background:linear-gradient(90deg, ${c.color}, ${c.color}88, ${c.color});"></div>
            <div style="width:64px; height:64px; border-radius:50%; background:${c.bg}; display:flex; align-items:center; justify-content:center; margin:0 auto 1.2rem; font-size:1.8rem; animation:_alertIconPulse 0.6s ease;">
                ${c.icon}
            </div>
            <h3 style="margin:0 0 0.6rem; font-size:1.3rem; font-weight:800; color:#1a1a1a;">${localTitle}</h3>
            <p style="margin:0 0 2rem; color:#555; line-height:1.6; font-size:0.95rem; word-break:break-word;">${message}</p>
            <button class="_alert-ok" style="width:100%; padding:1rem; border-radius:14px; border:none; background:${c.color}; color:white; font-weight:800; font-size:1rem; cursor:pointer; transition:all 0.2s ease; letter-spacing:0.5px;">${localBtn}</button>
        </div>
    `;
    document.body.appendChild(overlay);
    const btn = overlay.querySelector('._alert-ok');
    btn.onclick = () => { overlay.style.opacity = '0'; overlay.style.transition = 'opacity 0.2s'; setTimeout(() => overlay.remove(), 200); };
    overlay.onclick = (e) => { if (e.target === overlay) btn.click(); };
    btn.focus();
};

// Header modal helpers
window.showAIModal    = () => { document.getElementById('ai-modal').style.display    = 'flex'; };
window.showNotifModal = () => { 
    document.getElementById('notif-modal').style.display = 'flex';
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.style.display = 'none';
        badge.classList.remove('notif-pulse');
    }
    unreadCount = 0;
};

// Close modals when clicking backdrop
document.addEventListener('click', (e) => {
    if (e.target.id === 'ai-modal')    e.target.style.display = 'none';
    if (e.target.id === 'notif-modal') e.target.style.display = 'none';
});

// Premium Global Confirmation Modal (Michu Stays Branded)
window.showConfirm = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'primary' }) => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed; inset:0; background:rgba(15,23,42,0.6); backdrop-filter:blur(10px); z-index:20000; display:flex; align-items:center; justify-content:center; animation: _fadeIn 0.3s ease; padding:1.5rem;`;
        
        const colors = {
            primary: 'var(--color-primary)', // #0B6E4F
            danger: '#dc2626',
            warning: '#f59e0b',
            secondary: 'var(--color-secondary)' // #F4B400
        };
        const activeColor = colors[type] || colors.primary;
        const isDanger = type === 'danger';

        overlay.innerHTML = `
            <style>
                @keyframes _fadeIn { from{opacity:0} to{opacity:1} }
                @keyframes _slideUpPop { from{transform:scale(0.9) translateY(30px); opacity:0} to{transform:scale(1) translateY(0); opacity:1} }
                ._michu-confirm-btn { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
                ._michu-confirm-btn:active { transform: scale(0.96); }
            </style>
            <div style="background:white; border-radius:32px; padding:2.5rem 2rem; width:100%; max-width:400px; text-align:center; box-shadow:0 30px 70px rgba(0,0,0,0.25); animation:_slideUpPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); position:relative; overflow:hidden;">
                <!-- Decorative brand accent -->
                <div style="position:absolute; top:0; left:0; right:0; height:6px; background:linear-gradient(90deg, var(--color-primary), var(--color-secondary), var(--color-primary));"></div>
                
                <div style="width:72px; height:72px; border-radius:50%; background:${isDanger ? '#fef2f2' : '#f0fdf4'}; display:flex; align-items:center; justify-content:center; margin:0 auto 1.5rem; font-size:2rem; box-shadow:inset 0 2px 10px rgba(0,0,0,0.05);">
                    ${isDanger ? '🗑️' : '✨'}
                </div>

                <h3 style="margin:0 0 0.8rem; font-size:1.5rem; font-weight:900; color:#0f172a; letter-spacing:-0.5px;">${title}</h3>
                <p style="margin:0 0 2.5rem; color:#64748b; line-height:1.6; font-size:1rem;">${message}</p>
                
                <div style="display:flex; flex-direction:column; gap:0.8rem;">
                    <button id="_modal-confirm" class="_michu-confirm-btn" style="width:100%; padding:1.1rem; border-radius:18px; border:none; background:${activeColor}; color:white; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 8px 20px ${activeColor}44; letter-spacing:0.3px;">
                        ${confirmText}
                    </button>
                    <button id="_modal-cancel" class="_michu-confirm-btn" style="width:100%; padding:1.1rem; border-radius:18px; border:1px solid #e2e8f0; background:white; font-weight:700; cursor:pointer; color:#64748b; font-size:1rem;">
                        ${cancelText}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Trap focus or just handle buttons
        const confirmBtn = overlay.querySelector('#_modal-confirm');
        const cancelBtn = overlay.querySelector('#_modal-cancel');

        confirmBtn.onclick = () => { 
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s';
            setTimeout(() => { overlay.remove(); resolve(true); }, 200);
        };
        cancelBtn.onclick = () => { 
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s';
            setTimeout(() => { overlay.remove(); resolve(false); }, 200);
        };
        overlay.onclick = (e) => { if (e.target === overlay) cancelBtn.click(); };
        
        confirmBtn.focus();
    });
};

// Auth engine manages initial routing now to prevent flicker

// --- CRITICAL: GLOBAL INPUT FIX ---
// This ensures no input (like the 21/16 char email bug) is ever truncated by the browser or rogue scripts.
document.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        e.target.removeAttribute('maxlength');
    }
}, true);

document.addEventListener('focusin', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        e.target.removeAttribute('maxlength');
    }
}, true);

// ─── GLOBAL REAL-TIME NOTIFICATIONS ─────────────────────────────────
let unreadCount = 0;
const notifications = [];
let notifUnsub = null;

window.showPushNotification = ({ message, details, createdAt, link, params }) => {
    unreadCount++;
    const badge = document.getElementById('notif-badge');
    if (badge) {
        badge.style.display = 'block';
        badge.classList.add('notif-pulse');
    }

    // Play notification sound
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio autoplay blocked until user interacts with page.'));
    } catch(e) { console.warn('Audio play failed:', e); }

    // Add to internal list (prevent duplicates by ID if possible, but Firestore 'added' type handles it)
    notifications.unshift({ message, details, createdAt, link, params });
    renderNotifList();

    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed; top: 20px; right: 20px; width: 330px;
        background: white; border-left: 5px solid var(--color-primary);
        box-shadow: 0 20px 50px rgba(0,0,0,0.2); border-radius: 20px;
        padding: 1.25rem; z-index: 20000; display: flex; gap: 1rem;
        animation: _pushIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        cursor: pointer;
        max-width: calc(100vw - 2rem);
    `;
    container.innerHTML = `
        <style>
            @keyframes _pushIn { from{transform: translateX(120%); opacity:0} to{transform: translateX(0); opacity:1} }
            @keyframes _pushOut { from{transform: translateX(0); opacity:1} to{transform: translateX(120%); opacity:0} }
        </style>
        <div style="width:40px; height:40px; border-radius:12px; background:var(--color-primary); color:white; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </div>
        <div style="flex: 1;">
            <div style="font-weight: 800; color: var(--color-primary); font-size: 0.95rem; margin-bottom: 0.3rem;">${message}</div>
            <div style="color: #555; font-size: 0.82rem; line-height:1.5;">${details}</div>
            <div style="color: #aaa; font-size: 0.7rem; margin-top: 0.4rem;">Just now</div>
        </div>
    `;
    document.body.appendChild(container);

    const close = () => {
        container.style.animation = '_pushOut 0.4s ease forwards';
        setTimeout(() => container.remove(), 400);
    };

    container.onclick = () => {
        if (link) window.router.navigate(link, params || {});
        close();
    };
    setTimeout(close, 8000);
};

const renderNotifList = () => {
    const list = document.getElementById('notif-list-container');
    const empty = document.getElementById('notif-empty-state');
    if (!list) return;

    if (notifications.length > 0) {
        if (empty) empty.style.display = 'none';
        list.innerHTML = notifications.map(n => `
            <div class="notif-item" onclick="window.router.navigate('${n.link || 'home'}', ${n.params ? JSON.stringify(n.params).replace(/"/g, '&quot;') : '{}'}); window.closeNotifTray();">
                <div class="notif-item-title">${n.message}</div>
                <div class="notif-item-desc">${n.details}</div>
                <span class="notif-item-time">${new Date(n.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
        `).join('');
    }
};

window.showNotifTray = () => {
    unreadCount = 0;
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
    const tray = document.getElementById('notif-tray');
    if (tray) tray.classList.add('active');
    renderNotifList();
};

window.startNotifications = () => {
    if (notifUnsub) return; // already listening
    if (window.db && window.db.listenForNotifications) {
        try {
            notifUnsub = window.db.listenForNotifications((notif) => {
                window.showPushNotification({
                    message: notif.message,
                    details: notif.details,
                    createdAt: notif.createdAt,
                    link: notif.link,
                    params: notif.params
                });
            }, (err) => {
                if(!err.message?.includes('permission')) {
                    console.warn('Real-time sync error:', err);
                }
            });
        } catch(e) { console.warn('Notification listener failed:', e); }
    }
};

window.stopNotifications = () => {
    if (notifUnsub) {
        notifUnsub();
        notifUnsub = null;
    }
};

// PWA Service Worker is handled in index.html (firebase-messaging-sw.js)

// Redirect Route for Push Notifications
window.router.addRoute('redirect-bookings', async (container) => {
    container.innerHTML = `<div style="text-align:center; padding:5rem; font-weight:700; color:var(--color-primary);">Taking you to your bookings...</div>`;
    
    // Wait for auth to initialize robustly (up to 6 seconds)
    let retries = 30;
    while (!window.auth?.hasInitialized && retries > 0) {
        await new Promise(r => setTimeout(r, 200));
        retries--;
    }
    
    // Give extra time for role to load from Firestore if needed
    if (window.auth?.currentUser) {
         let r2 = 15;
         while(!window.auth?.userData?.role && r2 > 0) {
             await new Promise(r => setTimeout(r, 200));
             r2--;
         }
    }

    const role = window.auth?.userData?.role;
    if (role === 'admin') window.router.navigate('admin');
    else if (role === 'manager') window.router.navigate('manager');
    else if (window.auth?.currentUser) window.router.navigate('profile');
    else window.router.navigate('login');
});

window.michuConfirm = (title, message) => {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-msg');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const noBtn = document.getElementById('confirm-cancel-btn');

        if (!modal) {
            console.warn("SW: Confirm modal not found, using fallback");
            resolve(window.confirm(message || "Are you sure?"));
            return;
        }

        titleEl.innerText = title || "Are you sure?";
        msgEl.innerText = message || "This action cannot be undone.";
        
        // --- BULLETPROOF SCROLL LOCK (Freeze body at current pixel) ---
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflowY = 'scroll'; // Prevent width shift
        modal.style.display = 'flex';

        const cleanup = (val) => {
            modal.style.display = 'none';
            // --- RESTORE SCROLL ---
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflowY = '';
            window.scrollTo(0, scrollY);
            resolve(val);
        };

        yesBtn.onclick = () => cleanup(true);
        noBtn.onclick = () => cleanup(false);
        modal.onclick = (e) => { if (e.target === modal) cleanup(false); };
    });
};

// --- GLOBAL ROBUST HANDLERS FOR ACTIONS ---
window.michuDeleteReviewGlobal = async (reviewId, hotelId) => {
    console.log(`[Michu] Review Delete Clicked: ${reviewId}`);
    try {
        const confirmed = await window.michuConfirm("Delete Review", "Are you sure you want to delete your review forever?");
        if (confirmed) {
            window.showToast("Deleting review...", "info");
            await window.db.deleteReview(reviewId);
            window.showToast("Review deleted successfully", "success");
            if (hotelId) window.router.navigate('hotel_detail_view', { id: hotelId });
        }
    } catch (err) {
        console.error("Delete review error:", err);
        window.showToast("Error deleting review", "error");
    }
};

window.michuDeleteReplyGlobal = async (reviewId, hotelId) => {
    console.log(`[Michu] Reply Remove Clicked: ${reviewId}`);
    try {
        const confirmed = await window.michuConfirm("Remove Reply", "Are you sure you want to remove your manager response?");
        if (confirmed) {
            window.showToast("Removing reply...", "info");
            await window.db.deleteReviewReply(reviewId);
            window.showToast("Reply removed successfully", "success");
            if (hotelId) window.router.navigate('hotel_detail_view', { id: hotelId });
        }
    } catch (err) {
        console.error("Remove reply error:", err);
        window.showToast("Error removing reply", "error");
    }
};

// --- GLOBAL ROBUST EVENT DELEGATION FOR ACTIONS ---
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.michu-action-btn');
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const action = btn.dataset.action;
    const reviewId = btn.dataset.reviewId;
    const hotelId = btn.dataset.hotelId;
    
    console.log("[Global Delegation] Action:", action, "| ID:", reviewId);
    
    if (action === 'delete-review') {
        if (window.michuDeleteReviewGlobal) {
            window.michuDeleteReviewGlobal(reviewId, hotelId);
        } else {
            console.error("michuDeleteReviewGlobal not found");
            window.showToast("System error: Delete handler missing", "error");
        }
    }
    
    if (action === 'delete-reply') {
        if (window.michuDeleteReplyGlobal) {
            window.michuDeleteReplyGlobal(reviewId, hotelId);
        } else {
            console.error("michuDeleteReplyGlobal not found");
            window.showToast("System error: Remove handler missing", "error");
        }
    }
});

