// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║        MICHU STAYS — FEATURE 2: ADMIN ANNOUNCEMENT BANNER                   ║
// ║                                                                              ║
// ║  WHAT TO TELL ANTIGRAVITY:                                                   ║
// ║  "Add the admin announcement banner. This file has 3 sections. Do each      ║
// ║   section exactly as labelled. Do not change existing code — only add."     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// ════════════════════════════════════════════════════════════════════════════════
// SECTION A — NEW FILE: create js/views/announcements.js
//             (this handles BOTH the banner shown on the home page
//              AND the admin panel to create/manage announcements)
// ════════════════════════════════════════════════════════════════════════════════

// ── A1. HOME BANNER  ─────────────────────────────────────────────────────────
// Call window.renderAnnouncementBanner(containerEl) from home.js to show the banner.

window.renderAnnouncementBanner = async function(container) {
    let announcements = [];
    try {
        const snap = await firebase.firestore()
            .collection('announcements')
            .where('active', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        announcements = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch(e) { console.warn('Announcement fetch failed:', e); return; }

    if (!announcements.length) { container.innerHTML = ''; return; }

    // ── inject styles once ────────────────────────────────────────────────────
    if (!document.getElementById('ann-styles')) {
        const s = document.createElement('style');
        s.id = 'ann-styles';
        s.textContent = `
            .ann-label-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
            .ann-label{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--color-primary)}
            .ann-live-dot{width:7px;height:7px;border-radius:50%;background:var(--color-secondary);animation:ann-pulse 2s ease-in-out infinite;flex-shrink:0}
            @keyframes ann-pulse{0%,100%{box-shadow:0 0 0 3px rgba(244,180,0,.25)}50%{box-shadow:0 0 0 7px rgba(244,180,0,0)}}
            .ann-pips{display:flex;gap:5px;align-items:center}
            .ann-pip{width:6px;height:6px;border-radius:50%;background:var(--color-border);cursor:pointer;transition:all .25s}
            .ann-pip.on{background:var(--color-primary);transform:scale(1.45)}
            .ann-vp{overflow:hidden;border-radius:20px;position:relative;touch-action:pan-y}
            .ann-track{display:flex;will-change:transform}
            .ann-slide{flex:0 0 100%}
            .ann-card{border-radius:20px;overflow:hidden;position:relative;display:flex;flex-direction:column;min-height:140px}
            .ann-card.type-promo{background:linear-gradient(135deg,#0B6E4F,#0d8860);color:white}
            .ann-card.type-promo::after{content:'';position:absolute;right:-28px;top:-28px;width:130px;height:130px;border-radius:50%;border:24px solid rgba(244,180,0,.13);pointer-events:none}
            .ann-card.type-gold{background:linear-gradient(135deg,#c99200,#F4B400,#f7c830);color:#1A1A1A}
            .ann-card.type-dark{background:linear-gradient(135deg,#052e1f,#084d37,#0B6E4F);color:white}
            .ann-card.type-dark::after{content:'';position:absolute;left:-20px;top:-20px;width:100px;height:100px;border-radius:50%;border:18px solid rgba(244,180,0,.1);pointer-events:none}
            .ann-card.type-light{background:linear-gradient(135deg,#eaf7f2,#d4ede5);color:#1A1A1A;border:1px solid rgba(11,110,79,.12)}
            .ann-media{width:100%;height:180px;position:relative;overflow:hidden;flex-shrink:0}
            .ann-media img,.ann-media video{width:100%;height:100%;object-fit:cover;display:block}
            .ann-media-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0) 40%,rgba(0,0,0,.5) 100%);pointer-events:none}
            .ann-play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.9);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.2rem}
            .ann-inner{padding:18px 20px 16px;flex:1;display:flex;flex-direction:column;gap:10px;position:relative;z-index:1}
            .ann-badge-row{display:flex;align-items:center;gap:8px}
            .ann-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:99px}
            .type-promo .ann-badge,.type-dark .ann-badge{background:rgba(244,180,0,.2);color:#F4B400}
            .type-gold .ann-badge{background:rgba(0,0,0,.12);color:#1A1A1A}
            .type-light .ann-badge{background:rgba(11,110,79,.1);color:var(--color-primary)}
            .ann-title{font-size:19px;font-weight:800;line-height:1.25;letter-spacing:-.3px;flex:1}
            .ann-body{font-size:13px;line-height:1.6;opacity:.88;max-width:80%}
            .ann-footer{display:flex;align-items:center;justify-content:space-between;margin-top:auto;padding-top:4px;border-top:1px solid rgba(255,255,255,.15)}
            .type-light .ann-footer,.type-gold .ann-footer{border-top-color:rgba(0,0,0,.1)}
            .ann-cta{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;padding:7px 14px;border-radius:99px;border:none;cursor:pointer;font-family:'Outfit',sans-serif}
            .type-promo .ann-cta,.type-dark .ann-cta{background:var(--color-secondary);color:#1A1A1A}
            .type-gold .ann-cta{background:rgba(0,0,0,.15);color:#1A1A1A}
            .type-light .ann-cta{background:var(--color-primary);color:white}
            .ann-date{font-size:11px;font-weight:500;opacity:.55}
            .ann-prog{position:absolute;bottom:0;left:0;height:2px;background:rgba(255,255,255,.45);animation:ann-prog 4.5s linear infinite}
            @keyframes ann-prog{from{width:0}to{width:100%}}
            .ann-nav{position:absolute;top:50%;transform:translateY(-50%);width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.9);border:1px solid rgba(0,0,0,.08);cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;font-size:1rem;font-weight:700}
            .ann-nav.p{left:10px}.ann-nav.n{right:10px}
        `;
        document.head.appendChild(s);
    }

    const multi = announcements.length > 1;

    const buildCard = (ann) => {
        const type  = ann.type || 'promo';
        const media = ann.mediaType;
        const date  = ann.createdAt ? new Date(ann.createdAt).toLocaleDateString('en-ET',{day:'numeric',month:'short',year:'numeric'}) : '';
        const esc   = s => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        let mediaHtml = '';
        if (media === 'image' && ann.mediaUrl) {
            mediaHtml = `<div class="ann-media"><img src="${esc(ann.mediaUrl)}" alt="${esc(ann.mediaAlt||ann.title)}"><div class="ann-media-overlay"></div></div>`;
        } else if (media === 'video' && ann.mediaUrl) {
            mediaHtml = `<div class="ann-media">
                <video src="${esc(ann.mediaUrl)}" ${ann.mediaPoster?`poster="${esc(ann.mediaPoster)}"`:''}  playsinline muted loop preload="none" style="height:180px"></video>
                <div class="ann-media-overlay"></div>
                <button class="ann-play" aria-label="Play video" onclick="(function(btn){var v=btn.closest('.ann-media').querySelector('video');if(v.paused){v.play();btn.textContent='⏸';}else{v.pause();btn.textContent='▶';};})(this)">▶</button>
            </div>`;
        }
        return `<div class="ann-slide"><div class="ann-card type-${type}">
            ${mediaHtml}
            <div class="ann-inner">
                <div class="ann-badge-row">
                    <span class="ann-badge">${esc(ann.badge||'📢 Announcement')}</span>
                    ${ann.icon ? `<span style="font-size:1.4rem;line-height:1;">${esc(ann.icon)}</span>` : ''}
                </div>
                <div class="ann-title">${esc(ann.title)}</div>
                <div class="ann-body">${esc(ann.body)}</div>
                <div class="ann-footer">
                    <button class="ann-cta" onclick="window.router&&window.router.navigate('${esc(ann.ctaLink||'home')}')">${esc(ann.cta||'Learn More')} →</button>
                    <span class="ann-date">${date}</span>
                </div>
            </div>
            ${multi ? '<div class="ann-prog"></div>' : ''}
        </div></div>`;
    };

    container.innerHTML = `<div style="margin-bottom:20px;">
        <div class="ann-label-row">
            <div class="ann-label"><div class="ann-live-dot"></div>From Michu Stays</div>
            <div class="ann-pips">${multi ? announcements.map((_,i)=>`<div class="ann-pip${i===0?' on':''}" data-i="${i}"></div>`).join('') : ''}</div>
        </div>
        <div style="position:relative;">
            <div class="ann-vp" id="ann-vp">
                <div class="ann-track" id="ann-tr">${announcements.map(buildCard).join('')}</div>
            </div>
            ${multi ? `<button class="ann-nav p" id="ann-p" aria-label="Previous">‹</button><button class="ann-nav n" id="ann-n" aria-label="Next">›</button>` : ''}
        </div>
    </div>`;

    if (!multi) return;

    let cur = 0, tmr = null;
    const total = announcements.length;
    const go = (n, animate=true) => {
        cur = ((n%total)+total)%total;
        const tr = document.getElementById('ann-tr');
        tr.style.transition = animate ? 'transform .42s cubic-bezier(.4,0,.2,1)' : 'none';
        tr.style.transform  = `translateX(-${cur*100}%)`;
        container.querySelectorAll('.ann-pip').forEach((p,i) => p.classList.toggle('on', i===cur));
        container.querySelectorAll('.ann-prog').forEach(p => { p.style.animation='none'; void p.offsetWidth; p.style.animation=''; });
    };
    const auto = () => { clearInterval(tmr); tmr = setInterval(() => go(cur+1), 4500); };
    document.getElementById('ann-p').onclick = () => { go(cur-1); auto(); };
    document.getElementById('ann-n').onclick = () => { go(cur+1); auto(); };
    container.querySelectorAll('[data-i]').forEach(d => { d.onclick = () => { go(+d.dataset.i); auto(); }; });
    let tx = 0;
    document.getElementById('ann-vp').addEventListener('touchstart', e => { tx=e.touches[0].clientX; }, {passive:true});
    document.getElementById('ann-vp').addEventListener('touchend',   e => { const dx=e.changedTouches[0].clientX-tx; if(Math.abs(dx)>40){go(dx<0?cur+1:cur-1);auto();} });
    auto();
};


// ════════════════════════════════════════════════════════════════════════════════
// SECTION B — CHANGES TO EXISTING FILES
// ════════════════════════════════════════════════════════════════════════════════

/*

── B1. index.html ────────────────────────────────────────────────────────────────
Find the line:
    <script src="js/views/booking.js"></script>

Add directly below it:
    <script src="js/views/announcements.js"></script>


── B2. home.js  ──────────────────────────────────────────────────────────────────
Find the hero section HTML block. It looks like:
    <section class="hero-section">
        ...
    </section>

    <div class="container" style="position:relative; z-index:10; margin-top:-2rem;">
        <!-- Categories -->

Find the <div class="container"...> line AFTER the hero section.
Add this div right INSIDE it, before the <!-- Categories --> comment:

    <div id="ann-banner-container"></div>

Then, AFTER container.innerHTML = `...` is set and all the JS runs,
find the place where properties are rendered (look for renderProperties() or
the first time allProperties is used to build the grid). Add this call
right after container.innerHTML is assigned — at the top of the async handler,
after the loading spinner is replaced with actual content:

    // Render announcements banner
    const annContainer = document.getElementById('ann-banner-container');
    if (annContainer) window.renderAnnouncementBanner(annContainer);


── B3. admin.js — add Announcements tab  ─────────────────────────────────────────
Find the 6 admin tab buttons that look like:
    <button style="${tabStyle('analytics')}" onclick="window.fastTab('analytics')">📊 Analytics</button>
    <button style="${tabStyle('hotels')}"    onclick="window.fastTab('hotels')">Properties</button>
    <button style="${tabStyle('bookings')}"  onclick="window.fastTab('bookings')">Bookings</button>
    <button style="${tabStyle('managers')}"  onclick="window.fastTab('managers')">Managers</button>
    <button style="${tabStyle('add-hotel')}" onclick="window.fastTab('add-hotel')">Add Stay</button>
    <button style="${tabStyle('account')}"   onclick="window.fastTab('account')">My Account</button>

Add this 7th button in that group:
    <button style="${tabStyle('announcements')}" onclick="window.fastTab('announcements')">📢 Announcements</button>

Find the tab router block that has the six display:none/block divs.
It will look like:
    <div id="adm-tab-analytics" style="display:${activeTab==='analytics'?'block':'none'}">
    ...
    <div id="adm-tab-account" style="display:${activeTab==='account'?'block':'none'}">

Add this new tab div right after the last one:

    <div id="adm-tab-announcements" style="display:${activeTab==='announcements'?'block':'none'}">
        ${renderAnnouncementsAdminTab()}
    </div>

Then add this entire function INSIDE the admin route handler
(alongside the other render functions like renderBookingsTab etc.):

    const renderAnnouncementsAdminTab = () => {
        // We build the UI shell; data loads async after render
        setTimeout(async () => {
            const tabEl = document.getElementById('adm-tab-announcements');
            if (!tabEl || activeTab !== 'announcements') return;

            // Load existing announcements
            let existing = [];
            try {
                const snap = await firebase.firestore().collection('announcements').orderBy('createdAt','desc').get();
                existing = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch(e) { console.error(e); }

            const listHtml = existing.length === 0
                ? `<p style="color:#aaa;font-style:italic;">No announcements yet.</p>`
                : existing.map(a => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:0.9rem 1rem;border-bottom:1px solid var(--color-border);">
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.title||''}</div>
                            <div style="font-size:0.75rem;color:var(--color-text-light);margin-top:2px;">
                                ${a.type||'promo'} · ${a.mediaType||'text only'} · ${a.active?'<span style="color:green;font-weight:700;">Active</span>':'<span style="color:#aaa;">Inactive</span>'}
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;flex-shrink:0;margin-left:12px;">
                            <button onclick="window._toggleAnn('${a.id}',${!a.active})" style="font-size:0.75rem;padding:4px 10px;border-radius:8px;border:1px solid var(--color-border);background:white;cursor:pointer;font-family:'Outfit',sans-serif;">
                                ${a.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onclick="window._deleteAnn('${a.id}')" style="font-size:0.75rem;padding:4px 10px;border-radius:8px;border:1px solid #fee2e2;background:#fff5f5;color:#e53e3e;cursor:pointer;font-family:'Outfit',sans-serif;">
                                Delete
                            </button>
                        </div>
                    </div>`).join('');

            tabEl.innerHTML = `
            <div style="max-width:700px;">
                <!-- CREATE FORM -->
                <div style="background:white;border-radius:20px;box-shadow:var(--shadow-sm);padding:1.5rem;margin-bottom:1.5rem;">
                    <h3 style="margin:0 0 1.2rem;font-size:1rem;font-weight:800;color:var(--color-primary);">📢 Create New Announcement</h3>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                        <div>
                            <label style="font-size:0.78rem;font-weight:700;color:#666;display:block;margin-bottom:4px;">Title *</label>
                            <input id="ann-new-title" type="text" placeholder="Weekend Flash Sale — 20% Off" style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid var(--color-border);border-radius:10px;font-family:'Outfit',sans-serif;font-size:0.9rem;outline:none;">
                        </div>
                        <div>
                            <label style="font-size:0.78rem;font-weight:700;color:#666;display:block;margin-bottom:4px;">Badge label (e.g. Flash Sale)</label>
                            <input id="ann-new-badge" type="text" placeholder="Flash Sale" style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid var(--color-border);border-radius:10px;font-family:'Outfit',sans-serif;font-size:0.9rem;outline:none;">
                        </div>
                    </div>

                    <div style="margin-bottom:1rem;">
                        <label style="font-size:0.78rem;font-weight:700;color:#666;display:block;margin-bottom:4px;">Body text *</label>
                        <textarea id="ann-new-body" rows="2" placeholder="Short description of the announcement…" style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid var(--color-border);border-radius:10px;font-family:'Outfit',sans-serif;font-size:0.9rem;resize:vertical;outline:none;"></textarea>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1rem;">
                        <div>
                            <label style="font-size:0.78rem;font-weight:700;color:#666;display:block;margin-bottom:4px;">Card style</label>
                            <select id="ann-new-type" style="width:100%;padding:0.6rem;border:1.5px solid var(--color-border);border-radius:10px;font-family:'Outfit',sans-serif;font-size:0.85rem;outline:none;">
                                <option value="promo">🌿 Green (Promo)</option>
                                <option value="gold">✨ Gold</option>
                                <option value="dark">🌙 Dark Green</option>
                                <option value="light">🍃 Light Mint</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size:0.78rem;font-weight:700;color:#666;display:block;margin-bottom:4px;">CTA button text</label>
                            <input id="ann-new-cta" type="text" placeholder="Browse Deals" style="width:100%;padding:0.6rem 0.8rem;border:1.5px solid var(--color-border);border-radius:10px;font-family:'Outfit',sans-serif;font-size:0.9rem;outline:none;">
                        </div>
                        <div>
                            <label style="font-size:0.78rem;font-weight:700;color:#666;display:block;margin-bottom:4px;">CTA goes to (route)</label>
                            <select id="ann-new-link" style="width:100%;padding:0.6rem;border:1.5px solid var(--color-border);border-radius:10px;font-family:'Outfit',sans-serif;font-size:0.85rem;outline:none;">
                                <option value="home">Home / Browse</option>
                                <option value="profile">Guest Profile</option>
                            </select>
                        </div>
                    </div>

                    <!-- Media upload -->
                    <div style="border:1.5px dashed var(--color-border);border-radius:14px;padding:1rem;margin-bottom:1rem;background:#fafff9;">
                        <div style="font-size:0.78rem;font-weight:700;color:#666;margin-bottom:8px;">Media (optional — image or video)</div>
                        <input id="ann-new-media" type="file" accept="image/*,video/*"
                            style="font-family:'Outfit',sans-serif;font-size:0.85rem;width:100%;"
                            onchange="window._previewAnnMedia(this)">
                        <div id="ann-media-preview" style="margin-top:8px;"></div>
                        <div style="font-size:0.72rem;color:#aaa;margin-top:6px;">JPG, PNG, GIF or MP4 · max 10 MB · stored on Cloudinary</div>
                    </div>

                    <button id="ann-save-btn" onclick="window._saveAnnouncement()" style="width:100%;padding:0.9rem;background:var(--color-primary);color:white;border:none;border-radius:12px;font-family:'Outfit',sans-serif;font-size:0.95rem;font-weight:800;cursor:pointer;">
                        ✅ Publish Announcement
                    </button>
                    <div id="ann-save-status" style="margin-top:0.6rem;font-size:0.85rem;text-align:center;"></div>
                </div>

                <!-- EXISTING ANNOUNCEMENTS LIST -->
                <div style="background:white;border-radius:20px;box-shadow:var(--shadow-sm);overflow:hidden;">
                    <div style="padding:1rem 1.2rem;border-bottom:1px solid var(--color-border);font-weight:800;font-size:0.9rem;color:var(--color-primary);">
                        📋 All Announcements (${existing.length})
                    </div>
                    ${listHtml}
                </div>
            </div>`;

            // ── handlers ────────────────────────────────────────────────────
            window._previewAnnMedia = (input) => {
                const file = input.files[0];
                const preview = document.getElementById('ann-media-preview');
                if (!file || !preview) return;
                const isVideo = file.type.startsWith('video/');
                const url = URL.createObjectURL(file);
                preview.innerHTML = isVideo
                    ? `<video src="${url}" controls style="max-width:100%;max-height:140px;border-radius:10px;"></video>`
                    : `<img src="${url}" style="max-width:100%;max-height:140px;border-radius:10px;object-fit:cover;">`;
            };

            window._saveAnnouncement = async () => {
                const title = document.getElementById('ann-new-title')?.value.trim();
                const body  = document.getElementById('ann-new-body')?.value.trim();
                if (!title || !body) { window.showAlert('Title and body are required.'); return; }

                const btn    = document.getElementById('ann-save-btn');
                const status = document.getElementById('ann-save-status');
                btn.textContent = 'Saving…';
                btn.disabled    = true;
                status.style.color = '#888';
                status.textContent = '';

                try {
                    let mediaUrl = null, mediaPoster = null, mediaType = null;
                    const mediaFile = document.getElementById('ann-new-media')?.files[0];

                    if (mediaFile) {
                        status.textContent = '⏫ Uploading media…';
                        const isVideo = mediaFile.type.startsWith('video/');
                        mediaType = isVideo ? 'video' : 'image';
                        mediaUrl  = await window.db.uploadFile(mediaFile, 'announcements');
                        // For video: also upload a poster if a second image file is nearby;
                        // for now we leave mediaPoster null and the card will show no thumbnail
                    }

                    const doc = {
                        title,
                        body,
                        badge:    document.getElementById('ann-new-badge')?.value.trim() || 'Announcement',
                        type:     document.getElementById('ann-new-type')?.value  || 'promo',
                        cta:      document.getElementById('ann-new-cta')?.value.trim()  || 'Learn More',
                        ctaLink:  document.getElementById('ann-new-link')?.value  || 'home',
                        mediaType:  mediaType,
                        mediaUrl:   mediaUrl,
                        mediaPoster: mediaPoster,
                        active:   true,
                        createdAt: new Date().toISOString()
                    };

                    await firebase.firestore().collection('announcements').add(doc);
                    status.style.color = 'green';
                    status.textContent = '✅ Published! Guests will see it on the home screen.';
                    // Clear form
                    ['ann-new-title','ann-new-body','ann-new-badge','ann-new-cta'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.value = '';
                    });
                    document.getElementById('ann-media-preview').innerHTML = '';
                    document.getElementById('ann-new-media').value = '';
                    // Reload tab
                    setTimeout(() => { window.fastTab('announcements'); }, 1500);
                } catch(err) {
                    console.error('Save announcement error:', err);
                    status.style.color = '#e53e3e';
                    status.textContent = '❌ Error: ' + err.message;
                } finally {
                    btn.textContent = '✅ Publish Announcement';
                    btn.disabled    = false;
                }
            };

            window._toggleAnn = async (id, active) => {
                await firebase.firestore().collection('announcements').doc(id).update({ active });
                window.fastTab('announcements');
            };

            window._deleteAnn = async (id) => {
                if (!confirm('Delete this announcement?')) return;
                await firebase.firestore().collection('announcements').doc(id).delete();
                window.fastTab('announcements');
            };

        }, 0);

        return `<div style="padding:1.5rem;text-align:center;color:#aaa;">Loading announcements…</div>`;
    };


// ════════════════════════════════════════════════════════════════════════════════
// SECTION C — FIRESTORE SECURITY RULES FOR ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════════════════════════

/*

── C1. Add inside your firestore.rules, inside match /databases/{database}/documents { ─

    match /announcements/{annId} {
      // Anyone can read active announcements (needed for the home banner)
      allow read: if true;
      // Only admins can create, update, delete
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

After saving, run:
    firebase deploy --only firestore:rules


── C2. No new Firestore indexes needed for announcements. ────────────────────────


── C3. THAT IS EVERYTHING. Summary of all files changed: ────────────────────────

    NEW FILE:   js/views/announcements.js   ← SECTION A above
    EDIT:       index.html                  ← add <script> tag (B1)
    EDIT:       js/views/home.js            ← add #ann-banner-container + call (B2)
    EDIT:       js/views/admin.js           ← add tab button + tab div + function (B3)
    EDIT:       firestore.rules             ← add announcements rule (C1)
                                              then firebase deploy --only firestore:rules

*/
