window.router.addRoute('booking', async (container, params) => {
    // Guard: must be logged in to book
    if (!window.auth?.currentUser) {
        showAlert("Please log in or sign up to make a booking.");
        window.router.navigate('login');
        return;
    }

    const propertyId = params.id;
    container.innerHTML = `<div class="container" style="text-align:center;padding-top:4rem;">Loading from Firebase...</div>`;
    const property = await window.db.getPropertyById(propertyId, true);

    if (!property) {
        container.innerHTML = `<div class="container">Property not found. <button onclick="router.navigate('home')">Back</button></div>`;
        return;
    }

    const roomTypeId = params.roomTypeId || null;
    let selectedRoom = null;
    if (roomTypeId && property.roomTypes) {
        selectedRoom = property.roomTypes.find(rt => (rt.id || `room_${property.roomTypes.indexOf(rt)}`) === roomTypeId);
    }

    // Decode multi-room selection
    let selectedRooms = [];
    try {
        if (params.selectedRooms) {
            selectedRooms = JSON.parse(decodeURIComponent(params.selectedRooms));
        }
    } catch(e) {
        if (selectedRoom) {
            selectedRooms = [{ roomId: roomTypeId, roomCount: 1, adults: 2, children: 0, roomName: selectedRoom.name }];
        }
    }
    if (selectedRooms.length === 0 && selectedRoom) {
        selectedRooms = [{ roomId: roomTypeId, roomCount: 1, adults: 2, children: 0, roomName: selectedRoom.name }];
    }

    // Aggregated totals
    const totalRoomsBooked = selectedRooms.reduce((s, r) => s + (r.roomCount || 1), 0);
    const totalAdults = selectedRooms.reduce((s, r) => s + (r.adults || 1), 0);
    const totalChildren = selectedRooms.reduce((s, r) => s + (r.children || 0), 0);
    const totalGuests = totalAdults + totalChildren;

    const currentPrice = selectedRoom ? Number(String(selectedRoom.price || 0).replace(/[^\d.-]/g, '')) : Number(String(property.price || 0).replace(/[^\d.-]/g, ''));
    let discountPercent = Number(property.discountPercent || property.discount || 0);
    let originalPrice = property.originalPrice ? Number(String(property.originalPrice).replace(/[^\d.-]/g, '')) : 0;
    
    if (discountPercent > 0 && (!originalPrice || originalPrice <= currentPrice)) {
        originalPrice = Math.round(currentPrice / (1 - (discountPercent / 100)));
    }

    const calcBase = originalPrice || currentPrice;
    const checkIn = params.checkIn || 'Not set';
    const checkOut = params.checkOut || 'Not set';
    const guests = totalGuests || params.guests || 2;

    // Robust Date calculation for mobile
    const parseDate = (dStr) => {
        if (!dStr || dStr === 'Not set') return null;
        return new Date(dStr.replace(/-/g, '/')); // Use / for better Safari/Mobile support
    };

    const dIn = parseDate(checkIn);
    const dOut = parseDate(checkOut);
    
    // Calculate nights to auto-detect package if missing from params
    let nights = params.nights ? parseInt(params.nights) : 0;
    if (!nights && dIn && dOut && !isNaN(dIn) && !isNaN(dOut)) {
        const diff = dOut - dIn;
        nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    if (nights <= 0) nights = 1;

    let amount = 0;
    let pkgInfo = params.packageInfo || null;
    let packageDiscount = 0;

    if (params.totalAmount) {
        amount = Number(params.totalAmount);
        
        // Auto-detect package match strictly for UI display without overwriting amount
        if (property && property.packages) {
            const matching = property.packages.find(p => parseInt(p.nights) === nights);
            if (matching) {
                pkgInfo = { title: matching.title, services: matching.services };
                packageDiscount = Number(matching.discount || 0);
            }
        }
    } else {
        const basePrice = selectedRoom ? Number(String(selectedRoom.price || 0).replace(/[^\d.-]/g, '')) : Number(String(property.price || 0).replace(/[^\d.-]/g, ''));
        const discPct = Number(property.discountPercent || property.discount || 0);
        let currentPricePerNight = basePrice;
        if (discPct > 0) {
            currentPricePerNight = basePrice - Math.round(basePrice * (discPct / 100));
        }
        
        let subtotal = currentPricePerNight * totalRoomsBooked * nights;
        
        if (property && property.packages) {
            const matching = property.packages.find(p => parseInt(p.nights) === nights);
            if (matching) {
                pkgInfo = { title: matching.title, services: matching.services };
                amount = subtotal - Math.round(subtotal * (Number(matching.discount || 0) / 100));
                packageDiscount = Number(matching.discount || 0);
            } else {
                amount = subtotal;
            }
        } else {
            amount = subtotal;
        }
    }

    // CHECK FOR EVENT MODE ENFORCEMENT
    if (property.eventMode && !pkgInfo) {
        container.innerHTML = `
            <div class="container" style="padding-top:6rem; text-align:center;">
                <div style="font-size:4rem;">🎉</div>
                <h2 style="color:var(--color-primary); margin-top:1rem;">Event Package Required</h2>
                <p style="color:#666; margin-bottom:2rem; max-width:500px; margin-left:auto; margin-right:auto;">This property is currently in <b>Event Mode</b>. To book during this period, you must select one of the hotel's stay packages.</p>
                <button class="btn-primary" onclick="window.history.back()" style="padding:1rem 2rem;">‹ Go Back to Packages</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="booking-polish-container" style="padding-top: 2rem;">
            <div id="step-A">
                <h1 class="booking-main-title">Secure Your Booking</h1>
                <p class="booking-main-subtitle">Review your stay details and finalize payment</p>

                <!-- Hotel Details Card -->
                <div class="booking-card">
                    <div class="booking-card-header">
                        <div>
                            <h2 class="booking-hotel-name">${property.title}</h2>
                            <p class="booking-hotel-location">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                ${property.address}
                            </p>
                        </div>
                        ${(packageDiscount > 0 || property.discountPercent || property.discount) ? `
                            <span class="booking-offer-badge">
                                ${packageDiscount > 0 ? packageDiscount : (property.discountPercent || property.discount)}% OFF
                            </span>
                        ` : `
                            <span class="booking-offer-badge" style="background:#008450;">
                                GOLDEN OFFER
                            </span>
                        `}
                    </div>

                    <!-- STAY DATES block -->
                    <div class="booking-info-block">
                        <div class="booking-info-block-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <div class="booking-info-block-content">
                            <span class="booking-info-block-label">Stay Dates</span>
                            <span class="booking-info-block-value">${checkIn} — ${checkOut}</span>
                        </div>
                    </div>

                    <!-- SELECTION block -->
                    <div class="booking-info-block">
                        <div class="booking-info-block-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2 4v16"></path>
                                <path d="M2 8h18a2 2 0 0 1 2 2v10"></path>
                                <path d="M2 17h20"></path>
                                <path d="M6 8v9"></path>
                            </svg>
                        </div>
                        <div class="booking-info-block-content">
                            <span class="booking-info-block-label">Selection</span>
                            <span class="booking-info-block-value">
                                ${selectedRooms.length > 0 ? 
                                    selectedRooms.map(r => {
                                        const rd = property.roomTypes ? property.roomTypes.find(rt => (rt.id || `room_${property.roomTypes.indexOf(rt)}`) === r.roomId) : null;
                                        const name = rd ? rd.name : (r.roomName || 'Room');
                                        return `${r.roomCount}x ${name} (${r.adults} Adult${r.adults > 1 ? 's' : ''}${r.children > 0 ? `, ${r.children} Child${r.children > 1 ? 'ren' : ''}` : ''})`;
                                    }).join('<br>') : 
                                    (selectedRoom ? `1x ${selectedRoom.name} (${selectedRoom.capacity || 2} Guests)` : '1 Room')
                                }
                            </span>
                        </div>
                    </div>

                    <!-- Package Info Accent if selected -->
                    ${pkgInfo ? `
                        <div class="booking-info-block" style="background:#FFF9E6; border: 1px solid #FFECB3; align-items: flex-start;">
                            <div class="booking-info-block-icon" style="background:#FFF3CD; color:#D4AF37; margin-top: 0.15rem;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 12 20 22 4 22 4 12"></polyline>
                                    <rect x="2" y="7" width="20" height="5"></rect>
                                    <line x1="12" y1="22" x2="12" y2="7"></line>
                                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                                </svg>
                            </div>
                            <div class="booking-info-block-content" style="flex: 1;">
                                <span class="booking-info-block-label" style="color:#856404;">Selected Offer</span>
                                <span class="booking-info-block-value" style="color:#5f4b02; display: block;">${pkgInfo.title}</span>
                                
                                <div class="offer-accordion-trigger" style="margin-top:0.4rem; font-size:0.75rem; font-weight:700; color:#856404; display:flex; align-items:center; gap:0.25rem; cursor:pointer;" onclick="window.toggleOfferAccordion(this)">
                                    <span>Read offer details</span> <span class="offer-arrow">▼</span>
                                </div>
                                <div class="offer-accordion-content" style="display:none; font-size:0.75rem; color:#666; margin-top:0.5rem; line-height:1.4;">
                                    <strong>Includes:</strong> ${pkgInfo.services}
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="booking-divider"></div>

                    <div class="booking-price-row">
                        <span class="booking-price-label">Total Amount</span>
                        <span class="booking-price-value">${amount.toLocaleString()} ETB</span>
                    </div>
                </div>

                <!-- Collapsible Payment Section Wrapper -->
                <div class="payment-section-trigger" onclick="window.togglePaymentSection(this)">
                    <h2 class="booking-section-title">Choose Payment Method</h2>
                    <span class="payment-arrow">▼</span>
                </div>

                <div id="payment-collapsible-content" style="display:none; margin-bottom: 1.5rem;">
                    <div class="payment-method-grid">
                        <div class="pay-card active" id="card-cbe" onclick="selectPay('CBE')">
                            <div class="pay-card-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 21h18"></path>
                                    <path d="M3 7v1a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V7"></path>
                                    <path d="M12 2L3 7h18z"></path>
                                    <path d="M6 11v6"></path>
                                    <path d="M10 11v6"></path>
                                    <path d="M14 11v6"></path>
                                    <path d="M18 11v6"></path>
                                </svg>
                            </div>
                            <span class="pay-card-label">CBE Bank</span>
                        </div>

                        <div class="pay-card" id="card-tele" onclick="selectPay('telebirr')">
                            <div class="pay-card-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                                </svg>
                            </div>
                            <span class="pay-card-label">telebirr</span>
                        </div>
                    </div>

                    <!-- CBE Details Conditional Box -->
                    <div id="details-cbe" class="bank-details-box">
                        <div class="bank-details-value-container">
                            <span style="font-size:0.75rem; color:var(--color-text-light); display:block;">Account Name</span>
                            <strong style="font-size:0.95rem; color:var(--color-text-dark);">${property.cbeName || 'Michu Stays Partner'}</strong>
                        </div>
                        <div class="bank-details-value-container" style="margin-bottom: 0;">
                            <span style="font-size:0.75rem; color:var(--color-text-light); display:block;">CBE Account Number</span>
                            <strong id="cbe-acc-num" style="font-size:1.15rem; color:var(--color-text-dark); letter-spacing:0.05em;">${property.cbeAccount || 'Contact Admin'}</strong>
                            <button class="bank-details-copy-btn" onclick="navigator.clipboard.writeText('${property.cbeAccount || ''}'); window.showToast('Account copied!')">Copy</button>
                        </div>
                        
                        <div class="details-accordion-trigger" onclick="window.toggleAccordion(this)">
                            <span>Read details & instructions</span>
                            <span class="accordion-arrow">▼</span>
                        </div>
                        <div class="details-accordion-content">
                            <p style="margin:0 0 0.5rem; color:#475569;">Transfer the total amount of <strong>${amount.toLocaleString()} Birr</strong> via CBE Mobile Banking to the account above.</p>
                            <p style="margin:0; color:var(--color-primary); font-weight:600;">* Please screenshot your CBE confirmation for verification.</p>
                        </div>
                    </div>

                    <!-- Telebirr Details Conditional Box -->
                    <div id="details-tele" class="bank-details-box" style="display:none; border-color:#005bb7; background:#F0F7FF;">
                        <div class="bank-details-value-container" style="border-color:#bce0fd;">
                            <span style="font-size:0.75rem; color:#005bb7; display:block;">Account Name</span>
                            <strong style="font-size:0.95rem; color:var(--color-text-dark);">${property.telebirrName || property.title}</strong>
                        </div>
                        <div class="bank-details-value-container" style="border-color:#bce0fd; margin-bottom: 0;">
                            <span style="font-size:0.75rem; color:#005bb7; display:block;">telebirr Phone Number</span>
                            <strong id="tele-phone-num" style="font-size:1.15rem; color:var(--color-text-dark); letter-spacing:0.05em;">${property.telebirrNumber || property.phone || 'N/A'}</strong>
                            <button class="bank-details-copy-btn" style="color:#005bb7;" onclick="navigator.clipboard.writeText('${property.telebirrNumber || property.phone || ''}'); window.showToast('Phone number copied!')">Copy</button>
                        </div>
                        
                        <div class="details-accordion-trigger" style="border-color:#bce0fd;" onclick="window.toggleAccordion(this)">
                            <span style="color:#005bb7;">Read details & instructions</span>
                            <span class="accordion-arrow" style="color:#005bb7;">▼</span>
                        </div>
                        <div class="details-accordion-content" style="border-color:#bce0fd; background:#F0F7FF;">
                            <p style="margin:0 0 0.5rem; color:#005bb7;">Send the total amount of <strong>${amount.toLocaleString()} Birr</strong> via telebirr to the phone number above.</p>
                            <p style="margin:0; color:#005bb7; font-weight:600;">* Please screenshot your telebirr confirmation for verification.</p>
                        </div>
                    </div>

                    <!-- Contact & Screenshot Upload Section -->
                    <div style="margin-top:1.5rem;">
                        <label style="font-family:'Plus Jakarta Sans', sans-serif; font-size:0.9rem; font-weight:700; color:var(--color-text-dark); display:block; margin-bottom:0.5rem;">Your Contact Phone (for verification)</label>
                        <input type="tel" id="guest-phone" placeholder="e.g. +251 91...." class="guest-phone-input-polished" required>
                        
                        <label style="font-family:'Plus Jakarta Sans', sans-serif; font-size:0.9rem; font-weight:700; color:var(--color-text-dark); display:block; margin-bottom:0.5rem;">Upload Proof of Payment</label>
                        <input type="file" id="proof-file" accept="image/*,.pdf" style="display:none;">
                        <div class="upload-area-polished" id="upload-btn" onclick="document.getElementById('proof-file').click()">
                            <div class="upload-area-polished-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                                </svg>
                            </div>
                            <div style="text-align: left; flex: 1;">
                                <span id="upload-text" class="upload-area-polished-text">Click to upload your CBE screenshot</span>
                                <span class="upload-area-polished-subtext">JPG, PNG or PDF (Max 5MB)</span>
                            </div>
                        </div>
                        <p id="upload-filename" style="text-align:center; color:var(--color-primary); font-weight:700; margin:0.5rem 0; font-family:'Plus Jakarta Sans', sans-serif;"></p>
                        
                        <div id="upload-progress" style="display:none; background:#e2e8f0; border-radius:99px; height:6px; margin-bottom:1.5rem; overflow:hidden;">
                            <div id="upload-bar" style="background:var(--color-primary); height:6px; border-radius:99px; width:0%; transition:width 0.3s;"></div>
                        </div>
                        
                        <button class="btn-primary-polished" id="btn-submit" disabled>
                            Submit Proof & Confirm Booking
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Polished Success screen Step C -->
            <div id="step-C" class="hidden">
                <div style="text-align:center; padding:2rem 0;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #e6f4ea, #c2e7d9); color: var(--color-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; box-shadow: 0 10px 25px rgba(11,110,79,0.15); border: 2px solid #bbf7d0;">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    
                    <h2 style="font-family:'Hanken Grotesk', sans-serif; font-weight:800; color:var(--color-text-dark); margin-bottom:0.4rem; font-size:1.85rem; letter-spacing:-0.02em;">Booking Submitted!</h2>
                    <p style="font-family:'Plus Jakarta Sans', sans-serif; color:var(--color-text-light); margin-bottom:1.75rem; font-size: 0.95rem;">
                        Your Reference Code: 
                        <span style="background: #F1F5F9; border: 1px solid #E2E8F0; padding: 0.25rem 0.75rem; border-radius: 8px; font-weight: 700; color: var(--color-text-dark); font-family: 'Hanken Grotesk', sans-serif; margin-left: 0.25rem; font-size: 1.1rem; letter-spacing: 0.03em;" id="ref-code"></span>
                    </p>
                    
                    <div style="display: flex; gap: 1rem; align-items: flex-start; max-width: 100%; margin: 0 auto 1.5rem; background: #e6f4ea; padding: 1.25rem; border-radius: 16px; border: 1px solid #bbf7d0; font-family: 'Plus Jakarta Sans', sans-serif; text-align: left;">
                        <div style="background: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--color-primary); border: 1px solid #bbf7d0;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <div style="color: #0f5132; font-size: 0.9rem; line-height: 1.5; font-weight: 500;">
                            The Hotel Manager has received your <span id="method-receipt" style="font-weight: 700;"></span> confirmation and will verify it shortly. You'll receive a confirmation email, or you can track it in your booking history.
                        </div>
                    </div>
                    
                    <div style="background: #F8FAFB; border: 1px solid var(--color-border); padding: 1.25rem; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 2rem; text-align: left;">
                        <div>
                            <strong style="color: var(--color-text-light); font-size: 0.75rem; display: block; margin-bottom: 0.25rem; text-transform: uppercase; font-family: 'Inter', sans-serif; font-weight: 700; letter-spacing: 0.05em;">Need Help?</strong>
                            <span style="font-size: 0.85rem; color: var(--color-text-dark); font-family: 'Plus Jakarta Sans', sans-serif; display: block;">Call reception for immediate assistance</span>
                        </div>
                        <a href="tel:${property.phone || ''}" style="text-decoration: none; background: white; border: 1px solid var(--color-border); color: var(--color-text-dark); padding: 0.6rem 1rem; border-radius: 12px; font-weight: 800; font-size: 1.05rem; font-family: 'Hanken Grotesk', sans-serif; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 2px 6px rgba(0,0,0,0.02); transition: all 0.2s ease;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary);">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <span>${property.phone || 'Call'}</span>
                        </a>
                    </div>
                    
                    <button class="btn-primary-polished" style="margin: 0 auto; width: auto; min-width: 200px; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;" onclick="router.navigate('home')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        <span>Return to Home</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    let selectedFile = null;
    let currentMethod = 'CBE Mobile Banking';

    window.selectPay = (method) => {
        currentMethod = method === 'CBE' ? 'CBE Mobile Banking' : 'telebirr';
        const cardCbe = document.getElementById('card-cbe');
        const cardTele = document.getElementById('card-tele');
        const detCbe = document.getElementById('details-cbe');
        const detTele = document.getElementById('details-tele');
        const uploadText = document.getElementById('upload-text');

        if (cardCbe) cardCbe.className = method === 'CBE' ? 'pay-card active' : 'pay-card';
        if (cardTele) cardTele.className = method === 'telebirr' ? 'pay-card active' : 'pay-card';
        if (detCbe) detCbe.style.display = method === 'CBE' ? 'block' : 'none';
        if (detTele) detTele.style.display = method === 'telebirr' ? 'block' : 'none';
        if (uploadText) uploadText.innerText = `Click to upload your ${method} screenshot`;
    };

    window.toggleAccordion = (triggerEl) => {
        const content = triggerEl.nextElementSibling;
        const isHidden = content.style.display === 'none' || !content.style.display;
        content.style.display = isHidden ? 'block' : 'none';
        triggerEl.style.borderRadius = isHidden ? '12px 12px 0 0' : '12px';
        const arrow = triggerEl.querySelector('.accordion-arrow');
        if (arrow) {
            arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            arrow.innerText = isHidden ? '▲' : '▼';
        }
    };

    window.toggleOfferAccordion = (triggerEl) => {
        const content = triggerEl.nextElementSibling;
        const isHidden = content.style.display === 'none' || !content.style.display;
        content.style.display = isHidden ? 'block' : 'none';
        const arrow = triggerEl.querySelector('.offer-arrow');
        if (arrow) {
            arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            arrow.innerText = isHidden ? '▲' : '▼';
        }
    };

    window.togglePaymentSection = (triggerEl) => {
        const content = document.getElementById('payment-collapsible-content');
        if (!content) return;
        const isHidden = content.style.display === 'none' || !content.style.display;
        content.style.display = isHidden ? 'block' : 'none';
        const arrow = triggerEl.querySelector('.payment-arrow');
        if (arrow) {
            arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            arrow.innerText = isHidden ? '▲' : '▼';
        }
    };

    document.getElementById('proof-file').addEventListener('change', (e) => {
        selectedFile = e.target.files[0];
        if (selectedFile) {
            document.getElementById('upload-filename').innerText = `📎 ${selectedFile.name}`;
            document.getElementById('btn-submit').removeAttribute('disabled');
        }
    });

    document.getElementById('btn-submit').addEventListener('click', async () => {
        if (!selectedFile) return;

        const code = '#MICHU-' + Math.floor(1000 + Math.random() * 9000);
        const btn = document.getElementById('btn-submit');
        btn.innerText = 'Uploading proof...';
        btn.setAttribute('disabled', true);

        try {
            const progress = document.getElementById('upload-progress');
            const bar = document.getElementById('upload-bar');

            if (progress) progress.style.display = 'block';
            if (bar) bar.style.width = '20%';

            let proofUrl = '';
            try {
                proofUrl = await window.db.uploadPaymentProof(selectedFile, code);
                if (bar) bar.style.width = '70%';
            } catch (uploadErr) {
                if (btn) {
                    btn.innerText = 'Submit Proof & Confirm Booking';
                    btn.removeAttribute('disabled');
                }
                if (progress) progress.style.display = 'none';
                showAlert(uploadErr.message);
                return;
            }

            if (bar) bar.style.width = '90%';

            const user = window.auth?.currentUser;
            const userData = window.auth?.userData;
            const guestPhone = document.getElementById('guest-phone').value.trim();
            
            await window.db.createBooking(property.id, {
                name: userData?.fullName || user?.displayName || user?.email || 'Guest',
                email: user?.email || '',
                phone: guestPhone,
                checkIn: checkIn,
                checkOut: checkOut,
                guests: guests,
                adults: totalAdults,
                children: totalChildren,
                totalRooms: totalRoomsBooked,
                totalAmount: amount,
                packageInfo: pkgInfo,
                roomTypeId: roomTypeId,
                roomTypeName: selectedRoom ? selectedRoom.name : (selectedRooms[0]?.roomName || null),
                selectedRooms: selectedRooms.length > 0 ? selectedRooms : null
            }, code, proofUrl, currentMethod);

            if (bar) bar.style.width = '100%';
            window.showToast(`📤 Proof uploaded! Manager notified.`);

            const stepA = document.getElementById('step-A');
            const stepC = document.getElementById('step-C');
            const refCode = document.getElementById('ref-code');
            const methodReceipt = document.getElementById('method-receipt');

            if (stepA) stepA.classList.add('hidden');
            if (stepC) stepC.classList.remove('hidden');
            if (refCode) refCode.innerText = code;
            if (methodReceipt) methodReceipt.innerText = currentMethod;

        } catch (err) {
            btn.innerText = 'Submit Proof & Confirm Booking';
            btn.removeAttribute('disabled');
            showAlert("Error: " + err.message);
        }
    });
});
