const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const dom = new JSDOM(`<!DOCTYPE html><html><body>
<div id="legal-modal-title"></div>
<div id="legal-modal-body"></div>
</body></html>`);

const window = dom.window;
const document = window.document;

let currentLang = 'en';
window.t = function(key, defaultEnglish) {
    if (currentLang === 'en') return defaultEnglish || key;
    return defaultEnglish || key;
};

const _legalContent = {
    terms: {
        title: '📄 Terms & Conditions',
        body: `
            <h3>1. Acceptance of Terms</h3>
            <p>By accessing and using Michu Stays...</p>
        `
    }
};

function openLegalModal(key) {
    const content = _legalContent[key];
    if (!content) return;
    
    const translatedTitle = window.t(content.title);
    document.getElementById('legal-modal-title').textContent = translatedTitle;
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content.body;
    
    // Create TreeWalker
    const walk = document.createTreeWalker(tempDiv, window.NodeFilter.SHOW_TEXT, null, false);
    let node;
    while(node = walk.nextNode()) {
        const trimmed = node.textContent.trim();
        if (trimmed) {
            const trans = window.t(trimmed);
            node.textContent = node.textContent.replace(trimmed, trans);
        }
    }
    
    document.getElementById('legal-modal-body').innerHTML = tempDiv.innerHTML;
}

openLegalModal('terms');

console.log("Title: ", document.getElementById('legal-modal-title').textContent);
console.log("Body: ", document.getElementById('legal-modal-body').innerHTML);
