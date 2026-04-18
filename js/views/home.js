window.router.addRoute('home', async (container, params) => {
    container.innerHTML = `<div class="container" style="text-align:center; padding-top:4rem;"><div style="font-size:2rem; margin-bottom:1rem;">🏨</div>Loading Stays...</div>`;
    let allProperties = [];
    let allBookings = [];
    let propertyRatings = {};

    try {
        // Only fetch properties — reviews load in background, bookings not needed
        const timeout = new Promise((resolve) => setTimeout(() => resolve([]), 12000));
        allProperties = await Promise.race([
            window.db.getProperties(null, true).catch(() => []),
            timeout
        ]);
    } catch(e) { 
        console.error('Properties fetch failed:', e); 
    }

    // Reviews are loaded AFTER properties render (non-blocking)
    const loadReviewsInBackground = async () => {
        try {
            const reviewsSnap = await firestore.collection('reviews').get();
            const allReviews = reviewsSnap.docs.map(d => d.data());
            allReviews.forEach(r => {
                if (!propertyRatings[r.propertyId]) propertyRatings[r.propertyId] = { sum: 0, count: 0 };
                propertyRatings[r.propertyId].sum += (r.rating || 0);
                propertyRatings[r.propertyId].count++;
            });
            applyFilters(); // Re-render cards with ratings
        } catch(e) { console.warn('Reviews load failed:', e); }
    };

    window.router.updateSEO({
        title: 'Hotels in Dire Dawa - Book Best Stays in Ethiopia',
        description: 'Searching for hotels in Dire Dawa? Michu Stays offers premium apartments, guest houses, and hotel bookings in Dire Dawa and across Ethiopia at the best prices.'
    });

    // --- Constants ---
    const CARDS_PER_PAGE = 9;
    const ETHIOPIAN_CITIES = [
        'All Cities', 'Dire Dawa', 'Addis Ababa', 'Mekelle', 'Gondar', 'Adama (Nazret)', 'Awasa (Hawassa)', 'Bahir Dar', 'Dessie', 'Jimma', 'Jijiga', 'Shashamane', 'Arba Minch', 'Harar', 'Shire'
    ];

    let filterState = {
        city: 'All Cities',
        category: 'all',
        priceMax: 5000,
        bedrooms: 'any',
        searchQuery: window.globalSearchQuery || '',
        minRating: 0,
        page: 1,
        sortOrder: 'default',
        onlyFavorites: false,
        viewMode: 'grid' // 'grid' or 'map'
    };

    let michuMap = null;
    let mapMarkers = [];

    let favorites = JSON.parse(localStorage.getItem('michu_favorites') || '[]');

    window.toggleFav = (e, id) => {
        e.stopPropagation();
        if (favorites.includes(id)) {
            favorites = favorites.filter(fid => fid !== id);
        } else {
            favorites.push(id);
        }
        localStorage.setItem('michu_favorites', JSON.stringify(favorites));
        applyFilters(); 
    };

    // --- Render Card HTML ---
    const makeCard = (p) => {
        const rData = propertyRatings[p.id];
        const avgRating = rData ? Math.round((rData.sum / rData.count) * 10) / 10 : 0;
        const rCount = rData ? rData.count : 0;
        const starHtml = avgRating > 0 
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg> ${avgRating} <span style="color:#999;font-size:0.75rem;">(${rCount})</span>`
            : ``;
        const avail = p.availableRooms ?? p.totalRooms ?? 0;
        const roomBadge = avail > 0 
            ? `<span style="background:#e6f4ea;color:#1e7e34;padding:0.15rem 0.5rem;border-radius:6px;font-size:0.7rem;font-weight:700;">${avail} room${avail>1?'s':''} left</span>`
            : `<span style="background:#fce8e6;color:#c5221f;padding:0.15rem 0.5rem;border-radius:6px;font-size:0.7rem;font-weight:700;">Fully Booked</span>`;

        // --- ROBUST DISCOUNT DATA ---
        const currentPrice = Number(String(p.price || 0).replace(/[^\d.-]/g, ''));
        let discountPercentage = 0;
        if (p.discountPercent !== undefined && p.discountPercent !== null) {
            discountPercentage = Number(p.discountPercent) || 0;
        } else if (p.discount !== undefined && p.discount !== null) {
            discountPercentage = Number(p.discount) || 0;
        }
        
        let originalPrice = p.originalPrice ? Number(String(p.originalPrice).replace(/[^\d.-]/g, '')) : 0;
        
        // Always ensure original price is calculated correctly if discount exists
        if (discountPercentage > 0) {
            const calculatedOriginal = Math.round(currentPrice / (1 - (discountPercentage / 100)));
            if (!originalPrice || originalPrice <= currentPrice) {
                originalPrice = calculatedOriginal;
            }
        }

        let minPkgPrice = 0;
        let minPkgNights = 0;
        if (p.packages && p.packages.length > 0) {
            p.packages.forEach(pkg => {
                const n = parseInt(pkg.nights) || 1;
                const d = parseInt(pkg.discount) || 0;
                const base = (originalPrice || currentPrice) * n;
                const total = base - Math.round(base * (d / 100));
                if (minPkgPrice === 0 || total < minPkgPrice) {
                    minPkgPrice = total;
                    minPkgNights = n;
                }
            });
        }
        const effectiveRate = minPkgNights > 0 ? Math.round(minPkgPrice / minPkgNights) : 0;
            
        const isEvent = !!p.eventMode;

        const hasDiscount = discountPercentage > 0 && originalPrice > currentPrice;
        const distance = p.distanceFromCenter ? parseFloat(p.distanceFromCenter) : 0;

        return `
        <div class="property-card" style="cursor:pointer;" onclick="window.router.navigate('hotel_detail_view', { id: '${p.id}' })">
            <div class="property-image-container">
                <img src="${p.image || ''}" class="property-image" alt="${p.title}" loading="lazy" onerror="this.src='https://placehold.co/400x250/e8f5e2/1a6032?text=Michu+Stays'">
                <div class="heart-icon ${favorites.includes(p.id) ? 'active' : ''}" onclick="toggleFav(event, '${p.id}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${favorites.includes(p.id) ? '#d4af37' : 'rgba(0,0,0,0.3)'}" stroke="${favorites.includes(p.id) ? '#d4af37' : 'white'}" stroke-width="2.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </div>
                ${hasDiscount ? `<div style="position:absolute;top:0.8rem;left:0.8rem;background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:white;padding:0.3rem 0.8rem;border-radius:8px;font-size:0.8rem;font-weight:800;z-index:3;letter-spacing:0.5px;box-shadow:0 4px 12px rgba(245,158,11,0.4);border:1px solid rgba(255,255,255,0.25);">-${discountPercentage}%</div>` : ''}
            </div>
            <div class="property-info">
                <div class="property-header">
                    <div class="property-title">${p.title}</div>
                    <div class="property-rating">
                        ${starHtml}
                    </div>
                </div>
                <div class="property-address">${p.address || p.location || ''}</div>
                ${distance > 0 ? `<div style="display:flex;align-items:center;gap:0.35rem;font-size:0.8rem;color:#555;margin-bottom:0.4rem;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
                    ${distance} km from centre
                </div>` : ''}
                ${p.packages && p.packages.length > 0 ? `
                <div style="margin:0.5rem 0; display:flex;">
                    <div style="background:#0b6646; color:#e0b246; font-size:0.65rem; font-weight:900; padding:0.3rem 0.7rem; border-radius:8px; border:1px solid #c59d3f; display:inline-flex; align-items:center; gap:0.4rem; box-shadow:0 0 12px rgba(197,157,63,0.35); text-transform:uppercase; letter-spacing:0.05em; animation: pulse-glow 2.5s infinite alternate;">
                        <span style="font-size:0.8rem;">🎁</span> ${p.badgeText || 'SPECIAL OFFERS INSIDE'}
                    </div>
                </div>` : ''}
                
                <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                    <div class="property-price" style="margin-top:0.3rem;">
                        ${isEvent ? `
                            <div style="display:flex; flex-direction:column;">
                                <div style="display:flex; align-items:center; gap:0.3rem; margin-bottom:0.1rem;">
                                    <span style="font-size:0.6rem; background:#fff4e5; color:#d97706; padding:0.1rem 0.4rem; border-radius:4px; font-weight:900; text-transform:uppercase;">🎉 Event active</span>
                                </div>
                                <div style="display:flex; align-items:baseline; gap:0.25rem;">
                                    <span style="font-weight:900; font-size:1.45rem; color: #0b6646; letter-spacing:-0.03em;">${effectiveRate.toLocaleString()} Birr</span>
                                    <span style="color:#666; font-size:0.85rem; font-weight:700;">/ night</span>
                                </div>
                                <div style="font-size:0.65rem; color:#999; font-weight:600; margin-top:0.1rem;">
                                    (Total ${minPkgPrice.toLocaleString()} Birr for ${minPkgNights}-Night Package)
                                </div>
                            </div>
                        ` : (hasDiscount ? `
                            <div style="display:flex; flex-direction:column;">
                                <span style="text-decoration:line-through;color:#999;font-weight:500;font-size:0.85rem;margin-bottom:-0.2rem;">${originalPrice} Birr</span>
                                <div style="display:flex; align-items:baseline; gap:0.3rem;">
                                    <span style="font-weight:900; font-size:1.35rem; color: #f2a100; letter-spacing:-0.02em;">${currentPrice} Birr</span>
                                    <span style="color:var(--color-text-light);font-size:0.8rem;font-weight:normal">/ night</span>
                                </div>
                            </div>
                        ` : `
                            <div style="display:flex; align-items:baseline; gap:0.3rem;">
                                <span style="font-weight:900; font-size:1.35rem; color: var(--color-primary); letter-spacing:-0.02em;">${currentPrice} Birr</span>
                                <span style="color:var(--color-text-light);font-size:0.8rem;font-weight:normal">/ night</span>
                            </div>
                        `)}
                    </div>
                    <div style="text-align:right;">
                        ${roomBadge}
                    </div>
                </div>
            </div>
        </div>
    `;
    };

    const applyFilters = () => {
        // Helper to get avg rating for a property
        const getAvg = (pid) => {
            const r = propertyRatings[pid];
            return r ? Math.round((r.sum / r.count) * 10) / 10 : 0;
        };

        let filtered = allProperties.filter(p => {
            // Search query — matches hotel name, type, address, or city
            if (filterState.searchQuery) {
                const q = filterState.searchQuery.toLowerCase();
                const haystack = `${p.title} ${p.address || ''} ${p.location || ''} ${p.type || ''}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }

            // City
            if (filterState.city !== 'All Cities') {
                const searchArea = (p.address || p.location || p.title || '').toLowerCase();
                const cityTarget = filterState.city.toLowerCase().split(' ')[0];
                if (!searchArea.includes(cityTarget)) return false;
            }

            // Category
            if (filterState.category !== 'all') {
                const type = (p.type || p.title || '').toLowerCase();
                if (filterState.category === 'hotel' && !type.includes('hotel')) return false;
                if (filterState.category === 'guesthouse' && !(type.includes('guest') || type.includes('pension'))) return false;
                if (filterState.category === 'traditional' && !(type.includes('trad') || type.includes('villa'))) return false;
                if (filterState.category === 'apartment' && !type.includes('apart')) return false;
            }

            if (Number(String(p.price || 0).replace(/[^\d.-]/g, '')) > filterState.priceMax) return false;

            // Rating filter
            if (filterState.minRating > 0) {
                const avg = getAvg(p.id);
                if (avg < filterState.minRating) return false;
            }

            if (filterState.bedrooms !== 'any') {
                const rooms = parseInt(p.bedrooms || p.rooms || 1);
                if (filterState.bedrooms === '1' && rooms !== 1) return false;
                if (filterState.bedrooms === '2' && rooms !== 2) return false;
                if (filterState.bedrooms === '3+' && rooms < 3) return false;
            }

            // Only Favorites filter
            if (filterState.onlyFavorites && !favorites.includes(p.id)) return false;

            return true;
        });

        // HYBRID SORTING (Absolute Admin Override + User Sort)
        const hasUserFilters = 
            filterState.sortOrder !== 'default' || 
            filterState.city !== 'All Cities' || 
            filterState.minRating > 0 || 
            filterState.priceMax < 5000 || 
            filterState.searchQuery !== '' ||
            filterState.onlyFavorites;

        // --- Deterministic Daily Random for Non-Pinned ---
        const getDailySeed = () => {
            const d = new Date().toISOString().split('T')[0];
            let hash = 0;
            for (let i = 0; i < d.length; i++) hash = ((hash << 5) - hash) + d.charCodeAt(i);
            return hash;
        };

        const pinned = filtered.filter(f => (f.displaySequence ?? 0) > 0).sort((a,b) => a.displaySequence - b.displaySequence);
        const unpinned = filtered.filter(f => !(f.displaySequence > 0));

        // Seeded Shuffle for unpinned
        if (!hasUserFilters) {
            let seed = getDailySeed();
            for (let i = unpinned.length - 1; i > 0; i--) {
                const r = Math.abs(Math.sin(seed++) * 10000) % 1;
                const j = Math.floor(r * (i + 1));
                [unpinned[i], unpinned[j]] = [unpinned[j], unpinned[i]];
            }
            filtered = [...pinned, ...unpinned];
        } else {
            // Apply User Sort
            filtered.sort((a, b) => {
                if (filterState.sortOrder === 'price-asc') return Number(String(a.price||0).replace(/[^\d.-]/g, '')) - Number(String(b.price||0).replace(/[^\d.-]/g, ''));
                if (filterState.sortOrder === 'price-desc') return Number(String(b.price||0).replace(/[^\d.-]/g, '')) - Number(String(a.price||0).replace(/[^\d.-]/g, ''));
                if (filterState.sortOrder === 'name-asc') return a.title.localeCompare(b.title);
                if (filterState.sortOrder === 'name-desc') return b.title.localeCompare(a.title);
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
        }

        const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE));
        if (filterState.page > totalPages) filterState.page = totalPages;
        const start = (filterState.page - 1) * CARDS_PER_PAGE;
        const pageItems = filtered.slice(start, start + CARDS_PER_PAGE);

        const grid = document.getElementById('property-grid');
        const pagination = document.getElementById('pagination');
        const mapContainer = document.getElementById('map-view-container');

        if (filterState.viewMode === 'map') {
            if (grid) grid.style.display = 'none';
            if (pagination) pagination.style.display = 'none';
            if (mapContainer) {
                mapContainer.style.display = 'block';
                renderMap(filtered);
            }
        } else {
            if (grid) {
                grid.style.display = 'grid';
                grid.innerHTML = filtered.length > 0
                    ? pageItems.map(makeCard).join('')
                    : `<div style="padding:4rem; text-align:center; color:var(--color-text-light); grid-column:1/-1;">
                        <p style="font-size:3.5rem; margin-bottom:1.5rem;">🔎</p>
                        <h3 style="margin-bottom:0.5rem; color:#1a1a1a;">0 stays found</h3>
                        <p style="margin-bottom:1.5rem; font-size:0.95rem;">Try adjusting your filters or clearing them to see more options.</p>
                        <button class="btn-primary" onclick="window.clearAllFilters()" style="padding:0.7rem 1.5rem; border-radius:99px;">Clear All Filters</button>
                       </div>`;
            }
            if (pagination) {
                pagination.style.display = filtered.length > CARDS_PER_PAGE ? 'flex' : 'none';
                renderPagination(totalPages);
            }
            if (mapContainer) mapContainer.style.display = 'none';
        }

        const countEl = document.getElementById('results-count');
        if (countEl) {
            countEl.textContent = filtered.length > 0 ? `Showing ${filtered.length} stays in ${filterState.city}` : `0 stays found`;
        }
    };

    const renderPagination = (totalPages) => {
        const paginationEl = document.getElementById('pagination');
        if (!paginationEl || totalPages <= 1) {
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        let html = `<div class="page-item ${filterState.page === 1 ? 'disabled' : ''}" onclick="goToPage(${filterState.page - 1})">‹</div>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<div class="page-item ${i === filterState.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</div>`;
        }
        html += `<div class="page-item ${filterState.page === totalPages ? 'disabled' : ''}" onclick="goToPage(${filterState.page + 1})">›</div>`;
        paginationEl.innerHTML = html;
    };

    const maxPriceFromProps = allProperties.length > 0 ? Math.max(...allProperties.map(p => Number(String(p.price||0).replace(/[^\d.-]/g, '')) || 0)) : 5000;
    const maxPrice = Math.max(maxPriceFromProps, 5000);
    filterState.priceMax = maxPrice;

    // --- Render Page Shell ---
    container.innerHTML = `
        <!-- Minimal Search Bar Just Below Header -->
        <div id="home-search-wrapper" style="display:flex; justify-content:center; background:white; padding:0.6rem 0.75rem; border-bottom:1px solid #f0f0f0; position:relative; z-index:20; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
            <div class="home-search-bar-inline" style="max-width:500px; width:100%; height:48px; border:1.5px solid #eaeaea; padding:0 0.4rem; display:flex; align-items:center; border-radius:99px; background:#ffffff; box-sizing:border-box; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                <div style="padding:0 0.6rem; display:flex; align-items:center; flex-shrink:0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </div>
                <div style="flex:1; min-width:0; display:flex; align-items:center;">
                    <input id="home-search-input" type="text" placeholder="Where are you going?" style="border:none; height:100%; outline:none; background:transparent; width:100%; font-size:0.95rem; font-weight:600; color:#333;" value="${filterState.searchQuery}" onkeydown="if(event.key==='Enter') window.updateHomeSearch(this.value)">
                </div>
                <button class="btn-primary" style="flex-shrink:0; border-radius:99px; padding:0 1.2rem; height:36px; font-size:0.82rem; font-weight:800; display:flex; align-items:center; justify-content:center; border:0; box-shadow:0 2px 8px rgba(26,96,50,0.2); white-space:nowrap; width:auto;" onclick="window.updateHomeSearch(document.getElementById('home-search-input').value)">Search</button>
            </div>
        </div>

        <section class="hero-section">
            <div class="hero-overlay"></div>
            <div class="hero-content">
                <h1 class="hero-title">Experience the Spirit of <br><span style="color:var(--color-secondary); font-weight: 800; border-bottom: 3px solid var(--color-secondary);">Dire Dawa</span></h1>
                <p class="hero-subtitle">Premium stays in Ethiopia's iconic railway gateway.</p>
            </div>
        </section>

        <div class="container" style="position:relative; z-index:10; margin-top:-2rem;">
            <!-- Categories -->
            <div class="category-filters" style="margin-top:3rem; padding-bottom:1.5rem; border:none; gap:1.2rem;">
                <div class="category-item active" id="cat-all" onclick="setCat('all')">
                    <svg class="category-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                    </svg>
                    <span>All Stays</span>
                </div>
                <div class="category-item" id="cat-hotel" onclick="setCat('hotel')">
                    <svg class="category-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 19h10V5H7v14zm3-8h4v2h-4v-2zm0-4h4v2h-4V7zm0 8h4v2h-4v-2zM3 19h2V7H3v12zM19 19h2V7h-2v12z"/>
                    </svg>
                    <span>Hotels</span>
                </div>
                <div class="category-item" id="cat-guesthouse" onclick="setCat('guesthouse')">
                    <svg class="category-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17 11V3H7v4H3v14h7v-4h4v4h7V11h-4zM7 9h2v2H7V9zm0 4h2v2H7v-2zm10 6h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2z"/>
                    </svg>
                    <span>Guesthouses</span>
                </div>
                <div class="category-item" id="cat-apartment" onclick="setCat('apartment')">
                    <svg class="category-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8V9h8v10zm-2-8h-4v2h4v-2zm0 4h-4v2h4v-2z"/>
                    </svg>
                    <span>Apartments</span>
                </div>
                <div class="category-item" id="cat-traditional" onclick="setCat('traditional')">
                    <svg class="category-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.5l6 4.5v9h-3v-6h-6v6h-3v-9l6-4.5z"/>
                        <circle cx="12" cy="14" r="2"/>
                    </svg>
                    <span>Trad. Homes</span>
                </div>
            </div>

            <!-- Main Layout with Sidebar -->
            <div class="main-layout" style="margin-top:2rem;">
                <!-- Filter Toggle for Mobile -->
                <button class="filter-mobile-toggle" onclick="document.querySelector('.filters-sidebar').classList.toggle('active')" style="display:none; width:100%; padding:1rem; background:white; border:1px solid #eee; border-radius:12px; margin-bottom:1rem; font-weight:700; align-items:center; justify-content:center; gap:0.5rem;">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 4h18M6 10h12M9 16h6"></path></svg>
                    <span>Filter Stays</span>
                </button>

                <!-- Filters Sidebar -->
                <div class="filters-sidebar">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                         <label style="font-weight:800; font-size:0.7rem; color:#999; text-transform:uppercase; letter-spacing:0.5px; margin:0;">Location & Filters</label>
                         <span onclick="window.clearAllFilters()" style="font-size:0.75rem; color:var(--color-primary); cursor:pointer; font-weight:700;">Clear All</span>
                    </div>
                    <div class="filter-section" style="margin-bottom:2rem;">
                        <label style="display:block; font-weight:800; font-size:0.7rem; color:#999; margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.5px;">City / Location</label>
                        <select id="city-filter" style="width:100%; border:1.5px solid #f0f0f0; background:#f9f9f9; padding:0.8rem; border-radius:12px; outline:none; font-weight:600; font-family:inherit;">
                            ${ETHIOPIAN_CITIES.map(c => `<option value="${c}" ${c === filterState.city ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>

                    <div class="filter-section" style="margin-bottom:2rem;">
                        <label style="display:block; font-weight:800; font-size:0.7rem; color:#999; margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.5px;">Price: <span id="price-display" style="color:var(--color-primary);">${filterState.priceMax.toLocaleString()}</span> Birr</label>
                        <input type="range" id="price-slider" class="price-range-slider" min="100" max="${maxPrice}" value="${filterState.priceMax}" step="100" style="width:100%;">
                        <div style="display:flex; justify-content:space-between; margin-top:0.5rem; font-size:0.75rem; color:#888; font-weight:600;"><span>100</span><span>${maxPrice.toLocaleString()}</span></div>
                    </div>

                    <div class="filter-section" style="margin-bottom:2rem;">
                        <label style="display:block; font-weight:800; font-size:0.7rem; color:#999; margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.5px;">Minimum Rating</label>
                        <div id="rating-filter" style="display:flex; gap:0.4rem; flex-wrap:wrap;"></div>
                    </div>

                    <div class="filter-section" style="margin-bottom:2rem;">
                         <label style="display:block; font-weight:800; font-size:0.7rem; color:#999; margin-bottom:1rem; text-transform:uppercase; letter-spacing:0.5px;">Shortcuts</label>
                         <div style="display:grid; gap:0.8rem;">
                            <button id="show-all-houses" style="width:100%; text-align:left; padding:0.7rem 1rem; border-radius:12px; font-weight:700; font-size:0.85rem; border:none; cursor:pointer; background:${!filterState.onlyFavorites ? 'var(--color-primary)' : '#f9f9f9'}; color:${!filterState.onlyFavorites ? 'white' : '#666'};" onclick="toggleHouseFav(false)">🏠 All Stays</button>
                            <button id="show-fav-houses" style="width:100%; text-align:left; padding:0.7rem 1rem; border-radius:12px; font-weight:700; font-size:0.85rem; border:none; cursor:pointer; background:${filterState.onlyFavorites ? '#d4af37' : '#f9f9f9'}; color:${filterState.onlyFavorites ? 'white' : '#666'};" onclick="toggleHouseFav(true)">💛 Favorites</button>
                         </div>
                    </div>

                    <button class="btn-outline" style="width:100%; border-radius:12px; padding:0.8rem; font-weight:700; font-size:0.8rem;" onclick="resetFilters()">↺ Reset All Filters</button>
                </div>

                <!-- Main Content Area -->
                <div style="min-width:0;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:2rem;">
                         <div>
                            <h3 id="results-count" style="font-size:1.6rem; font-weight:900; margin:0; letter-spacing:-1px;">Exploring Ethiopian Stays</h3>
                            <div style="display:flex; gap:0.6rem; margin-top:0.6rem;">
                                <button id="toggle-list" class="active" onclick="window.setViewMode('grid')" style="display:flex; align-items:center; gap:0.4rem; padding:0.5rem 1rem; border-radius:30px; border:1px solid #ddd; background:white; cursor:pointer; font-weight:700; font-size:0.8rem; height:36px; transition:all 0.2s;">
                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/></svg>
                                    Grid View
                                </button>
                                <button id="toggle-map" onclick="window.setViewMode('map')" style="display:flex; align-items:center; gap:0.4rem; padding:0.5rem 1rem; border-radius:30px; border:1px solid #ddd; background:white; cursor:pointer; font-weight:700; font-size:0.8rem; height:36px; transition:all 0.2s;">
                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
                                    Map View
                                </button>
                            </div>
                         </div>
                         <select id="user-sort-dropdown" onchange="window.updateSort(this.value)" style="padding:0.6rem 1rem; border-radius:12px; border:1.5px solid #f0f0f0; background:white; font-size:0.85rem; font-weight:700; outline:none; text-transform:uppercase;">
                            <option value="default" ${filterState.sortOrder === 'default' ? 'selected' : ''}>Latest Added</option>
                            <option value="price-asc" ${filterState.sortOrder === 'price-asc' ? 'selected' : ''}>Price: Low to High</option>
                            <option value="price-desc" ${filterState.sortOrder === 'price-desc' ? 'selected' : ''}>Price: High to Low</option>
                            <option value="name-asc" ${filterState.sortOrder === 'name-asc' ? 'selected' : ''}>Name: A - Z</option>
                         </select>
                    </div>

                    <div class="property-grid" id="property-grid"></div>
                    <div id="map-view-container" style="display:none; width:100%; height:800px; border-radius:24px; overflow:hidden; border:1px solid #eee; margin-bottom:4rem; box-shadow:0 8px 32px rgba(0,0,0,0.05);">
                        <div id="home-map" style="width:100%; height:100%;"></div>
                    </div>
                    <div class="pagination" id="pagination" style="margin-top:4rem;"></div>

                    <style>
                        #toggle-list.active, #toggle-map.active { background: var(--color-primary) !important; color: white !important; border-color: var(--color-primary) !important; box-shadow: 0 4px 12px rgba(26,96,50,0.2); }
                        .custom-map-marker { transition: transform 0.2s cubic-bezier(.34,1.56,.64,1); }
                        .custom-map-marker:hover { transform: scale(1.1); z-index: 1000 !important; }
                        .leaflet-popup-content-wrapper { border-radius: 16px; padding: 0; overflow: hidden; box-shadow: 0 12px 32px rgba(0,0,0,0.15); }
                        .leaflet-popup-content { margin: 0; }
                        .leaflet-popup-tip-container { display: none; }

                        @keyframes pulse-glow {
                            from { box-shadow: 0 0 8px rgba(197,157,63,0.3); transform: scale(1); }
                            to { box-shadow: 0 0 16px rgba(197,157,63,0.6); transform: scale(1.02); }
                        }
                    </style>

                    <!-- DYNAMIC DISCOVERY SECTIONS (Below main grid) -->
                    ${(() => {
                        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                        
                        // --- Trendy Stays: Based on number of bookings (NOW PUBLICLY READABLE) ---
                        const bookingCounts = {};
                        (allBookings || []).forEach(b => {
                            bookingCounts[b.propertyId] = (bookingCounts[b.propertyId] || 0) + 1;
                        });

                        const recentBookingCounts = {};
                        (allBookings || []).filter(b => {
                            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                            return bTime > oneWeekAgo;
                        }).forEach(b => {
                            recentBookingCounts[b.propertyId] = (recentBookingCounts[b.propertyId] || 0) + 1;
                        });

                        // Sort by recent first, then total as secondary
                        const trendyStays = allProperties
                            .filter(p => bookingCounts[p.id] > 0)
                            .sort((a,b) => {
                                const rA = recentBookingCounts[a.id] || 0;
                                const rB = recentBookingCounts[b.id] || 0;
                                if (rB !== rA) return rB - rA;
                                return bookingCounts[b.id] - bookingCounts[a.id];
                            })
                            .slice(0, 3);

                        // If no bookings yet, use high ratings or newest
                        const finalTrendy = trendyStays.length > 0 ? trendyStays : allProperties.slice(0, 3);

                        // --- New on Michu: properties added recently ---
                        const newHotels = allProperties
                            .filter(p => !p.createdAt || p.createdAt > oneWeekAgo || allProperties.length < 5)
                            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                            .slice(0, 3);

                        let sectionsHtml = '';

                        if (finalTrendy.length > 0) {
                            const hasActiveBookings = trendyStays.length > 0;
                            sectionsHtml += `
                            <div style="margin-top:4rem;">
                                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:2rem;">
                                    <div>
                                        <h2 style="font-size:2rem; font-weight:900; margin:0; letter-spacing:-1px;">📈 Trendy Stays</h2>
                                        <p style="color:#666; margin-top:0.4rem; font-size:1rem;">${hasActiveBookings ? 'Most booked properties in Dire Dawa this week.' : 'Handpicked favorites gaining popularity.'}</p>
                                    </div>
                                    <div style="background:#fff4e5; color:#b45309; padding:0.4rem 0.8rem; border-radius:10px; font-weight:800; font-size:0.75rem;">Hot Pick</div>
                                </div>
                                <div class="property-grid">
                                    ${finalTrendy.map(p => makeCard(p)).join('')}
                                </div>
                            </div>`;
                        }

                        if (newHotels.length > 0) {
                            sectionsHtml += `
                            <div style="margin-top:4rem;">
                                <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:2rem;">
                                    <div>
                                        <h2 style="font-size:2rem; font-weight:900; margin:0; letter-spacing:-1px;">✨ New on Michu Stays</h2>
                                        <p style="color:#666; margin-top:0.4rem; font-size:1rem;">Discover the newest additions to our collection.</p>
                                    </div>
                                    <div style="background:#e6f4ea; color:#1e7e34; padding:0.4rem 0.8rem; border-radius:10px; font-weight:800; font-size:0.75rem;">Just Arrived</div>
                                </div>
                                <div class="property-grid">
                                    ${newHotels.map(p => makeCard(p)).join('')}
                                </div>
                            </div>`;
                        }
                        return sectionsHtml;
                    })()}

                    <!-- Cinematic Entertainment News Slider (Now Below Trendy Stays) -->
                    <div style="margin-top:6rem; position:relative;">
                        <h3 style="font-size:1.8rem; font-weight:900; margin-bottom:1.5rem; display:flex; align-items:center; gap:0.6rem; letter-spacing:-0.5px;">
                            <span style="background:linear-gradient(135deg, var(--color-primary), #2d8a5e); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">✨ News & Entertainment</span>
                        </h3>
                        
                        <div class="news-slider-wrapper">
                            <div class="news-slider" id="home-news-slider">
                                ${(() => {
                                    const items = [
                                        { card: 'TRADITION', title: 'Netsanet Workneh: A Legacy That Lives On', excerpt: 'Celebrating the life and career of a legend who shaped the sound of a generation.', img: 'images/news_1.png' },
                                        { card: 'FESTIVAL', title: 'Unity in Rhythm: Shashamane Reggae 2026', excerpt: 'A soulful gathering of music and culture as Ethiopia celebrates its deep-rooted Rastafarian heritage.', img: 'images/news_2.png' },
                                        { card: 'CREATIVE', title: 'Kezira Hub: The Future of Dire Dawa Art', excerpt: 'Step inside the new historic-meets-modern creative district turning heads across the Horn of Africa.', img: 'images/news_3.png' },
                                        { card: 'LIFESTYLE', title: 'A Taste of Dire: Street Food Festival', excerpt: 'From aromatic coffee to the perfect Basha bread—discover the flavors of Ethiopia\'s crossroad city.', img: 'images/news_4.png' }
                                    ];
                                    return items.map((n, i) => `
                                        <div class="news-slide" style="flex: 0 0 100%;">
                                            <img src="${n.img}" class="news-image" alt="${n.title}">
                                            <div class="news-overlay"></div>
                                            <div class="news-content-box">
                                                <span class="news-badge">${n.card}</span>
                                                <h4 class="news-title">${n.title}</h4>
                                                <p class="news-excerpt">${n.excerpt}</p>
                                                <button class="btn-primary" style="padding:0.7rem 1.5rem; font-size:0.85rem; border-radius:99px;" onclick="window.showToast('Full story coming soon!')">Read Full Story</button>
                                            </div>
                                        </div>
                                    `).join('');
                                })()}
                            </div>

                            <button class="news-control prev" onclick="window.slideNews(-1)">❮</button>
                            <button class="news-control next" onclick="window.slideNews(1)">❯</button>
                            
                            <div class="news-nav" id="news-dots">
                                <span class="nav-dot active" onclick="window.goToSlide(0)"></span>
                                <span class="nav-dot" onclick="window.goToSlide(1)"></span>
                                <span class="nav-dot" onclick="window.goToSlide(2)"></span>
                                <span class="nav-dot" onclick="window.goToSlide(3)"></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Guest Reviews Section (Moved from Footer) -->
            <div class="footer-testimonials" style="margin-top:6rem; background:rgba(255,255,255,0.05); border-radius:32px; padding:4rem 2rem; border:1px solid rgba(0,0,0,0.05); position:relative; overflow:hidden;">
                <div style="position:absolute; top:-2rem; right:-2rem; font-size:10rem; color:rgba(0,0,0,0.02); pointer-events:none;">"</div>
                <h3 style="font-size:2.4rem; font-weight:900; margin-bottom:3rem; text-align:center; letter-spacing:-1px;">⭐ Real Stories from our Stays</h3>
                <div class="testimonials-grid">
                    <div class="testimonial-card">
                        <div class="testimonial-stars">★★★★★</div>
                        <p>Michu Stays made finding a comfortable room in Dire Dawa so easy. The booking was confirmed instantly and everything was just as described. I will definitely be coming back!</p>
                        <div class="testimonial-author">
                            <div class="testimonial-avatar" style="background: linear-gradient(135deg, #1a6032, #2d8a4e);">HA</div>
                            <div class="testimonial-author-info">
                                <strong>Helina Alemayehu</strong>
                                <span>Dire Dawa · Hotel Stay</span>
                            </div>
                        </div>
                    </div>
                    <div class="testimonial-card">
                        <div class="testimonial-stars">★★★★★</div>
                        <p>Excellent platform! I booked an apartment for my business trip and the process was seamless. The payment options are very convenient — used TeleBirr and it worked perfectly.</p>
                        <div class="testimonial-author">
                            <div class="testimonial-avatar" style="background: linear-gradient(135deg, #d97706, #f59e0b);">BT</div>
                            <div class="testimonial-author-info">
                                <strong>Biruk Tesfaye</strong>
                                <span>Addis Ababa · Business Trip</span>
                            </div>
                        </div>
                    </div>
                    <div class="testimonial-card">
                        <div class="testimonial-stars">★★★★☆</div>
                        <p>Great service and very responsive support team. The guesthouse I booked was clean and affordable. I appreciate that the platform is built specifically for Ethiopian travelers.</p>
                        <div class="testimonial-author">
                            <div class="testimonial-avatar" style="background: linear-gradient(135deg, #4b5563, #6b7280);">SM</div>
                            <div class="testimonial-author-info">
                                <strong>Selamawit Mekonen</strong>
                                <span>Harar · Guesthouse</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    applyFilters();

    // Render star rating filter
    const renderRatingFilter = () => {
        const container = document.getElementById('rating-filter');
        if (!container) return;
        let html = `<span onclick="window.setMinRating(0)" style="padding:0.3rem 0.6rem; border-radius:8px; font-size:0.8rem; cursor:pointer; font-weight:600; ${filterState.minRating === 0 ? 'background:var(--color-primary);color:white;' : 'background:#f4f4f4;color:#666;'}">Any</span>`;
        for (let s = 1; s <= 5; s++) {
            html += `<span onclick="window.setMinRating(${s})" style="padding:0.3rem 0.5rem; border-radius:8px; font-size:0.85rem; cursor:pointer; ${filterState.minRating === s ? 'background:#f59e0b;color:white;' : 'background:#f4f4f4;color:#666;'}">${s}★</span>`;
        }
        container.innerHTML = html;
    };
    renderRatingFilter();

    window.setMinRating = (n) => {
        filterState.minRating = n;
        filterState.page = 1;
        renderRatingFilter();
        applyFilters();
    };

    window.updateSearch = () => {
        const whereVal = document.getElementById('search-where').value.trim();
        filterState.searchQuery = whereVal;
        filterState.page = 1;
        // Also try to match a city
        const matched = ETHIOPIAN_CITIES.find(c => whereVal.toLowerCase().includes(c.toLowerCase().split(' ')[0]) && c !== 'All Cities');
        if (matched) {
            filterState.city = matched;
            document.getElementById('city-filter').value = matched;
        } else {
            filterState.city = 'All Cities';
            document.getElementById('city-filter').value = 'All Cities';
        }
        applyFilters();
    };

    window.clearAllFilters = () => {
        filterState = {
            ...filterState,
            city: 'All Cities',
            category: 'all',
            priceMax: maxPrice,
            bedrooms: 'any',
            searchQuery: '',
            minRating: 0,
            page: 1,
            onlyFavorites: false
        };
        const cityEl = document.getElementById('city-filter');
        const typeEl = document.getElementById('type-filter');
        const bedEl = document.getElementById('bedrooms-filter');
        const searchEl = document.getElementById('search-where');
        if (cityEl) cityEl.value = 'All Cities';
        if (typeEl) typeEl.value = 'all';
        if (bedEl) bedEl.value = 'any';
        if (searchEl) searchEl.value = '';
        renderRatingFilter();
        const catAll = document.getElementById('cat-all');
        if (catAll) catAll.click();
        applyFilters();
    };

    document.getElementById('city-filter').addEventListener('change', (e) => {
        filterState.city = e.target.value; filterState.page = 1; applyFilters();
    });

    window.toggleHouseFav = (val) => {
        filterState.onlyFavorites = val;
        filterState.page = 1;
        applyFilters();
    };

    window.setCat = (cat) => {
        filterState.category = cat; filterState.page = 1;
        document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
        document.getElementById(`cat-${cat}`).classList.add('active');
        applyFilters();
    };

    // Connect global search query updating
    window.updateHomeSearch = (query) => {
        filterState.searchQuery = query || window.globalSearchQuery || '';
        filterState.page = 1;
        applyFilters();
    };

    window.updateSort = (val) => {
        filterState.sortOrder = val;
        filterState.page = 1;
        applyFilters();
    };

    const slider = document.getElementById('price-slider');
    const display = document.getElementById('price-display');
    slider.oninput = () => {
        filterState.priceMax = parseInt(slider.value); display.textContent = `${filterState.priceMax.toLocaleString()} Birr${filterState.priceMax>=maxPrice?'+':''}`;
        applyFilters();
    };

    window.goToPage = (page) => {
        filterState.page = page; applyFilters();
        document.getElementById('property-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.resetFilters = () => {
        filterState = { city: 'All Cities', category: 'all', priceMax: maxPrice, entirePlace: true, privateRoom: true, bedrooms: 'any', searchQuery: '', minRating: 0, page: 1, sortOrder: 'default' };
        document.getElementById('city-filter').value = 'All Cities';
        document.getElementById('search-where').value = '';
        const sortDropdown = document.getElementById('user-sort-dropdown');
        if (sortDropdown) sortDropdown.value = 'default';
        document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
        document.getElementById('cat-all').classList.add('active');
        slider.value = maxPrice; display.textContent = `${maxPrice.toLocaleString()}+ Birr`;
        renderRatingFilter();
        applyFilters();
    };

    window.setViewMode = (mode) => {
        filterState.viewMode = mode;
        document.getElementById('toggle-list')?.classList.toggle('active', mode === 'grid');
        document.getElementById('toggle-map')?.classList.toggle('active', mode === 'map');
        applyFilters();
    };

    const renderMap = (properties) => {
        if (!michuMap) {
            michuMap = L.map('home-map').setView([9.5931, 41.8661], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(michuMap);
        }

        // Clear existing markers
        mapMarkers.forEach(m => michuMap.removeLayer(m));
        mapMarkers = [];

        const bounds = [];
        properties.forEach(p => {
            // Seeded random coordinates for demo if missing
            if (!p.lat || !p.lng) {
                const seed = p.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const rLat = Math.abs(Math.sin(seed) * 0.05);
                const rLng = Math.abs(Math.cos(seed) * 0.05);
                p.lat = 9.57 + rLat;
                p.lng = 41.84 + rLng;
            }

            const customIcon = L.divIcon({
                className: 'custom-map-marker',
                html: `<div style="background:white; border:2px solid var(--color-primary); padding:4px 10px; border-radius:30px; font-weight:800; font-size:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15); display:inline-block; white-space:nowrap;">${p.price.toLocaleString()} ETB</div>`,
                iconSize: [80, 30],
                iconAnchor: [40, 30]
            });

            const marker = L.marker([p.lat, p.lng], { icon: customIcon })
                .bindPopup(`
                    <div style="width:200px; cursor:pointer;" onclick="window.router.navigate('hotel_detail_view', { id: '${p.id}' })">
                        <img src="${p.image}" style="width:100%; height:100px; object-fit:cover; border-radius:8px; margin-bottom:8px;" onerror="this.src='https://placehold.co/200x100?text=Property'">
                        <div style="font-weight:800; font-size:14px; margin-bottom:4px;">${p.title}</div>
                        <div style="color:#666; font-size:12px; margin-bottom:8px;">${p.address || ''}</div>
                        <div style="font-weight:900; color:var(--color-primary);">${p.price.toLocaleString()} Birr</div>
                    </div>
                `)
                .addTo(michuMap);
            
            mapMarkers.push(marker);
            bounds.push([p.lat, p.lng]);
        });

        if (bounds.length > 0) {
            michuMap.fitBounds(bounds, { padding: [50, 50] });
        }
    };

    renderRatingFilter();
    applyFilters();

    // Load reviews in background (non-blocking) — ratings appear after cards
    loadReviewsInBackground();

    // --- News Slider Controller ---
    let currentSlide = 0;
    const totalSlides = 4;
    const sliderEl = document.getElementById('home-news-slider');
    const dots = document.querySelectorAll('.nav-dot');

    window.slideNews = (dir) => {
        currentSlide = (currentSlide + dir + totalSlides) % totalSlides;
        window.updateSlider();
    };

    window.goToSlide = (n) => {
        currentSlide = n;
        window.updateSlider();
    };

    window.updateSlider = () => {
        if(!sliderEl) return;
        sliderEl.style.transform = `translateX(-${currentSlide * 100}%)`;
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === currentSlide);
        });
    };

    let slideInterval = setInterval(() => window.slideNews(1), 5000);
    // Pause on hover
    document.querySelector('.news-slider-wrapper')?.addEventListener('mouseenter', () => clearInterval(slideInterval));
    document.querySelector('.news-slider-wrapper')?.addEventListener('mouseleave', () => {
        clearInterval(slideInterval);
        slideInterval = setInterval(() => window.slideNews(1), 5000);
    });
});
