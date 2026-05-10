// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║          MICHU STAYS — FEATURE 1: GUEST ↔ HOTEL CHAT                       ║
// ║                                                                              ║
// ║  WHAT TO TELL ANTIGRAVITY:                                                   ║
// ║  "Add the guest-hotel chat feature. This file has 4 sections. Do each       ║
// ║   section exactly as labelled. Do not change existing code — only add."     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


// ════════════════════════════════════════════════════════════════════════════════
// SECTION A — NEW FILE: create js/views/chat.js  (paste the whole block below)
// ════════════════════════════════════════════════════════════════════════════════

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
                <div style="text-align:center;color:#aaa;font-size:0.75rem;padding:0.5rem;">
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
                    senderName: window.auth.userData?.name || user.email,
                    senderRole: role,
                    text
                });
                const targetId = role === 'guest' ? thread.managerId : thread.guestId;
                await window.db.createNotification({
                    message:      role === 'guest' ? `💬 New message from ${window.auth.userData?.name || 'Guest'}` : `💬 Hotel replied to your message`,
                    details:      text.length > 80 ? text.slice(0,80)+'…' : text,
                    targetUserId: targetId,
                    type:         'chat_message',
                    link:         'chat',
                    params:       { bookingId: thread.bookingId || '', propertyId: thread.propertyId }
                });
                if (role === 'guest') {
                    window.db.triggerPushNotification(thread.propertyId, `💬 New message from ${window.auth.userData?.name || 'Guest'}`, text.length > 80 ? text.slice(0,80)+'…' : text).catch(()=>{});
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


// ════════════════════════════════════════════════════════════════════════════════
// SECTION B — ADD TO db.js  (paste these 7 methods INSIDE the Database class,
//             right before the closing brace } of the class)
// ════════════════════════════════════════════════════════════════════════════════

/*  PASTE START ↓  */

    async getBookingById(bookingId) {
        const doc = await firestore.collection('bookings').doc(bookingId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }

    async getOrCreateChatThread(propertyId, guestId, bookingId, property, booking) {
        const threadId = `${propertyId}_${guestId}`;
        const ref = firestore.collection('chatThreads').doc(threadId);
        const doc = await ref.get();
        if (doc.exists) {
            if (bookingId && doc.data().bookingId !== bookingId) {
                await ref.update({ bookingId, bookingRef: booking?.referenceCode || doc.data().bookingRef || '', updatedAt: new Date().toISOString() });
            }
            return { id: doc.id, ...doc.data() };
        }
        const thread = {
            propertyId, propertyTitle: property?.title || '', managerId: property?.managerId || '',
            guestId, guestName: null, guestEmail: null,
            bookingId: bookingId || null, bookingRef: booking?.referenceCode || null,
            lastMessage: null, lastMessageAt: null,
            unreadByGuest: 0, unreadByManager: 0,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        try {
            const uDoc = await firestore.collection('users').doc(guestId).get();
            if (uDoc.exists) { thread.guestName = uDoc.data().name || uDoc.data().displayName || null; thread.guestEmail = uDoc.data().email || null; }
        } catch(e) {}
        await ref.set(thread);
        return { id: threadId, ...thread };
    }

    async sendChatMessage(threadId, { senderId, senderName, senderRole, text }) {
        const msgRef = await firestore.collection('chatThreads').doc(threadId).collection('messages').add({
            senderId, senderName: senderName || '', senderRole: senderRole || 'guest',
            text, readAt: null, createdAt: new Date().toISOString()
        });
        const update = { lastMessage: text.length > 100 ? text.slice(0,100)+'…' : text, lastMessageAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        if (senderRole === 'guest') { update.unreadByManager = firebase.firestore.FieldValue.increment(1); update.unreadByGuest = 0; }
        else { update.unreadByGuest = firebase.firestore.FieldValue.increment(1); update.unreadByManager = 0; }
        await firestore.collection('chatThreads').doc(threadId).update(update);
        return { id: msgRef.id };
    }

    listenToChatMessages(threadId, callback) {
        return firestore.collection('chatThreads').doc(threadId).collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.warn('Chat listener:', err));
    }

    async markThreadRead(threadId, userId) {
        try {
            const role = window.auth?.userData?.role || 'guest';
            const key  = role === 'guest' ? 'unreadByGuest' : 'unreadByManager';
            await firestore.collection('chatThreads').doc(threadId).update({ [key]: 0 });
            const unread = await firestore.collection('chatThreads').doc(threadId).collection('messages')
                .where('senderId', '!=', userId).where('readAt', '==', null).get();
            if (!unread.empty) {
                const batch = firestore.batch();
                unread.docs.forEach(d => batch.update(d.ref, { readAt: new Date().toISOString() }));
                await batch.commit();
            }
        } catch(e) { console.warn('markThreadRead:', e); }
    }

    async getManagerChatThreads(managerId) {
        const snap = await firestore.collection('chatThreads').where('managerId', '==', managerId).orderBy('lastMessageAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async getGuestChatThreads(guestId) {
        const snap = await firestore.collection('chatThreads').where('guestId', '==', guestId).orderBy('lastMessageAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

/*  PASTE END ↑  */


// ════════════════════════════════════════════════════════════════════════════════
// SECTION C — CHANGES TO EXISTING FILES  (tell AntiGravity exactly what to find
//             and what to add — do NOT replace the whole file)
// ════════════════════════════════════════════════════════════════════════════════

/*

── C1. index.html ────────────────────────────────────────────────────────────────
Find this line (it's with the other view script tags):
    <script src="js/views/booking.js"></script>

Add this line directly below it:
    <script src="js/views/chat.js"></script>


── C2. profile.js  ───────────────────────────────────────────────────────────────
Find the booking row HTML where you have the "Rate" or "Review" button.
It looks something like:
    <button onclick="window.openRatingModal(...)">Rate</button>

Add this button right next to it:
    <button onclick="window.router.navigate('chat',{bookingId:'${b.id}'})"
        style="border:none;background:none;color:var(--color-primary);font-size:0.75rem;font-weight:700;cursor:pointer;padding:0 0 0 8px;text-decoration:underline;">
        💬 Message Hotel
    </button>


── C3. hotel-detail.js  ──────────────────────────────────────────────────────────
Find the "Book Now" button. It has style like:
    width:100%; padding:1.5rem; font-size:1.3rem; border-radius:20px; font-weight:950;

Add this button directly below the Book Now button:
    <button onclick="window.router.navigate('chat',{propertyId:'${hotel.id}'})"
        style="width:100%;padding:0.9rem;margin-top:0.6rem;font-size:0.9rem;border-radius:20px;font-weight:700;background:white;color:var(--color-primary);border:2px solid var(--color-primary);cursor:pointer;font-family:'Outfit',sans-serif;">
        💬 Message Hotel First
    </button>


── C4. manager.js  ───────────────────────────────────────────────────────────────
Find the three tab buttons that look like:
    <button style="${tabStyle('bookings')}" onclick="window.setMgrTab('bookings')">📅 Bookings</button>
    <button style="${tabStyle('property')}" onclick="window.setMgrTab('property')">🏨 My Property</button>
    <button style="${tabStyle('account')}" onclick="window.setMgrTab('account')">👤 My Account</button>

Add this as a 4th button in that same group:
    <button style="${tabStyle('messages')}" onclick="window.setMgrTab('messages')">
        💬 Messages${window._mgrChatUnread > 0 ? ` <span style="background:#e53e3e;color:white;font-size:0.65rem;font-weight:700;padding:1px 6px;border-radius:99px;margin-left:4px;">${window._mgrChatUnread}</span>` : ''}
    </button>

Find the renderActiveTab function that has:
    if (activeTab === 'bookings') return renderBookingsTab();
    if (activeTab === 'property') return renderPropertyTab();
    if (activeTab === 'account')  return renderAccountTab();

Add this line at the end of it:
    if (activeTab === 'messages') return renderMessagesTab();

Then add this entire function INSIDE the manager route handler (alongside renderBookingsTab, etc.):

    const renderMessagesTab = async () => {
        // Show loading first
        setTimeout(async () => {
            const mgrContent = document.querySelector('.manager-content');
            if (!mgrContent) return;
            try {
                const threads = await window.db.getManagerChatThreads(uid);
                window._mgrChatUnread = threads.reduce((sum,t) => sum + (t.unreadByManager||0), 0);
                if (threads.length === 0) {
                    mgrContent.innerHTML = `<div style="padding:3rem;text-align:center;background:white;border-radius:24px;box-shadow:var(--shadow-sm);">
                        <div style="font-size:2.5rem;margin-bottom:1rem;">💬</div>
                        <h3 style="margin:0 0 0.5rem;color:var(--color-text-dark);">No conversations yet</h3>
                        <p style="color:var(--color-text-light);font-size:0.9rem;">When guests message your hotel, conversations will appear here.</p>
                    </div>`;
                    return;
                }
                mgrContent.innerHTML = `<div style="background:white;border-radius:24px;box-shadow:var(--shadow-sm);overflow:hidden;">
                    <div style="padding:1.2rem 1.5rem;border-bottom:1px solid var(--color-border);font-weight:700;color:var(--color-text-dark);">
                        ${threads.length} conversation${threads.length!==1?'s':''}
                        ${window._mgrChatUnread > 0 ? `<span style="color:#e53e3e;font-size:0.8rem;margin-left:8px;">(${window._mgrChatUnread} unread)</span>` : ''}
                    </div>
                    ${threads.map(t => {
                        const unread = t.unreadByManager || 0;
                        const time   = t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleString('en-ET',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
                        const avatar = (t.guestName||t.guestEmail||'G').charAt(0).toUpperCase();
                        return `<div onclick="window.router.navigate('chat',{bookingId:'${t.bookingId||''}',propertyId:'${t.propertyId}'})"
                            style="display:flex;align-items:center;gap:0.9rem;padding:0.9rem 1.5rem;border-bottom:1px solid var(--color-border);cursor:pointer;background:${unread>0?'#f7fff9':'white'};" 
                            onmouseenter="this.style.background='#f0f7f2'" onmouseleave="this.style.background='${unread>0?'#f7fff9':'white'}'">
                            <div style="width:44px;height:44px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1rem;flex-shrink:0;position:relative;">
                                ${avatar}
                                ${unread>0?`<span style="position:absolute;top:-2px;right:-2px;width:14px;height:14px;background:#e53e3e;border-radius:50%;border:2px solid white;"></span>`:''}
                            </div>
                            <div style="flex:1;min-width:0;">
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                                    <div style="font-weight:${unread>0?'700':'600'};font-size:0.9rem;color:var(--color-text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%;">${t.guestName||t.guestEmail||'Guest'}</div>
                                    <div style="font-size:0.7rem;color:#aaa;">${time}</div>
                                </div>
                                <div style="font-size:0.8rem;color:${unread>0?'var(--color-primary)':'#aaa'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                    ${t.lastMessage||'No messages yet'}
                                    ${t.bookingRef?`<span style="margin-left:6px;font-size:0.65rem;background:#e8f5ec;color:var(--color-primary);padding:2px 6px;border-radius:99px;">${t.bookingRef}</span>`:''}
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>`;
            } catch(err) {
                console.error('Messages tab error:', err);
            }
        }, 0);
        return `<div style="padding:2rem;text-align:center;color:#aaa;font-size:0.9rem;">Loading conversations…</div>`;
    };


── C5. firestore.rules  ──────────────────────────────────────────────────────────
Add this block INSIDE your existing rules, inside the
  match /databases/{database}/documents { ... }  block:

    match /chatThreads/{threadId} {
      allow read: if request.auth != null && (
        resource.data.guestId   == request.auth.uid ||
        resource.data.managerId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      allow create: if request.auth != null &&
        request.resource.data.guestId == request.auth.uid;
      allow update: if request.auth != null && (
        resource.data.guestId   == request.auth.uid ||
        resource.data.managerId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      allow delete: if false;

      match /messages/{messageId} {
        allow read: if request.auth != null && (
          get(/databases/$(database)/documents/chatThreads/$(threadId)).data.guestId   == request.auth.uid ||
          get(/databases/$(database)/documents/chatThreads/$(threadId)).data.managerId == request.auth.uid ||
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
        );
        allow create: if request.auth != null &&
          request.resource.data.senderId == request.auth.uid &&
          request.resource.data.text is string &&
          request.resource.data.text.size() > 0 &&
          request.resource.data.text.size() < 2000;
        allow update: if request.auth != null &&
          request.resource.data.text     == resource.data.text &&
          request.resource.data.senderId == resource.data.senderId;
        allow delete: if false;
      }
    }

After saving firestore.rules, run:
    firebase deploy --only firestore:rules


── C6. Firestore index required  ─────────────────────────────────────────────────
Go to Firebase Console → Firestore → Indexes → Add composite index:
    Collection:  chatThreads
    Field 1:     managerId   (Ascending)
    Field 2:     lastMessageAt  (Descending)

(Firebase will also prompt you automatically with a link in the browser console
the first time a manager opens the Messages tab — just click it.)

*/
