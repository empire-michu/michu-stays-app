// ── A1. HOME BANNER  ─────────────────────────────────────────────────────────
// Called from home.js: window.renderAnnouncementBanner(containerEl)

window.renderAnnouncementBanner = async function(container) {
    let announcements = [];
    try {
        // Avoid composite index requirement by fetching recent and filtering in JS
        const snap = await firebase.firestore()
            .collection('announcements')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
            
        announcements = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(ann => ann.active === true)
            .slice(0, 5);
    } catch(e) { console.warn('Announcement fetch failed:', e); return; }

    if (!announcements.length) { 
        // Keep the fallback hero
        return; 
    }

    // inject styles once
    if (!document.getElementById('ann-hero-styles')) {
        const s = document.createElement('style');
        s.id = 'ann-hero-styles';
        s.textContent = `
            .ann-hero-vp { overflow:hidden; position:relative; width:100%; touch-action:pan-y; min-height: 320px; }
            .ann-hero-track { display:flex; will-change:transform; height:100%; }
            .ann-hero-slide { flex:0 0 100%; position:relative; height:100%; }
            
            .ann-hero-nav { position:absolute; top:50%; transform:translateY(-50%); width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,0.2); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.4); color:white; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10; font-size:1.1rem; transition:background 0.2s; }
            .ann-hero-nav:hover { background:rgba(255,255,255,0.4); }
            .ann-hero-nav.p { left:15px; }
            .ann-hero-nav.n { right:15px; }

            .ann-hero-pips { position:absolute; bottom:12px; left:50%; transform:translateX(-50%); display:flex; gap:5px; z-index:10; }
            .ann-hero-pip { width:7px; height:7px; border-radius:50%; background:rgba(255,255,255,0.4); cursor:pointer; transition:all .25s; }
            .ann-hero-pip.on { background:#fff; transform:scale(1.2); }

            .hero-section-ann {
                position: relative;
                width: 100%;
                min-height: 320px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: white;
            }

            .ann-hero-media { position:absolute; inset:0; z-index:0; }
            .ann-hero-media img, .ann-hero-media video { width:100%; height:100%; object-fit:cover; display:block; }
            .ann-hero-overlay { position:absolute; inset:0; background:linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.55)); z-index:1; }
            
            .ann-hero-content {
                position: relative;
                z-index: 2;
                padding: 20px;
                max-width: 800px;
                display:flex;
                flex-direction:column;
                align-items:center;
                animation: fadeUp 0.8s ease-out;
            }

            .ann-hero-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                background: rgba(244,180,0,0.4);
                color: #fff;
                padding: 3px 10px;
                border-radius: 99px;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                margin-bottom: 10px;
                border: 1px solid rgba(255,255,255,0.3);
                backdrop-filter: blur(4px);
            }

            .ann-hero-title {
                font-size: clamp(1.6rem, 4vw, 2.6rem);
                font-weight: 900;
                line-height: 1.1;
                margin-bottom: 0.6rem;
                text-shadow: 0 4px 12px rgba(0,0,0,0.5);
                letter-spacing: -0.5px;
            }

            .ann-hero-body {
                font-size: clamp(0.9rem, 1.8vw, 1.15rem);
                opacity: 0.95;
                margin-bottom: 20px;
                max-width: 580px;
                text-shadow: 0 2px 8px rgba(0,0,0,0.5);
                line-height: 1.4;
            }

            .ann-hero-cta {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                background: var(--color-secondary);
                color: #1A1A1A;
                font-size: 14px;
                font-weight: 800;
                padding: 10px 28px;
                border-radius: 99px;
                border: none;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                box-shadow: 0 4px 15px rgba(244,180,0,0.3);
            }
            .ann-hero-cta:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(244,180,0,0.4);
                background: #fff;
            }
            .ann-hero-cta svg {
                width: 16px;
                height: 16px;
            }

        `;
        document.head.appendChild(s);
    }

    const multi = announcements.length > 1;

    const buildCard = (ann) => {
        const media = ann.mediaType;
        const esc = s => String(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        
        let mediaHtml = '';
        if (media === 'image' && ann.mediaUrl) {
            mediaHtml = `<img src="${esc(ann.mediaUrl)}" alt="${esc(ann.mediaAlt||ann.title)}">`;
        } else if (media === 'video' && ann.mediaUrl) {
            mediaHtml = `<video src="${esc(ann.mediaUrl)}" ${ann.mediaPoster?`poster="${esc(ann.mediaPoster)}"`:''} playsinline muted autoplay loop></video>`;
        } else {
            // Fallback gradient if no media
            mediaHtml = `<div style="width:100%;height:100%;background:linear-gradient(135deg, #0B6E4F, #1A1A1A);"></div>`;
        }

        const hasContent = ann.title || ann.body || ann.ctaLink || ann.badge;
        
        return `
        <div class="ann-hero-slide" onclick="${ann.ctaLink ? `window.router&&window.router.navigate('${esc(ann.ctaLink)}')` : ''}" style="${ann.ctaLink ? 'cursor:pointer' : ''}">
            <section class="hero-section hero-section-ann" style="background:none;">
                <div class="ann-hero-media">${mediaHtml}</div>
                ${hasContent ? `<div class="ann-hero-overlay"></div>` : ''}
                
                ${hasContent ? `
                <div class="ann-hero-content">
                    ${ann.badge ? `
                    <div class="ann-hero-badge">
                        <span style="font-size:0.9rem;line-height:1;margin-top:-2px;">📢</span>
                        ${esc(ann.badge)}
                    </div>` : ''}
                    
                    ${ann.title ? `<h1 class="ann-hero-title">${esc(ann.title)}</h1>` : ''}
                    ${ann.body ? `<p class="ann-hero-body">${esc(ann.body)}</p>` : ''}
                    
                    ${ann.ctaLink ? `
                        <button class="ann-hero-cta">
                            ${esc(ann.cta || 'Learn More')}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                        </button>
                    ` : ''}
                </div>
                ` : ''}
            </section>
        </div>`;
    };

    container.innerHTML = `
        <div class="ann-hero-vp" id="ann-hero-vp">
            <div class="ann-hero-track" id="ann-hero-tr">
                ${announcements.map(buildCard).join('')}
            </div>
            ${multi ? `
                <button class="ann-hero-nav p" id="ann-hero-p" aria-label="Previous">‹</button>
                <button class="ann-hero-nav n" id="ann-hero-n" aria-label="Next">›</button>
                <div class="ann-hero-pips">
                    ${announcements.map((_,i) => `<div class="ann-hero-pip${i===0?' on':''}" data-i="${i}"></div>`).join('')}
                </div>
            ` : ''}
        </div>
    `;

    // Ensure the viewport matches hero height (handled by hero-section class, but just in case)
    const vp = document.getElementById('ann-hero-vp');
    
    if (!multi) return;

    let cur = 0, tmr = null;
    const total = announcements.length;
    
    const go = (n, animate=true) => {
        cur = ((n % total) + total) % total;
        const tr = document.getElementById('ann-hero-tr');
        if (!tr) return;
        tr.style.transition = animate ? 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'none';
        tr.style.transform  = `translateX(-${cur * 100}%)`;
        container.querySelectorAll('.ann-hero-pip').forEach((p, i) => p.classList.toggle('on', i === cur));
    };
    
    const auto = () => { clearInterval(tmr); tmr = setInterval(() => go(cur+1), 6000); };
    
    document.getElementById('ann-hero-p').onclick = () => { go(cur-1); auto(); };
    document.getElementById('ann-hero-n').onclick = () => { go(cur+1); auto(); };
    container.querySelectorAll('[data-i]').forEach(d => { 
        d.onclick = () => { go(+d.dataset.i); auto(); }; 
    });
    
    let tx = 0;
    vp.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive:true});
    vp.addEventListener('touchend', e => { 
        const dx = e.changedTouches[0].clientX - tx; 
        if(Math.abs(dx) > 40) {
            go(dx < 0 ? cur + 1 : cur - 1);
            auto();
        } 
    });
    
    auto();
};

