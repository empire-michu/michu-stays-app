window.router.addRoute('add-property', (container) => {
    container.innerHTML = `
        <div class="container" style="padding-top: 2rem;">
            <div class="flex space-between align-center" style="margin-bottom: 2rem;">
                <h2>Add New Property</h2>
                <button class="btn-outline" onclick="router.navigate('manager')">← Back to Dashboard</button>
            </div>

            <div class="form-card">
                <form id="add-property-form" onsubmit="event.preventDefault(); submitProperty();">
                    <div class="form-group">
                        <label>Property/Hotel Name</label>
                        <input type="text" id="prop-title" required placeholder="e.g. Addis View Hotel">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Property Type</label>
                            <select id="prop-type" required style="width:100%; border:1px solid #ddd; padding:0.8rem; border-radius:8px;">
                                <option value="Hotel">Hotel</option>
                                <option value="Guesthouse">Guesthouse</option>
                                <option value="Apartment">Apartment</option>
                                <option value="Traditional Home">Traditional Home</option>
                            </select>
                        </div>
                    </div>

                    <h3 style="margin: 2rem 0 1rem; color: var(--color-primary); font-weight:800; font-size:1.1rem; display:flex; align-items:center; gap:0.5rem;">🔑 Room Types & Beds Configuration</h3>
                    <p style="font-size: 0.8rem; color: #666; margin-bottom: 1.2rem; line-height:1.4;">Add the room types and bed configurations for this property. The lowest room price will be displayed as the main starting price in search listings.</p>
                    
                    <div id="prop-rooms-container" style="display:grid; gap:1.2rem; margin-bottom:1.5rem;">
                        <div class="prop-room-row" style="background:#f8fafc; padding:1.2rem; border-radius:12px; border:1px solid #cbd5e1; display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; position:relative;">
                            <button type="button" onclick="this.parentElement.remove()" style="position:absolute; top:0.8rem; right:0.8rem; background:none; border:none; color:#ff385c; cursor:pointer; font-size:1.1rem; font-weight:800; z-index:10;">✕</button>
                            <div style="grid-column: 1 / -1; margin-right: 2rem;">
                                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Room Type Name</label>
                                <input type="text" placeholder="e.g. Standard Single Room" value="Standard Single Room" class="prop-room-name" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
                            </div>
                            <div style="grid-column: 1 / -1;">
                                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Description</label>
                                <input type="text" placeholder="e.g. Cozy single bed room with private bathroom" value="Cozy single bed room with private bathroom" class="prop-room-desc" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
                            </div>
                            <div>
                                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Price per Night (Birr)</label>
                                <input type="number" placeholder="Price" value="1200" class="prop-room-price" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700; color:var(--color-primary);">
                            </div>
                            <div>
                                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Max Guests Capacity</label>
                                <input type="number" placeholder="Capacity" value="1" class="prop-room-capacity" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
                            </div>
                            <div>
                                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Bed Configurations</label>
                                <input type="text" placeholder="e.g. 1 Single Bed" value="1 Single Bed" class="prop-room-beds" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
                            </div>
                            <div>
                                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Quantity (Total Rooms)</label>
                                <input type="number" placeholder="Total Rooms" value="5" class="prop-room-total-rooms" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
                            </div>
                        </div>
                    </div>
                    
                    <button type="button" onclick="window.addPropRoomType()" style="width:100%; margin-bottom:2rem; padding:0.8rem; border-radius:12px; border:1.5px dashed var(--color-primary); background:none; color:var(--color-primary); font-weight:700; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#f0fdf4'">+ Add Another Room Type</button>

                    <div class="form-group">
                        <label>Address / Location</label>
                        <input type="text" id="prop-address" required placeholder="e.g. 123 Bole Road, Addis Ababa">
                    </div>

                    <div class="form-group">
                        <label>Google Maps Search Term (Optional)</label>
                        <input type="text" id="prop-map-query" placeholder="e.g. Sheraton Addis Ababa">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Distance from City Centre (km)</label>
                            <input type="number" id="prop-distance" step="0.1" min="0" placeholder="e.g. 2.5">
                        </div>
                        <div class="form-group">
                            <label>Discount (%)</label>
                            <input type="number" id="prop-discount" min="0" max="90" placeholder="e.g. 15 (leave empty for none)">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Reception Phone Number</label>
                        <input type="text" id="prop-phone" required placeholder="+251 9...">
                    </div>

                    <h3 style="margin: 2rem 0 1rem; color: var(--color-primary);">CBE Bank Details</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label>CBE Account Number</label>
                            <input type="text" id="prop-cbe-acc" required placeholder="1000...">
                        </div>
                        <div class="form-group">
                            <label>CBE Account Name</label>
                            <input type="text" id="prop-cbe-name" required placeholder="Exact name on account">
                        </div>
                    </div>

                    <h3 style="margin: 2rem 0 1rem; color: var(--color-primary);">Assignment</h3>
                    <div class="form-group">
                        <label>Assigned Manager User ID (Optional)</label>
                        <input type="text" id="prop-manager-id" placeholder="Paste Manager's UID here (defaults to you)">
                        <p style="font-size: 0.75rem; color: #888; margin-top: 0.3rem;">Link this property to a manager's account to give them dashboard access.</p>
                    </div>

                    <h3 style="margin: 2rem 0 1rem; color: var(--color-primary);">Media Gallery (1 Video + 10 Photos)</h3>
                    <p style="font-size: 0.9rem; color: #666; margin-bottom: 1.5rem;">Upload high-quality visuals to attract more guests.</p>
                    
                    <div class="form-group">
                        <label>Video Tour (Watchable from Gallery)</label>
                        <input type="file" id="prop-video" accept="video/mp4,video/x-m4v,video/*" style="width:100%; padding:0.5rem; border:1px dashed #ccc; border-radius:8px;">
                    </div>

                    <div class="form-group">
                        <label>Photo Gallery (Max 10 photos)</label>
                        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap:1rem; margin-top:0.5rem;">
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `
                                <div class="upload-slot" id="slot-${i}" style="border:2px dashed #eee; height:100px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-direction:column; cursor:pointer; position:relative; overflow:hidden;">
                                    <span style="font-size:1.5rem;">📸</span>
                                    <span style="font-size:0.7rem;">Photo ${i}</span>
                                    <input type="file" id="photo-file-${i}" accept="image/*" onchange="previewImage(${i}, this)" style="position:absolute; inset:0; opacity:0; cursor:pointer;">
                                    <img id="preview-${i}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:none;">
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <p id="prop-upload-status" style="text-align:center; color:var(--color-secondary); font-weight:600; margin-top:1rem;"></p>

                    <div style="margin-top: 3rem;">
                        <button type="submit" id="submit-btn" class="btn-primary" style="width: 100%; font-size: 1.1rem; padding: 1rem;">Publish Property</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Internal preview helper
    window.previewImage = (id, input) => {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.getElementById(`preview-${id}`);
                img.src = e.target.result;
                img.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    };

    window.addPropRoomType = () => {
        const container = document.getElementById('prop-rooms-container');
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'prop-room-row';
        div.style.cssText = `background:#f8fafc; padding:1.2rem; border-radius:12px; border:1px solid #cbd5e1; display:grid; grid-template-columns:1fr 1fr; gap:0.8rem; position:relative; margin-bottom:0.5rem;`;
        div.innerHTML = `
            <button type="button" onclick="this.parentElement.remove()" style="position:absolute; top:0.8rem; right:0.8rem; background:none; border:none; color:#ff385c; cursor:pointer; font-size:1.1rem; font-weight:800; z-index:10;">✕</button>
            <div style="grid-column: 1 / -1; margin-right: 2rem;">
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Room Type Name</label>
                <input type="text" placeholder="e.g. Deluxe Room" class="prop-room-name" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
            </div>
            <div style="grid-column: 1 / -1;">
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Description</label>
                <input type="text" placeholder="e.g. Ocean view, balcony" class="prop-room-desc" style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Price per Night (Birr)</label>
                <input type="number" placeholder="Price" class="prop-room-price" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700; color:var(--color-primary);">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Max Guests Capacity</label>
                <input type="number" placeholder="Capacity" value="2" class="prop-room-capacity" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Bed Configurations</label>
                <input type="text" placeholder="e.g. 1 King Bed" class="prop-room-beds" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem;">
            </div>
            <div>
                <label style="display:block; font-weight:800; font-size:0.65rem; color:#64748b; margin-bottom:0.3rem; text-transform:uppercase;">Quantity (Total Rooms)</label>
                <input type="number" placeholder="Total Rooms" value="5" class="prop-room-total-rooms" required style="width:100%; padding:0.6rem; border:1px solid #cbd5e1; border-radius:8px; font-size:0.85rem; font-weight:700;">
            </div>
        `;
        container.appendChild(div);
    };

    let propUploadSkipped = false;
    let propUploadAborted = false;
    window.skipPropUpload = () => {
        propUploadSkipped = true;
        if (window.db.lastTask) { try { window.db.lastTask.cancel(); } catch(e){} }
        window.showToast("⏩ Skipping Media Upload...");
    };
    window.cancelPropUpload = () => {
        propUploadAborted = true;
        if (window.db.lastTask) { try { window.db.lastTask.cancel(); } catch(e){} }
        window.showToast("🛑 Upload Canceled");
    };

    window.submitProperty = async () => {
        const statusEl = document.getElementById('prop-upload-status');
        const submitBtn = document.getElementById('submit-btn');
        propUploadSkipped = false;
        propUploadAborted = false;
        
        try {
            submitBtn.disabled = true;
            statusEl.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:0.5rem;">
                    <span id="prop-status-text">Uploading media to Firebase...</span>
                    <div id="prop-skip-container" style="display:none; gap:0.5rem;">
                        <button type="button" class="btn-outline" style="padding:0.4rem 0.8rem; font-size:0.75rem; border-color:#888; color:#888;" onclick="window.skipPropUpload()">Skip Media & Publish</button>
                        <button type="button" class="btn-outline" style="padding:0.4rem 0.8rem; font-size:0.75rem; border-color:red; color:red;" onclick="window.cancelPropUpload()">Cancel Posting</button>
                    </div>
                </div>
            `;
            const statusText = document.getElementById('prop-status-text');
            const skipContainer = document.getElementById('prop-skip-container');
            
            let skipTimer = setInterval(() => {
                const currentText = statusText.innerText || "";
                if (currentText.includes('0%') || currentText.includes('Uploading Photo')) {
                    skipContainer.style.display = 'flex';
                }
            }, 3000);

            const title = document.getElementById('prop-title').value;
            const type = document.getElementById('prop-type').value;
            const address = document.getElementById('prop-address').value;
            
            // Extract roomTypes
            const roomTypesArr = Array.from(document.querySelectorAll('.prop-room-row')).map((row, idx) => ({
                id: `room_${idx}_${Date.now()}`,
                name: row.querySelector('.prop-room-name').value.trim(),
                description: row.querySelector('.prop-room-desc').value.trim(),
                price: parseInt(row.querySelector('.prop-room-price').value) || 0,
                capacity: parseInt(row.querySelector('.prop-room-capacity').value) || 2,
                beds: row.querySelector('.prop-room-beds').value.trim(),
                totalRooms: parseInt(row.querySelector('.prop-room-total-rooms').value) || 1
            })).filter(r => r.name && r.price);

            if (roomTypesArr.length === 0) {
                throw new Error("Please add at least one room type with a valid price.");
            }

            const price = Math.min(...roomTypesArr.map(r => r.price));
            const availableRooms = roomTypesArr.reduce((sum, r) => sum + r.totalRooms, 0);

            const phone = document.getElementById('prop-phone').value;
            const cbeAccount = document.getElementById('prop-cbe-acc').value;
            const cbeName = document.getElementById('prop-cbe-name').value;
            const mapQuery = document.getElementById('prop-map-query').value.trim();
            const distanceFromCenter = document.getElementById('prop-distance').value ? parseFloat(document.getElementById('prop-distance').value) : 0;
            const discountPercent = document.getElementById('prop-discount').value ? parseInt(document.getElementById('prop-discount').value) : 0;
            const originalPrice = discountPercent > 0 ? Math.round(price / (1 - discountPercent / 100)) : 0;

            const imageUrls = [];
            for (let i = 1; i <= 10; i++) {
                if (propUploadAborted) throw new Error("Canceled");
                if (propUploadSkipped) {
                    continue; // Skip this file
                }
                const fileInput = document.getElementById(`photo-file-${i}`);
                if (fileInput.files[0]) {
                    try {
                        const url = await window.db.uploadFile(fileInput.files[0], 'properties/photos', (percent) => {
                            if (statusText) statusText.innerText = `Uploading Photo ${i} of 10: ${percent}%...`;
                        });
                        imageUrls.push(url);
                    } catch(err) {
                        if (propUploadSkipped) {
                            continue; // Skip file and move to next
                        }
                        throw err;
                    }
                }
            }

            if (propUploadAborted) throw new Error("Canceled");
            
            let videoUrl = '';
            const videoInput = document.getElementById('prop-video');
            if (videoInput.files[0] && !propUploadSkipped) {
                try {
                    videoUrl = await window.db.uploadFile(videoInput.files[0], 'properties/videos', (percent) => {
                        if (statusText) statusText.innerText = `Uploading Video: ${percent}%...`;
                    });
                } catch(err) {
                    if (!propUploadSkipped) throw err;
                }
            }

            if (propUploadAborted) throw new Error("Canceled");
            statusText.innerText = "Media uploaded. Saving property...";

            await window.db.addProperty({
                title,
                type,
                address,
                price,
                availableRooms,
                phone,
                cbeAccount,
                cbeName,
                mapQuery,
                distanceFromCenter,
                discountPercent,
                originalPrice,
                rating: 5.0,
                image: imageUrls[0] || '',
                images: imageUrls,
                videoTour: videoUrl,
                roomTypes: roomTypesArr,
                managerId: document.getElementById('prop-manager-id').value.trim() || window.auth?.currentUser?.uid || ''
            });

            clearInterval(skipTimer);
            window.showToast("Success! Your property is live.");
            window.router.navigate('manager');

        } catch (err) {
            console.error(err);
            if (err.message !== "Canceled") {
                window.showToast("Error publishing property: " + err.message);
            }
            statusEl.innerText = "";
            submitBtn.disabled = false;
        }
    };
});
