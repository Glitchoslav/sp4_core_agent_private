import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { getGlobalLanguageFailsafeDecision } from '../src/pipeline/postProcessUtils.js';

console.log('🧪 TEST: global language failsafe explicit-trigger contract');

// Source-level freeze assertion: integration.js must not contain the inverted non-Slovak gate
const source = await fs.readFile(new URL('../integration.js', import.meta.url), 'utf8');
assert.doesNotMatch(
    source,
    /!isUserPrimarilySlovak/,
    'global language failsafe must not depend on the inverted non-Slovak gate'
);

assert.equal(
    typeof getGlobalLanguageFailsafeDecision,
    'function',
    'getGlobalLanguageFailsafeDecision must be importable from postProcessUtils'
);

const slovakLeak = getGlobalLanguageFailsafeDecision({
    userInputLang: 'sk',
    isManifestRequest: false,
    forceSlovak: false,
    enforcementResult: null,
    englishRatioFinal: 0.82,
    totalWords: 28,
});

assert.equal(slovakLeak.shouldFallback, true, 'heavy English leak on Slovak-required output must trigger global failsafe');
assert.equal(slovakLeak.explicitLanguageTrigger, 'USER_INPUT_SK', 'Slovak input must count as explicit global failsafe trigger');
assert.equal(slovakLeak.heavyEnglishLeak, true, 'heavy English leak must be reported explicitly');

const englishLeak = getGlobalLanguageFailsafeDecision({
    userInputLang: 'en',
    isManifestRequest: false,
    forceSlovak: false,
    enforcementResult: null,
    englishRatioFinal: 0.82,
    totalWords: 28,
});

assert.equal(englishLeak.shouldFallback, false, 'plain English output without explicit Slovak trigger must not hit global failsafe');
assert.equal(englishLeak.explicitLanguageTrigger, null, 'plain English output must not invent a Slovak trigger');

const explicitGuardLeak = getGlobalLanguageFailsafeDecision({
    userInputLang: 'en',
    isManifestRequest: false,
    forceSlovak: false,
    enforcementResult: { languageGuardReason: 'PERSISTENT_ENGLISH_AFTER_REWRITE' },
    englishRatioFinal: 0.76,
    totalWords: 24,
});

assert.equal(explicitGuardLeak.shouldFallback, true, 'persistent EN guard reason must trigger global failsafe as explicit last-line signal');
assert.equal(
    explicitGuardLeak.explicitLanguageTrigger,
    'PERSISTENT_ENGLISH_AFTER_REWRITE',
    'global failsafe must honor explicit language guard reason from enforceSlovak slice'
);

const mildLeak = getGlobalLanguageFailsafeDecision({
    userInputLang: 'sk',
    isManifestRequest: false,
    forceSlovak: false,
    enforcementResult: { languageGuardReason: 'PERSISTENT_ENGLISH_AFTER_REWRITE' },
    englishRatioFinal: 0.40,
    totalWords: 28,
});

assert.equal(mildLeak.shouldFallback, false, 'failsafe must stay off when the final leak is not heavy enough');
assert.equal(mildLeak.heavyEnglishLeak, false, 'mild leak must not be treated as heavy leak');

console.log('PASS: global language failsafe only triggers from explicit language signals');