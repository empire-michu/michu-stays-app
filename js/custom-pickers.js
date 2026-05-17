// js/custom-pickers.js

document.addEventListener('DOMContentLoaded', () => {
    injectPickerStyles();
    initCustomPickers();
});

// Observe DOM changes for dynamically loaded views
const observer = new MutationObserver(() => {
    initCustomPickers();
});
observer.observe(document.body, { childList: true, subtree: true });

function injectPickerStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Flatpickr Michu Stays Branded Theme */
        .flatpickr-calendar {
            font-family: 'Outfit', sans-serif !important;
            border-radius: 16px !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
            border: none !important;
        }
        .flatpickr-day.selected, .flatpickr-day.startRange, .flatpickr-day.endRange, .flatpickr-day.selected.inRange, .flatpickr-day.startRange.inRange, .flatpickr-day.endRange.inRange, .flatpickr-day.selected:focus, .flatpickr-day.startRange:focus, .flatpickr-day.endRange:focus, .flatpickr-day.selected:hover, .flatpickr-day.startRange:hover, .flatpickr-day.endRange:hover, .flatpickr-day.selected.prevMonthDay, .flatpickr-day.startRange.prevMonthDay, .flatpickr-day.endRange.prevMonthDay, .flatpickr-day.selected.nextMonthDay, .flatpickr-day.startRange.nextMonthDay, .flatpickr-day.endRange.nextMonthDay {
            background: #0B6E4F !important;
            border-color: #0B6E4F !important;
        }
        .flatpickr-day.inRange {
            background: rgba(11, 110, 79, 0.1) !important;
            border-color: transparent !important;
            box-shadow: none !important;
        }
        .flatpickr-current-month .flatpickr-monthDropdown-months {
            font-weight: 700 !important;
        }
    `;
    document.head.appendChild(style);
}

function initCustomPickers() {
    // 1. FLAT PICKR for Dates
    const dateInputs = document.querySelectorAll('input[type="date"]:not(.flatpickr-initialized)');
    dateInputs.forEach(input => {
        input.classList.add('flatpickr-initialized');
        // Convert to text so native Android picker never flashes
        input.type = 'text';
        input.style.cursor = 'pointer';
        
        flatpickr(input, {
            dateFormat: "Y-m-d",
            disableMobile: true, // IMPORTANT: Forces flatpickr UI on mobile instead of native fallback
            onChange: function(selectedDates, dateStr, instance) {
                // Trigger inline onchange if any
                const event = new Event('change', { bubbles: true });
                input.dispatchEvent(event);
            }
        });
    });

    // 2. CUSTOM BOTTOM SHEET for Selects
    const selects = document.querySelectorAll('select:not(.custom-select-initialized)');
    selects.forEach(select => {
        select.classList.add('custom-select-initialized');
        
        // Disable native clicking but allow our JS to handle it
        const openCustomSelect = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const optionsContainer = document.getElementById('custom-select-options');
            if(!optionsContainer) return;
            
            optionsContainer.innerHTML = '';
            
            const titleEl = document.getElementById('custom-select-title');
            // Try to find a label or default title
            let labelText = 'Select Option';
            const prevLabel = select.previousElementSibling;
            if (prevLabel && prevLabel.tagName.toLowerCase() === 'label') {
                labelText = prevLabel.innerText;
            } else if (select.id) {
                labelText = select.id.replace(/-/g, ' ').toUpperCase();
            }
            titleEl.innerText = labelText;

            Array.from(select.options).forEach(opt => {
                const isSelected = opt.value === select.value;
                const optDiv = document.createElement('div');
                optDiv.style.padding = '1.2rem 1rem';
                optDiv.style.borderRadius = '16px';
                optDiv.style.background = isSelected ? 'rgba(11, 110, 79, 0.08)' : '#f8fafc';
                optDiv.style.border = `2px solid ${isSelected ? '#0B6E4F' : 'transparent'}`;
                optDiv.style.color = isSelected ? '#0B6E4F' : '#1e293b';
                optDiv.style.fontWeight = isSelected ? '800' : '600';
                optDiv.style.fontSize = '1.05rem';
                optDiv.style.cursor = 'pointer';
                optDiv.style.display = 'flex';
                optDiv.style.alignItems = 'center';
                optDiv.style.justifyContent = 'space-between';
                optDiv.style.transition = 'all 0.2s';
                
                optDiv.innerHTML = `
                    <span>${opt.text}</span>
                    <div style="width:24px; height:24px; border-radius:50%; border:2.5px solid ${isSelected ? '#0B6E4F' : '#cbd5e1'}; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                        ${isSelected ? '<div style="width:12px; height:12px; background:#0B6E4F; border-radius:50%;"></div>' : ''}
                    </div>
                `;
                
                optDiv.onclick = () => {
                    select.value = opt.value;
                    const event = new Event('change', { bubbles: true });
                    select.dispatchEvent(event);
                    window.closeCustomSelect();
                };
                optionsContainer.appendChild(optDiv);
            });
            
            // Show overlay
            const overlay = document.getElementById('custom-select-overlay');
            const sheet = document.getElementById('custom-select-sheet');
            overlay.style.display = 'flex';
            // Reflow
            void overlay.offsetWidth;
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
            sheet.style.bottom = '0';
        };

        // Prevent native Android/iOS select UI
        select.addEventListener('mousedown', openCustomSelect);
        select.addEventListener('touchstart', openCustomSelect, { passive: false });
        select.addEventListener('click', (e) => e.preventDefault());
        
        // Prevent keyboard
        select.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openCustomSelect(e);
            }
        });
    });
}

window.closeCustomSelect = () => {
    const overlay = document.getElementById('custom-select-overlay');
    const sheet = document.getElementById('custom-select-sheet');
    if(!overlay || !sheet) return;
    
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    sheet.style.bottom = '-100%';
    setTimeout(() => {
        overlay.style.display = 'none';
    }, 300);
};
