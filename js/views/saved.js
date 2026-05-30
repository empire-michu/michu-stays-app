window.router.addRoute('saved', async (container, params) => {
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">
        <div style="font-size:1.2rem; font-weight:700; color:#555;">Loading Saved Stays...</div>
    </div>`;

    let allProperties = [];
    try {
        allProperties = await window.db.getProperties(null, true).catch(() => []);
    } catch(e) { 
        console.error('Properties fetch failed:', e); 
    }

    let favorites = JSON.parse(localStorage.getItem('michu_favorites') || '[]');
    let savedStays = allProperties.filter(p => favorites.includes(p.id));

    window.toggleFavFromSaved = (e, id) => {
        e.stopPropagation();
        if (favorites.includes(id)) {
            favorites = favorites.filter(fid => fid !== id);
        } else {
            favorites.push(id);
        }
        localStorage.setItem('michu_favorites', JSON.stringify(favorites));
        
        // Re-render
        savedStays = allProperties.filter(p => favorites.includes(p.id));
        renderSaved();
    };

    const makeSavedCard = (p) => {
        const hasRoomTypes = p.roomTypes && p.roomTypes.length > 0;
        let currentPrice = 0;
        if (hasRoomTypes) {
            currentPrice = Math.min(...p.roomTypes.map(rt => Number(String(rt.price || 0).replace(/[^\d.-]/g, ''))));
        } else {
            currentPrice = Number(String(p.price || 0).replace(/[^\d.-]/g, ''));
        }

        let discountPercentage = Number(p.discountPercent || p.discount || 0);
        let originalPrice = currentPrice;
        if (discountPercentage > 0) {
            currentPrice = originalPrice - Math.round(originalPrice * (discountPercentage / 100));
        }

        const avail = hasRoomTypes 
            ? p.roomTypes.reduce((sum, rt) => sum + (Number(rt.availableRooms !== undefined ? rt.availableRooms : rt.totalRooms) || 0), 0)
            : (p.availableRooms ?? p.totalRooms ?? 0);

        const roomBadge = avail > 0 
            ? `<span style="background:#e6f4ea;color:#1e7e34;padding:0.2rem 0.6rem;border-radius:8px;font-size:0.7rem;font-weight:800;white-space:nowrap;">${avail} Left</span>`
            : `<span style="background:#fce8e6;color:#c5221f;padding:0.2rem 0.6rem;border-radius:8px;font-size:0.7rem;font-weight:800;white-space:nowrap;">Sold Out</span>`;

        return `
        <div class="stitch-card" style="cursor:pointer; display:flex; gap:1rem; padding:1rem; margin-bottom:1rem; align-items:center;" onclick="window.location.hash = '#hotel_detail_view?id=${p.id}'">
            <div style="position:relative; width:100px; height:100px; border-radius:16px; overflow:hidden; flex-shrink:0;">
                <img src="${p.image || ''}" alt="${p.title}" style="width:100%; height:100%; object-fit:cover; background:#f1f5f9;" onerror="this.src='https://placehold.co/400x400/e8f5e2/1a6032?text=Michu+Stays'">
                <div style="position:absolute; top:0.5rem; right:0.5rem; background:white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.2);" onclick="window.toggleFavFromSaved(event, '${p.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#d4af37" stroke="#d4af37" stroke-width="2.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
            </div>
            <div style="flex:1; min-width:0;">
                <h4 style="margin:0 0 0.2rem; font-size:1.05rem; font-weight:800; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title}</h4>
                <p style="margin:0 0 0.5rem; font-size:0.8rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:2px; margin-bottom:-2px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    ${p.address || p.location || 'Ethiopia'}
                </p>
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                    <div style="display:flex; align-items:baseline; gap:0.25rem;">
                        <span style="font-weight:800; font-size:1.1rem; color:#0F5A3F;">${currentPrice.toLocaleString()} Birr</span>
                    </div>
                    <div>${roomBadge}</div>
                </div>
            </div>
        </div>
        `;
    };

    const renderSaved = () => {
        container.innerHTML = `
            <div class="container" style="padding-top:2.5rem; padding-bottom:6rem; max-width:800px;">
                <style>
                    .stitch-header-simple {
                        background: linear-gradient(135deg, #0F5A3F 0%, #0a402d 100%);
                        border-radius: 24px;
                        padding: 2rem;
                        color: white;
                        margin-bottom: 2rem;
                        box-shadow: 0 10px 25px rgba(15, 90, 63, 0.2);
                        position: relative;
                        overflow: hidden;
                    }
                    .stitch-header-simple::after {
                        content: '';
                        position: absolute;
                        top: 0; right: 0;
                        width: 150px; height: 150px;
                        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                        transform: translate(30%, -30%);
                        pointer-events: none;
                    }
                    .stitch-card {
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                        border: 1px solid #f1f5f9;
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .stitch-card:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(0,0,0,0.06);
                    }
                    .empty-state {
                        text-align: center;
                        padding: 4rem 1.5rem;
                        background: white;
                        border-radius: 24px;
                        border: 1px dashed #cbd5e1;
                        color: #64748b;
                    }
                    .empty-state-icon {
                        width: 64px; height: 64px;
                        background: #f1f5f9;
                        border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        margin: 0 auto 1.5rem;
                        color: #94a3b8;
                    }
                </style>

                <div class="stitch-header-simple">
                    <h2 style="margin:0 0 0.5rem; font-size:1.8rem; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                        Saved Stays
                    </h2>
                    <p style="margin:0; opacity:0.85; font-size:1rem;">Your favorite spots across Ethiopia.</p>
                </div>

                <div id="saved-list-container">
                    ${savedStays.length > 0 ? savedStays.map(p => makeSavedCard(p)).join('') : `
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
                            </div>
                            <h3 style="margin:0 0 0.5rem; color:#1e293b; font-weight:800; font-size:1.2rem;">No Saved Stays</h3>
                            <p style="margin:0 0 1.5rem; font-size:0.95rem; line-height:1.5;">Tap the heart icon on any property to save it here for later.</p>
                            <button class="stitch-btn" style="background:#0F5A3F; color:white; border:none; padding:0.8rem 1.5rem; border-radius:12px; font-weight:700; cursor:pointer;" onclick="window.router.navigate('home')">Explore Stays</button>
                        </div>
                    `}
                </div>
            </div>
        `;
    };

    renderSaved();
});
