const fs = require('fs');

function replaceInFile(filePath, search, replacement) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.split(search).join(replacement);
    fs.writeFileSync(filePath, content, 'utf8');
}

// 1. Fix the window.i18n.t to window.t in profile.js, auth.js, index.html
replaceInFile('js/views/profile.js', 'window.i18n.t', 'window.t');
replaceInFile('js/auth.js', 'window.i18n.t', 'window.t');
replaceInFile('index.html', 'window.i18n.t', 'window.t');

// 2. Fix the Amharic translation for "Michu Stays"
let i18n = fs.readFileSync('js/i18n.js', 'utf8');

// Replace specific variants to be safe
i18n = i18n.split('ሚቹ ስቴይስን').join('ምቹ ስቴይስን');
i18n = i18n.split('ሚቹ ስቴይስ').join('ምቹ ስቴይስ');

// Also, the alert dialogs title might have it if it wasn't captured above.
// Let's just do a global replace of "ሚቹ " with "ምቹ " just in case, but specific is safer.
// Actually, let's also replace "ሚቹ" with "ምቹ" if it's standalone, but maybe only in the AM translation block.
// Let's stick to 'ሚቹ ስቴይስ' -> 'ምቹ ስቴይስ' as requested by the user.

fs.writeFileSync('js/i18n.js', i18n, 'utf8');
console.log('Fixes applied successfully.');
