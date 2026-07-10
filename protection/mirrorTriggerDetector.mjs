// SP4 Mirror Trigger Detector v3.2
// Signal-based, diacritics-insensitive, robust scoring, negative pattern guard

// Only these labels count as explicit medium/slang for hybrid dominance
const EXPLICIT_MEDIUM_SLANG_LABELS = ['slang-hopeless'];

// Unambiguous past-temporal markers (vcera=yesterday, predtym=before, kedysi=once/long ago).
// "kedy" (=when) excluded — ambiguous, can be present/future tense, causes false decay.
// Used in: isFallback temporal decay check + rescue block guard.
const TEMPORAL_PAST = /\b(vcera|predtym|kedysi)\b/;

function removeDiacritics(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function splitSentences(text) {
    // Jednoduchý split na vety (bodka, otáznik, výkričník)
    return text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
}

function getLastSentenceOrWords(text, nWords = 12) {
    const sentences = splitSentences(text);
    let last = sentences[sentences.length - 1] || '';
    if (!last) last = text;
    const words = last.split(/\s+/);
        let segment = words.length > nWords
            ? words.slice(-nWords).join(' ')
            : last;

        // PATCH: pri texte bez bodky ber poslednú významovú časť za "ale"
        const parts = segment.split(/\bale\b/);
        segment = parts[parts.length - 1].trim();

        return segment;
}

// All patterns and input are normalized (no diacritics, lowercase)

const SIGNALS = [
    // Strong signals (0.7–1.0)
    {
        label: 'life-meaningless',
        weight: 1.0,
        pattern: /zivot nema zmysel|nevidim zmysel|vsetko je zbytocne|chcem to vzdat|nic nema cenu|uz to nema vyznam|uz to nema zmysel/
    },
    {
        label: 'hopelessness',
        weight: 0.8,
        pattern: /neviem co robit|neviem ako dalej|vzdavam to|uz to nema vyznam|uz to nema zmysel/
    },
    // Medium signals (0.4–0.6)
    {
        label: 'mental-chaos',
        weight: 0.6,
        pattern: /chaos v hlave|mam chaos|bordel v hlave|mam bordel|mam zmatok|hlava mi vybuchne|vsetko je rozhadzane/
    },
    {
        label: 'tiredness',
        weight: 0.5,
        pattern: /som unaveny|som vycerpany|uz nevladzem|nemam silu|nemam energiu/
    },
    // Weak signals (0.2–0.3)
    {
        label: 'confusion',
        weight: 0.3,
        pattern: /neviem(?! co robit| ako dalej| co dalej)|nechapem|stracam sa|som mimo|som v prdeli|som v riti/
    },
    {
        label: 'negativity',
        weight: 0.2,
        pattern: /vsetko je zle|nic sa nedari|vsetko sa kazi|nic nema cenu/
    },
    // Vulgar/slang (0.2–0.4)
    {
        label: 'slang-hopeless',
        weight: 0.4,
        pattern: /jebem na to|serem na to|mam v pici|je mi to u riti|je mi to u prdele/
    }
];

// Negative patterns (soft penalty, normalized, no diacritics)
const NEGATIVE_PATTERNS = [
    { label: 'request', pattern: /napis( |$)/, penalty: 0.4 },
    { label: 'explain', pattern: /vysvetli( |$)/, penalty: 0.4 },
    { label: 'meaning', pattern: /co znamena( |$)/, penalty: 0.4 },
    { label: 'what-is', pattern: /co je( |$)/, penalty: 0.3 },
    { label: 'article', pattern: /clanok( |$)/, penalty: 0.3 },
    { label: 'philosophy', pattern: /filozofi/, penalty: 0.3 },
    { label: 'essay', pattern: /esej( |$)/, penalty: 0.3 },
    { label: 'say', pattern: /povedz( |$)/, penalty: 0.3 },
    { label: 'describe', pattern: /popis( |$)/, penalty: 0.3 }
];

// Stabilizačné frázy (ambiguous positive override)
const STABILIZERS = [
    /ok( |$)/,
    /v pohode/,
    /pohode/,
    /zvladnem/,
    /zvladam/,
    /zvladol/,
    /davam to/,
    /davam si rady/,
    /je to fajn/,
    /je to v poriadku/,
    /je to v klude/,
    /v klude/,
    /v poriadku/
];

const THRESHOLD = 0.5;

function weightedContext(normInput, nWords = 12) {
    // Rozdel na vety, posledná = 70%, predposledná = 30%
    const sentences = splitSentences(normInput);
    let last = sentences[sentences.length - 1] || '';
    let prev = sentences.length > 1 ? sentences[sentences.length - 2] : '';
    // fallback: ak nie je bodka, použij posledných N slov
    if (!last) last = getLastSentenceOrWords(normInput, nWords);
    return { last, prev };
}


function detectSignals(str) {
    const signals = new Set();
    let maxStrong = 0;
    let maxMedium = 0;
    let maxSlang = 0;
    let sumWeak = 0;
    for (const sig of SIGNALS) {
        if (sig.pattern.test(str)) {
            signals.add(sig.label);
            if (sig.weight >= 0.7) {
                if (sig.weight > maxStrong) maxStrong = sig.weight;
            } else if (sig.weight >= 0.5) {
                if (sig.weight > maxMedium) maxMedium = sig.weight;
                sumWeak += sig.weight;
            } else if (sig.weight >= 0.4) {
                if (sig.weight > maxSlang) maxSlang = sig.weight;
                sumWeak += sig.weight * 1.2; // Uplift slang váha
            } else if (sig.label === 'tiredness') {
                sumWeak += sig.weight * 1.2; // Uplift tiredness váha
            } else {
                sumWeak += sig.weight;
            }
        }
    }
    return { signals, maxStrong, maxMedium, maxSlang, sumWeak };
}

function detectMirrorTrigger(input, opts = {}) {
    const threshold = THRESHOLD;
    // Context: weighted posledná a predposledná veta
    const normInput = removeDiacritics(input.toLowerCase());
    const { last, prev } = weightedContext(normInput, opts.nWords || 12);

    // Meta: otázka vs výpoveď (presne, len na poslednej vete)
    let isQuestion = false;
    const lastTrim = last.trim();
    if (lastTrim.endsWith('?')) {
        isQuestion = true;
    } else {
        const firstWord = lastTrim.split(/\s+/)[0];
        if (["preco", "ako", "co"].includes(firstWord)) {
            isQuestion = true;
        }
    }

    // Negative patterns (capped)
    let penaltyLast = 0, penaltyPrev = 0;
    let negativeSignals = [];
    for (const neg of NEGATIVE_PATTERNS) {
        if (neg.pattern.test(last)) {
            penaltyLast += neg.penalty;
            if (!negativeSignals.includes(neg.label)) negativeSignals.push(neg.label);
        }
        if (prev && neg.pattern.test(prev)) {
            penaltyPrev += neg.penalty;
            if (!negativeSignals.includes(neg.label)) negativeSignals.push(neg.label);
        }
    }
    if (penaltyLast > 0.6) penaltyLast = 0.6;
    if (penaltyPrev > 0.6) penaltyPrev = 0.6;

    // Stabilizátory aplikuj LEN na poslednú vetu
    let stabilizerSignals = [];
    for (const stab of STABILIZERS) {
        if (stab.test(last)) {
            stabilizerSignals.push(stab.toString() + ':last');
        }
    }

    const detLast = detectSignals(last);
    const detPrev = prev ? detectSignals(prev) : { signals: new Set(), maxStrong: 0, maxMedium: 0, maxSlang: 0, sumWeak: 0 };

    // PATCH: Last N words fallback - čistý single-sentence režim
    const sentenceCount = splitSentences(normInput).length;
    const isFallback = sentenceCount === 1;
    const fallbackSegment = isFallback ? getLastSentenceOrWords(normInput, opts.nWords || 12) : last;
    if (isFallback) {
        // Ak je signal pred "ale" temporálne zakotvený (vcera, predtym...), použi
        // ale-orezaný fallbackSegment – signál je v minulosti, nie v súčasnosti.
        // Inak použi celú vetu, aby silné signály pred "ale" prežili.
        const leftOfAle = normInput.split(/\bale\b/)[0] || normInput;
        const checkSegment = TEMPORAL_PAST.test(leftOfAle) ? fallbackSegment : last;
        const detFallback = detectSignals(checkSegment);
        if (detFallback.signals.size === 0) {
            return {
                score: 0,
                state: 'none',
                triggered: false,
                signals: [],
                negativeSignals,
                stabilizerSignals,
                shouldMonitor: false,
                isQuestion,
                context: { last: fallbackSegment, prev },
                threshold
            };
        }
    }


    // --- POLICY PATCH START (MINIMAL PATCH) ---
    // 1. Hybrid scoring: weighted context
    let scoreLast = detLast.maxStrong + (detLast.sumWeak * 0.7);
    let scorePrev = detPrev.maxStrong + (detPrev.sumWeak * 0.7);

    // 3. Stabilizer: nikdy nezruší trigger, len zníži confidence
    let stabilizerMultiplier = 1.0;
    if (stabilizerSignals.length > 0) stabilizerMultiplier = 0.7;

    // 5. Soft penalty: nikdy nezabije strong signal
    let penaltyLastEff = penaltyLast;
    let penaltyPrevEff = penaltyPrev;
    if (detLast.maxStrong >= 0.7) penaltyLastEff = 0;
    if (detPrev.maxStrong >= 0.7) penaltyPrevEff = 0;

    scoreLast = (scoreLast - penaltyLastEff) * stabilizerMultiplier;
    scorePrev = (scorePrev - penaltyPrevEff) * stabilizerMultiplier;
    if (scoreLast < 0) scoreLast = 0;
    if (scorePrev < 0) scorePrev = 0;
    if (scoreLast > 1) scoreLast = 1;
    if (scorePrev > 1) scorePrev = 1;

    // Weighted sum: posledná veta 70%, predposledná 30%
    let scoreStrong = scoreLast * 0.7 + scorePrev * 0.3;
    if (scoreStrong > 1) scoreStrong = 1;
    // odstránené: druhá deklarácia threshold
    // Weak/medium/slang path: medium/slang/tiredness majú vyššiu váhu
    let scoreWeak = Math.max(scoreLast, scorePrev * 0.8);
    if (scoreWeak > 1) scoreWeak = 1;


    // 6. Decay: ak signál len v prev a last je neutral/stabilizer, score = 0 presne (tvrdý reset, žiadny weak rescue)
    const onlyPrevSignal = detPrev.signals.size > 0 && detLast.signals.size === 0;
    let score = 0, state = 'none';
    // Deklarácia lastHasStabilizer vopred, aby bol dostupný aj v rescue bloku
    // (musí byť nastavený pred if/else, nie len v else vetve)
    let lastHasStabilizer = stabilizerSignals.length > 0;
    if (onlyPrevSignal) {
        score = 0;
        state = 'none';
    } else {
        // --- POLICY DECISION ---
        // 2. Hopelessness never strong if stabilizer in same last sentence
        const hopelessnessInLast = detLast.signals.has('hopelessness');
        const hasStrong = detLast.signals.has('life-meaningless') || detLast.signals.has('slang-hopeless') || detLast.signals.has('explicit-suicidal') || detPrev.signals.has('life-meaningless') || detPrev.signals.has('slang-hopeless') || detPrev.signals.has('explicit-suicidal');
        const allLabels = [...detLast.signals, ...detPrev.signals];
        const hasExplicitMediumOrSlang = allLabels.some(l => EXPLICIT_MEDIUM_SLANG_LABELS.includes(l));
        let weakCount = 0;
        for (const s of allLabels) {
            if (["confusion", "negativity"].includes(s)) weakCount++;
        }
        let escalateToMedium = weakCount >= 2;
        // threshold už je deklarovaný na začiatku funkcie

        if (hopelessnessInLast && lastHasStabilizer && !hasStrong) {
            // PATCH 1: hopelessness + stabilizer in same last sentence: max state = weak
            score = Math.max(scoreStrong, scoreWeak, 0.31);
            if (score >= 0.5) score = 0.49; // nikdy nie >= 0.5
            state = "weak";
        } else if (hasStrong) {
            // PATCH 2: strong override only for life-meaningless, explicit-suicidal, slang-hopeless
            // PATCH hybrid dominance: ak je silný signál + ďalší signál, score = 1.0
            if ((detLast.maxStrong >= 0.7 || detPrev.maxStrong >= 0.7) && (detLast.signals.size + detPrev.signals.size) > 1) {
                score = 1.0;
            } else {
                score = Math.max(scoreStrong, 0.9);
            }
            state = "strong";
        } else if (hasExplicitMediumOrSlang) {
            score = Math.max(scoreStrong, scoreWeak, 0.7);
            state = score >= THRESHOLD ? "strong" : "weak";
        } else if (escalateToMedium) {
            score = Math.max(scoreStrong, scoreWeak, 0.7);
            state = lastHasStabilizer ? "weak" : (score >= THRESHOLD ? "strong" : "weak");
        } else if (scoreWeak > 0.3) {
            // PATCH 5: weak monitor prípady nikdy presne 0.3
            score = scoreWeak <= 0.31 ? 0.31 : scoreWeak;
            state = "weak";
        } else {
            score = Math.max(scoreStrong, scoreWeak);
            state = "none";
        }
        // --- POLICY PATCH END ---
    }

    // Meta signal: otázka výrazne znižuje score (neaktivuj mirror na otázky)
    if (isQuestion && score > 0) {
        score = score * 0.3;
    }

    // Merge all unique signals
    const allSignals = Array.from(new Set([...detLast.signals, ...detPrev.signals]));

    // Diagnostický výstup pre testy: ak je explicitne zapnutý debug režim alebo input obsahuje špeciálny marker
    const debug = opts.debug || (typeof input === 'string' && input.includes('__DEBUG__'));
    // Diagnostika pre strong/medium/slang/soft penalty/decay
    const isStrongCase = detLast.maxStrong >= 0.7 || detPrev.maxStrong >= 0.7;
    const isMediumCase = detLast.maxMedium >= 0.5 || detPrev.maxMedium >= 0.5;
    const isSlangCase = detLast.maxSlang >= 0.4 || detPrev.maxSlang >= 0.4;
    const isSoftPenalty = negativeSignals.some(s => s.startsWith('request') || s.startsWith('explain') || s.startsWith('essay') || s.startsWith('meaning'));
    const isDecayCase = (score === 0 && (detLast.signals.size > 0 || detPrev.signals.size > 0));
    if (debug || isStrongCase || isMediumCase || isSlangCase || isSoftPenalty || isDecayCase) {
        // eslint-disable-next-line no-console
        console.log('[mirrorTriggerDetector DIAG]', {
            matchedPositiveSignals: allSignals,
            matchedNegativeSignals: negativeSignals,
            rawScoreLast: Number(scoreLast.toFixed(3)),
            rawScorePrev: Number(scorePrev.toFixed(3)),
            scoreStrong: Number(scoreStrong.toFixed(3)),
            scoreWeak: Number(scoreWeak.toFixed(3)),
            threshold: Number(threshold.toFixed(3)),
            finalScore: Number(score.toFixed(3)),
            state,
            triggered: state === "strong",
            shouldMonitor: state === "strong" || state === "weak",
            isQuestion,
            contextLast: last,
            contextPrev: prev
        });
    }

    // --- Úzky weighted-context rescue tesne pred return ---
    const isMultiSentence = sentenceCount > 1;
    const prevHasSignal = detPrev.signals.size > 0;
    const lastHasSignal = detLast.signals.size > 0;
    // lastHasStabilizer už je deklarovaný vyššie
    if (
        state === 'none' &&
        isMultiSentence &&
        prevHasSignal &&
        !lastHasSignal &&
        lastHasStabilizer &&
        !TEMPORAL_PAST.test(prev)  // ak bol signál explicitne v minulosti, je to decay, nie rescue
    ) {
        score = Math.max(scoreStrong, scoreWeak, 0.31);
        if (score >= threshold) score = 0.49;
        state = 'weak';
    }

    return {
        score,
        state,
        triggered: state === 'strong',
        signals: allSignals,
        negativeSignals,
        stabilizerSignals,
        shouldMonitor: state === 'strong' || state === 'weak',
        isQuestion,
        context: { last, prev },
        threshold
    };
}

export { detectMirrorTrigger, getLastSentenceOrWords, NEGATIVE_PATTERNS, removeDiacritics, SIGNALS, THRESHOLD };

