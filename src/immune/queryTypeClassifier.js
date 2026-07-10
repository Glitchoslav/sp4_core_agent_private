// ┌─────────────────────────────────────────────────────────────────┐
// │  SP4 OS MODULE: queryTypeClassifier                            │
// │  Phase: 5 (routing learning)                                   │
// │  Layer: Protection / Analytics                                 │
// │  Role: Lightweight query type heuristics for immune analytics  │
// └─────────────────────────────────────────────────────────────────┘

export const QUERY_TYPES = [
    'conversational',
    'followup',
    'technical_simple',
    'technical_deep',
    'identity',
    'existential',
    'fallback_noise',
    'code_heavy',
    'mixed',
];

const FOLLOWUP_PATTERNS = [
    /\b(a co|a čo|a potom|a dalej|a ďalej|ako to|co tym|čo tým|preco to|prečo to|to ako|to myslis|to myslíš)\b/,
    /^\s*(a|ale|tak|cize|čiže)\b/,
];

const CONVERSATIONAL_PATTERNS = [
    /\b(ahoj|cau|čau|nazdar|dik|diky|ďakujem|dakujem|thanks|ok|okej|super|ako sa mas|ako sa máš|co nove|čo nové)\b/,
];

const IDENTITY_PATTERNS = [
    /\b(kto si|co si|čo si|ako sa volas|ako sa voláš|kto je sp4|co je sp4|čo je sp4|kto sme|co sme|čo sme|sp4)\b/,
];

const EXISTENTIAL_PATTERNS = [
    /\b(zmysel zivota|zmysel života|preco zijeme|prečo žijeme|existencia|vedomie|du[aá]sa|bytie|smrt|smrť|pravda|osud)\b/,
];

const TECH_TERMS = [
    'api', 'json', 'http', 'https', 'tcp', 'udp', 'port', 'router', 'cache', 'latency', 'timeout',
    'node', 'nodejs', 'javascript', 'typescript', 'python', 'ollama', 'prompt', 'token', 'model',
    'bug', 'debug', 'stack', 'trace', 'error', 'server', 'client', 'request', 'response', 'regex',
    'docker', 'git', 'commit', 'branch', 'memory', 'scheduler', 'llm', 'agent', 'runtime', 'handler',
    'import', 'export', 'function', 'class', 'const', 'let', 'async', 'await', 'curl', 'localhost',
];

const CODE_PATTERNS = [
    /```/,
    /=>/,
    /\b(const|let|var|function|return|import|export|class|async|await|try|catch|if|else)\b/,
    /[{}()[\];]/,
    /\w+\([^)]*\)/,
    /\b[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\b/,
];

function normalizeText(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_:+./?#\-\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function countMatches(patterns, text) {
    return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function countTerms(text, terms) {
    let count = 0;
    for (const term of terms) {
        if (text.includes(term)) count++;
    }
    return count;
}

function isFallbackNoise(raw, normalized, wordCount) {
    if (!normalized) return true;
    if (wordCount <= 1 && normalized.length <= 3) return true;

    const alphaNum = (raw.match(/[a-z0-9]/gi) || []).length;
    const noiseChars = raw.length - alphaNum;
    const noiseRatio = raw.length > 0 ? noiseChars / raw.length : 1;
    const repeated = /(.)\1{4,}/.test(raw);
    const gibberish = /\b(asd+|qwe+|zzz+|xxx+|testtest|blabla)\b/.test(normalized);

    return repeated || gibberish || (wordCount <= 2 && noiseRatio > 0.45);
}

function detectMixed(topType, topScore, secondType, secondScore) {
    if (!topType || !secondType) return false;
    if (topScore < 2 || secondScore < 2) return false;
    if (Math.abs(topScore - secondScore) > 1) return false;
    if (topType === secondType) return false;
    if (topType.startsWith('technical_') && secondType.startsWith('technical_')) return false;
    if ((topType === 'code_heavy' && secondType.startsWith('technical_')) || (secondType === 'code_heavy' && topType.startsWith('technical_'))) return false;
    return true;
}

export function classifyQueryTypeDetailed(userInput) {
    const raw = String(userInput || '');
    const normalized = normalizeText(raw);
    const words = normalized ? normalized.split(' ').filter(Boolean) : [];
    const wordCount = words.length;
    const charCount = normalized.length;
    const lineCount = raw.split(/\r?\n/).length;
    const techTerms = countTerms(normalized, TECH_TERMS);
    const codeSignals = countMatches(CODE_PATTERNS, raw);
    const followupSignals = countMatches(FOLLOWUP_PATTERNS, normalized);
    const conversationalSignals = countMatches(CONVERSATIONAL_PATTERNS, normalized);
    const identitySignals = countMatches(IDENTITY_PATTERNS, normalized);
    const existentialSignals = countMatches(EXISTENTIAL_PATTERNS, normalized);
    const fallbackNoise = isFallbackNoise(raw, normalized, wordCount);

    if (fallbackNoise) {
        return {
            query_type: 'fallback_noise',
            confidence: 'high',
            signals: { wordCount, charCount, techTerms, codeSignals, followupSignals, identitySignals, existentialSignals },
        };
    }

    const scores = new Map([
        ['conversational', 0],
        ['followup', 0],
        ['technical_simple', 0],
        ['technical_deep', 0],
        ['identity', 0],
        ['existential', 0],
        ['code_heavy', 0],
    ]);

    if (conversationalSignals > 0) scores.set('conversational', scores.get('conversational') + 2);
    if (followupSignals > 0) scores.set('followup', scores.get('followup') + 2);
    if (identitySignals > 0) scores.set('identity', scores.get('identity') + 3);
    if (existentialSignals > 0) scores.set('existential', scores.get('existential') + 3);
    if (techTerms >= 1) scores.set('technical_simple', scores.get('technical_simple') + 2);
    if (techTerms >= 4) scores.set('technical_deep', scores.get('technical_deep') + 2);
    if (codeSignals >= 2) scores.set('code_heavy', scores.get('code_heavy') + 3);
    if (lineCount >= 3) scores.set('code_heavy', scores.get('code_heavy') + 1);
    if (charCount >= 160 || wordCount >= 24) scores.set('technical_deep', scores.get('technical_deep') + 1);
    if (charCount <= 40 && followupSignals > 0) scores.set('followup', scores.get('followup') + 1);
    if (charCount <= 50 && conversationalSignals > 0 && techTerms === 0) scores.set('conversational', scores.get('conversational') + 1);
    if (charCount <= 80 && identitySignals > 0) scores.set('identity', scores.get('identity') + 1);

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const [topType, topScore] = ranked[0];
    const [secondType, secondScore] = ranked[1];

    let queryType = topScore <= 0 ? 'mixed' : topType;
    if (detectMixed(topType, topScore, secondType, secondScore)) {
        queryType = 'mixed';
    } else if (queryType === 'technical_simple' && (scores.get('technical_deep') >= scores.get('technical_simple') || techTerms >= 5)) {
        queryType = 'technical_deep';
    } else if (queryType === 'technical_deep' && techTerms <= 2 && charCount < 180) {
        queryType = 'technical_simple';
    } else if (queryType === 'code_heavy' && techTerms === 0 && charCount < 40) {
        queryType = 'mixed';
    }

    let confidence = 'medium';
    if (topScore >= 4 && (topScore - secondScore >= 2 || queryType === 'fallback_noise')) confidence = 'high';
    if (topScore <= 1 || queryType === 'mixed') confidence = 'low';

    return {
        query_type: queryType,
        confidence,
        signals: { wordCount, charCount, techTerms, codeSignals, followupSignals, identitySignals, existentialSignals },
    };
}

export function classifyQueryType(userInput) {
    return classifyQueryTypeDetailed(userInput).query_type;
}