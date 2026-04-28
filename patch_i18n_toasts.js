const fs = require('fs');
let i18n = fs.readFileSync('js/i18n.js', 'utf8');

const amKeys = `
        "👋 Your account has been deleted. We're sorry to see you go.": "👋 መለያዎ ተሰርዟል። ስለሄዱ እናዝናለን።",
        "✅ Profile updated successfully!": "✅ መገለጫዎ በተሳካ ሁኔታ ተዘምኗል!",
        "ℹ️ Please fill in all password fields.": "ℹ️ እባክዎ ሁሉንም የይለፍ ቃል መስኮች ይሙሉ።",
        "❌ New passwords do not match!": "❌ አዲሶቹ የይለፍ ቃላት አይዛመዱም!",
        "Updating...": "በማዘመን ላይ...",
        "Update Password": "የይለፍ ቃል አዘምን",
`;

const omKeys = `
        "👋 Your account has been deleted. We're sorry to see you go.": "👋 Herregni keessan haqameera. Deemuu keessaniif gadda qabna.",
        "✅ Profile updated successfully!": "✅ Ibsamni keessan milkiidhaan fooyya'eera!",
        "ℹ️ Please fill in all password fields.": "ℹ️ Maaloo kutaawwan jecha iccitii hunda guutaa.",
        "❌ New passwords do not match!": "❌ Jechi iccitii haaraan wal hin fakkaatu!",
        "Updating...": "Fooyyeffamaa jira...",
        "Update Password": "Jecha Iccitii Fooyyessi",
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
console.log('✅ i18n.js updated with profile toasts');
