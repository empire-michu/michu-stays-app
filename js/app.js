class Router {
    constructor() {
        this.routes = {};
        this.appContainer = document.getElementById('app-container');
        
        // Prevent browser from auto-scrolling to bottom on refresh
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        const handleInitialOrPop = () => {
            let name = 'home';
            const params = {};

            // Support direct server pathname routing for receipt verification (e.g. /verify?ref=XYZ)
            if (window.location.pathname.startsWith('/verify')) {
                name = 'verify';
                const searchParams = new URLSearchParams(window.location.search);
                searchParams.forEach((v, k) => {
                    params[k] = v;
                });
            } else {
                const fullHash = window.location.hash.replace('#', '') || 'home';
                const [hashName, queryStr] = fullHash.split('?');
                name = hashName;
                if (queryStr) {
                    queryStr.split('&').forEach(pair => {
                        const [k, v] = pair.split('=');
                        if (k) params[k] = decodeURIComponent(v || '');
                    });
                }
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

        const isSourceBookings = window.location.hash.includes('source=bookings');

        document.querySelectorAll('.mobile-nav-item').forEach(item => {
            item.classList.remove('active');
            const onclick = item.getAttribute('onclick') || '';
            
            let shouldBeActive = false;
            
            if (isSourceBookings) {
                if (onclick.includes('mobileBookings')) shouldBeActive = true;
            } else {
                if (onclick.includes(`'${name}'`) || 
                    (name === 'bookings' && onclick.includes('mobileBookings')) ||
                    (name === 'saved' && onclick.includes("'saved'")) ||
                    (name === 'manager' && onclick.includes('mobileManage')) ||
                    (name === 'admin' && onclick.includes('mobileManage'))) {
                    shouldBeActive = true;
                }
            }

            if (shouldBeActive) {
                item.classList.add('active');
            }
        });

        // Enforce role-based Saved/Manage visibility on every route change
        const role = window.auth?.userData?.role;
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

window.mobileBookings = function() {
    const role = window.auth?.userData?.role;
    if (role === 'admin') {
        router.navigate('admin', { source: 'bookings' });
    } else if (role === 'manager') {
        router.navigate('manager', { source: 'bookings' });
    } else if (window.auth?.currentUser) {
        router.navigate('bookings');
    } else {
        router.navigate('login');
    }
};

// Mobile Manage: Route to manager or admin dashboard (without bookings tab)
window.mobileManage = function() {
    const role = window.auth?.userData?.role;
    if (role === 'admin') {
        router.navigate('admin', { source: 'manage' });
    } else if (role === 'manager') {
        router.navigate('manager', { source: 'manage' });
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

// Close notif modal when clicking backdrop
document.addEventListener('click', (e) => {
    if (e.target.id === 'ai-modal') e.target.style.display = 'none';
    
    // Close lang dropdown
    const ld = document.getElementById('lang-dropdown');
    if (ld) ld.style.display = 'none';

    // Close notif modal dropdown
    const nm = document.getElementById('notif-modal');
    if (nm && !nm.contains(e.target)) nm.style.display = 'none';
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

// ─── GLOBAL REAL-TIME NOTIFICATIONS ───
let notifications = [];
let notifUnsub = null;
let notifCategoryFilter = 'all';
let notifSearchQuery = '';
let unreadCount = 0;
let showAllNotifs = false; // For "See older" logic
const NOTIF_INITIAL_LIMIT = 7;


window.setNotifFilter = (filter) => {
    notifCategoryFilter = filter;
    document.querySelectorAll('.notif-tab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-filter') === filter);
    });
    renderNotifList();
};

window.setNotifSearch = (query) => {
    notifSearchQuery = query.toLowerCase();
    renderNotifList();
};

window.markAllRead = async () => {
    const user = window.auth?.currentUser;
    if (!user) return;
    try {
        await window.db.markAllNotificationsAsRead(user.uid);
        notifications.forEach(n => n.isRead = true);
        unreadCount = 0;
        updateNotifBadge();
        renderNotifList();
    } catch(e) { console.error(e); }
};

window.clearAllNotifications = async () => {
    const user = window.auth?.currentUser;
    if (!user) return;
    const confirmed = await window.showConfirm({title: 'Clear all', message: 'Delete all notifications permanently?'});
    if (!confirmed) return;
    try {
        await window.db.deleteAllNotifications(user.uid);
        notifications = [];
        unreadCount = 0;
        updateNotifBadge();
        renderNotifList();
    } catch(e) { console.error(e); }
};

const updateNotifBadge = () => {
    const badge = document.getElementById('notif-badge');
    const headerBadge = document.getElementById('notif-header-badge');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
        if (unreadCount > 0) badge.classList.add('notif-pulse');
    }
    if (headerBadge) {
        headerBadge.textContent = unreadCount;
        headerBadge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }
};

window.markAllNotifsRead = async () => {
    if (!window.auth?.currentUser) return;
    const role = window.auth.userData?.role;
    try {
        await window.db.markAllNotificationsAsRead(window.auth.currentUser.uid, role);
        notifications.forEach(n => n.isRead = true);
        unreadCount = 0;
        updateNotifBadge();
        window.renderNotifList();
    } catch(e) { console.warn("Failed to mark all read:", e); }
};

window.clearAllNotifs = async () => {
    const ok = await window.showConfirm({
        title: 'Clear Notifications',
        message: 'Are you sure you want to permanently delete all notifications?',
        confirmText: 'Delete All',
        type: 'danger'
    });
    if (!ok) return;

    if (!window.auth?.currentUser) return;
    const role = window.auth.userData?.role;
    try {
        await window.db.deleteAllNotifications(window.auth.currentUser.uid, role);
        notifications = [];
        unreadCount = 0;
        updateNotifBadge();
        window.renderNotifList();
    } catch(e) { console.warn("Failed to clear notifications:", e); }
};

window.renderNotifList = () => {
    const list = document.getElementById('notif-list-container');
    if (!list) return;

    // Apply Filter & Search
    let displayList = [...notifications];
    if (notifCategoryFilter !== 'all') {
        displayList = displayList.filter(n => n.category === notifCategoryFilter);
    }
    if (notifSearchQuery) {
        displayList = displayList.filter(n => 
            (n.message || '').toLowerCase().includes(notifSearchQuery) || 
            (n.details || '').toLowerCase().includes(notifSearchQuery)
        );
    }

    const totalCount = displayList.length;
    const hasMore = totalCount > NOTIF_INITIAL_LIMIT;
    
    if (hasMore && !showAllNotifs) {
        displayList = displayList.slice(0, NOTIF_INITIAL_LIMIT);
    }

    if (displayList.length === 0) {
        list.innerHTML = `
            <div style="text-align:center;padding:5rem 2rem;color:#64748b;display:flex;flex-direction:column;align-items:center;gap:1rem;background:white !important;">
                <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                <div style="font-weight:700;font-size:1rem;color:#94a3b8;">${notifSearchQuery ? 'No matching notifications' : 'All caught up!'}</div>
                <div style="font-size:0.85rem;opacity:0.7;">${notifSearchQuery ? 'Try a different search term' : 'New notifications will appear here.'}</div>
            </div>`;
        return;
    }

    // Grouping Logic
    const groups = { 'TODAY': [], 'YESTERDAY': [], 'OLDER': [] };
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    displayList.forEach(n => {
        const d = new Date(n.createdAt);
        if (d.toDateString() === todayStr) groups['TODAY'].push(n);
        else if (d.toDateString() === yesterdayStr) groups['YESTERDAY'].push(n);
        else groups['OLDER'].push(n);
    });

    const statusMap = {
        confirmed: { class: 'status-confirmed', label: 'Confirmed', icon: '✓' },
        pending: { class: 'status-failed', label: 'Pending', icon: '!' },
        failed: { class: 'status-failed', label: 'Action needed', icon: '!' },
        upcoming: { class: 'status-upcoming', label: 'Upcoming', icon: '⏲' },
        review: { class: 'status-info', label: 'Review', icon: '★' },
        info: { class: 'status-info', label: 'Info', icon: 'i' }
    };

    const relativeTime = (ts) => {
        if (!ts) return 'Just now';
        const diff = (Date.now() - new Date(ts).getTime()) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    let html = '';
    const sectionOrder = ['TODAY', 'YESTERDAY', 'OLDER'];
    
    sectionOrder.forEach(label => {
        if (groups[label] && groups[label].length > 0) {
            html += `<div class="notif-group-header">${label}</div>`;
            groups[label].forEach(n => {
                const s = statusMap[n.status] || statusMap.info;
                const isUnread = !n.isRead;
                html += `
                <div class="notif-item-pro ${isUnread ? 'unread' : ''}" 
                     onclick="window.handleNotifClick('${n.id}')"
                     style="background: white !important; color: #1e293b !important; border-bottom: 1px solid #f1f5f9 !important;">
                    ${isUnread ? '<div class="notif-unread-dot"></div>' : ''}
                    <div class="notif-avatar ${s.class}">${s.icon}</div>
                    <div class="notif-content-pro">
                        <div class="notif-title-row-pro">
                            <div class="notif-title-pro" style="color: #0f172a !important; font-weight: 700 !important;">${n.message}</div>
                            <div class="notif-status-tag ${s.class}">${s.label}</div>
                        </div>
                        <div class="notif-subtitle-pro" style="color: #475569 !important;">${n.details || ''}</div>
                        <div class="notif-meta-pro" style="color: #94a3b8 !important;">${relativeTime(n.createdAt)}</div>
                        
                        ${n.actions && n.actions.length > 0 ? `
                            <div class="notif-actions-pro">
                                ${n.actions.map((act, i) => `
                                    <button class="notif-btn-cta" onclick="event.stopPropagation(); window.handleNotifAction('${n.id}', ${i})">${act.label}</button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>`;
            });
        }
    });

    if (hasMore && !showAllNotifs) {
        html += `
            <div style="padding:1.5rem; text-align:center; background:white;">
                <button onclick="window.expandNotifications()" style="width:100%; padding:0.8rem; border-radius:12px; border:1.5px solid #f1f5f9; background:#f8fafc; color:#1e73e8; font-weight:700; font-size:0.85rem; cursor:pointer; transition:all 0.2s;">
                    See ${totalCount - NOTIF_INITIAL_LIMIT} older notifications
                </button>
            </div>
        `;
    }

    list.innerHTML = html;
};

window.expandNotifications = () => {
    showAllNotifs = true;
    renderNotifList();
};

window.handleNotifClick = (notifId) => {
    const n = notifications.find(notif => notif.id === notifId);
    if (!n) return;

    // Navigate to the intended destination
    if (n.link) {
        window.router.navigate(n.link, n.params || {});
    } else {
        window.router.navigate('home');
    }

    // Close the panel
    window.showNotifModal(false);

    // Mark as read locally and in DB
    if (!n.isRead) {
        n.isRead = true;
        if (unreadCount > 0) unreadCount--;
        updateNotifBadge();
        renderNotifList();
        window.db.markNotificationAsRead(n.id).catch(e => console.warn("Failed to mark read on server:", e));
    }
};

window.handleNotifAction = (notifId, actionIndex) => {
    const n = notifications.find(notif => notif.id === notifId);
    if (!n || !n.actions || !n.actions[actionIndex]) return;

    const act = n.actions[actionIndex];
    window.router.navigate(act.link, act.params || {});
    window.showNotifModal(false);
};

window.updateNotifPanelOnly = (notif) => {
    // This function handles historical notifications silently (no popup/sound)
    // but ensures they are accumulated in memory and update the badge.
    // The panel will render them when opened via showNotifModal.

    // Add to in-memory list if not already there
    if (!notifications.find(n => n.id === notif.id)) {
        notifications.unshift({ 
            id: notif.id,
            message: notif.message, 
            details: notif.details, 
            createdAt: notif.createdAt, 
            link: notif.link, 
            params: notif.params, 
            isRead: !!notif.isRead, 
            category: notif.category || 'system', 
            status: notif.status || 'info', 
            actions: notif.actions || [] 
        });
        // Sort by date to ensure history is correct
        notifications.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (!notif.isRead) unreadCount++;
    updateNotifBadge();

    // Try to render if DOM is ready, but don't fail if it isn't
    const list = document.getElementById('notif-list-container');
    if (list) renderNotifList();
};

window.updateExistingNotifOnly = (notif) => {
    const existing = notifications.find(n => n.id === notif.id);
    if (existing) {
        existing.message = notif.message || existing.message;
        existing.details = notif.details || existing.details;
        existing.status = notif.status || existing.status;
        existing.category = notif.category || existing.category;
        if (notif.isRead !== undefined) {
            const wasUnread = !existing.isRead;
            existing.isRead = !!notif.isRead;
            if (wasUnread && existing.isRead && unreadCount > 0) {
                unreadCount--;
                updateNotifBadge();
            }
        }
        existing.actions = notif.actions || existing.actions;
        renderNotifList();
    }
};

window.showPushNotification = ({ message, details, createdAt, link, params, category, status, actions, id }) => {
    // Check if we already have this notification to avoid duplicates
    if (id && notifications.find(n => n.id === id)) return;

    unreadCount++;
    updateNotifBadge();

    // Play notification sound for LIVE notifications
    try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch(e) {}

    // Add to in-memory list
    notifications.unshift({ 
        id,
        message, 
        details, 
        createdAt, 
        link, 
        params, 
        isRead: false, 
        category: category || 'system', 
        status: status || 'info', 
        actions: actions || [] 
    });
    renderNotifList();

    // --- DECK STACKING LOGIC ---
    const updateToastDeck = () => {
        const all = document.querySelectorAll('.michu-push-toast');
        if (all.length > 0 && all[0].dataset.expanded === "true") {
            all.forEach((t, i) => {
                t.style.top = (20 + (i * 95)) + 'px';
            });
            return;
        }

        const toasts = Array.from(all).reverse();
        toasts.forEach((t, i) => {
            t.className = 'michu-push-toast';
            if (i === 0) {
                t.style.top = '20px';
                t.style.zIndex = '20000';
            } else if (i === 1) {
                t.classList.add('deck-1');
                t.style.top = '20px';
            } else if (i === 2) {
                t.classList.add('deck-2');
                t.style.top = '20px';
            } else {
                t.classList.add('hidden-stack');
                t.style.top = '20px';
            }
            
            // Add/update counter and "Dismiss all" on top toast
            let badge = t.querySelector('.toast-badge-count');
            let dismissAll = t.querySelector('.toast-dismiss-all');

            if (i === 0 && toasts.length > 1) {
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'toast-badge-count';
                    t.appendChild(badge);
                }
                badge.textContent = `+${toasts.length - 1}`;

                if (!dismissAll) {
                    dismissAll = document.createElement('button');
                    dismissAll.className = 'toast-dismiss-all';
                    dismissAll.style.cssText = 'position:absolute; bottom:8px; right:12px; background:none; border:none; color:var(--color-primary); font-size:10px; font-weight:800; cursor:pointer; padding:4px; opacity:0.8;';
                    dismissAll.innerText = 'Dismiss all';
                    dismissAll.onclick = (e) => {
                        e.stopPropagation();
                        window.dismissAllToasts();
                    };
                    t.appendChild(dismissAll);
                }
            } else {
                if (badge) badge.remove();
                if (dismissAll) dismissAll.remove();
            }
        });
    };

    window.dismissAllToasts = () => {
        const all = document.querySelectorAll('.michu-push-toast');
        all.forEach(t => {
            t.style.animation = '_pushOut 0.4s ease forwards';
            setTimeout(() => t.remove(), 400);
        });
    };

    const container = document.createElement('div');
    container.className = 'michu-push-toast';
    container.style.top = '20px';
    container.style.width = '300px'; // Smaller width
    container.style.background = 'white'; // White background
    container.style.color = '#1e293b'; // Dark text
    container.style.border = '1px solid #e2e8f0';
    container.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
    
    container.innerHTML = `
        <style>
            @keyframes _pushIn{from{transform:translateY(-100%) translateX(0);opacity:0}to{transform:translateY(0) translateX(0);opacity:1}} 
            @keyframes _pushOut{from{transform:translateX(0);opacity:1}to{transform:translateX(120%);opacity:0}}
            .toast-close-btn { position:absolute; top:8px; right:8px; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#f1f5f9; color:#94a3b8; border:none; cursor:pointer; font-size:12px; opacity:0; transition:opacity 0.2s; }
            .michu-push-toast:hover .toast-close-btn { opacity:1; }
        </style>
        <button class="toast-close-btn" onclick="event.stopPropagation(); this.parentElement.closeToast();">✕</button>
        <div style="width:34px;height:34px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
            <svg width="16" height="16" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        </div>
        <div style="flex:1; min-width:0;">
            <div style="font-weight:800;color:#1e293b;font-size:0.85rem;margin-bottom:0.15rem; padding-right:15px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${message || 'New notification'}</div>
            <div style="color:#64748b;font-size:0.75rem;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${details || ''}</div>
            <div style="color:#94a3b8;font-size:0.6rem;margin-top:0.3rem;">Just now</div>
        </div>`;
    
    // Slide in from top
    container.style.animation = '_pushIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    document.body.appendChild(container);
    updateToastDeck();
    
    container.closeToast = () => { 
        container.style.animation = '_pushOut 0.4s ease forwards'; 
        setTimeout(() => {
            container.remove();
            updateToastDeck();
        }, 400); 
    };

    // Expand behavior: if clicking a stacked toast, or top toast with others behind, maybe fan them?
    // For now, clicking top toast just navigates.
    
    container.onclick = () => { 
        const all = document.querySelectorAll('.michu-push-toast');
        if (all.length > 1 && container.dataset.expanded !== "true") {
            // Fan out vertically
            Array.from(all).reverse().forEach((t, i) => {
                t.dataset.expanded = "true";
                t.className = 'michu-push-toast'; 
                t.style.top = (20 + (i * 95)) + 'px';
                t.style.transform = 'none';
                t.style.opacity = '1';
                t.style.pointerEvents = 'auto';
                const b = t.querySelector('.toast-badge-count');
                if (b) b.remove();
            });
            return;
        }
        
        if (link) {
            window.router.navigate(link, params || {}); 
        } else {
            window.router.navigate('home');
        }
        container.closeToast(); 
    };
    
    setTimeout(() => { if (container.parentElement) container.closeToast(); }, 12000); 
};

window.showNotifModal = (open) => {
    const modal = document.getElementById('notif-modal');
    if (!modal) return;

    if (open === undefined) {
        open = (modal.style.display !== 'flex');
    }

    if (open) {
        modal.style.display = 'flex';
        // Always force a fresh render from the full in-memory notifications array
        // This ensures historical notifications that arrived while the panel was closed are shown
        showAllNotifs = false; // Reset pagination
        renderNotifList();
        // Update badge
        const badge = document.getElementById('notif-badge');
        if (badge) {
            badge.style.display = 'none';
            badge.classList.remove('notif-pulse');
        }
        unreadCount = 0;
    } else {
        modal.style.display = 'none';
        notifications.forEach(n => n.isNew = false);
    }
};

// --- Professional Cropper Logic ---
let globalCropperInstance = null;
let cropperResolve = null;

window.cropImage = function(imageFile) {
    return new Promise((resolve, reject) => {
        const modal = document.getElementById('cropper-modal');
        const img = document.getElementById('cropper-image');
        
        if (!modal || !img) {
            reject("Cropper elements missing");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            modal.style.display = 'flex';
            
            if (globalCropperInstance) {
                globalCropperInstance.destroy();
            }
            
            globalCropperInstance = new Cropper(img, {
                aspectRatio: 1, // Square for profiles
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
            
            cropperResolve = resolve;
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
    });
};

window.cancelCrop = function() {
    const modal = document.getElementById('cropper-modal');
    if(modal) modal.style.display = 'none';
    if (globalCropperInstance) {
        globalCropperInstance.destroy();
        globalCropperInstance = null;
    }
    if (cropperResolve) {
        cropperResolve(null);
        cropperResolve = null;
    }
};

window.applyCrop = function() {
    if (!globalCropperInstance) return;
    
    const canvas = globalCropperInstance.getCroppedCanvas({
        width: 512,
        height: 512,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    });
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.9);
    
    const modal = document.getElementById('cropper-modal');
    if(modal) modal.style.display = 'none';
    
    globalCropperInstance.destroy();
    globalCropperInstance = null;
    
    if (cropperResolve) {
        cropperResolve(base64Image);
        cropperResolve = null;
    }
};

window.startNotifications = async () => {
    if (notifUnsub) return; // already listening

    // Wait for auth to be truly ready with role data (up to 5 seconds)
    let retries = 25;
    while (!window.auth?.userData?.role && retries > 0) {
        await new Promise(r => setTimeout(r, 200));
        retries--;
    }

    if (window.db && window.db.listenForNotifications) {
        try {
            notifUnsub = window.db.listenForNotifications((notif) => {
                window.showPushNotification({
                    id: notif.id,
                    message: notif.message,
                    details: notif.details,
                    createdAt: notif.createdAt,
                    link: notif.link,
                    params: notif.params,
                    category: notif.category,
                    status: notif.status,
                    actions: notif.actions
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
            if (window.refreshMichuReviewsUI && hotelId) {
                await window.refreshMichuReviewsUI(hotelId);
            } else if (hotelId) {
                window.router.navigate('hotel_detail_view', { id: hotelId });
            }
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
            if (window.refreshMichuReviewsUI && hotelId) {
                await window.refreshMichuReviewsUI(hotelId);
            } else if (hotelId) {
                window.router.navigate('hotel_detail_view', { id: hotelId });
            }
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



