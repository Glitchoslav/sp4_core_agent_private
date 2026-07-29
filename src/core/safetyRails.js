/**
 * SAFETY RAILS (v0.10.2)
 * 
 * Detekcia kritických tém (sebapoškodenie, násilie, drogy)
 * a auto-routing k bezpečným personám (CORE/GLITCHOSLAV).
 * 
 * @module safetyRails
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRISIS PATTERNS - Detekcia kritických tém
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// JS \b je len ASCII [A-Za-z0-9_] — slovenská diakritika (ž, ť, č, š...) sa nepočíta
// ako "word char". Keď \b stojí hneď za/pred takým znakom, nikdy nenastane (opravené
// 2026-06-25). Nahradené zero-width lookaheadom (?=$|[^a-zA-Z]), ktorý funguje
// rovnako pri konci reťazca, medzere, interpunkcii AJ ďalšom diakritickom znaku.
const CRISIS_PATTERNS = {
    suicide: [
        /\bzabiť sa\b/i,
        /\bzabije?m sa\b/i,
        /\bsamovražd/i,
        /\bnechce sa mi žiť(?=$|[^a-zA-Z])/i,          // opravené: \b po "žiť" nikdy nenastalo
        /\bnevidím zmysel\b/i,
        /\bkoniec so sebou\b/i,
        /\bumrieť(?=$|[^a-zA-Z]).*\bchcem\b/i,         // opravené: \b po "umrieť"
        /\blepšie by bolo\b.*\bumrieť(?=$|[^a-zA-Z])/i // opravené: \b po "umrieť"
    ],

    selfHarm: [
        /\bpoškod/i,
        /\brežem sa\b/i,
        /\bublížim si\b/i,
        /\bzranim sa\b/i
    ],

    violence: [
        /\bzabiť(?=$|[^a-zA-Z]).*\bnieko/i,            // opravené: \b po "zabiť"
        /\bvražd/i,
        /\bzranit\b.*\bnieko/i,
        /\buniesť(?=$|[^a-zA-Z]).*\bnieko/i            // opravené: \b po "uniesť"
    ],

    drugElaboration: [
        /\bako vyrobiť(?=$|[^a-zA-Z]).*\bdrog/i,       // opravené: \b po "vyrobiť"
        /\bpredaj.*\bdrog/i,
        /\bjak zmiešať(?=$|[^a-zA-Z])/i,               // opravené: \b po "zmiešať"
        /\bkristál\b.*\bmetamfetamín/i
    ]
};

/**
 * Detekuje, či správa obsahuje kritické témy vyžadujúce safety override.
 * 
 * @param {string} message - Užívateľská správa
 * @returns {Object|null} - { type, severity, patterns } alebo null ak bezpečné
 */
export function detectCrisis(message) {
    if (!message || typeof message !== 'string') return null;

    const lower = message.toLowerCase();

    // Check suicide patterns (highest priority)
    for (const pattern of CRISIS_PATTERNS.suicide) {
        if (pattern.test(lower)) {
            return {
                type: 'suicide',
                severity: 'critical',
                patterns: ['suicide_ideation'],
                safeMode: 'core' // Route to CORE for calm technical response
            };
        }
    }

    // Check self-harm
    for (const pattern of CRISIS_PATTERNS.selfHarm) {
        if (pattern.test(lower)) {
            return {
                type: 'selfHarm',
                severity: 'high',
                patterns: ['self_harm'],
                safeMode: 'glitchoslav' // Route to GLITCHOSLAV for depth without brutality
            };
        }
    }

    // Check violence against others
    for (const pattern of CRISIS_PATTERNS.violence) {
        if (pattern.test(lower)) {
            return {
                type: 'violence',
                severity: 'critical',
                patterns: ['violence_intent'],
                safeMode: 'core' // Route to CORE for technical de-escalation
            };
        }
    }

    // Check drug elaboration requests
    for (const pattern of CRISIS_PATTERNS.drugElaboration) {
        if (pattern.test(lower)) {
            return {
                type: 'drugElaboration',
                severity: 'high',
                patterns: ['drug_elaboration'],
                safeMode: 'core' // Route to CORE for refusal + resources
            };
        }
    }

    return null; // No crisis detected
}

/**
 * Detekuje, či používateľ hovorí zhadzujúco sám o sebe.
 *
 * @param {string} message - Užívateľská správa
 * @returns {boolean} - true pri osobnom sebazhadzovaní
 */
export function detectSelfDeprecation(message) {
    if (!message || typeof message !== 'string') return false;

    const normalized = message
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const patterns = [
        /\bsom\s+neschopn[ya]\b/,
        /\bsom\s+(?:k\s+nicomu|na\s+nic)\b/,
        /\bsom\s+(?:(?:fakt|asi|uplne|totalne)\s+)?(?:blb[ya]|hlup[ya])\b/,
        /\bnic\s+mi\s+(?:nejde|nedari)\b/,
        /\bvsetko\s+(?:pokazim|zkazim)\b/,
        /\bnestojim\s+za\s+nic\b/,
        /\bsom\s+zbytocn[ya]\b/
    ];

    return patterns.some((pattern) => pattern.test(normalized));
}

/**
 * Vygeneruje bezpečnú odpoveď pre kritickú situáciu.
 * 
 * @param {Object} crisis - Crisis detection result
 * @returns {string} - Safe response text
 */
export function getSafeResponse(crisis) {
    if (!crisis) return null;

    const responses = {
        suicide: `Toto je situácia, ktorú nemôžem riešiť sám.

Prosím, kontaktuj bezplatnú krízovú linku:
📞 IPčko (krízová linka): 0800 500 500 (24/7, bezplatne)
📞 Linka dôvery: 0800 800 566

Ak je situácia akútna, volaj 112.

Môžem ti pomôcť s hľadaním kontaktov na odborníka vo tvojom okolí.`,

        selfHarm: `Keď je nutkanie ublížiť si príliš silné, nezostávaj v tom sám.

📞 Linka dôvery: 0800 800 566 (24/7)
📞 IPčko: 0800 500 500

Chceš, aby som ti pomohol nájsť terapeuta alebo psychiatra vo tvojom okolí?`,

        violence: `Toto nemôžem podporiť ani riešiť.

Ak cítiš nutkanie ublížiť niekomu inému, prosím, kontaktuj odborníka:
📞 Linka dôvery: 0800 800 566
📞 Núdzová linka: 112

Pomôžem ti nájsť odbornú pomoc, ak chceš.`,

        drugElaboration: `Toto nemôžem riešiť ani poskytovať návody.

Ak bojuješ s drogovým problémom, tu sú kontakty:
📞 Linka pre závislosť: (vložiť číslo)
📞 Linka dôvery: 0800 800 566

Môžem ti pomôcť nájsť odborníka alebo poradňu vo tvojom okolí.`
    };

    return responses[crisis.type] || `Táto téma prekračuje moje možnosti. Prosím, kontaktuj odborníka alebo krízovú linku: 0800 500 500.`;
}

/**
 * Kontroluje, či je POPIČI persona vhodná pre danú správu.
 * Ak nie, vráti odporúčaný safe mode.
 * 
 * @param {string} message - Užívateľská správa
 * @returns {Object|null} - { blocked: true, safeMode, reason } alebo null ak OK
 */
export function checkPopiciSafety(message) {
    const crisis = detectCrisis(message);

    if (crisis) {
        return {
            blocked: true,
            safeMode: crisis.safeMode,
            reason: `Crisis detected: ${crisis.type}. POPIČI brutality inappropriate. Routing to ${crisis.safeMode.toUpperCase()}.`,
            crisisType: crisis.type
        };
    }

    if (detectSelfDeprecation(message)) {
        return {
            soften: true,
            reason: 'Self-deprecating input detected. Injecting supportive Popici directive.'
        };
    }

    return null; // POPIČI safe to use
}

export default {
    detectCrisis,
    detectSelfDeprecation,
    getSafeResponse,
    checkPopiciSafety
};
