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

        /* Custom Select Overlay & Sheet Responsive Premium Styles */
        #custom-select-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.6) !important;
            backdrop-filter: blur(8px) !important;
            z-index: 40000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s cubic-bezier(0.25, 1, 0.5, 1) !important;
        }
        
        #custom-select-overlay.active {
            opacity: 1 !important;
            pointer-events: auto !important;
        }

        #custom-select-sheet {
            background: #ffffff !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3) !important;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            overflow: hidden;
            width: 100% !important;
        }

        /* Option Choice Item Style */
        .custom-select-option {
            padding: 1rem 1.2rem !important;
            border-radius: 16px !important;
            background: #f8fafc !important;
            border: 2px solid transparent !important;
            color: #1e293b !important;
            font-weight: 600 !important;
            font-size: 1.05rem !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            transition: all 0.25s cubic-bezier(0.25, 1, 0.5, 1) !important;
            margin-bottom: 0.5rem !important;
        }
        
        .custom-select-option:hover {
            background: #f1f5f9 !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
        }
        
        .custom-select-option:active {
            transform: translateY(1px) scale(0.98) !important;
        }
        
        .custom-select-option.selected {
            background: rgba(11, 110, 79, 0.06) !important;
            border-color: #0B6E4F !important;
            color: #0B6E4F !important;
            font-weight: 800 !important;
        }

        /* Mobile Viewport Style (Default) */
        @media (max-width: 768px) {
            #custom-select-overlay {
                align-items: flex-end !important;
            }
            #custom-select-sheet {
                max-width: 500px !important;
                margin: 0 auto !important;
                border-radius: 32px 32px 0 0 !important;
                padding: 1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom)) !important;
                max-height: 80vh !important;
                transform: translateY(100%) !important;
                transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
            }
            #custom-select-overlay.active #custom-select-sheet {
                transform: translateY(0) !important;
            }
            .custom-select-drag-bar {
                display: block !important;
            }
        }

        /* Desktop Viewport Style */
        @media (min-width: 769px) {
            #custom-select-overlay {
                align-items: center !important;
            }
            #custom-select-sheet {
                width: 450px !important;
                border-radius: 28px !important;
                padding: 2rem !important;
                max-height: 85vh !important;
                transform: scale(0.92) translateY(15px) !important;
                opacity: 0 !important;
                transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease !important;
            }
            #custom-select-overlay.active #custom-select-sheet {
                transform: scale(1) translateY(0) !important;
                opacity: 1 !important;
            }
            .custom-select-drag-bar {
                display: none !important;
            }
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
                optDiv.className = 'custom-select-option' + (isSelected ? ' selected' : '');
                
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
            if(!overlay) return;
            overlay.style.display = 'flex';
            // Reflow
            void overlay.offsetWidth;
            overlay.classList.add('active');
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
    if(!overlay) return;
    
    overlay.classList.remove('active');
    setTimeout(() => {
        if(!overlay.classList.contains('active')) {
            overlay.style.display = 'none';
        }
    }, 350);
};
