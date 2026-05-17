/**
 * Michu Stays — Receipt Generator
 * Opens a branded, printable receipt in a new browser tab.
 * Only for Confirmed bookings.
 */

window.openReceipt = (booking) => {
    if (!booking || booking.status !== 'Confirmed') {
        window.showToast?.('⚠️ Receipts are only available for confirmed bookings.');
        return;
    }

    // Calculate nights
    let nights = 0;
    if (booking.checkIn && booking.checkOut) {
        const diffTime = Math.abs(new Date(booking.checkOut) - new Date(booking.checkIn));
        nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const refCode = booking.referenceCode || 'N/A';
    const verifyUrl = `https://michustays.pro.et/verify?ref=${encodeURIComponent(refCode)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(verifyUrl)}&color=0B6E4F`;
    const receiptDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const receiptTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const bookingDate = booking.createdAt
        ? new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '—';

    const logoUrl = window.location.origin + '/images/logo.png';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt — ${refCode} | Michu Stays</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f4f6f8;
            color: #1a1a2e;
            padding: 2rem;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .receipt-wrapper {
            max-width: 680px;
            margin: 0 auto;
            background: white;
            border-radius: 24px;
            box-shadow: 0 8px 40px rgba(0,0,0,0.08);
            overflow: hidden;
        }

        /* === HEADER === */
        .receipt-header {
            background: linear-gradient(135deg, #0B6E4F 0%, #094d38 100%);
            color: white;
            padding: 2.5rem 2.5rem 2rem;
            position: relative;
            overflow: hidden;
        }
        .receipt-header::after {
            content: '';
            position: absolute;
            top: -50%;
            right: -30%;
            width: 300px;
            height: 300px;
            border-radius: 50%;
            background: rgba(244, 180, 0, 0.08);
        }
        .header-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            position: relative;
            z-index: 1;
        }
        .logo-section {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .logo-section img {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: rgba(255,255,255,0.15);
            padding: 6px;
            object-fit: contain;
        }
        .logo-section h1 {
            font-size: 1.6rem;
            font-weight: 900;
            letter-spacing: -0.5px;
        }
        .logo-section h1 span {
            color: #F4B400;
        }
        .receipt-badge {
            background: rgba(244, 180, 0, 0.2);
            color: #F4B400;
            padding: 0.4rem 1rem;
            border-radius: 99px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
            border: 1px solid rgba(244, 180, 0, 0.3);
        }
        .ref-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255,255,255,0.1);
            padding: 1rem 1.5rem;
            border-radius: 14px;
            position: relative;
            z-index: 1;
        }
        .ref-bar .ref-label {
            font-size: 0.7rem;
            font-weight: 700;
            text-transform: uppercase;
            opacity: 0.7;
            letter-spacing: 1px;
        }
        .ref-bar .ref-code {
            font-family: 'Courier New', monospace;
            font-size: 1.3rem;
            font-weight: 900;
            letter-spacing: 2px;
            color: #F4B400;
        }
        .ref-bar .ref-date {
            font-size: 0.8rem;
            opacity: 0.8;
        }

        /* === BODY === */
        .receipt-body {
            padding: 2.5rem;
        }

        .section {
            margin-bottom: 2rem;
        }
        .section-title {
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: #0B6E4F;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .section-title::after {
            content: '';
            flex: 1;
            height: 1px;
            background: linear-gradient(to right, #e8f0ed, transparent);
        }

        .detail-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.8rem;
        }
        .detail-item {
            background: #f8faf9;
            padding: 0.9rem 1.1rem;
            border-radius: 12px;
            border: 1px solid #e8f0ed;
        }
        .detail-item.full-width {
            grid-column: 1 / -1;
        }
        .detail-label {
            font-size: 0.65rem;
            font-weight: 700;
            text-transform: uppercase;
            color: #888;
            letter-spacing: 0.8px;
            margin-bottom: 0.3rem;
        }
        .detail-value {
            font-size: 0.95rem;
            font-weight: 700;
            color: #1a1a2e;
        }

        /* === PAYMENT SUMMARY === */
        .payment-summary {
            background: linear-gradient(135deg, #f0f7f4 0%, #f8faf9 100%);
            border: 2px solid #d4e8de;
            border-radius: 18px;
            padding: 1.8rem;
            margin-bottom: 2rem;
        }
        .payment-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.6rem 0;
        }
        .payment-row:not(:last-child) {
            border-bottom: 1px dashed #d4e8de;
        }
        .payment-row .label {
            font-size: 0.85rem;
            color: #666;
            font-weight: 600;
        }
        .payment-row .value {
            font-weight: 700;
            font-size: 0.95rem;
        }
        .payment-row.total {
            border-bottom: none;
            padding-top: 1rem;
            margin-top: 0.5rem;
            border-top: 2px solid #0B6E4F;
        }
        .payment-row.total .label {
            font-size: 1rem;
            font-weight: 800;
            color: #0B6E4F;
        }
        .payment-row.total .value {
            font-size: 1.3rem;
            font-weight: 900;
            color: #0B6E4F;
        }
        .status-confirmed {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            background: #e6f4ea;
            color: #1e7e34;
            padding: 0.3rem 0.8rem;
            border-radius: 99px;
            font-size: 0.75rem;
            font-weight: 800;
            text-transform: uppercase;
        }

        /* === QR FOOTER === */
        .receipt-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 2rem 2.5rem;
            background: #f8faf9;
            border-top: 1px solid #e8f0ed;
            gap: 1.5rem;
        }
        .qr-section {
            display: flex;
            align-items: center;
            gap: 1.2rem;
        }
        .qr-section img {
            width: 100px;
            height: 100px;
            border-radius: 12px;
            border: 2px solid #e8f0ed;
            padding: 4px;
            background: white;
        }
        .qr-info {
            max-width: 260px;
        }
        .qr-info .qr-title {
            font-size: 0.75rem;
            font-weight: 800;
            color: #0B6E4F;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 0.3rem;
        }
        .qr-info p {
            font-size: 0.75rem;
            color: #888;
            line-height: 1.5;
        }
        .print-info {
            text-align: right;
            font-size: 0.7rem;
            color: #aaa;
            line-height: 1.6;
        }

        /* === WATERMARK === */
        .watermark {
            text-align: center;
            padding: 1.2rem;
            font-size: 0.7rem;
            color: #ccc;
            font-weight: 600;
            letter-spacing: 1px;
        }

        /* === PRINT === */
        @media print {
            body { background: white; padding: 0; }
            .receipt-wrapper { box-shadow: none; border-radius: 0; }
            .no-print { display: none !important; }
        }

        /* === MOBILE === */
        @media (max-width: 600px) {
            body { padding: 0.5rem; }
            .receipt-header { padding: 1.5rem; }
            .receipt-body { padding: 1.5rem; }
            .receipt-footer { flex-direction: column; padding: 1.5rem; text-align: center; }
            .detail-grid { grid-template-columns: 1fr; }
            .header-top { flex-direction: column; gap: 0.8rem; }
            .ref-bar { flex-direction: column; gap: 0.5rem; text-align: center; }
            .qr-section { flex-direction: column; text-align: center; }
            .print-info { text-align: center; }
        }

        /* Print button */
        .print-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            width: 100%;
            max-width: 680px;
            margin: 1.5rem auto 0;
            padding: 1rem;
            background: #0B6E4F;
            color: white;
            border: none;
            border-radius: 14px;
            font-family: 'Outfit', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }
        .print-btn:hover { background: #094d38; transform: translateY(-1px); }
    </style>
</head>
<body>

    <div class="receipt-wrapper">
        <div class="receipt-header">
            <div class="header-top">
                <div class="logo-section">
                    <img src="${logoUrl}" alt="Michu Stays" onerror="this.style.display='none'">
                    <h1>Michu <span>Stays</span></h1>
                </div>
                <div class="receipt-badge">✓ Official Receipt</div>
            </div>
            <div class="ref-bar">
                <div>
                    <div class="ref-label">Reference Code</div>
                    <div class="ref-code">${refCode}</div>
                </div>
                <div class="ref-date">Issued: ${receiptDate} at ${receiptTime}</div>
            </div>
        </div>

        <div class="receipt-body">
            <div class="section">
                <div class="section-title">Guest Information</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Full Name</div>
                        <div class="detail-value">${booking.customerName || 'Guest'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Email</div>
                        <div class="detail-value">${booking.customerEmail || '—'}</div>
                    </div>
                    ${booking.customerPhone ? `
                    <div class="detail-item full-width">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value">${booking.customerPhone}</div>
                    </div>` : ''}
                </div>
            </div>

            <div class="section">
                <div class="section-title">Booking Details</div>
                <div class="detail-grid">
                    <div class="detail-item full-width">
                        <div class="detail-label">Property / Stay</div>
                        <div class="detail-value">${booking.propertyTitle || '—'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Check-In</div>
                        <div class="detail-value">${booking.checkIn || '—'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Check-Out</div>
                        <div class="detail-value">${booking.checkOut || '—'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Duration</div>
                        <div class="detail-value">${nights} Night${nights !== 1 ? 's' : ''}</div>
                    </div>
                    ${booking.packageInfo ? `
                    <div class="detail-item full-width">
                        <div class="detail-label">Package</div>
                        <div class="detail-value">🎁 ${booking.packageInfo.title || 'Custom Package'}${booking.packageInfo.services ? ' — ' + booking.packageInfo.services : ''}</div>
                    </div>` : ''}
                </div>
            </div>

            <div class="payment-summary">
                <div class="section-title" style="margin-bottom:1.2rem;">Payment Summary</div>
                <div class="payment-row">
                    <span class="label">Payment Method</span>
                    <span class="value">${booking.paymentMethod || 'Bank Transfer'}</span>
                </div>
                <div class="payment-row">
                    <span class="label">Booking Date</span>
                    <span class="value">${bookingDate}</span>
                </div>
                <div class="payment-row">
                    <span class="label">Status</span>
                    <span class="value"><span class="status-confirmed">✓ Confirmed</span></span>
                </div>
                <div class="payment-row total">
                    <span class="label">Total Amount</span>
                    <span class="value">${(booking.totalAmount || 0).toLocaleString()} Birr</span>
                </div>
            </div>
        </div>

        <div class="receipt-footer">
            <div class="qr-section">
                <img src="${qrUrl}" alt="Verification QR Code">
                <div class="qr-info">
                    <div class="qr-title">Verify This Receipt</div>
                    <p>Scan the QR code or visit the verification link to confirm the authenticity of this booking receipt.</p>
                </div>
            </div>
            <div class="print-info">
                <div>Michu Stays™</div>
                <div>michustays.pro.et</div>
                <div>support@michustays.com</div>
            </div>
        </div>

        <div class="watermark">
            This is a computer-generated receipt and does not require a signature.
        </div>
    </div>

    <button class="print-btn no-print" onclick="window.print()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Download / Print Receipt
    </button>

    <script>
        // Auto-trigger print dialog after a brief delay
        setTimeout(() => { window.print(); }, 800);
    </script>
</body>
</html>`;

    const receiptWindow = window.open('', '_blank');
    if (receiptWindow) {
        receiptWindow.document.write(html);
        receiptWindow.document.close();
    } else {
        window.showToast?.('⚠️ Pop-up blocked! Please allow pop-ups for this site.');
    }
};
