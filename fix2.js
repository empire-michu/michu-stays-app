const fs = require('fs');
const path = require('path');
const base = 'c:/Users/HP/Desktop/Michu Stays/Michu AntiGravity Trial 1';

// 1. home.js
const homePath = path.join(base, 'js/views/home.js');
let h = fs.readFileSync(homePath, 'utf8');

// The unicode values might be converted to strings or left as raw unicode characters.
// We'll replace both possible forms.
// 🏠 = \uD83C\uDFE0
const houseSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; margin-bottom:-2px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
h = h.replace(/>\uD83C\uDFE0 All Stays/g, `>${houseSvg} All Stays`);
h = h.replace(/>🏠 All Stays/g, `>${houseSvg} All Stays`);

// 💛 = \uD83D\uDC9B
const heartSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; margin-bottom:-2px;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
h = h.replace(/>\uD83D\uDC9B Favorites/g, `>${heartSvg} Favorites`);
h = h.replace(/>💛 Favorites/g, `>${heartSvg} Favorites`);

fs.writeFileSync(homePath, h);


// 2. manager.js
const mgrPath = path.join(base, 'js/views/manager.js');
let m = fs.readFileSync(mgrPath, 'utf8');

// 🎁 = \uD83C\uDF81
const giftSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>';
m = m.replace(/>\uD83C\uDF81<\/span> STAY PACKAGES/g, `>${giftSvg}</span> STAY PACKAGES`);
m = m.replace(/>🎁<\/span> STAY PACKAGES/g, `>${giftSvg}</span> STAY PACKAGES`);

// 🎉 = \uD83C\uDF89
const partySvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px; margin-bottom:-2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
m = m.replace(/>\uD83C\uDF89 Event Mode/g, `>${partySvg} Event Mode`);
m = m.replace(/>🎉 Event Mode/g, `>${partySvg} Event Mode`);

// Live Preview inner emojis
// 📍 = \uD83D\uDCCD
const pinSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>';
m = m.replace(/📍/g, pinSvg);
m = m.replace(/\uD83D\uDCCD/g, pinSvg);

// 💡 = \uD83D\uDCA1
const bulbSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>';
m = m.replace(/💡/g, bulbSvg);
m = m.replace(/\uD83D\uDCA1/g, bulbSvg);

// Fix Live Preview layout
const oldLivePreview = '<div style="background:white; border-radius:24px; overflow:hidden; box-shadow:var(--shadow-lg); border:1px solid #eee;">';
const newLivePreview = '<div style="background:white; border-radius:24px; overflow:hidden; box-shadow:var(--shadow-lg); border:1px solid #eee; max-width:400px; margin:0 auto;">';
m = m.replace(oldLivePreview, newLivePreview);

fs.writeFileSync(mgrPath, m);
console.log('Script executed successfully!');
