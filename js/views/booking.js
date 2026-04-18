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

    const currentPrice = Number(String(property.price || 0).replace(/[^\d.-]/g, ''));
    let discountPercent = Number(property.discountPercent || property.discount || 0);
    let originalPrice = property.originalPrice ? Number(String(property.originalPrice).replace(/[^\d.-]/g, '')) : 0;
    
    if (discountPercent > 0 && (!originalPrice || originalPrice <= currentPrice)) {
        originalPrice = Math.round(currentPrice / (1 - (discountPercent / 100)));
    }

    const calcBase = originalPrice || currentPrice;
    const checkIn = params.checkIn || 'Not set';
    const checkOut = params.checkOut || 'Not set';
    const guests = params.guests || 2;

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
    if (params.totalAmount) {
        amount = Number(params.totalAmount);
    } else {
        const base = calcBase * nights;
        const discountToApply = discountPercent || 0;
        amount = base - Math.round(base * (discountToApply / 100));
    }

    let pkgInfo = params.packageInfo || null;

    // Auto-detect package match if not passed explicitly (e.g. page refresh)
    if (property && property.packages) {
        const matching = property.packages.find(p => parseInt(p.nights) === nights);
        if (matching) {
            pkgInfo = { title: matching.title, services: matching.services };
            const pBase = calcBase * nights;
            amount = pBase - Math.round(pBase * (matching.discount / 100));
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
        <div class="container" style="padding-top:4rem; padding-bottom:2rem;">
            <div class="stepper-container">
                <div class="stepper-header">Secure Your Booking</div>
                <div style="text-align:center;margin-bottom:2rem;">
                    <h3>${property.title}</h3>
                    <p style="color:var(--color-text-light)">${property.address}</p>
                    <div style="margin-top:0.8rem; font-size:0.95rem; color:var(--color-primary); font-weight:700; background:#f0f7ff; display:inline-block; padding:0.6rem 1.2rem; border-radius:12px; border:1px solid #c9e2ff;">
                        📅 ${checkIn} to ${checkOut}
                    </div>
                    ${pkgInfo ? `
                        <div style="margin-top:1rem; background:#fff9e6; border:1px solid #ffecb3; padding:0.8rem; border-radius:12px; max-width:400px; margin-left:auto; margin-right:auto;">
                            <div style="font-weight:800; color:#856404; font-size:0.7rem; text-transform:uppercase;">Selected Offer</div>
                            <div style="font-weight:700; color:#333;">🎁 ${pkgInfo.title}</div>
                            <div style="font-size:0.75rem; color:#666; margin-top:0.2rem;">Includes: ${pkgInfo.services}</div>
                        </div>
                    ` : ''}
                </div>

                <div id="step-A">
                    <!-- ... payment selector ... -->
                    <!-- Payment Method Selector -->
                    <div style="margin-bottom:2rem;">
                        <p style="font-weight:700; margin-bottom:1rem; color:var(--color-text-dark);">Choose your preferred payment method:</p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                            <label class="payment-option" style="cursor:pointer;">
                                <input type="radio" name="payMethod" value="CBE" checked style="display:none;">
                                <div class="pay-card active" id="card-cbe" onclick="selectPay('CBE')">
                                    <span style="font-size:1.5rem; margin-bottom:0.5rem;">🏦</span>
                                    <span style="font-weight:600;">CBE Bank</span>
                                </div>
                            </label>
                            <label class="payment-option" style="cursor:pointer;">
                                <input type="radio" name="payMethod" value="telebirr" style="display:none;">
                                <div class="pay-card" id="card-tele" onclick="selectPay('telebirr')">
                                    <span style="font-size:1.5rem; margin-bottom:0.5rem;">📱</span>
                                    <span style="font-weight:600;">telebirr</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- CBE Details (Conditional) -->
                    <div id="details-cbe" class="bank-details-box">
                        <p style="font-size:1.1rem;margin-bottom:1rem;">Transfer <strong>${amount.toLocaleString()} Birr</strong> via CBE Mobile Banking to:</p>
                        <div style="background:white;padding:1rem;border-radius:4px;margin-bottom:1rem;border:1px solid var(--color-border)">
                            <strong>CBE Account:</strong> ${property.cbeAccount || 'Contact Admin'}<br>
                            <strong>Account Name:</strong> ${property.cbeName || 'Michu Stays Partner'}
                        </div>
                        <p style="font-size:0.8rem; margin-top:0.5rem; color:var(--color-primary);">* Please screenshot your CBE confirmation.</p>
                    </div>

                    <!-- Telebirr Details (Conditional) -->
                    <div id="details-tele" class="bank-details-box" style="display:none; border-color:#005bb7; background:#f0f7ff;">
                        <p style="font-size:1.1rem;margin-bottom:1rem;">Send <strong>${amount.toLocaleString()} Birr</strong> via telebirr to:</p>
                        <div style="background:white;padding:1rem;border-radius:4px;margin-bottom:1rem;border:1px solid #005bb7">
                            <strong>telebirr Phone:</strong> ${property.telebirrNumber || property.phone}<br>
                            <strong>Account Name:</strong> ${property.telebirrName || property.title}
                        </div>
                        <p style="font-size:0.85rem; margin-top:0.5rem; color:#005bb7; font-weight:600;">"Once sent, please screenshot your telebirr SMS or App confirmation."</p>
                    </div>

                    <div style="margin-top:2rem;">
                        <p style="font-weight:600;margin-bottom:0.5rem">Your Contact Phone (for verification)</p>
                        <input type="tel" id="guest-phone" placeholder="e.g. +251 91...." class="form-input" style="width:100%; padding:0.8rem; border:1px solid var(--color-border); border-radius:4px; margin-bottom:1.5rem;">
                        
                        <p style="font-weight:600;margin-bottom:0.5rem">Upload Proof of Payment</p>
                        <input type="file" id="proof-file" accept="image/*,.pdf" style="display:none;">
                        <div class="upload-area" id="upload-btn" onclick="document.getElementById('proof-file').click()">
                            <span style="font-size:2rem;color:var(--color-primary);">📎</span><br>
                            <span id="upload-text">Click to upload your payment screenshot</span>
                        </div>
                        <p id="upload-filename" style="text-align:center;color:var(--color-primary);font-weight:600;margin:0.5rem 0;"></p>
                        
                        <div id="upload-progress" style="display:none;background:var(--color-neutral);border-radius:99px;height:6px;margin-bottom:1rem;">
                            <div id="upload-bar" style="background:var(--color-primary);height:6px;border-radius:99px;width:0%;transition:width 0.3s;"></div>
                        </div>
                        <button class="btn-primary" style="width:100%" id="btn-submit" disabled>Submit Proof &amp; Confirm Booking</button>
                    </div>
                </div>

                <div id="step-C" class="hidden">
                    <div style="text-align:center;padding:2rem 0;">
                        <div style="width:60px;height:60px;background:var(--color-primary);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:2rem;">✓</div>
                        <h2 style="color:var(--color-primary);margin-bottom:0.5rem">Booking Submitted!</h2>
                        <p style="margin-bottom:0.5rem">Your Reference Code: <strong id="ref-code" style="color:var(--color-secondary);font-size:1.2rem;"></strong></p>
                        <p style="color:var(--color-primary); font-weight:700; max-width:85%; margin:0 auto 1.5rem; font-size:1rem; line-height:1.5; background:#e6f4ea; padding:1rem; border-radius:12px;">
                            The Hotel Manager has received your <span id="method-receipt"></span> confirmation and will verify it shortly. You'll receive a confirmation email, or you can see it on your booking history.
                        </p>
                        <div style="background:#f4f4f4; padding:1rem; border-radius:12px; display:inline-block; margin-bottom:2rem;">
                            <strong style="color:var(--color-primary); font-size:0.9rem; display:block; margin-bottom:0.3rem;">Call Reception for immediate assistance:</strong>
                            <span style="font-weight:800; font-size:1.2rem; color:#333;">📞 ${property.phone || 'N/A'}</span>
                        </div>
                        <button class="btn-outline" onclick="router.navigate('home')">Return to Home</button>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .pay-card {
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                padding: 1rem; border: 2px solid var(--color-border); border-radius: 12px;
                transition: all 0.2s; background: white;
            }
            .pay-card.active {
                border-color: var(--color-primary); background: #f0fdf4; color: var(--color-primary);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
        </style>
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
                totalAmount: amount,
                packageInfo: pkgInfo
            }, code, proofUrl, currentMethod);

            if (bar) bar.style.width = '100%';
            window.showToast(`📤 Proof uploaded! Manager notified.`);
            
            // FIRE THE PUSH NOTIFICATION
            const guestName = user?.displayName || user?.email || 'A guest';
            window.db.triggerPushNotification(
                property.id, 
                '🛎️ New Booking Alert!', 
                `${guestName} has submitted a booking and payment proof for ${property.title}. Please review it.`
            );

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
