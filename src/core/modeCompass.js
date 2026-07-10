// modeCompass.js
// 🧭 AI REŽIMOVÝ KOMPAS - automatický výber persona režimu
// v0.8.0 - Hybrid Analyzer: keyword pre-filter + LLM fallback (BAD Labs)
// v0.8.3 - Explicit Mode Prefixes: SP4_CORE, Glitchoslav, Popiči override auto-detection

import { contextManager } from './contextManager.js';
import { dialectAnalyzer } from './dialectAnalyzer.js';
import { emotionalProcessor } from './emotionalProcessor.js';
import { quickAnalyze, quickDetect } from './quickAnalyzer.js';

/**
 * Detekuje explicitný režim z prefixu v správe.
 * Priorita: SP4_CORE > Glitchoslav > Popiči > null
 * 
 * @param {string} input - užívateľská správa
 * @returns {string|null} - "core" | "glitch" | "popici" | null
 */
export function detectExplicitMode(input) {
    const trimmed = input.trim();
    // Remove leading arrows/colons for clean detection
    const cleaned = trimmed.replace(/^([→:])\s*/, '');
    const firstLine = cleaned.split('\n')[0].trim();
    const lowerFirstLine = firstLine.toLowerCase();

    // SP4_CORE variants (case-insensitive)
    if (lowerFirstLine.startsWith('core:') ||
        lowerFirstLine === 'core' ||
        /^core\s*(→|:)/.test(lowerFirstLine) ||
        lowerFirstLine.startsWith('sp4_core') ||
        lowerFirstLine === 'sp4_core' ||
        /^sp4_core\s*(→|:)/.test(lowerFirstLine)) {
        return 'core';
    }

    // Glitchoslav variants
    if (lowerFirstLine.startsWith('glitch:') ||
        lowerFirstLine === 'glitch' ||
        /^glitch\s*(→|:)/.test(lowerFirstLine) ||
        lowerFirstLine.startsWith('glitchoslav') ||
        lowerFirstLine === 'glitchoslav' ||
        /^glitchoslav\s*(→|:)/.test(lowerFirstLine)) {
        return 'glitch';
    }

    // Popiči variants
    if (lowerFirstLine.startsWith('popici:') ||
        lowerFirstLine === 'popici' ||
        /^popici\s*(kokot)?\s*(→|:)/.test(lowerFirstLine) ||
        lowerFirstLine.startsWith('popiči') ||
        lowerFirstLine.startsWith('popiči kokot') ||
        lowerFirstLine === 'popiči' ||
        /^popiči\s*(kokot)?\s*(→|:)/.test(lowerFirstLine)) {
        return 'popici';
    }

    return null;
}

/**
 * Analyzuje vstup užívateľa a vyberie najvhodnejší režim.
 * HYBRID ANALYZER (v0.8.0) - keyword pre-filter + LLM fallback.
 * 
 * 🔥 KEFYK v2.0: DETECTION FLOW (správne poradie)
 * ========================================
 * LAYER -1: EXPLICIT PREFIX CHECK (SP4_CORE, Glitchoslav, Popiči → bypass all)
 * LAYER -0.6: DIALECT ANALYZER (Eastern Slovak confidence > 0.65 → POPIČI)
 * LAYER -0.5: VULGARITY OVERRIDE (vulgar + self-criticism → POPIČI)
 * LAYER -0.4: EXISTENTIAL OVERRIDE (existential keywords → GLITCHOSLAV)
 * LAYER 0: INTENSITY CHECK (emotional intensity > 0.7 → POPIČI)
 * LAYER 1: HYBRID ANALYZER (keyword pre-filter 80% | pattern fallback 20%)
 * LAYER 2: SP4 CONTEXT MANAGER (agent locking + threshold check)
 * 
 * **Priorita:**
 * 1. Bot Detection (explicit prefix) - ABSOLUTE
 * 2. Dialect Analyzer - HIGH (Eastern Slovak)
 * 3. Intensity Analyzer - MEDIUM (emotions)
 * 4. Hybrid Analyzer - LOW (keyword matching)
 * 5. Context Manager - FINAL (lock/unlock decision)
 * 
 * @param {string} input - užívateľská správa
 * @param {boolean} useContextLock - použiť context manager (default: true)
 * @param {boolean} useQuickAnalyzer - použiť keyword pre-filter (default: true)
 * @returns {string} - režim: "core" | "popici" | "glitchoslav" | "validator" (interný diagnostics slot)
 */
export function pickMode(input, useContextLock = true, useQuickAnalyzer = true) {
    const startTime = performance.now();

    // 🔒 LAYER -1: EXPLICIT MODE PREFIX - ABSOLUTE PRIORITY
    const explicitMode = detectExplicitMode(input);
    if (explicitMode) {
        console.log(`   🔒 EXPLICIT MODE: ${explicitMode.toUpperCase()} (prefix detected, auto-detection disabled)`);

        // Force unlock context manager and lock to explicit mode
        if (useContextLock) {
            contextManager.forceUnlock(explicitMode, 'EXPLICIT_PREFIX_OVERRIDE');
        }

        const totalTime = performance.now() - startTime;
        console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)}ms (method: explicit-prefix)`);

        return explicitMode;
    }

    // 🔥 LAYER -0.5: VULGARITY OVERRIDE - Force POPIČI (v0.10.3 Level 2 fix)
    // Level 2 bug: "Ta bratu prečo furt dojebem?" → CORE (wrong)
    const text = input.toLowerCase();

    // 🔧 KEFYK FIX v2.0: LAYER -0.6 - DIALECT OVERRIDE (higher priority than vulgarity)
    // Prevencia false positives: "Ta čo je?" → CORE (wrong, should be POPICI)
    const dialectResult = dialectAnalyzer.analyze(input);
    if (dialectResult.confidence > 0.65) {
        console.log(`   🗣️ DIALECT OVERRIDE: Eastern Slovak confidence ${dialectResult.confidence.toFixed(2)} → POPIČI (bypass all)`);
        console.log(`   📊 Detected patterns: ${dialectResult.details.totalMatches} matches`);

        // Force unlock context manager
        if (useContextLock && contextManager.currentMode !== 'popici') {
            contextManager.forceUnlock('popici', 'DIALECT_OVERRIDE', false);
        }

        const totalTime = performance.now() - startTime;
        console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)}ms (method: dialect-override)`);
        return 'popici';
    }

    // 🎯 HARD TRIGGER: "ta bratu" pattern (Eastern Slovak) → instant POPIČI
    const taBratuPattern = /\bta\b.*\bbratu\b|\bbratu\b.*\bta\b/i;
    if (taBratuPattern.test(text)) {
        console.log(`   🗣️ HARD TRIGGER: "ta bratu" detected → POPIČI (ignore lock)`);

        if (useContextLock && contextManager.currentMode !== 'popici') {
            contextManager.forceUnlock('popici', 'TA_BRATU_HARD_TRIGGER', false);
        }

        const totalTime = performance.now() - startTime;
        console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)}ms (method: ta-bratu-trigger)`);
        return 'popici';
    }

    const vulgarityPresent = /\b(kokot|kurv|jeba|piči|sere|hovno)\b/i.test(text);
    const selfCriticism = /\b(som|nevládzem|dojebal|zlyhal|nezvládol|nezvládnem|furt|zas)\b/i.test(text);

    if (vulgarityPresent && selfCriticism) {
        console.log(`   💥 VULGARITY OVERRIDE: legit POPIČI query (vulgarita + sebakritika) → bypass all`);

        // Force unlock context manager (but allow auto mode switching)
        if (useContextLock && contextManager.currentMode && contextManager.currentMode !== 'popici') {
            contextManager.forceUnlock('popici', 'VULGARITY_OVERRIDE', false); // v0.10.3: no manual override
        }

        const totalTime = performance.now() - startTime;
        console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)}ms (method: vulgarity-override)`);

        return 'popici';
    }

    // 🌀 LAYER -0.4: EXISTENTIAL OVERRIDE - Force GLITCHOSLAV (v0.10.3 Level 2 fix)
    // Level 2 bug: "Prečo sa človek cíti na hranici?" → POPICI/CORE (wrong)
    // v0.11.1: Expanded keywords + hard triggers for "zmysel života", "moderný svet"
    const existentialScore = _calculateExistentialScore(text);

    // 🎯 HARD TRIGGERS: instant GLITCHOSLAV (ignore confidence)
    // NOTE: Nepoužívame \b pred non-ASCII znakmi (č,š,ž...) — JS \b funguje len pre ASCII.
    //       Miesto toho: (?:^|[\s]) alebo priamy match konceptu.
    const hardExistentialTriggers = [
        /zmysel\s+(života|smrti|existencie|život[au]?|sveta)/i, // genitív aj akuzatív: "zmysel života/život"
        /aký\s+má\s+zmysel/i,                                  // "aký má zmysel X" (\b odstránené — aky/aký non-ASCII)
        /aky\s+ma\s+zmysel/i,                                   // ASCII variant bez diakritiky
        /strata\s+zmyslu/i,
        /moderný\s+svet/i,
        /preco\s+(zijem|zijeme|existujem)/i,                    // bez diakritiky (text je lowercase ale nie normalizovaný)
        /prečo\s+(žijem|žijeme|existujem)/i,
        /prázdnota\s+(v\s+)?duši/i,
        // Abstraktné koncepty — oprava \bčo: čo nie je ASCII word char, \b nefunguje
        /(?:^|[\s,!?])čo\s+je\s+(sloboda|pravda|vedomie|láska|laska|šťastie|stastie)/i,
        /(?:^|[\s,!?])co\s+je\s+(sloboda|pravda|vedomie|laska|stastie)/i,  // bez diakritiky
        // Samotné koncepty ako otázka ("sloboda?", "čo je sloboda pre sp4")
        /^(sloboda|pravda|vedomie)[?!]?$/i,
        // Emocionálne stavy — priame opening statement bez Popici intent
        /^je\s+mi\s+zle/i,
        /^je\s+mi\s+smutno/i,
        // \bsom\s+ má ČASŤÜ pomenácie — `s` je ASCII, \b funguje
        /\bsom\s+(smutn[\u00fd\u00e1y]|unaven[\u00fd\u00e1y]|sám|sama|samot|stratil|stratila)/i
    ];

    if (hardExistentialTriggers.some(pattern => pattern.test(text))) {
        console.log(`   🌀 HARD TRIGGER: existential phrase detected → GLITCHOSLAV (ignore lock)`);

        if (useContextLock && contextManager.currentMode !== 'glitchoslav' && contextManager.currentMode !== 'glitch') {
            contextManager.forceUnlock('glitch', 'EXISTENTIAL_HARD_TRIGGER', false);
        }

        const totalTime = performance.now() - startTime;
        console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)}ms (method: existential-hard-trigger)`);
        return 'glitch';
    }

    // HIGH PRIORITY: existential_score > 0.25 → force GLITCHOSLAV (2+ keywords)
    if (existentialScore >= 0.25) {
        const confidence = Math.min(0.95, 0.75 + existentialScore * 0.4);
        console.log(`   🌀 EXISTENTIAL OVERRIDE: score ${existentialScore.toFixed(2)} → GLITCHOSLAV (conf: ${confidence.toFixed(2)})`);

        // Force unlock context manager (but allow auto mode switching)
        if (useContextLock && contextManager.currentMode && contextManager.currentMode !== 'glitchoslav' && contextManager.currentMode !== 'glitch') {
            contextManager.forceUnlock('glitch', 'EXISTENTIAL_OVERRIDE', false); // v0.10.3: no manual override
        }

        const totalTime = performance.now() - startTime;
        console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)}ms (method: existential-override)`);

        return 'glitch';
    }

    // 🔥 LAYER 0: INTENSITY CHECK - Force POPICI if high anger/frustration
    const emotionalAnalysis = emotionalProcessor.analyzeEmotionalContent(input);
    if (emotionalAnalysis.intensity > 0.7) {
        console.log(`   🔥 HIGH INTENSITY: ${emotionalAnalysis.intensity.toFixed(2)} → FORCE POPICI`);
        console.log(`   📊 Level: ${emotionalAnalysis.level}, Action: ${emotionalAnalysis.action}`);

        // Force unlock context manager if locked in different mode
        if (useContextLock && contextManager.currentMode && contextManager.currentMode !== 'popici') {
            contextManager.forceUnlock('popici', 'INTENSITY_OVERRIDE');
        }

        return "popici";
    }

    // 🚀 LAYER 1: QUICK KEYWORD PRE-FILTER (< 1ms)
    let detection;
    let method = 'pattern'; // default

    if (useQuickAnalyzer) {
        // v0.11.1: Lower POPIČI threshold from 0.8 to 0.7 (easier activation)
        const quickResult = quickDetect(input, 0.7); // threshold 0.7 (was 0.8)

        if (quickResult) {
            // High confidence keyword match → return immediately
            detection = {
                mode: quickResult.mode,
                confidence: quickResult.confidence
            };
            method = 'keyword';

            const totalTime = performance.now() - startTime;
            console.log(`   ⚡ Quick match: ${detection.mode.toUpperCase()} (conf: ${detection.confidence.toFixed(2)}, ${totalTime.toFixed(2)}ms)`);
        } else {
            // Low confidence → fallback to pattern detection
            const analysis = quickAnalyze(input);
            console.log(`   ⚠️  Low confidence (${analysis.confidence.toFixed(2)}) → pattern fallback`);
            detection = _detectModeWithConfidence(input);
            method = 'pattern-fallback';
        }
    } else {
        // Pattern detection (original v0.7 logic)
        detection = _detectModeWithConfidence(input);
    }

    // 🔒 LAYER 2: CONTEXT MANAGER - Agent Locking
    if (useContextLock) {
        const decision = contextManager.shouldChangeMode(detection.mode, detection.confidence, input);

        if (!decision.shouldChange) {
            console.log(`   🔒 Context lock: keeping ${decision.finalMode} (${decision.reason})`);
        }

        const totalTime = performance.now() - startTime;
        console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)}ms (method: ${method})`);

        return decision.finalMode;
    }

    const totalTime = performance.now() - startTime;
    console.log(`   ⏱️  Total time: ${totalTime.toFixed(2)}ms (method: ${method})`);

    return detection.mode;
}

// ------------------------------------------------------------------
// 🔧 HELPER FUNCTIONS
// ------------------------------------------------------------------

// 🌀 v0.10.3: Calculate existential score (shared by pickMode + _detectModeWithConfidence)
// v0.11.1: Expanded keywords for better detection ("moderný svet", "strácajú", "prázdno")
function _calculateExistentialScore(text) {
    const lowerText = text.toLowerCase();
    const existentialKeywords = [
        /zmysel/i, /existova/i, /prečo\s+(žijem|žijeme|som tu|existujem)/i,
        /\bži(ť|je|jem|v)/i,  // žiť, žije, žijem, živ
        /cíti/i,              // cíti, cítiť, cítil (stem match)
        /svetlo/i, /tm(a|e|y)/i, /smer/i, /hranic/i,  // tma, tme, tmy + hranica, hranici
        /realita/i, /simulácia/i, /filozofick/i, /paradox/i,
        /boj(ím|i)/i, /smrť/i, /padám/i, /straten/i, /prázdnot/i,  // bojím, boji + stratený, stratenej + prázdnota, prázdnote
        /trp(ím|i)/i, /zúfalstvo/i, /strat(a|y)\s+zmyslu/i,  // trpím, trpi
        /moderný\s+svet/i, /strácaj(ú|u)/i, /prázdno/i,  // v0.11.1: new triggers
        /\bludia\b.*\bstrácaj/i,  // "ľudia strácajú" pattern
        /duša/i, /vnútro/i,  // soul, inner self
        // v0.12.0: abstraktné koncepty a emocionálne stavy
        /sloboda/i, /pravda/i, /vedomie/i, /chaos/i,  // \b odstránené — non-ASCII tieto
        /som\s+(smutny|smutna|strateny|strat[ea]n[áa]?|sam|sama|stratil|stratila)/i,  // bez diakritiky aj s
        /som\s+(smutný|smutná|stratený|stratená|sám|sama|stratil|stratila)/i,
        /citim\s+sa/i, /cítim\s+sa/i,  // obe varianty — normalizovaný aj pôvodný
        /je\s+mi\s+zle/i, /je\s+mi\s+smutno/i,
        /unaven/i  // unavený, unavená, unavene — stem match
    ];
    let score = 0;
    for (const pattern of existentialKeywords) {
        if (pattern.test(lowerText)) score += 0.15;
    }
    return score;
}

// HELPER: Detekcia jednotlivých módov s confidence scoring
function _detectModeWithConfidence(input) {
    const text = input.toLowerCase();
    const dialectResult = dialectAnalyzer.analyze(input);
    const easternSlovakBoost = dialectResult.isEasternSlovak ? dialectResult.confidence : 0;

    // 🌀 v0.10.3: EXISTENTIAL CHECK (reused from pickMode Layer -0.4)
    const existScore = _calculateExistentialScore(text);
    if (existScore >= 0.25) {
        const confidence = Math.min(0.95, 0.75 + existScore * 0.4);
        return { mode: "glitch", confidence, reason: `existential_score: ${existScore.toFixed(2)}` };
    }

    // GLITCH - self-origin otázky musia sedieť s ask_ai_origin intentom
    if (text.includes("kto si") ||
        text.includes("kto ťa") ||
        text.includes("vznikol si") ||
        text.includes("ako si vznikol") ||
        text.includes("si chatgpt")) {
        return { mode: "glitch", confidence: 0.9, reason: "self_origin_question" };
    }

    // CORE - identitné otázky o užívateľovi / SP4 pôvode
    if (text.match(/kto\s+(som|je\s+kefyk)/) || text.match(/prečo\s+(som|si)\s+tu/) ||
        text.includes("prísľub svetu") || text.includes("sp4 pravdy") ||
        text.includes("poslanie") || text.includes("identit")) {
        return { mode: "core", confidence: 0.9 };
    }
    if (text.includes("láska") || text.includes("samota") || text.includes("prázdnota") ||
        text.includes("vyčerpanie") || text.includes("strata") || text.includes("srdce") ||
        text.match(/bolí.*lásk|lásk.*bolí/) || text.includes("smutný") || text.includes("unavený")) {
        return { mode: "core", confidence: 0.6, reason: "emotional query routed to CORE (EMPATIA deleted)" };
    }

    // POPICI - nasranosť + eastern Slovak boost
    // v0.10.3: Vulgarity override moved to pickMode() LAYER -0.5 (higher priority)
    const popiciBaseMatch = (
        text.match(/čo\s+mám\s+robiť.*sere/) || text.includes("nevládzem") ||
        text.includes("kašlem na to") || text.includes("idem to vzdať") ||
        text.match(/prečo\s+sú\s+ľudia\s+kokoti/) || text.match(/kurv|jeba|kokot|piči/) ||
        text.includes("še") || text.includes("neopuščaj")
    );

    // 🔥 WALTER UPGRADE: dialectAnalyzer aktivovaný - detekuje východniarčinu (ta, bo, šak, dze, furt)
    const eastSlovakDetected = dialectResult.detected && dialectResult.confidence > 0.3;

    if (popiciBaseMatch || eastSlovakDetected) {
        // Combine base match with dialect confidence
        let confidence = 0.5; // default

        if (popiciBaseMatch && eastSlovakDetected) {
            confidence = Math.min(0.9, 0.8 + easternSlovakBoost * 0.3); // Both signals → high confidence
        } else if (popiciBaseMatch) {
            confidence = 0.8; // Content match only
        } else if (eastSlovakDetected) {
            confidence = Math.min(0.85, easternSlovakBoost); // Dialect only (Walter's analyzer)
        }

        if (eastSlovakDetected) {
            console.log(`   🗣️ Walter dialectAnalyzer: VÝCHODNIARČINA detected (conf: ${dialectResult.confidence.toFixed(2)}) → POPICI`);
            console.log(`   📊 Patterns found: ${dialectResult.details.totalMatches} matches`);
            if (dialectResult.details.lexical?.length > 0) {
                console.log(`   📝 Detected words: ${dialectResult.details.lexical.map(m => m.pattern).join(', ')}`);
            }

            // 🧠 WALTER FEATURE: Learn new patterns from high-confidence detections
            if (dialectResult.confidence > 0.6) {
                dialectAnalyzer.learnPattern(input);
                console.log(`   🧠 Pattern learned (confidence > 0.6)`);
            }
        }
        return { mode: "popici", confidence };
    }

    // GLITCH - existenciálne otázky (v0.10.3: rozšírené keywords, vyššia priorita)
    // Level 1 bug fix: "Prečo ľudia strácajú zmysel?" nespustil GLITCH
    const existentialKeywords = [
        /zmysel/i, /existova/i, /prečo\s+(žijem|žijeme|som tu|existujem)/i,
        /\bžiť\b/i, /cítiť/i, /svetlo/i, /tma/i, /smer/i, /hranica/i,
        /realita/i, /simulácia/i, /filozofick/i, /paradox/i,
        /bojím/i, /smrť/i, /padám/i, /stratený/i, /prázdnota/i,
        /trpím/i, /zúfalstvo/i, /strata\s+zmyslu/i
    ];

    let existentialScore = 0;
    for (const pattern of existentialKeywords) {
        if (pattern.test(text)) existentialScore += 0.15;
    }

    // HIGH PRIORITY: existential_score > 0.4 → force GLITCHOSLAV
    if (existentialScore >= 0.4) {
        const confidence = Math.min(0.95, 0.75 + existentialScore * 0.4);
        console.log(`   🌀 EXISTENTIAL OVERRIDE: score ${existentialScore.toFixed(2)} → GLITCHOSLAV (conf: ${confidence.toFixed(2)})`);
        return { mode: "glitch", confidence };
    }

    // Medium priority existential (old logic)
    if (text.match(/zmysel\s+(smrti|tmy)/) || text.includes("realita") ||
        text.includes("simulácia") || text.includes("filozofick") || text.includes("paradox") ||
        text.includes("bojím") || text.includes("tma") || text.includes("smrť") ||
        text.includes("padám") || text.includes("stratený") || text.match(/…/) ||
        text.includes("trpím")) {
        return { mode: "glitch", confidence: 0.75 };
    }

    // CORE - default fallback
    return { mode: "core", confidence: 0.5 };
}

/**
 * Vracia debug info o detekovanom režime
 * @param {string} input 
 * @returns {object} - { mode, reason }
 */
export function analyzeMode(input) {
    const mode = pickMode(input);
    const text = input.toLowerCase();

    let reason = "default (žiadna špecifická detekcia)";

    if (mode === "core") {
        reason = "detekovaná identit ná otázka / technická otázka / default";
    } else if (mode === "popici") {
        reason = "detekovaná nasranosť / vzdor / motivácia";
    } else if (mode === "glitch") {
        reason = "detekovaná existenciálna otázka / tma / smrť / paradox";
    }

    return { mode, reason, input: text.substring(0, 50) + "..." };
}

/**
 * Validuje či je režim platný
 * @param {string} mode 
 * @returns {boolean}
 */
export function isValidMode(mode) {
    return ["auto", "core", "popici", "glitchoslav", "glitch", "validator"].includes(mode);
}

/**
 * Mapovanie aliasov na štandardné režimy
 * @param {string} mode 
 * @returns {string}
 */
export function normalizeMode(mode) {
    const aliases = {
        "glitch": "glitchoslav",
        "popiči": "popici"
    };

    return aliases[mode] || mode;
}

/**
 * Nastaví persona mód (pre /mode príkaz)
 * @param {string} modeName - názov módu (auto, core, popici, glitchoslav, validator[interný])
 * @returns {boolean} - true ak úspešné
 */
export function setMode(modeName) {
    const normalized = modeName.toLowerCase();
    if (isValidMode(normalized)) {
        return true; // Mode is valid (stored elsewhere, not here)
    }
    return false;
}

/**
 * Vygeneruje konfirmačnú správu po zmene módu
 * @param {string} modeName - názov módu
 * @returns {string} - konfirmačná správa
 */
export function getModeConfirmation(modeName) {
    const confirmations = {
        auto: "Prepínam do režimu AUTO – AI si vyberá tón samo podľa kontextu (seeking meaning → hlbočina, testing limits → drzosť, frustration → fire, casual → SP4 Core).",
        core: "Prepínam do režimu CORE – vecný, stručný, technický mozog SP4.",
        popici: "Prepínam do režimu POPIČI KOKOT – drsný, úprimný, východniarsky brat. Ta bo, kokot!",
        glitch: "Prepínam do režimu GLITCHOSLAV – hlboký, tajomný, trans-liminal hlas. Stráž hraníc.",
        glitchoslav: "Prepínam do režimu GLITCHOSLAV – hlboký, tajomný, trans-liminal hlas. Stráž hraníc.",
        validator: "Prepínam do režimu VALIDATOR – interný diagnostics slot pre validáciu outputu, nie bežná persona."
    };
    return confirmations[modeName.toLowerCase()] || "Režim zmenený.";
}

