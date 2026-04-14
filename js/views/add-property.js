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
                        <div class="form-group">
                            <label>Price per Night (Birr)</label>
                            <input type="number" id="prop-price" required placeholder="1000" min="1">
                        </div>
                    </div>

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
            const price = parseInt(document.getElementById('prop-price').value);
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
                managerId: window.auth?.currentUser?.uid || ''
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
