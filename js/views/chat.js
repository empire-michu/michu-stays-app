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

        // Track editing state
        let _editingMsgId = null;
        let _selectedPhotoFile = null;

        container.innerHTML = `
        <style>
            #chat-ctx-sheet { display:none; position:fixed; inset:0; z-index:9998; }
            #chat-ctx-sheet .overlay { position:absolute; inset:0; background:rgba(0,0,0,0.4); }
            #chat-ctx-sheet .sheet {
                position:absolute; bottom:0; left:0; right:0;
                background:white; border-radius:24px 24px 0 0;
                padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom,0px));
                box-shadow:0 -8px 40px rgba(0,0,0,0.15);
                animation: slideUp 0.25s cubic-bezier(0.32,0.72,0,1);
            }
            @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
            #chat-ctx-sheet .sheet-handle { width:40px;height:4px;background:#e2e8f0;border-radius:99px;margin:0 auto 1.2rem; }
            .ctx-btn {
                display:flex; align-items:center; gap:0.9rem;
                width:100%; padding:1rem 0.5rem;
                border:none; background:none; cursor:pointer;
                font-size:1rem; font-weight:600; color:#1e293b;
                border-bottom:1px solid #f1f5f9; text-align:left;
            }
            .ctx-btn:last-child { border-bottom:none; }
            .ctx-btn .icon { width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0; }
            .ctx-btn.danger { color:#dc2626; }
            .ctx-btn.danger-strong { color:#b91c1c; }
            .msg-bubble-wrap { display:flex; position:relative; }
            .msg-bubble { transition: background 0.3s; }
            .msg-bubble.highlighted { filter: brightness(0.88); }
            #edit-bar {
                display:none; align-items:center; gap:0.5rem;
                padding:0.5rem 1rem; background:#fff7ed;
                border-top:2px solid #d97706; font-size:0.82rem; color:#92400e;
            }
            #edit-bar.active { display:flex; }
            @keyframes rotate { 100% { transform: rotate(360deg); } }
            @keyframes dash {
              0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
              50% { stroke-dasharray: 89, 200; stroke-dashoffset: -35px; }
              100% { stroke-dasharray: 89, 200; stroke-dashoffset: -124px; }
            }
        </style>
 
        <div style="display:flex;flex-direction:column;height:calc(100vh - 70px);background:#f0f4f1;">
 
            <div style="padding:1rem;background:white;border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:0.9rem;box-shadow:var(--shadow-sm);">
                <button onclick="window.history.back()" style="background:none;border:none;cursor:pointer;font-size:1.4rem;color:var(--color-primary);">‹</button>
                <div style="width:40px;height:40px;border-radius:50%;background:var(--color-primary);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:1rem;flex-shrink:0;">${avatar}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:0.95rem;color:var(--color-text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${otherParty}</div>
                    <div style="font-size:0.75rem;color:var(--color-text-light);">${role === 'guest' ? '💬 Direct message to hotel' : '📩 Guest conversation'}</div>
                </div>
                <button onclick="window._clearChatHistory('${thread.id}', '${role}')" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:#ef4444;padding:4px;" title="Clear Chat History">🗑️</button>
            </div>
 
            <div id="chat-messages" style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:0.6rem;scroll-behavior:smooth;">
                <div data-header style="text-align:center;color:#aaa;font-size:0.75rem;padding:0.5rem;">
                    ${thread.bookingRef ? `Booking <strong>${thread.bookingRef}</strong> · ` : ''}Conversation with <strong>${hotelName}</strong>
                </div>
            </div>
 
            <!-- Edit indicator bar -->
            <div id="edit-bar">
                <span style="flex:1;">✏️ Editing message…</span>
                <button onclick="window._cancelEdit()" style="border:none;background:#fee2e2;color:#b91c1c;padding:4px 12px;border-radius:8px;font-weight:700;cursor:pointer;font-size:0.8rem;">Cancel</button>
            </div>

            <!-- Photo Preview Bar -->
            <div id="photo-preview-bar" style="display:none; align-items:center; gap:0.8rem; padding:0.75rem 1rem; background:white; border-top:1px solid var(--color-border); position:relative;">
                <div style="position:relative; width:60px; height:60px; border-radius:12px; overflow:hidden; border:1px solid var(--color-border); background:#f8fafc;">
                    <img id="photo-preview-img" style="width:100%; height:100%; object-fit:cover;" />
                    <div id="photo-upload-spinner" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.5); align-items:center; justify-content:center; color:white; font-size:0.8rem; font-weight:bold;">
                        <svg width="20" height="20" viewBox="0 0 50 50" style="animation: rotate 2s linear infinite; width:20px; height:20px;">
                            <circle cx="25" cy="25" r="20" fill="none" stroke="white" stroke-width="5" stroke-dasharray="1, 200" stroke-dashoffset="0" stroke-linecap="round" style="animation: dash 1.5s ease-in-out infinite;"/>
                        </svg>
                    </div>
                </div>
                <div style="flex:1; min-width:0;">
                    <div id="photo-preview-name" style="font-size:0.82rem; font-weight:700; color:var(--color-text-dark); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Screenshot.png</div>
                    <div id="photo-preview-size" style="font-size:0.75rem; color:var(--color-text-light);">1.2 MB</div>
                </div>
                <button type="button" onclick="window._clearChatPhoto()" style="border:none; background:#fee2e2; color:#b91c1c; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; cursor:pointer;">✕</button>
            </div>
 
            <div style="background:white;border-top:1px solid var(--color-border);padding:0.75rem 1rem;padding-bottom:calc(0.75rem + env(safe-area-inset-bottom,0px));display:flex;align-items:flex-end;gap:0.6rem;">
                <button id="attach-btn" type="button" onclick="document.getElementById('chat-photo-input').click()"
                    style="width:42px;height:42px;border-radius:50%;background:#f1f5f9;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s;"
                    aria-label="Attach Photo" title="Attach Photo">
                    <svg width="20" height="20" fill="none" stroke="var(--color-primary)" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                    </svg>
                </button>
                <input type="file" id="chat-photo-input" accept="image/*" style="display:none;" onchange="window._handleChatPhotoSelect(event)" />
                <textarea id="chat-input" placeholder="Type a message…" rows="1"
                    style="flex:1;border:1.5px solid var(--color-border);border-radius:20px;padding:0.6rem 1rem;font-family:'Outfit',sans-serif;font-size:0.9rem;resize:none;outline:none;max-height:120px;line-height:1.5;background:#fafff9;"
                    oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';"
                    onfocus="this.style.borderColor='var(--color-primary)'"
                    onblur="this.style.borderColor='var(--color-border)'"
                    onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window._sendChat();}"></textarea>
                <button id="send-btn" onclick="window._sendChat()"
                    style="width:42px;height:42px;border-radius:50%;background:var(--color-primary);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 4px 12px rgba(11,110,79,0.3);"
                    aria-label="Send">
                    <svg width="18" height="18" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                </button>
            </div>
        </div>
 
        <!-- Context bottom sheet -->
        <div id="chat-ctx-sheet">
            <div class="overlay" onclick="window._closeCtxSheet()"></div>
            <div class="sheet">
                <div class="sheet-handle"></div>
                <div id="ctx-sheet-body"></div>
            </div>
        </div>`;

        // ── Real-time messages listener ──────────────────────────────────────
        const msgBox = document.getElementById('chat-messages');
        let unsubscribe = null;

        unsubscribe = window.db.listenToChatMessages(thread.id, (messages) => {
            const header = msgBox.querySelector('[data-header]');
            msgBox.innerHTML = '';
            if (header) msgBox.appendChild(header);

            const clearedAt = role === 'guest' ? window._currentChatThread?.clearedByGuestAt : window._currentChatThread?.clearedByManagerAt;

            const visibleMessages = messages.filter(msg => {
                if (clearedAt && msg.createdAt < clearedAt) return false;
                if (role === 'guest' && msg.hiddenForGuest) return false;
                if (role === 'manager' && msg.hiddenForManager) return false;
                return true;
            });

            // Auto-mark as read if receiver is viewing
            const unreadOthers = visibleMessages.filter(m => m.senderId !== user.uid && !m.readAt);
            if (unreadOthers.length > 0) {
                window.db.markThreadRead(thread.id, user.uid).catch(() => {});
            }

            if (visibleMessages.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'text-align:center;color:#aaa;font-size:0.85rem;margin-top:2rem;';
                empty.textContent = clearedAt ? '📭 History cleared.' : (role === 'guest' ? '✉️ Send your first message to the hotel.' : '✉️ No messages yet from this guest.');
                msgBox.appendChild(empty);
                return;
            }

            let lastDate = '';

            visibleMessages.forEach(msg => {
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
                wrap.className = 'msg-bubble-wrap';
                wrap.style.cssText = `justify-content:${isMe ? 'flex-end' : 'flex-start'};`;

                const bubble = document.createElement('div');
                bubble.className = 'msg-bubble';
                bubble.dataset.msgId = msg.id;
                bubble.style.cssText = `max-width:78%;background:${isMe ? 'var(--color-primary)' : 'white'};color:${isMe ? 'white' : 'var(--color-text-dark)'};padding:0.65rem 0.9rem;border-radius:${isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px'};font-size:0.88rem;line-height:1.5;box-shadow:var(--shadow-sm);word-break:break-word;border:${isMe ? 'none' : '1px solid var(--color-border)'};user-select:none;cursor:${isMe && !msg.isDeleted ? 'pointer' : 'default'};`;

                let escaped = String(msg.text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

                // If it's the fallback "📷 Photo" and we have an image, hide the text so it's just the clean photo bubble!
                if (msg.imageUrl && escaped === '📷 Photo') {
                    escaped = '';
                }

                let imageHtml = '';
                if (msg.imageUrl) {
                    imageHtml = `
                        <div style="position:relative; margin-bottom: ${escaped ? '0.5rem' : '0px'}; border-radius: 12px; overflow: hidden; border: 1px solid ${isMe ? 'rgba(255,255,255,0.2)' : 'var(--color-border)'}; cursor: pointer; max-width: 100%; transition: opacity 0.2s;" 
                             onclick="window._showFullPhoto(event, '${msg.imageUrl}')"
                             class="msg-image-container">
                            <img src="${msg.imageUrl}" style="display: block; width: 100%; max-height: 240px; object-fit: cover;" alt="Image attachment" />
                        </div>
                    `;
                }

                // Read receipt
                let receipt = '';
                if (isMe) {
                    receipt = msg.readAt
                        ? ' · <span style="color:#3b82f6;font-weight:700;font-size:0.75rem;" title="Seen">✓✓</span>'
                        : ' · <span style="color:#9ca3af;font-weight:700;font-size:0.75rem;" title="Delivered">✓✓</span>';
                }

                const messageText = msg.isDeleted
                    ? `<em style="opacity:0.6;font-size:0.85rem;">🚫 This message was deleted</em>`
                    : (imageHtml + (escaped ? escaped.replace(/\n/g,'<br>') : ''));

                bubble.innerHTML = `${messageText}
                    <div style="font-size:0.65rem;opacity:0.65;text-align:${isMe?'right':'left'};margin-top:3.5px;display:flex;align-items:center;justify-content:${isMe?'flex-end':'flex-start'};gap:3px;">
                        <span>${timeStr}</span>
                        ${msg.editedAt && !msg.isDeleted ? '<em style="font-size:0.6rem;">(Edited)</em>' : ''}
                        ${receipt}
                    </div>`;

                // Long-press / hold to open context menu (only for own non-deleted messages)
                if (isMe && !msg.isDeleted) {
                    let pressTimer = null;

                    const openMenu = (e) => {
                        e.preventDefault();
                        // highlight bubble
                        document.querySelectorAll('.msg-bubble.highlighted').forEach(b => b.classList.remove('highlighted'));
                        bubble.classList.add('highlighted');
                        window._showCtxSheet(msg);
                    };

                    // Mobile: long press
                    bubble.addEventListener('touchstart', (e) => {
                        pressTimer = setTimeout(() => openMenu(e), 350);
                    }, { passive: true });
                    bubble.addEventListener('touchend', () => clearTimeout(pressTimer));
                    bubble.addEventListener('touchmove', () => clearTimeout(pressTimer));

                    // Desktop: right-click
                    bubble.addEventListener('contextmenu', openMenu);
                }

                wrap.appendChild(bubble);
                msgBox.appendChild(wrap);
            });

            msgBox.scrollTop = msgBox.scrollHeight;
        });

        // Store thread for reference
        window._currentChatThread = thread;

        // ── Context Sheet ────────────────────────────────────────────────────
        window._closeCtxSheet = () => {
            document.getElementById('chat-ctx-sheet').style.display = 'none';
            document.querySelectorAll('.msg-bubble.highlighted').forEach(b => b.classList.remove('highlighted'));
        };

        window._showCtxSheet = (msg) => {
            const sheet = document.getElementById('chat-ctx-sheet');
            const body  = document.getElementById('ctx-sheet-body');
            body.innerHTML = `
                <div style="padding:0 0.5rem;">
                    <div style="text-align:center; color:#94a3b8; font-size:0.7rem; font-weight:800; text-transform:uppercase; margin-bottom:1rem; letter-spacing:1px;">Message Options</div>
                    
                    <button class="ctx-btn" onclick="window._editMsg('${msg.id}', \`${msg.text.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">
                        <span class="icon" style="background:#f0fdf4;color:#16a34a;">✏️</span>
                        <div style="display:flex; flex-direction:column;">
                            <span>Edit Message</span>
                            <span style="font-size:0.75rem; color:#94a3b8; font-weight:400;">Modify your sent message</span>
                        </div>
                    </button>

                    <button class="ctx-btn" onclick="window._delMsg('${msg.id}')">
                        <span class="icon" style="background:#fff7ed;color:#ea580c;">🗑️</span>
                        <div style="display:flex; flex-direction:column;">
                            <span>Delete for Me</span>
                            <span style="font-size:0.75rem; color:#94a3b8; font-weight:400;">Hide from your conversation</span>
                        </div>
                    </button>

                    <button class="ctx-btn danger-strong" onclick="window._delForEveryone('${msg.id}')">
                        <span class="icon" style="background:#fef2f2;color:#dc2626;">🚫</span>
                        <div style="display:flex; flex-direction:column;">
                            <span>Delete for Everyone</span>
                            <span style="font-size:0.75rem; color:#f87171; font-weight:400;">Permanent removal for both parties</span>
                        </div>
                    </button>

                    <button class="ctx-btn" onclick="window._closeCtxSheet()" style="color:#64748b; margin-top:1.5rem; background:#f8fafc; border-radius:16px; border-bottom:none; justify-content:center; gap:0.5rem; padding:0.8rem;">
                        <span>Dismiss</span>
                    </button>
                </div>`;
            sheet.style.display = 'block';
        };

        // ── Edit Message ─────────────────────────────────────────────────────
        window._editMsg = (msgId, oldText) => {
            window._closeCtxSheet();
            _editingMsgId = msgId;
            const input = document.getElementById('chat-input');
            const editBar = document.getElementById('edit-bar');
            const sendBtn = document.getElementById('send-btn');

            input.value = oldText;
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
            input.focus();
            editBar.classList.add('active');

            // Change send icon to checkmark
            sendBtn.innerHTML = `<svg width="18" height="18" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
            sendBtn.style.background = '#d97706';
        };

        window._cancelEdit = () => {
            _editingMsgId = null;
            const input = document.getElementById('chat-input');
            const editBar = document.getElementById('edit-bar');
            const sendBtn = document.getElementById('send-btn');
            input.value = '';
            input.style.height = 'auto';
            editBar.classList.remove('active');
            sendBtn.innerHTML = `<svg width="18" height="18" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
            sendBtn.style.background = 'var(--color-primary)';
        };

        // ── Delete for Me ────────────────────────────────────────────────────
        window._delMsg = async (msgId) => {
            window._closeCtxSheet();
            const confirmed = await window.showConfirm({
                title: 'Delete for Me?',
                message: 'This message will be hidden from your view but remain visible to the other person.',
                confirmText: 'Delete for Me',
                type: 'warning'
            });
            if (confirmed) {
                try {
                    await window.db.deleteChatMessageForMe(thread.id, msgId, role);
                } catch(e) { window.showToast('❌ Error: ' + e.message); }
            }
        };

        // ── Delete for Everyone ──────────────────────────────────────────────
        window._delForEveryone = async (msgId) => {
            window._closeCtxSheet();
            const confirmed = await window.showConfirm({
                title: 'Delete for Everyone?',
                message: 'This will permanently remove the message for both you and the other person. This cannot be undone.',
                confirmText: 'Delete for Everyone',
                type: 'danger'
            });
            if (confirmed) {
                try {
                    await window.db.deleteChatMessageForEveryone(thread.id, msgId);
                    window.showToast('🗑️ Deleted for everyone.');
                } catch(e) { window.showToast('❌ Error: ' + e.message); }
            }
        };

        // ── Clear Chat History ───────────────────────────────────────────────
        window._clearChatHistory = async (tid, userRole) => {
            const confirmed = await window.showConfirm({
                title: 'Clear History?',
                message: 'All current messages will be hidden from your view. The other person will still be able to see their copy of the conversation.',
                confirmText: 'Clear My History',
                type: 'danger'
            });
            if (confirmed) {
                try {
                    await window.db.clearChatHistory(tid, userRole);
                    window._currentChatThread[userRole === 'guest' ? 'clearedByGuestAt' : 'clearedByManagerAt'] = new Date().toISOString();
                    window.showToast('✅ History cleared.');
                } catch(e) { window.showToast('Error: ' + e.message); }
            }
        };

        // ── Photo Attachment Handlers ────────────────────────────────────────
        window._handleChatPhotoSelect = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // Check file size (limit to 10MB)
            if (file.size > 10 * 1024 * 1024) {
                window.showAlert('Image size should be less than 10MB.');
                event.target.value = '';
                return;
            }

            _selectedPhotoFile = file;

            const previewBar = document.getElementById('photo-preview-bar');
            const previewImg = document.getElementById('photo-preview-img');
            const nameEl = document.getElementById('photo-preview-name');
            const sizeEl = document.getElementById('photo-preview-size');

            nameEl.textContent = file.name;
            sizeEl.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

            // Read file for local preview
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewBar.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        };

        window._clearChatPhoto = () => {
            _selectedPhotoFile = null;
            const input = document.getElementById('chat-photo-input');
            if (input) input.value = '';
            const previewBar = document.getElementById('photo-preview-bar');
            if (previewBar) previewBar.style.display = 'none';
        };

        // ── Full-screen Zoom Viewer Overlay ──────────────────────────────────
        window._showFullPhoto = (event, url) => {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            let overlay = document.getElementById('chat-photo-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'chat-photo-overlay';
                overlay.style.cssText = `
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.95);
                    z-index: 99999;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.25s ease-out;
                    pointer-events: none;
                    backdrop-filter: blur(8px);
                `;
                overlay.innerHTML = `
                    <button onclick="window._closeFullPhoto()" style="position: absolute; top: calc(1rem + env(safe-area-inset-top, 0px)); right: 1rem; border: none; background: rgba(255, 255, 255, 0.15); color: white; width: 44px; height: 44px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;">✕</button>
                    <div style="position: absolute; bottom: calc(2rem + env(safe-area-inset-bottom, 0px)); display: flex; gap: 1rem; z-index: 10;">
                        <a id="chat-photo-download-link" href="" download target="_blank" style="text-decoration: none; display: flex; align-items: center; gap: 0.5rem; background: var(--color-primary); color: white; padding: 0.75rem 1.5rem; border-radius: 30px; font-weight: 700; font-size: 0.9rem; box-shadow: 0 4px 12px rgba(11,110,79,0.3); border: none; cursor: pointer;">
                            <span>💾 Download</span>
                        </a>
                    </div>
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 2rem; box-sizing: border-box;" onclick="window._closeFullPhoto()">
                        <img id="chat-photo-overlay-img" style="max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 12px 30px rgba(0,0,0,0.5); transform: scale(0.95); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);" />
                    </div>
                `;
                document.body.appendChild(overlay);
            }

            const img = document.getElementById('chat-photo-overlay-img');
            const downloadLink = document.getElementById('chat-photo-download-link');

            img.src = url;
            downloadLink.href = url;

            overlay.style.pointerEvents = 'auto';
            overlay.style.opacity = '1';
            setTimeout(() => {
                img.style.transform = 'scale(1)';
            }, 10);
        };

        window._closeFullPhoto = () => {
            const overlay = document.getElementById('chat-photo-overlay');
            if (overlay) {
                const img = document.getElementById('chat-photo-overlay-img');
                if (img) img.style.transform = 'scale(0.95)';
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
            }
        };

        // ── Send / Save Edit ─────────────────────────────────────────────────
        window._sendChat = async () => {
            const input = document.getElementById('chat-input');
            const text  = (input?.value || '').trim();

            if (!text && !_selectedPhotoFile) return;

            // If editing, save edit
            if (_editingMsgId) {
                if (!text) return;
                const editId = _editingMsgId;
                window._cancelEdit();
                try {
                    await window.db.editChatMessage(thread.id, editId, text);
                    window.showToast('✅ Message updated.');
                } catch(e) { window.showToast('❌ Edit failed: ' + e.message); }
                return;
            }

            // Normal send - with upload if file selected
            let imageUrl = null;
            const fileToSend = _selectedPhotoFile;

            if (fileToSend) {
                const spinner = document.getElementById('photo-upload-spinner');
                if (spinner) spinner.style.display = 'flex';

                if (input) input.disabled = true;
                const attachBtn = document.getElementById('attach-btn');
                const sendBtn = document.getElementById('send-btn');
                if (attachBtn) attachBtn.disabled = true;
                if (sendBtn) sendBtn.disabled = true;

                try {
                    // Upload via window.db.uploadFile to folder 'chat_attachments'
                    imageUrl = await window.db.uploadFile(fileToSend, 'chat_attachments');
                } catch (uploadErr) {
                    console.error('Photo upload failed:', uploadErr);
                    window.showAlert('Failed to upload image. Please try again.');

                    if (spinner) spinner.style.display = 'none';
                    if (input) input.disabled = false;
                    if (attachBtn) attachBtn.disabled = false;
                    if (sendBtn) sendBtn.disabled = false;
                    return;
                }

                window._clearChatPhoto();

                if (spinner) spinner.style.display = 'none';
                if (input) input.disabled = false;
                if (attachBtn) attachBtn.disabled = false;
                if (sendBtn) sendBtn.disabled = false;
            }

            const messageTextToSend = text || "📷 Photo";

            input.value = '';
            input.style.height = 'auto';
            try {
                await window.db.sendChatMessage(thread.id, {
                    senderId:   user.uid,
                    senderName: window.auth.userData?.fullName || window.auth.userData?.name || user.email,
                    senderRole: role,
                    text:       messageTextToSend,
                    imageUrl:   imageUrl
                });
                const targetId = role === 'guest' ? thread.managerId : thread.guestId;
                await window.db.createNotification({
                    message:      role === 'guest' ? `💬 New message from ${window.auth.userData?.fullName || 'Guest'}` : `💬 Hotel replied to your message`,
                    details:      messageTextToSend.length > 80 ? messageTextToSend.slice(0,80)+'…' : messageTextToSend,
                    targetUserId: targetId,
                    type:         'chat_message',
                    link:         'chat',
                    params:       { bookingId: thread.bookingId || '', propertyId: thread.propertyId }
                });
                if (role === 'guest') {
                    window.db.triggerPushNotification(thread.propertyId, `💬 New message from ${window.auth.userData?.fullName || 'Guest'}`, messageTextToSend.length > 80 ? messageTextToSend.slice(0,80)+'…' : messageTextToSend).catch(() => {});
                }
            } catch(err) {
                console.error('Send error:', err);
                window.showAlert('Failed to send. Check your connection.');
            }
        };

        // Cleanup on navigate away
        const _origNav = window.router.navigate.bind(window.router);
        window.router.navigate = (...args) => {
            if (unsubscribe) { unsubscribe(); unsubscribe = null; }

            // Clean up window handlers
            delete window._handleChatPhotoSelect;
            delete window._clearChatPhoto;
            delete window._showFullPhoto;
            delete window._closeFullPhoto;

            // Clean up full screen zoom modal
            const overlay = document.getElementById('chat-photo-overlay');
            if (overlay) overlay.remove();

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
