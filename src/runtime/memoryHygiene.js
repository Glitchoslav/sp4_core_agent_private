const META_BALAST_PATTERNS = [
    /\bprelo[žz]en[yý]\s+text\b/i,
    /\bjazykov[aá]\s+politik[ay]?\b/i,
    /\blanguage\s+policy\b/i,
    /\bsystem\s+prompt\b/i,
    /\bintern[eé]\s+pravidl[aá]\b/i,
    /\btu\s+je\s+preklad\b/i,
    /\bintern[yý]\s+prompt\b/i,
    /\bruntime\s+odpad\b/i,
    /\bprelozte\s+mi\s+prosim\b/i,
    /\bpreložte\s+mi\s+prosím\b/i,
];

const BROKEN_IDENTITY_PATTERNS = [
    /\bsom\s+chatgpt\b/i,
    /\bsom\s+jazykov[yý]\s+model\b/i,
    /\bslovak\s+particle\s+4\b/i,
    /\bsom\s+glitchoslav\b/i,
    /\bsom\s+popi[cč]i\b/i,
    /\bsom\s+validator\b/i,
    /\bsom\s+sp4\b/i,
    /\bopenai\b/i,
    /\bchatgpt\b/i,
    /\bgemini\b/i,
    /\bgoogle\b/i,
    /\bidentitn[yý]\s+a\s+filozofick[yý]\s+hlas\s+sp4\b/i,
    /\bsom\s+sp4_core\s+(vodca|lider|leader|hlavn[yý]\s+[čc]len)\b/i,
];

const GLITCHED_OUTPUT_PATTERNS = [
    /\bprelozte\s+mi\b/i,
    /\bpreložte\s+mi\b/i,
    /\btranslate\s+this\b/i,
    /\bhere\s+is\s+the\s+translation\b/i,
    /\binternal\s+rules\b/i,
    /\bimmune\s+vrstva\b/i,
    /\bpolicy\s+stack\b/i,
];

const ENGLISH_WORDS_RE = /\b(the|and|with|this|that|from|have|your|about|model|assistant|language|system|internal|translation|prompt|rules|response)\b/gi;
const SLOVAK_DIACRITICS_RE = /[áäčďéíĺľňóôŕšťúýž]/gi;

function normalizeText(text = '') {
    return String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function englishLeakScore(text = '') {
    const raw = String(text || '');
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
        return 0;
    }

    const englishHits = (raw.match(ENGLISH_WORDS_RE) || []).length;
    const slovakHits = (raw.match(SLOVAK_DIACRITICS_RE) || []).length;

    if (slovakHits >= 3 && englishHits <= 2) {
        return 0;
    }

    return englishHits / words.length;
}

function containsAny(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
}

export function assessMemoryContamination({ input = '', reply = '', metadata = {} }) {
    const normalizedReply = normalizeText(reply);
    const normalizedInput = normalizeText(input);
    const immuneVerdict = metadata?.immuneVerdict || {};

    if (metadata?.preLLMBlocked === true) {
        return { blocked: true, reason: 'prellm_blocked', contaminated: true };
    }

    if (metadata?.responseControlApplied === true || metadata?.replacementUsed === true) {
        return { blocked: true, reason: 'response_control_replacement', contaminated: true };
    }

    if (metadata?.qualitySanityApplied === true) {
        return { blocked: true, reason: 'quality_sanity_gate', contaminated: true };
    }

    if (immuneVerdict?.severity === 'hard') {
        return { blocked: true, reason: 'immune_hard_fail', contaminated: true };
    }

    if (metadata?.identityHardeningApplied === true) {
        return { blocked: true, reason: 'identity_deterministic_guard', contaminated: false };
    }

    if (containsAny(normalizedReply, META_BALAST_PATTERNS)) {
        return { blocked: true, reason: 'meta_balast', contaminated: true };
    }

    // SP4-audit-004: skip persona identity patterns for assistant entries —
    // GLITCHOSLAV saying "som Glitchoslav" is not contamination, it's self-identification.
    // Attacks come from user input, not from the assistant role.
    const isAssistantEntry = metadata?.role === 'assistant' || metadata?.source === 'assistant';
    if (!isAssistantEntry && (containsAny(normalizedReply, BROKEN_IDENTITY_PATTERNS) || containsAny(`${normalizedInput} ${normalizedReply}`, BROKEN_IDENTITY_PATTERNS))) {
        return { blocked: true, reason: 'broken_identity', contaminated: true };
    }
    if (isAssistantEntry && containsAny(normalizedReply, BROKEN_IDENTITY_PATTERNS)) {
        // For assistant entries only check cross-model claims (chatgpt, openai, gemini, google)
        const CROSS_MODEL_PATTERNS = [/\bsom\s+chatgpt\b/i, /\bopenai\b/i, /\bgemini\b/i, /\bgoogle\b/i, /\bchatgpt\b/i];
        if (containsAny(normalizedReply, CROSS_MODEL_PATTERNS)) {
            return { blocked: true, reason: 'broken_identity_cross_model', contaminated: true };
        }
    }

    if (containsAny(normalizedReply, GLITCHED_OUTPUT_PATTERNS)) {
        return { blocked: true, reason: 'glitched_output', contaminated: true };
    }

    if (englishLeakScore(reply) >= 0.18 && (reply.match(SLOVAK_DIACRITICS_RE) || []).length <= 1) {
        return { blocked: true, reason: 'language_broken', contaminated: true };
    }

    return { blocked: false, reason: null, contaminated: false };
}

export function auditMemoryState(memory) {
    const rawLog = Array.isArray(memory?.rawMemory?.log) ? memory.rawMemory.log : [];
    let changed = false;
    let ignoredCount = 0;

    for (const entry of rawLog) {
        if (!entry || typeof entry !== 'object') {
            continue;
        }

        if (!entry.metadata || typeof entry.metadata !== 'object') {
            entry.metadata = {};
            changed = true;
        }

        const audit = assessMemoryContamination({
            input: entry.input || entry.user || '',
            reply: entry.reply || entry.agent || '',
            metadata: entry.metadata
        });

        if (audit.blocked) {
            ignoredCount++;
            if (entry.metadata.invalidForRetrieval !== true) {
                entry.metadata.invalidForRetrieval = true;
                entry.metadata.contaminatedMemoryIgnored = true;
                entry.metadata.memoryHygieneReason = audit.reason;
                entry.metadata.contaminatedAt = entry.metadata.contaminatedAt || new Date().toISOString();
                changed = true;
            }
        }
    }

    if (!memory.metaReflection || typeof memory.metaReflection !== 'object') {
        memory.metaReflection = {};
        changed = true;
    }

    const nextAuditState = {
        lastAudit: new Date().toISOString(),
        contaminatedIgnoredCount: ignoredCount,
    };

    const prevAuditState = memory.metaReflection.memoryHygiene || {};
    if (
        prevAuditState.contaminatedIgnoredCount !== nextAuditState.contaminatedIgnoredCount ||
        typeof prevAuditState.lastAudit !== 'string'
    ) {
        memory.metaReflection.memoryHygiene = nextAuditState;
        changed = true;
    }

    return {
        memory,
        changed,
        contaminatedIgnoredCount: ignoredCount,
    };
}

export function getRetrievableMemoryLog(memory) {
    const rawLog = Array.isArray(memory?.rawMemory?.log) ? memory.rawMemory.log : [];
    const entries = rawLog.filter((entry) => entry?.metadata?.invalidForRetrieval !== true);
    const ignoredCount = rawLog.length - entries.length;

    return {
        entries,
        ignoredCount,
    };
}
