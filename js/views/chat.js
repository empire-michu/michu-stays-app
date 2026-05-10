window.router.addRoute('chat', async (container, params) => {
    if (!window.auth?.currentUser) {
        window.showAlert('Please log in to use messaging.');
        window.router.navigate('login');
        return;
    }

    const user      = window.auth.currentUser;
    const role      = window.auth?.userData?.role || 'guest';
    const bookingId = params.bookingId || null;
    const propertyId = params.propertyId || null;

    container.innerHTML = `<div style="display:flex;flex-direction:column;height:calc(100vh - 70px);">
        <div style="padding:1.2rem 1rem;background:white;border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:0.8rem;">
            <button onclick="window.history.back()" style="background:none;border:none;cursor:pointer;padding:4px;font-size:1.4rem;color:var(--color-primary);">‹</button>
            <div style="font-size:1rem;font-weight:700;color:var(--color-primary);">Loading…</div>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#999;font-size:0.9rem;">⏳ Connecting…</div>
    </div>`;

    try {
        let thread = null;
        let property = null;
        let guestId = (role === 'guest') ? user.uid : null;

        if (bookingId) {
            const booking = await window.db.getBookingById(bookingId);
            if (!booking) throw new Error('Booking not found');
            property = await window.db.getPropertyById(booking.propertyId);
            guestId  = booking.customerId;
            thread   = await window.db.getOrCreateChatThread(booking.propertyId, guestId, booking.id, property, booking);
        } else if (propertyId) {
            property = await window.db.getPropertyById(propertyId);
            if (!property) throw new Error('Property not found');
            if (role !== 'guest') { window.showAlert('Managers use the dashboard to open chats.'); window.history.back(); return; }
            thread = await window.db.getOrCreateChatThread(propertyId, user.uid, null, property, null);
        } else {
            throw new Error('Missing bookingId or propertyId');
        }

        await window.db.markThreadRead(thread.id, user.uid);

        const hotelName  = property?.title || 'Hotel';
        const otherParty = role === 'guest' ? hotelName : (thread.guestName || thread.guestEmail || 'Guest');
        const avatar     = otherParty.charAt(0).toUpperCase();

        container.innerHTML = `
        <div style="display:flex;flex-direction:column;height:calc(100vh - 70px);background:#f0f4f1;">

            <div style="padding:1rem;background:white;border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:0.9rem;box-shadow:var(--shadow-sm);">
                <button onclick="window.history.back()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--color-primary);">‹</button>
                <div style="width:40px;height:40px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1rem;flex-shrink:0;">${avatar}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.95rem;color:var(--color-text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${otherParty}</div>
                    <div style="font-size:0.75rem;color:var(--color-text-light);">${role === 'guest' ? '💬 Direct message to hotel' : '📩 Guest conversation'}</div>
                </div>
                ${thread.bookingRef ? `<div style="background:#e8f5ec;color:var(--color-primary);font-size:0.7rem;font-weight:700;padding:4px 10px;border-radius:99px;">${thread.bookingRef}</div>` : ''}
            </div>

            <div id="chat-messages" style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:0.6rem;scroll-behavior:smooth;">
                <div data-header style="text-align:center;color:#aaa;font-size:0.75rem;padding:0.5rem;">
                    ${thread.bookingRef ? `Booking <strong>${thread.bookingRef}</strong> · ` : ''}Conversation with <strong>${hotelName}</strong>
                </div>
            </div>

            <div style="background:white;border-top:1px solid var(--color-border);padding:0.75rem 1rem;padding-bottom:calc(0.75rem + env(safe-area-inset-bottom,0px));display:flex;align-items:flex-end;gap:0.6rem;">
                <textarea id="chat-input" placeholder="Type a message…" rows="1"
                    style="flex:1;border:1.5px solid var(--color-border);border-radius:20px;padding:0.6rem 1rem;font-family:'Outfit',sans-serif;font-size:0.9rem;resize:none;outline:none;max-height:120px;line-height:1.5;background:#fafff9;"
                    oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';"
                    onfocus="this.style.borderColor='var(--color-primary)'"
                    onblur="this.style.borderColor='var(--color-border)'"
                    onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window._sendChat();}"></textarea>
                <button onclick="window._sendChat()"
                    style="width:42px;height:42px;border-radius:50%;background:var(--color-primary);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(11,110,79,0.3);"
                    aria-label="Send">
                    <svg width="18" height="18" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </div>
        </div>`;

        // ── Real-time messages listener ──────────────────────────────────────
        const msgBox = document.getElementById('chat-messages');
        let unsubscribe = null;

        unsubscribe = window.db.listenToChatMessages(thread.id, (messages) => {
            const header = msgBox.querySelector('[data-header]');
            msgBox.innerHTML = '';
            if (header) msgBox.appendChild(header);

            if (messages.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'text-align:center;color:#aaa;font-size:0.85rem;margin-top:2rem;';
                empty.textContent = role === 'guest' ? '✉️ Send your first message to the hotel.' : '✉️ No messages yet from this guest.';
                msgBox.appendChild(empty);
                return;
            }

            let lastDate = '';
            messages.forEach(msg => {
                const isMe    = msg.senderId === user.uid;
                const d       = new Date(msg.createdAt);
                const dateStr = d.toLocaleDateString('en-ET', { weekday:'short', month:'short', day:'numeric' });
                const timeStr = d.toLocaleTimeString('en-ET', { hour:'2-digit', minute:'2-digit' });

                if (dateStr !== lastDate) {
                    lastDate = dateStr;
                    const sep = document.createElement('div');
                    sep.style.cssText = 'text-align:center;margin:0.5rem 0;';
                    sep.innerHTML = `<span style="background:#ddeadf;color:#3d6645;font-size:0.7rem;font-weight:600;padding:3px 12px;border-radius:99px;">${dateStr}</span>`;
                    msgBox.appendChild(sep);
                }

                const wrap = document.createElement('div');
                wrap.style.cssText = `display:flex;justify-content:${isMe ? 'flex-end' : 'flex-start'};`;

                const bubble = document.createElement('div');
                bubble.style.cssText = `max-width:78%;background:${isMe ? 'var(--color-primary)' : 'white'};color:${isMe ? 'white' : 'var(--color-text-dark)'};padding:0.65rem 0.9rem;border-radius:${isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};font-size:0.88rem;line-height:1.5;box-shadow:var(--shadow-sm);word-break:break-word;border:${isMe ? 'none' : '1px solid var(--color-border)'};`;

                const escaped = String(msg.text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                bubble.innerHTML = `${escaped.replace(/\n/g,'<br>')}
                    <div style="font-size:0.65rem;opacity:0.65;text-align:${isMe?'right':'left'};margin-top:3px;">${timeStr}${isMe && msg.readAt ? ' · ✓✓' : ''}</div>`;
                wrap.appendChild(bubble);
                msgBox.appendChild(wrap);
            });
            msgBox.scrollTop = msgBox.scrollHeight;
        });

        // ── Send handler ─────────────────────────────────────────────────────
        window._sendChat = async () => {
            const input = document.getElementById('chat-input');
            const text  = (input?.value || '').trim();
            if (!text) return;
            input.value = '';
            input.style.height = 'auto';
            try {
                await window.db.sendChatMessage(thread.id, {
                    senderId:   user.uid,
                    senderName: window.auth.userData?.fullName || window.auth.userData?.name || user.email,
                    senderRole: role,
                    text
                });
                const targetId = role === 'guest' ? thread.managerId : thread.guestId;
                await window.db.createNotification({
                    message:      role === 'guest' ? `💬 New message from ${window.auth.userData?.fullName || 'Guest'}` : `💬 Hotel replied to your message`,
                    details:      text.length > 80 ? text.slice(0,80)+'…' : text,
                    targetUserId: targetId,
                    type:         'chat_message',
                    link:         'chat',
                    params:       { bookingId: thread.bookingId || '', propertyId: thread.propertyId }
                });
                if (role === 'guest') {
                    window.db.triggerPushNotification(thread.propertyId, `💬 New message from ${window.auth.userData?.fullName || 'Guest'}`, text.length > 80 ? text.slice(0,80)+'…' : text).catch(()=>{});
                }
            } catch(err) {
                console.error('Send error:', err);
                window.showAlert('Failed to send. Check your connection.');
            }
        };

        // cleanup on navigate away
        const _origNav = window.router.navigate.bind(window.router);
        window.router.navigate = (...args) => {
            if (unsubscribe) { unsubscribe(); unsubscribe = null; }
            window.router.navigate = _origNav;
            _origNav(...args);
        };

    } catch(err) {
        console.error('Chat error:', err);
        container.innerHTML = `<div style="padding:2rem;text-align:center;">
            <div style="font-size:2rem;margin-bottom:1rem;">💬</div>
            <div style="color:#e53e3e;font-weight:600;">Could not load conversation</div>
            <div style="color:#888;font-size:0.85rem;margin-top:0.5rem;">${err.message}</div>
            <button onclick="window.history.back()" class="btn-primary" style="margin-top:1rem;">Go Back</button>
        </div>`;
    }
});
