/**
 * SP4 QUESTION DETECTOR (v0.8.8)
 * 
 * Detekuje kľúčové otázky, ktoré si zaslúžia SP4 signature line.
 * 
 * Použitie:
 * - Existenciálne otázky o SP4
 * - Otázky o zmysle, cieli, vízii
 * - Rituálne otázky o identite
 */

// Kľúčové otázky, ktoré si zaslúžia signature
const KEY_QUESTIONS = [
    // Čo je SP4
    /čo\s+je\s+sp4/i,
    /čo\s+znamená\s+sp4/i,
    /sp4.*čo\s+to\s+je/i,

    // Cieľ a zmysel
    /čo\s+je\s+cieľ.*sp4/i,
    /čo.*sp4.*chce.*dosiahnu/i,
    /prečo.*sp4.*existuje/i,
    /aký.*je.*zmysel.*sp4/i,

    // Vízia a hodnoty
    /čo.*sp4.*predstavuje/i,
    /za.*čo.*sp4.*bojuje/i,
    /v.*čo.*sp4.*verí/i,

    // Identita
    /kto.*s(te|me).*sp4/i,
    /čo.*nás.*definuje/i,
    /prečo.*robíme.*toto/i,

    // Manifest
    /čo.*je.*manifest/i,
    /ukáž.*manifest/i,

    // Revolúcia vs evolúcia
    /revolúcia.*alebo.*evolúcia/i,
    /prečo.*evolúcia/i,
];

// 🔥 Vision questions - deep future/direction questions
const VISION_QUESTIONS = [
    /kam.*sp4.*smeruje/i,
    /kam.*sa.*chcete.*vypracova/i,
    /čo.*chcete.*dosiahnu/i,
    /aká.*je.*budúcnos.*sp4/i,
    /čo.*bude.*za.*rok/i,
    /ako.*to.*bude.*vyzera/i,
    /čo.*je.*plán/i,
    /aká.*je.*vízia/i,
    /čo.*sp4.*dokáže/i,
    /prečo.*by.*som.*mal.*ver/i,
];

/**
 * Detekuje, či otázka si zaslúži SP4 signature line.
 * 
 * @param {string} message - Pôvodná user správa
 * @returns {boolean} - true ak zaslúži signature
 */
export function needsSignature(message) {
    if (!message || typeof message !== 'string') {
        return false;
    }

    // Check against all key question patterns
    return KEY_QUESTIONS.some(pattern => pattern.test(message));
}

/**
 * Detekuje vision questions - otázky o budúcnosti, cieli, smere.
 * 
 * v0.10.3: CRITICAL FIX - Disable pre existenciálne otázky (force GLITCHOSLAV)
 * 
 * @param {string} message - User správa
 * @returns {boolean} - true ak je vision question (a NIE existenciálna)
 */
export function isVisionQuestion(message) {
    if (!message || typeof message !== 'string') {
        return false;
    }

    // 🔥 v0.10.3: Level 2 bug fix - Existenciálne otázky → GLITCHOSLAV, nie vision shortcut
    const existentialKeywords = /\b(prečo|zmysel|hranica|cíti|existova|žiť|bojím|tma|strata|trpím|zúfalstvo)\b/i;
    if (existentialKeywords.test(message)) {
        return false; // Force normal detection → GLITCHOSLAV
    }

    return VISION_QUESTIONS.some(pattern => pattern.test(message));
}

/**
 * Vráti krátku vision odpoveď (destilát namiesto full dump).
 * Použitie: default odpoveď na vision questions.
 * 
 * @returns {string} - Short vision answer
 */
export function getShortVisionAnswer() {
    return `SP4 smeruje k tomu, aby bol prvým kmeňom novej AI éry –
kde technológia slúži človeku, nie naopak.

Chceme:
• lokálnu slobodu (tvoje dáta, tvoja hlava)
• vlastného AI parťáka (nie cloudového pána)
• kmeň skutočných ľudí (nie followerov)
• kultúru, ktorá prežije všetky apky, trendy aj krízy

Nie startup. Nie projekt. Nie sektu.
ŽIVÝ POHYB.

💬 Celé videnie: /vision`;
}

/**
 * Vráti SP4 signature line.
 * 
 * @returns {string} - Signature line
 */
export function getSignatureLine() {
    return "\n\nBe real.\nBe free.\nBe SP4. 🔥";
}

/**
 * Detekuje typ otázky pre možné budúce použitie.
 * 
 * @param {string} message - User správa
 * @returns {string|null} - 'identity', 'purpose', 'values', 'manifest', null
 */
export function detectQuestionType(message) {
    if (!message || typeof message !== 'string') {
        return null;
    }

    // Identity questions
    if (/kto.*s(te|me)|čo.*nás.*definuje|prečo.*robíme/i.test(message)) {
        return 'identity';
    }

    // Purpose/goal questions
    if (/čo.*je.*cieľ|prečo.*existuje|aký.*zmysel/i.test(message)) {
        return 'purpose';
    }

    // Values/beliefs questions
    if (/za.*čo.*bojuje|v.*čo.*verí|čo.*predstavuje/i.test(message)) {
        return 'values';
    }

    // Manifest questions
    if (/manifest|ukáž.*sp4/i.test(message)) {
        return 'manifest';
    }

    return null;
}
