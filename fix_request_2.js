const fs = require('fs');

// 1. Fix i18n.js
let i18n = fs.readFileSync('js/i18n.js', 'utf8');
const oldT = `window.t = function(key, defaultEnglish) {
    if (currentLang === 'en') return defaultEnglish;
    if (translations[currentLang] && translations[currentLang][key]) {
        return translations[currentLang][key];
    }
    return defaultEnglish;
};`;
const newT = `window.t = function(key, defaultEnglish) {
    if (currentLang === 'en') return defaultEnglish || key;
    if (translations[currentLang] && translations[currentLang][key]) {
        return translations[currentLang][key];
    }
    return defaultEnglish || key;
};`;
i18n = i18n.replace(oldT, newT);
fs.writeFileSync('js/i18n.js', i18n, 'utf8');

// 2. Remove AI button from index.html
let html = fs.readFileSync('index.html', 'utf8');
const aiBtnStart = html.indexOf('<button class="michu-ai-btn"');
if (aiBtnStart > -1) {
    const aiBtnEnd = html.indexOf('</button>', aiBtnStart) + 9;
    html = html.substring(0, aiBtnStart) + html.substring(aiBtnEnd);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log("Removed AI button from index.html.");
} else {
    console.log("AI button not found in index.html.");
}

console.log("Fixes applied.");
