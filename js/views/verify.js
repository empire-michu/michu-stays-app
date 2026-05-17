window.router.addRoute('verify', async (container, params) => {
    const refCode = params.ref;
    
    // Set dynamic premium document title
    window.router.updateSEO({
        title: 'Receipt Verification',
        description: 'Verify the authenticity of digital receipts issued by Michu Stays hosts.'
    });

    // 1. LOADING SKELETON / SPINNING STATE
    container.innerHTML = `
        <div class="verify-page-wrapper" style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(135deg, #f4fbf7 0%, #edf7f2 100%); font-family: 'Outfit', sans-serif;">
            <div class="verify-card" style="width: 100%; max-width: 580px; background: #ffffff; border-radius: 28px; box-shadow: 0 20px 40px rgba(11,110,79,0.06); padding: 3rem 2rem; text-align: center; border: 1.5px solid rgba(11,110,79,0.06); transition: all 0.3s ease;">
                <div class="loader-spinner" style="width: 54px; height: 54px; border: 5px solid rgba(11, 110, 79, 0.1); border-left-color: #0B6E4F; border-radius: 50%; margin: 0 auto 1.5rem; animation: michuSpin 1s cubic-bezier(0.55, 0.055, 0.675, 0.19) infinite;"></div>
                <h3 style="font-weight: 800; font-size: 1.5rem; color: #0B6E4F; margin-bottom: 0.5rem;">Authenticating Receipt...</h3>
                <p style="color: #64748b; font-size: 0.95rem; max-width: 320px; margin: 0 auto; line-height: 1.5;">Querying Michu Stays secure guest ledger database for reference code: <strong style="color: #0f172a;">${refCode || 'N/A'}</strong></p>
            </div>
        </div>
        <style>
            @keyframes michuSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;

    // Help with a subtle bounce delay for beautiful flow
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!refCode) {
        container.innerHTML = `
            <div class="verify-page-wrapper" style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(135deg, #fef4f4 0%, #fdf2f2 100%); font-family: 'Outfit', sans-serif;">
                <div class="verify-card error-card" style="width: 100%; max-width: 580px; background: #ffffff; border-radius: 28px; box-shadow: 0 20px 40px rgba(220,38,38,0.05); padding: 3.5rem 2rem; text-align: center; border: 1.5px solid rgba(220,38,38,0.1); animation: michuFadeIn 0.4s ease;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2.8rem; color: #dc2626; box-shadow: 0 8px 24px rgba(220,38,38,0.15); animation: michuShake 0.5s ease-in-out;">⚠️</div>
                    <h2 style="font-weight: 900; color: #1e293b; font-size: 1.6rem; letter-spacing: -0.5px; margin-bottom: 0.8rem;">Verification Link Missing</h2>
                    <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; max-width: 400px; margin: 0 auto 2.5rem;">
                        No receipt reference code was detected in the URL query. Please scan the QR code printed on the official receipt or check the verification link provided.
                    </p>
                    <button onclick="window.router.navigate('home')" class="btn-primary" style="background: #0B6E4F; color: #ffffff; font-weight: 700; border: none; padding: 1rem 2rem; border-radius: 16px; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 100%; max-width: 280px; box-shadow: 0 10px 20px rgba(11,110,79,0.15); transition: all 0.2s ease;">
                        ← Go to Homepage
                    </button>
                </div>
            </div>
            <style>
                @keyframes michuFadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes michuShake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-6px); }
                    40%, 80% { transform: translateX(6px); }
                }
            </style>
        `;
        return;
    }

    try {
        const booking = await window.db.getBookingByRefCode(refCode);

        // 2. INVALID REFERENCE CODE / FORGED RECEIPT
        if (!booking) {
            container.innerHTML = `
                <div class="verify-page-wrapper" style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(135deg, #fef4f4 0%, #fdf2f2 100%); font-family: 'Outfit', sans-serif;">
                    <div class="verify-card error-card" style="width: 100%; max-width: 580px; background: #ffffff; border-radius: 28px; box-shadow: 0 20px 40px rgba(220,38,38,0.06); padding: 3.5rem 2rem; text-align: center; border: 1.5px solid rgba(220,38,38,0.12); animation: michuFadeIn 0.4s ease;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2.8rem; color: #dc2626; box-shadow: 0 8px 24px rgba(220,38,38,0.15); animation: michuShake 0.5s ease-in-out;">✕</div>
                        <h2 style="font-weight: 900; color: #1e293b; font-size: 1.6rem; letter-spacing: -0.5px; margin-bottom: 0.8rem;">Receipt Not Verified</h2>
                        <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; max-width: 400px; margin: 0 auto 2.5rem;">
                            No booking was found in the official Michu Stays database matching the reference code: <strong style="color: #0f172a; font-family: 'Courier New', monospace; font-size: 1.1rem; background: #f1f5f9; padding: 0.2rem 0.5rem; border-radius: 6px; display: inline-block; margin-top: 0.4rem;">${refCode}</strong>.<br><span style="display: block; margin-top: 0.8rem; color: #b91c1c; font-weight: 600;">⚠️ Verification Failed. This receipt might be forged or modified.</span>
                        </p>
                        <button onclick="window.router.navigate('home')" class="btn-primary" style="background: #0B6E4F; color: #ffffff; font-weight: 700; border: none; padding: 1rem 2rem; border-radius: 16px; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 100%; max-width: 280px; box-shadow: 0 10px 20px rgba(11,110,79,0.15); transition: all 0.2s ease;">
                            ← Go to Homepage
                        </button>
                    </div>
                </div>
                <style>
                    @keyframes michuFadeIn {
                        from { opacity: 0; transform: translateY(15px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    @keyframes michuShake {
                        0%, 100% { transform: translateX(0); }
                        20%, 60% { transform: translateX(-6px); }
                        40%, 80% { transform: translateX(6px); }
                    }
                </style>
            `;
            return;
        }

        // Calculate nights dynamically
        let nights = 0;
        if (booking.checkIn && booking.checkOut) {
            const diffTime = Math.abs(new Date(booking.checkOut) - new Date(booking.checkIn));
            nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // 3. SUCCESS / VERIFIED STATE (Premium Styled Screen)
        container.innerHTML = `
            <div class="verify-page-wrapper" style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 3rem 1rem; background: linear-gradient(135deg, #f4fbf7 0%, #edf7f2 100%); font-family: 'Outfit', sans-serif;">
                <div class="verify-card verified-card" style="width: 100%; max-width: 580px; background: #ffffff; border-radius: 28px; box-shadow: 0 25px 60px rgba(11,110,79,0.08); padding: 3rem 2rem; text-align: center; border: 1.5px solid rgba(11,110,79,0.12); position: relative; overflow: hidden; animation: michuFadeIn 0.5s ease-out;">
                    <!-- Sleek brand visual accent -->
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #0B6E4F, #F4B400, #0B6E4F);"></div>
                    
                    <!-- Official verification stamp -->
                    <div style="width: 76px; height: 76px; border-radius: 50%; background: #e6f4ea; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.2rem; font-size: 2.5rem; color: #1e7e34; box-shadow: 0 8px 24px rgba(30,126,52,0.18); animation: michuScaleUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);">✓</div>
                    
                    <h2 style="font-weight: 900; color: #0B6E4F; font-size: 1.6rem; letter-spacing: -0.5px; margin: 0 0 0.2rem;">VERIFIED OFFICIAL RECEIPT</h2>
                    <p style="color: #64748b; font-size: 0.88rem; font-weight: 500; margin-bottom: 2rem;">Secure Digital Verification Service</p>

                    <!-- Receipt Details Grid -->
                    <div style="background: #f8faf9; border: 1.5px solid #edf2f0; border-radius: 20px; padding: 1.5rem; text-align: left; display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem;">
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.6rem;">
                            <span style="font-size: 0.82rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Receipt Reference</span>
                            <span style="font-family: 'Courier New', monospace; font-size: 1rem; font-weight: 800; color: #0B6E4F; letter-spacing: 0.5px;">${booking.referenceCode}</span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.6rem;">
                            <span style="font-size: 0.82rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Guest Name</span>
                            <strong style="font-size: 0.95rem; color: #0f172a;">${booking.customerName}</strong>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.6rem;">
                            <span style="font-size: 0.82rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 0.1rem;">Stay / Property</span>
                            <strong style="font-size: 0.95rem; color: #0f172a; text-align: right; max-width: 65%; line-height: 1.4;">${booking.propertyTitle}</strong>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.6rem;">
                            <span style="font-size: 0.82rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Dates</span>
                            <strong style="font-size: 0.95rem; color: #0f172a;">${booking.checkIn} to ${booking.checkOut}</strong>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.6rem;">
                            <span style="font-size: 0.82rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Duration</span>
                            <strong style="font-size: 0.95rem; color: #0f172a;">${nights} Night${nights !== 1 ? 's' : ''} (${booking.guests || 1} Guest${booking.guests !== 1 ? 's' : ''})</strong>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.6rem;">
                            <span style="font-size: 0.82rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Payment Channel</span>
                            <strong style="font-size: 0.95rem; color: #0f172a;">${booking.paymentMethod}</strong>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 0.6rem;">
                            <span style="font-size: 0.82rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Record Status</span>
                            <span style="background: #e6f4ea; color: #1e7e34; padding: 0.25rem 0.7rem; border-radius: 99px; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; border: 1px solid rgba(30,126,52,0.15); display: inline-flex; align-items: center; gap: 0.25rem;">
                                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #28a745;"></span> Verified ${booking.status}
                            </span>
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.4rem;">
                            <span style="font-size: 0.95rem; color: #0B6E4F; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px;">Total Paid</span>
                            <strong style="font-size: 1.35rem; color: #0B6E4F; font-weight: 900;">${(booking.totalAmount || 0).toLocaleString()} Birr</strong>
                        </div>

                    </div>

                    <!-- Secure lock badge -->
                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.78rem; color: #94a3b8; margin-bottom: 2rem;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        <span>Ledger check verified direct from host record database</span>
                    </div>

                    <button onclick="window.router.navigate('home')" class="btn-primary" style="background: #0B6E4F; color: #ffffff; font-weight: 700; border: none; padding: 1rem 2rem; border-radius: 16px; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 100%; box-shadow: 0 10px 25px rgba(11,110,79,0.2); transition: all 0.2s ease;">
                        Back to Home Page
                    </button>
                </div>
            </div>
            <style>
                @keyframes michuFadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes michuScaleUp {
                    from { transform: scale(0.85); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .verify-card button:hover {
                    opacity: 0.95;
                    transform: translateY(-1px);
                }
            </style>
        `;
    } catch(e) {
        console.error("Receipt Verification Query Failure:", e);
        container.innerHTML = `
            <div class="verify-page-wrapper" style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 2rem 1rem; background: linear-gradient(135deg, #fef4f4 0%, #fdf2f2 100%); font-family: 'Outfit', sans-serif;">
                <div class="verify-card error-card" style="width: 100%; max-width: 580px; background: #ffffff; border-radius: 28px; box-shadow: 0 20px 40px rgba(220,38,38,0.06); padding: 3.5rem 2rem; text-align: center; border: 1.5px solid rgba(220,38,38,0.12); animation: michuFadeIn 0.4s ease;">
                    <div style="width: 80px; height: 80px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2.8rem; color: #dc2626; box-shadow: 0 8px 24px rgba(220,38,38,0.15);">⚠️</div>
                    <h2 style="font-weight: 900; color: #1e293b; font-size: 1.6rem; letter-spacing: -0.5px; margin-bottom: 0.8rem;">Verification Offline</h2>
                    <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; max-width: 400px; margin: 0 auto 2.5rem;">
                        A temporary database connection timeout or network disruption occurred while verifying this receipt. Please check your connectivity and try again.
                    </p>
                    <button onclick="window.location.reload()" class="btn-primary" style="background: #0B6E4F; color: #ffffff; font-weight: 700; border: none; padding: 1rem 2rem; border-radius: 16px; font-size: 0.95rem; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 100%; max-width: 280px; box-shadow: 0 10px 20px rgba(11,110,79,0.15); transition: all 0.2s ease;">
                        🔄 Retry Verification
                    </button>
                </div>
            </div>
            <style>
                @keyframes michuFadeIn {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>
        `;
    }
});
