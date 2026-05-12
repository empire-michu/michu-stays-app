const fs = require('fs');
const path = require('path');

const base = 'c:/Users/HP/Desktop/Michu Stays/Michu AntiGravity Trial 1';

// 1. i18n.js
const i18nPath = path.join(base, 'js/i18n.js');
let i18n = fs.readFileSync(i18nPath, 'utf8');
i18n = i18n.replace(/\"⭐ Real Stories from our Stays\": \"⭐ /g, '\"⭐ Real Stories from our Stays\": \"');
i18n = i18n.replace(/\"⭐ Real Stories from our Stays\": \"\? /g, '\"⭐ Real Stories from our Stays\": \"');
i18n = i18n.replace(/\"🏦 /g, '\"');
i18n = i18n.replace(/\": \"🏦 /g, '\": \"');
i18n = i18n.replace(/\"📱 /g, '\"');
i18n = i18n.replace(/\": \"📱 /g, '\": \"');
fs.writeFileSync(i18nPath, i18n);

// 2. hotel-detail.js
const hotelDetailPath = path.join(base, 'js/views/hotel-detail.js');
let hd = fs.readFileSync(hotelDetailPath, 'utf8');
const amenitiesSVG = `const amenitiesIcons = {
        'WiFi': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>',
        'Pool': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 22a8 8 0 0 0 20 0"></path><path d="M16 14v4"></path><path d="M8 14v4"></path><path d="M12 14v4"></path></svg>',
        'Spa': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"></path><path d="M6 9h12"></path><path d=\"M6 15h12\"></path></svg>',
        'Breakfast': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
        'Parking': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"></rect><circle cx="7" cy="15" r="2"></circle><circle cx="17" cy="15" r=\"2\"></circle></svg>',
        'Gym': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11"></path><path d=\"M21 21l-1-1\"></path><path d=\"M3 3l1 1\"></path><path d=\"M18 22l4-4\"></path><path d=\"M2 6l4-4\"></path><path d=\"M3 10l7-7\"></path><path d=\"M14 21l7-7\"></path></svg>',
        'AC': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="M8.5 4.5L12 8l3.5-3.5"></path><path d="M20.5 10.5L17 14l3.5 3.5"></path><path d="M3.5 13.5L7 10 3.5 6.5"></path><path d="M15.5 19.5L12 16l-3.5 3.5"></path></svg>',
        'Bar': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"></path><path d="M12 15v7"></path><path d="M12 15l-8-8V2h16v5z"></path></svg>'
    };`;
hd = hd.replace(/const amenitiesIcons = \{.*?\};/s, amenitiesSVG);
// Fix the unicode emojis in hotel-detail.js
// 🎁 = \uD83C\uDF81, 🌙 = \uD83C\uDF19
hd = hd.replace(/>\uD83C\uDF81<\/span>/g, '><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg></span>');
hd = hd.replace(/>\uD83C\uDF19<\/span>/g, '><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></span>');
// Sometimes it's parsed literally as the emoji character
hd = hd.replace(/>🎁<\/span>/g, '><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg></span>');
hd = hd.replace(/>🌙<\/span>/g, '><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg></span>');

fs.writeFileSync(hotelDetailPath, hd);

// 3. booking.js
const bookingPath = path.join(base, 'js/views/booking.js');
let b = fs.readFileSync(bookingPath, 'utf8');
// 🗓️ = \uD83D\uDDD3\uFE0F
b = b.replace(/>\uD83D\uDDD3\uFE0F<\/span>/g, '><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>');
b = b.replace(/>🗓️<\/span>/g, '><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></span>');

b = b.replace(/>\uD83C\uDF81<\/span>/g, '><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg></span>');
b = b.replace(/>🎁<\/span>/g, '><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg></span>');

// 🏦 = \uD83C\uDFE6
b = b.replace(/>\uD83C\uDFE6<\/span>/g, '><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M3 7v1a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V7"></path><path d="M12 2L3 7h18z"></path><path d="M6 11v6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M18 11v6"></path></svg></span>');
b = b.replace(/>🏦<\/span>/g, '><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M3 7v1a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V7"></path><path d="M12 2L3 7h18z"></path><path d="M6 11v6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M18 11v6"></path></svg></span>');

// 📱 = \uD83D\uDCF1
b = b.replace(/>\uD83D\uDCF1<\/span>/g, '><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></span>');
b = b.replace(/>📱<\/span>/g, '><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></span>');

fs.writeFileSync(bookingPath, b);
console.log('Script executed successfully');
