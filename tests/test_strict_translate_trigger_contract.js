import assert from 'node:assert';
import { detectEnglish } from '../src/core/languageUtils.js';
import { shouldTriggerStrictTranslate } from '../src/core/strictTranslateMode.js';

const slovakSample = 'Toto je čisto slovenská veta o SP4, pamäti a lokálnom AI partnerovi.';
const englishSample = 'This is clearly an English response with several English words in the final output.';
const codeHeavySample = 'SP4 API JSON HTTP v lokálnom režime s pamäťou a validátorom pre používateľa.';

const slovakDetection = detectEnglish(slovakSample);
assert.equal(typeof slovakDetection, 'object', 'detectEnglish must return structured stats object');
assert.ok(slovakDetection.ratio < 0.25, `expected Slovak sample below trigger threshold, got ${slovakDetection.ratio}`);
assert.equal(
    shouldTriggerStrictTranslate(slovakSample),
    false,
    'Slovak text must not trigger strict translate just because detectEnglish returns an object'
);

const englishDetection = detectEnglish(englishSample);
assert.equal(typeof englishDetection, 'object', 'detectEnglish must keep object contract for English sample');
assert.ok(englishDetection.ratio >= 0.25, `expected English sample above trigger threshold, got ${englishDetection.ratio}`);
assert.equal(
    shouldTriggerStrictTranslate(englishSample),
    true,
    'English text should trigger strict translate'
);

const codeHeavyDetection = detectEnglish(codeHeavySample);
assert.equal(typeof codeHeavyDetection, 'object', 'detectEnglish must keep object contract for code-heavy sample');
assert.ok(codeHeavyDetection.ratio < 0.25, `expected mixed technical sample below trigger threshold, got ${codeHeavyDetection.ratio}`);
assert.equal(
    shouldTriggerStrictTranslate(codeHeavySample),
    false,
    'Code-heavy technical text should not trigger strict translate by object truthiness alone'
);

console.log('PASS: strict translate trigger contract');