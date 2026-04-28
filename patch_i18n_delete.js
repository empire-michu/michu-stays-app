const fs = require('fs');
let i18n = fs.readFileSync('js/i18n.js', 'utf8');

const amKeys = `
        // Profile - Private Zone
        "Private Zone": "የግል ክልል",
        "Deleting your account will remove all booking history and personal data permanently.": "መለያዎን መሰረዝ ሁሉንም የቦታ ማስያዣ ታሪክዎን እና የግል መረጃዎን በቋሚነት ያስወግዳል።",
        "Delete My Account Forever": "መለያዬን ለዘላለም ሰርዝ",
        "Keep Account": "መለያ ይቆይ",
        "Delete Forever": "ለዘላለም ሰርዝ",
        "Your account and booking history will be gone forever. There is no coming back from this.": "መለያዎ እና የቦታ ማስያዣ ታሪክዎ ለዘላለም ይጠፋል። ከዚህ በኋላ መመለስ አይቻልም።",
`;

const omKeys = `
        // Profile - Private Zone
        "Private Zone": "Naannoo Dhuunfaa",
        "Deleting your account will remove all booking history and personal data permanently.": "Herrega keessan haquun seenaa qabxii hundaafi odeeffannoo dhuunfaa keessan dhaabbataatti ni balleessa.",
        "Delete My Account Forever": "Herrega Ko Bara Baraan Haqi",
        "Keep Account": "Herregni Haa Turu",
        "Delete Forever": "Bara Baraan Haqi",
        "Your account and booking history will be gone forever. There is no coming back from this.": "Herreigni keessanii fi seenaan qabxii keessanii bara baraan ni bada. Kanaan booda deebi'uun hin danda'amu.",
`;

// Insert AM keys before "// Alert dialog titles"
const amTarget = '        // Alert dialog titles & buttons';
const amIdx = i18n.indexOf(amTarget);
if (amIdx > -1) {
    i18n = i18n.substring(0, amIdx) + amKeys + '\n' + i18n.substring(amIdx);
}

// Insert OM keys before second occurrence
const omIdx = i18n.indexOf(amTarget, amIdx + amKeys.length + 100);
if (omIdx > -1) {
    i18n = i18n.substring(0, omIdx) + omKeys + '\n' + i18n.substring(omIdx);
}

fs.writeFileSync('js/i18n.js', i18n);
console.log('✅ i18n.js updated with Private Zone keys');
