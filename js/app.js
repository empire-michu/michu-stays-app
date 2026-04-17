class Router {
    constructor() {
        this.routes = {};
        this.appContainer = document.getElementById('app-container');
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.name) {
                this.navigate(e.state.name, e.state.params, false);
            } else {
                const hash = window.location.hash.replace('#', '') || 'home';
                this.navigate(hash, {}, false);
            }
        });

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
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
                window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
                    const currentHash = window.location.hash.replace('#', '');
                    if (currentHash && currentHash !== 'home' && currentHash !== 'login') {
                        window.history.back();
                    } else {
                        window.Capacitor.Plugins.App.exitApp();
                    }
                });
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
            if (updateHistory) {
                let hashPath = `#${name}`;
                // Optional: Serialize params into URL if needed, but for now simple hash is enough.
                if (window.location.hash !== hashPath) {
                    window.history.pushState({ name, params }, '', hashPath);
                }
            }
            this.appContainer.innerHTML = ''; // Clear current view
            this.routes[name](this.appContainer, params); // Render new view
            this.updateSEO(); // Initial reset to default SEO
            this.updateMobileNav(name); // Highlight current menu item
            window.scrollTo(0,0);
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
            <h3 style="margin:0 0 0.6rem; font-size:1.3rem; font-weight:800; color:#1a1a1a;">${c.title}</h3>
            <p style="margin:0 0 2rem; color:#555; line-height:1.6; font-size:0.95rem; word-break:break-word;">${message}</p>
            <button class="_alert-ok" style="width:100%; padding:1rem; border-radius:14px; border:none; background:${c.color}; color:white; font-weight:800; font-size:1rem; cursor:pointer; transition:all 0.2s ease; letter-spacing:0.5px;">Got it</button>
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

// Premium Global Confirmation Modal
window.showConfirm = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'primary' }) => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `position:fixed; inset:0; background:rgba(0,0,0,0.4); backdrop-filter:blur(4px); z-index:10000; display:flex; align-items:center; justify-content:center; animation: fadeIn 0.2s ease;`;
        
        const colors = {
            primary: 'var(--color-primary)',
            danger: '#c5221f',
            warning: '#e37400'
        };
        const activeColor = colors[type] || colors.primary;

        overlay.innerHTML = `
            <style>
                @keyframes fadeIn { from{opacity:0} to{opacity:1} }
                @keyframes slideUp { from{transform:translateY(20px); opacity:0} to{transform:translateY(0); opacity:1} }
            </style>
            <div style="background:white; border-radius:24px; padding:2.5rem; width:90%; max-width:400px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.15); animation:slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); border-top:5px solid ${activeColor};">
                <h3 style="margin:0 0 0.8rem; font-size:1.4rem; color:#1a1a1a;">${title}</h3>
                <p style="margin:0 0 2rem; color:#666; line-height:1.5;">${message}</p>
                <div style="display:flex; gap:1rem;">
                    <button id="_modal-cancel" style="flex:1; padding:0.9rem; border-radius:12px; border:1px solid #eee; background:#fff; font-weight:700; cursor:pointer; color:#888;">${cancelText}</button>
                    <button id="_modal-confirm" style="flex:1; padding:0.9rem; border-radius:12px; border:none; background:${activeColor}; color:white; font-weight:700; cursor:pointer;">${confirmText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('#_modal-cancel').onclick = () => { overlay.remove(); resolve(false); };
        overlay.querySelector('#_modal-confirm').onclick = () => { overlay.remove(); resolve(true); };
        overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
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

window.showPushNotification = ({ message, details, createdAt, link }) => {
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
    notifications.unshift({ message, details, createdAt, link });
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
        <div style="font-size: 1.8rem;">🔔</div>
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
        if (link) window.router.navigate(link);
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
            <div onclick="window.router.navigate('${n.link || 'home'}'); document.getElementById('notif-modal').style.display='none';" style="padding:1rem; background:#f8f9fa; border-radius:15px; border:1px solid #edf2f7; cursor:pointer; transition:all 0.2s;">
                <div style="font-weight:700; color:var(--color-primary); font-size:0.9rem; margin-bottom:0.2rem;">${n.message}</div>
                <div style="font-size:0.8rem; color:#666; line-height:1.4;">${n.details}</div>
                <div style="font-size:0.7rem; color:#bbb; margin-top:0.5rem;">${new Date(n.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
        `).join('');
    }
};

window.showNotifModal = () => {
    unreadCount = 0;
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
    const modal = document.getElementById('notif-modal');
    if (modal) modal.style.display = 'flex';
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
                    link: notif.link
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

// --- PWA SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered successfully'))
            .catch(err => console.log('Service Worker registration failed', err));
    });
}


