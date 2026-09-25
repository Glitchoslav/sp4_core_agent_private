// Bod 7 (P1_P2_FIX_PROPOSAL): post-processing nesmie kaziť kód ani identifikátory.
// Prieskum: žiadny deterministický krok nevkladá medzeru do "policy.cloudAllowed" (tento test to stráži),
// ale 7 z 8 krokov zlučovalo kódové bloky do jedného riadku alebo ničilo odsadenie.
import { test } from 'node:test';
import assert from 'node:assert/strict';

console.log = () => {};
const { filterResponse } = await import('../src/core/responseFilter.js');
const { scrubCorePoliteness } = await import('../src/personas/core/scrubber.core.js');
const { sanitizeCoreOutput } = await import('../src/core/coreFallbacks.js');
const { stripResidualEnglish, cleanupWeirdSlovak } = await import('../src/pipeline/postProcessUtils.js');
const { glitchNormalizeSk } = await import('../src/core/glitchNormalizer.js');
const { scrubPopiciSympathyPhrases } = await import('../integration.js');
const { preserveCodeSegments } = await import('../src/pipeline/codeSegments.js');

const STEPS = {
  'filterResponse(core)': (t) => filterResponse(t, 'core'),
  'filterResponse(popici)': (t) => filterResponse(t, 'popici'),
  'filterResponse(glitchoslav)': (t) => filterResponse(t, 'glitchoslav'),
  scrubCorePoliteness,
  sanitizeCoreOutput,
  stripResidualEnglish,
  glitchNormalizeSk,
  cleanupWeirdSlovak: (t) => cleanupWeirdSlovak(t),
  scrubPopiciSympathyPhrases,
};

const IDENTIFIERS = 'Nastav policy.cloudAllowed na false a over config.llm.primaryModel v súbore.';
const FENCE = '```js\nif (policy.allowCloud) {\n    return  askCloud(prompt);\n}\n```';
const WITH_CODE = `Príklad nastavenia:\n${FENCE}\nHotovo, over to spustením.`;
const INLINE = 'Spusti `npm run test:gate  --silent` a pozri výstup v termináli.';

test('identifiers with dots survive every deterministic step', () => {
  for (const [name, step] of Object.entries(STEPS)) {
    assert.match(step(IDENTIFIERS), /policy\.cloudAllowed/, name);
    assert.match(step(IDENTIFIERS), /config\.llm\.primaryModel/, name);
  }
});

test('fenced code block survives every step byte-for-byte', () => {
  for (const [name, step] of Object.entries(STEPS)) {
    const out = step(WITH_CODE);
    assert.ok(out.includes(FENCE), `${name} changed the code block: ${JSON.stringify(out)}`);
  }
});

test('inline code survives every step', () => {
  for (const [name, step] of Object.entries(STEPS)) {
    assert.ok(step(INLINE).includes('`npm run test:gate  --silent`'), `${name}: ${JSON.stringify(step(INLINE))}`);
  }
});

test('text outside code is still cleaned', () => {
  assert.equal(glitchNormalizeSk('Hľadám  smysl života.'), 'Hľadám zmysel života.');
  const mixed = glitchNormalizeSk(`Hľadám smysl.\n${FENCE}`);
  assert.match(mixed, /zmysel/);
  assert.ok(mixed.includes(FENCE));
  assert.equal(cleanupWeirdSlovak('To je aj aj dobré .'), 'To je aj dobré.');
});

test('preserveCodeSegments: no code → transform called on the original text', () => {
  assert.equal(preserveCodeSegments('a  b', (t) => t.replace(/\s+/g, ' ')), 'a b');
  assert.equal(preserveCodeSegments(null, (t) => t), null);
});
