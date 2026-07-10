import assert from 'node:assert';
import { shouldUseGroundedLanguageFallback } from '../orchestration/glitchOrchestrator.js';
import { getGroundedFallbackAnswer } from '../src/core/sp4GroundingKnowledge.js';

const fallback = getGroundedFallbackAnswer('čo je to sp4?');
const identityFallback = getGroundedFallbackAnswer('kto je kefyk a kde vzniklo sp4?');
const communityFallback = getGroundedFallbackAnswer('kto tvori komunitu sp4?');

const slovakRawIdentity = 'Kefyk je zakladateľ SP4, hasič-záchranár a filozof slobody. Vytvoril SP4, aby mal človek vlastný AI mozog, nie korporátny produkt kontrolovaný treťou stranou. SP4 vzniklo v roku 2025 na východnom Slovensku.';
const englishRawIdentity = 'The founder of SP4 is Kefyk. SP4 was created in 2025 in eastern Slovakia as an answer to digital control.';

assert.ok(fallback, 'expected grounded fallback');
assert.ok(/offline-first AI projekt|offline-first|lokálne|súkromia|validátorov/i.test(fallback), 'fallback should contain factual SP4 framing');
assert.ok(!/Prepočítať SP4 do prirodzenej slovenčiny/i.test(fallback), 'fallback must not contain translator meta text');
assert.ok(!/Budzaj sa realne|AI mince|cloud-based/i.test(fallback), 'fallback must not contain corrupted translation artifacts');

assert.ok(identityFallback, 'expected grounded identity fallback');
assert.ok(/Kefyk .* zakladateľ SP4|Kefyk \(Glitchoslav\) je zakladateľ SP4/i.test(identityFallback), 'identity fallback should contain founder fact');
assert.ok(/SP4 vzniklo v roku 2025 na východnom Slovensku/i.test(identityFallback), 'identity fallback should contain canonical origin fact');

assert.ok(communityFallback, 'expected community fallback');
assert.ok(/SP4 tvorí kmeň reálnych ľudí okolo Kefyka/i.test(communityFallback), 'community fallback should contain community fact');

assert.equal(shouldUseGroundedLanguageFallback(slovakRawIdentity), false, 'slovak identity text must not trigger grounded language fallback');
assert.equal(shouldUseGroundedLanguageFallback(englishRawIdentity), true, 'actual english output should still trigger grounded language fallback');

console.log('PASS: grounded language fallback');
