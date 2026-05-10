// ── A1. HOME BANNER  ─────────────────────────────────────────────────────────
// Called from home.js: window.renderAnnouncementBanner(containerEl)

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

    // inject styles once
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
        if (!tr) return;
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
