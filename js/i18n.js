// js/i18n.js

// Formal and Professional Amharic and Oromiffa Translations
const translations = {
    am: {
        // Core Navigation & UI
        "Home": "ዋና ገፅ",
        "Search": "ፈልግ",
        "Bookings": "ቦታ ማስያዣዎች",
        "Profile": "ፕሮፋይል",
        "Login": "ግባ",
        "Sign Up": "ይመዝገቡ",
        "A.I": "አርቴፊሻል ኢንተለጀንስ",
        
        // Home Page Filters & Titles
        "All Stays": "ሁሉም ማረፊያዎች",
        "Hotels": "ሆቴሎች",
        "Guesthouses": "የእንግዳ ማረፊያዎች",
        "Apartments": "አፓርታማዎች",
        "Trad. Homes": "ባህላዊ ቤቶች",
        "Filter Stays": "ማረፊያዎችን አጣራ",
        "Location & Filters": "አድራሻ እና ማጣሪያዎች",
        "Clear All": "ሁሉንም አጥፋ",
        "City / Location": "ከተማ / አድራሻ",
        "Minimum Rating": "አነስተኛ ደረጃ",
        "Shortcuts": "አቋራጮች",
        "🏠 All Stays": "🏠 ሁሉም ማረፊያዎች",
        "💛 Favorites": "💛 ተመራጮች",
        "↺ Reset All Filters": "↺ ሁሉንም ማጣሪያዎች ዳግም አስጀምር",
        "Exploring Ethiopian Stays": "የኢትዮጵያ ማረፊያዎችን ያስሱ",
        "Grid View": "በካርድ እይታ",
        "Map View": "በካርታ እይታ",
        "Latest Added": "በቅርብ የተጨመሩ",
        "Price: Low to High": "ዋጋ: ከዝቅተኛ ወደ ከፍተኛ",
        "Price: High to Low": "ዋጋ: ከከፍተኛ ወደ ዝቅተኛ",
        "Name: A - Z": "ስም: ከሀ እስከ ፐ",
        "Where are you going?": "የት መሄድ ይፈልጋሉ?",
        "Experience the Spirit of ": "የድሬዳዋን መንፈስ ይለማመዱ ",
        "Dire Dawa": "ድሬዳዋ",
        "Premium stays in Ethiopia's iconic railway gateway.": "በኢትዮጵያ ታዋቂ የባቡር በር ላይ ያሉ ምርጥ ማረፊያዎች።",
        
        // Footer & Legal
        "Our Services": "አገልግሎቶቻችን",
        "Hotel Bookings": "የሆቴል ምዝገባዎች",
        "Apartment Rentals": "የአፓርታማ ኪራዮች",
        "Guesthouse Stays": "የእንግዳ ማረፊያዎች",
        "Verified Listings": "የተረጋገጡ ማረፊያዎች",
        "Guest Reviews": "የእንግዳ አስተያየቶች",
        "Local Experiences": "የአካባቢ ልምዶች",
        "24/7 Support": "የ24/7 ድጋፍ",
        "Legal & Policies": "ህግ እና ፖሊሲዎች",
        "Terms & Conditions": "ውሎች እና ሁኔታዎች",
        "Privacy Policy": "የግላዊነት ፖሊሲ",
        "Booking Policy": "የቦታ ማስያዝ ፖሊሲ",
        "Cancellation Policy": "የስረዛ ፖሊሲ",
        "Refund Policy": "የተመላሽ ገንዘብ ፖሊሲ",
        "Compliance & Ethics": "ህግ ማክበር እና ስነ-ምግባር",
        "Accepted Payments": "ተቀባይነት ያላቸው ክፍያዎች",
        "Bank Transfer": "የባንክ ማስተላለፍ",
        "Quick Links": "ፈጣን አገናኞች",

        // New missing strings (Home, Detail, Booking)
        "All Cities": "ሁሉም ከተሞች",
        "Fully Booked": "ሙሉ በሙሉ ተይዟል",
        "night": "አዳር",
        "SPECIAL STAY PACKAGES": "ልዩ የማረፊያ ፓኬጆች",
        "LIMITED TIME DEAL": "ለተወሰነ ጊዜ የተሰጠ ቅናሽ",
        "Select Bundle": "ጥምረትን ይምረጡ",
        "Reserve Now": "አሁኑኑ ያስይዙ",
        "Total": "ድምር",
        "Price includes all taxes & fees": "ዋጋው ሁሉንም ግብሮች እና ክፍያዎች ያካትታል",
        "Property Amenities": "የማረፊያው አገልግሎቶች",
        "WIFI": "ዋይፋይ",
        "Pool": "መዋኛ ገንዳ",
        "Spa": "ስፓ",
        "CHECK-IN": "መግቢያ",
        "CHECK-OUT": "መውጫ",
        "Secure Your Booking": "ቦታዎን ያረጋግጡ",
        "Choose your preferred payment method:": "የሚመርጡትን የክፍያ መንገድ ይምረጡ፦",
        "CBE Bank": "የኢትዮጵያ ንግድ ባንክ",
        "telebirr": "ቴሌብር",
        "CBE Account:": "የኢትዮጵያ ንግድ ባንክ ሂሳብ፦",
        "Account Name:": "የሂሳቡ ስም፦",
        "Your Contact Phone (for verification)": "የእርስዎ ስልክ ቁጥር (ለማረጋገጫ)",
        "Upload Proof of Payment": "የክፍያ ማረጋገጫ ይስቀሉ",
        "Click to upload your payment screenshot": "የክፍያዎን ስክሪንሾት ለመስቀል ይጫኑ",
        "Birr": "ብር",
        "CBE Mobile Banking": "ሲቢኢ ሞባይል ባንኪንግ",
        "nights": "አዳሮች",

        // Actions & Modals
        "Are you sure?": "እርግጠኛ ነዎት?",
        "Cancel": "ሰርዝ",
        "Delete": "አጥፋ",
        "Got It!": "ገባኝ!"
    },
    om: {
        // Core Navigation & UI
        "Home": "Fuula Duraa",
        "Search": "Barbaadi",
        "Bookings": "Kutaawwan",
        "Profile": "Ibsama",
        "Login": "Seeni",
        "Sign Up": "Galmoofnu",
        "A.I": "A.I",
        
        // Home Page Filters & Titles
        "All Stays": "Iddoowwan Hunda",
        "Hotels": "Hoteelota",
        "Guesthouses": "Manni Keessummaa",
        "Apartments": "Abaartamaa",
        "Trad. Homes": "Manneen Aadaa",
        "Filter Stays": "Iddoowwan Calay",
        "Location & Filters": "Iddoo fi Calay",
        "Clear All": "Hunda Haqi",
        "City / Location": "Magaalaa / Iddoo",
        "Minimum Rating": "Sadarkaa Xiqqaa",
        "Shortcuts": "Karaa Gabaabaa",
        "🏠 All Stays": "🏠 Iddoowwan Hunda",
        "💛 Favorites": "💛 Jaallatamo",
        "↺ Reset All Filters": "↺ Calay Hunda Deebisi",
        "Exploring Ethiopian Stays": "Iddoowwan Itoophiyaa Sakatta'uu",
        "Grid View": "Ilaalcha Kaardii",
        "Map View": "Ilaalcha Kaartaa",
        "Latest Added": "Dhiyeenya Kan Dabalame",
        "Price: Low to High": "Gatii: Gadi aanaa irraa gara Ol aanaa",
        "Price: High to Low": "Gatii: Ol aanaa irraa gara Gadi aanaa",
        "Name: A - Z": "Maqaa: A - Z",
        "Where are you going?": "Eessa deemaa jirta?",
        "Experience the Spirit of ": "Hafuura Dirree Dawaa Muuxadhu ",
        "Dire Dawa": "Dirree Dawaa",
        "Premium stays in Ethiopia's iconic railway gateway.": "Iddoowwan filatamoo balbala baaburaa Itoophiyaa beekamaa ta'e keessatti.",
        
        // Footer & Legal
        "Our Services": "Tajaajiloota Keenya",
        "Hotel Bookings": "Kutaawwan Hoteelaa",
        "Apartment Rentals": "Kiraayii Abaartamaa",
        "Guesthouse Stays": "Turmaata Mana Keessummaa",
        "Verified Listings": "Galmee Mirkanaa'e",
        "Guest Reviews": "Yaada Keessummaa",
        "Local Experiences": "Muuxannoo Naannoo",
        "24/7 Support": "Deeggarsa 24/7",
        "Legal & Policies": "Seera fi Imaammata",
        "Terms & Conditions": "Haalawwan fi Dambiiwwan",
        "Privacy Policy": "Imaammata Iccitii",
        "Booking Policy": "Imaammata Kutaawwan",
        "Cancellation Policy": "Imaammata Haqaa",
        "Refund Policy": "Imaammata Deebii",
        "Compliance & Ethics": "Seera Kabajuu fi Safuu",
        "Accepted Payments": "Kaffaltiiwwan Fudhataman",
        "Bank Transfer": "Baankiin Dabarsuu",
        "Quick Links": "Geessituu Saffisaa",

        // New missing strings (Home, Detail, Booking)
        "All Cities": "Magaalota Hunda",
        "Fully Booked": "Guutummaatti Qabameera",
        "night": "halkan",
        "SPECIAL STAY PACKAGES": "QURXAA IDDOO ADDAA",
        "LIMITED TIME DEAL": "QOPHIIN YEROO MURTAA'AA",
        "Select Bundle": "Qurxaa Filadhu",
        "Reserve Now": "Ammummaa Qabadhu",
        "Total": "Ida'ama",
        "Price includes all taxes & fees": "Gatiin gibira fi kaffaltii hunda of keessatti qabata",
        "Property Amenities": "Tajaajiloota Iddoo",
        "WIFI": "WIFI",
        "Pool": "Bishaan Daakuu",
        "Spa": "Spa",
        "CHECK-IN": "SEENUU",
        "CHECK-OUT": "BAHU",
        "Secure Your Booking": "Iddoo Keessan Mirkaneessaa",
        "Choose your preferred payment method:": "Mala kaffaltii filattan filadhaa:",
        "CBE Bank": "Baankii Daldala Itoophiyaa",
        "telebirr": "telebirr",
        "CBE Account:": "Lakkoofsa Herregaa CBE:",
        "Account Name:": "Maqaa Herregaa:",
        "Your Contact Phone (for verification)": "Lakkoofsa Bilbilaa Keessan (mirkaneessuuf)",
        "Upload Proof of Payment": "Ragaa Kaffaltii Fidaa",
        "Click to upload your payment screenshot": "Suuraa kaffaltii keessan fiduuf cuqaasaa",
        "Birr": "Birrii",
        "CBE Mobile Banking": "CBE Mobile Banking",
        "nights": "Halkani",

        // Actions & Modals
        "Are you sure?": "Mirkaneessaa?",
        "Cancel": "Haqi",
        "Delete": "Balleessi",
        "Got It!": "Beekera!"
    }
};

let currentLang = localStorage.getItem('michu_lang') || 'en';

window.setMichuLang = function(lang) {
    localStorage.setItem('michu_lang', lang);
    location.reload();
};

// Standard explicit translate function (Option 1 wrapper)
window.t = function(key, defaultEnglish) {
    if (currentLang === 'en') return defaultEnglish;
    if (translations[currentLang] && translations[currentLang][key]) {
        return translations[currentLang][key];
    }
    return defaultEnglish;
};

const dynamicTranslations = {
    am: [
        { regex: /^Showing (\d+) stays in (.*)$/i, replace: "በ $2 ውስጥ $1 ማረፊያዎችን በማሳየት ላይ" },
        { regex: /^(\d+(\.\d+)?) km from centre$/i, replace: "ከማዕከል $1 ኪ.ሜ ይርቃል" },
        { regex: /^\/\s*night$/i, replace: "/ አዳር" },
        { regex: /^(\d+)\s+NIGHT BUNDLE$/i, replace: "የ $1 አዳር ጥምረት" },
        { regex: /^(\d+)%\s+OFF$/i, replace: "$1% ቅናሽ" },
        { regex: /^Discount\s*\((\d+)%\)$/i, replace: "ቅናሽ ($1%)" },
        { regex: /^Transfer (.*?) Birr via (.*?) to:$/i, replace: "እባክዎ $1 ብር በ $2 ወደዚህ ያስተላልፉ፦" },
        { regex: /^\*\s*Please screenshot your (.*?) confirmation\.?$/i, replace: "* እባክዎ የ $1 ማረጋገጫዎን ስክሪንሾት ያንሱ።" },
        { regex: /^0 stays found$/i, replace: "ምንም ማረፊያ አልተገኘም" },
        { regex: /^(\d+) nights$/i, replace: "$1 አዳሮች" }
    ],
    om: [
        { regex: /^Showing (\d+) stays in (.*)$/i, replace: "Iddoowwan $1 $2 keessatti argisiisaa" },
        { regex: /^(\d+(\.\d+)?) km from centre$/i, replace: "Giddugala irraa km $1 fagaata" },
        { regex: /^\/\s*night$/i, replace: "/ halkan" },
        { regex: /^(\d+)\s+NIGHT BUNDLE$/i, replace: "Qurxaa halkan $1" },
        { regex: /^(\d+)%\s+OFF$/i, replace: "Hir'isuu %$1" },
        { regex: /^Discount\s*\((\d+)%\)$/i, replace: "Hir'isuu (%$1)" },
        { regex: /^Transfer (.*?) Birr via (.*?) to:$/i, replace: "Birrii $1 karaa $2 gara kanaatti dabarsaa:" },
        { regex: /^\*\s*Please screenshot your (.*?) confirmation\.?$/i, replace: "* Maaloo mirkaneessa $1 keessan suuraa kaasaa." },
        { regex: /^0 stays found$/i, replace: "Iddoowwan 0 argamaniiru" },
        { regex: /^(\d+) nights$/i, replace: "Halkan $1" }
    ]
};

// AUTO-TRANSLATOR (Safeguard)
// This strictly follows the "DON'T TOUCH OTHER WORKING FEATURES" rule.
// It magically translates the DOM text dynamically so you don't have to alter existing logic.
function autoTranslateNode(node) {
    if (currentLang === 'en') return;
    
    // Ignore script, style tags and the language dropdown itself
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
    if (node.id === 'lang-dropdown') return;

    if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent.trim();
        if (!text) return;

        // Exact match replacement
        if (translations[currentLang][text]) {
            node.textContent = node.textContent.replace(text, translations[currentLang][text]);
            return;
        }

        // Dynamic regex replacement
        let dynRules = dynamicTranslations[currentLang] || [];
        for (let i = 0; i < dynRules.length; i++) {
            let rule = dynRules[i];
            let match = text.match(rule.regex);
            if (match) {
                let replaced = rule.replace;
                // Replace $1, $2 with matched groups, translating them if possible
                for (let j = 1; j < match.length; j++) {
                    let val = match[j] || '';
                    if (translations[currentLang][val]) {
                        val = translations[currentLang][val];
                    }
                    replaced = replaced.replace('$' + j, val);
                }
                node.textContent = node.textContent.replace(text, replaced);
                return;
            }
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Translate placeholders in inputs
        if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') {
            const placeholder = node.getAttribute('placeholder');
            if (placeholder && translations[currentLang][placeholder]) {
                node.setAttribute('placeholder', translations[currentLang][placeholder]);
            }
        }
        
        node.childNodes.forEach(autoTranslateNode);
    }
}

// Initialize Translations on Load
document.addEventListener('DOMContentLoaded', () => {
    // Set UI flag
    const flagEl = document.getElementById('current-lang-flag');
    const codeEl = document.getElementById('current-lang-code');
    if (flagEl && codeEl) {
        if (currentLang === 'am') { flagEl.textContent = '🇪🇹'; codeEl.textContent = 'AM'; }
        else if (currentLang === 'om') { flagEl.textContent = '🇪🇹'; codeEl.textContent = 'OR'; }
        else { flagEl.textContent = '🇬🇧'; codeEl.textContent = 'EN'; }
    }

    if (currentLang !== 'en') {
        // Run initial pass
        autoTranslateNode(document.body);
        
        // Watch for dynamically generated content (like in home.js or booking.js)
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(addedNode => {
                    autoTranslateNode(addedNode);
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
});
