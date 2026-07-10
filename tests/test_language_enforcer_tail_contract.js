import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { reconcileLanguageRewrite } from '../src/pipeline/postProcessUtils.js';

console.log('🧪 TEST: language enforcer tail explicit-failure contract');

// Source-level freeze assertions: integration.js pipeline behaviorcontracts
const source = await fs.readFile(new URL('../integration.js', import.meta.url), 'utf8');
assert.doesNotMatch(
    source,
    /Bratu, ešte som sa zamotal v cudzích slovách/,
    'language enforcer tail must not author its own Slovak fallback sentence'
);
assert.match(
    source,
    /languageGuardReason = persistentEnglish \? 'PERSISTENT_ENGLISH_AFTER_REWRITE' : null;/,
    'persistent EN after rewrite must be exposed as an explicit guard reason'
);

assert.equal(typeof reconcileLanguageRewrite, 'function', 'reconcileLanguageRewrite must be importable from postProcessUtils');

const improvedLeak = reconcileLanguageRewrite({
    originalText: 'This is still mostly English.',
    rewrittenText: 'Toto je lepšie, but stále je tam EN leak.',
    englishRatioBefore: 0.75,
    englishRatioAfter: 0.35,
});

assert.equal(
    improvedLeak.text,
    'Toto je lepšie, but stále je tam EN leak.',
    'persistent EN with real improvement must keep the rewritten text instead of inventing fallback text'
);
assert.equal(improvedLeak.persistentEnglish, true, 'improved persistent EN case must still be marked as persistentEnglish');
assert.equal(improvedLeak.rewriteImproved, true, 'improved persistent EN case must report rewriteImproved');
assert.equal(improvedLeak.ratioDropPercent, 40, 'ratio drop percent must stay calculable for logging and calibration');

const regressedLeak = reconcileLanguageRewrite({
    originalText: 'Pôvodný text ostáva menej zlý.',
    rewrittenText: 'This got even worse after rewrite.',
    englishRatioBefore: 0.55,
    englishRatioAfter: 0.60,
});

assert.equal(
    regressedLeak.text,
    'Pôvodný text ostáva menej zlý.',
    'persistent EN without improvement must keep the original text instead of inventing fallback text'
);
assert.equal(regressedLeak.persistentEnglish, true, 'regressed EN case must still be marked as persistentEnglish');
assert.equal(regressedLeak.rewriteImproved, false, 'regressed EN case must report failed improvement');
assert.equal(regressedLeak.ratioDropPercent, -5, 'regressed EN case must preserve negative ratio drop for diagnostics');

const cleanRewrite = reconcileLanguageRewrite({
    originalText: 'This is English.',
    rewrittenText: 'Toto je po slovensky.',
    englishRatioBefore: 0.80,
    englishRatioAfter: 0.02,
});

assert.equal(cleanRewrite.text, 'Toto je po slovensky.', 'successful rewrite must keep rewritten Slovak text');
assert.equal(cleanRewrite.persistentEnglish, false, 'clean rewrite must not be marked as persistentEnglish');
assert.equal(cleanRewrite.rewriteImproved, true, 'clean rewrite must report improvement');

console.log('PASS: language enforcer tail only escalates explicit failure');