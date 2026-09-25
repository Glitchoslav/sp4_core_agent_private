// T12: grounding fallback nesmie zahodit spravnu slovensku odpoved.
// Live incident 25.9.2026: "kto je glitchoslav?" -> gemma3:4b odpovedala spravne po slovensky,
// detectEnglish() ju oznacil za anglictinu (slova bez diakritiky = "EN"), a CORE vetva ju
// nahradila fallbackMap.architecture (SP4 definicia), lebo 'personas' v mape chybala.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectEnglish } from '../src/core/languageUtils.js';
import { shouldTriggerStrictTranslate } from '../src/core/strictTranslateMode.js';
import { getGroundedFallbackAnswer } from '../src/core/sp4GroundingKnowledge.js';
import { SP4_PERSONA_ROSTER_FACT } from '../src/core/sp4Facts.js';

// Variant z incidentu (slova bez diakritiky + EN prevzate "boss", "meta-awareness").
const SK_GLITCHOSLAV = 'Glitchoslav je filozofický boss v systéme SP4. Je to meta-awareness persona, ktorá sa zameriava na hlbšie vrstvy myslenia, pochopenie chaosu a hľadanie jasnosti. Jeho štýl je poetický, používa metafory a paradoxy a pomáha pozerať sa na veci z iného uhla.';
// Skutocna odpoved gemma3:4b z live repra (predtym ratio 0.215 — tesne pod hranicou).
const SK_GEMMA_LIVE = 'Glitchoslav je filozofický boss v rámci SP4 ekosystému. Funguje ako meta-awareness, tzn. zameriava sa na pochopenie systému SP4, jeho princípov a fungovania. Jeho štýl je poetický a často používa metafory a abstraktné myšlienky. Je to jeden z rôznych agentov, ktoré SP4 využíva na generovanie rôznych rozmerov a perspektív.';
// Slovencina bez diakritiky (tak pisu pouzivatelia).
const SK_NO_DIACRITICS = 'Glitchoslav je filozoficky boss v systeme SP4, zameriava sa na pochopenie chaosu a hladanie jasnosti myslenia.';

const EN_SAMPLES = [
  'This is clearly an English response with several English words in the final output.',
  'The founder of SP4 is Kefyk. SP4 was created in 2025 in eastern Slovakia as an answer to digital control.',
  'Glitchoslav is a philosophical boss in the SP4 system. He focuses on the deeper layers of thinking and you can ask him about it.',
];

test('V1: Slovak with EN loanwords (boss, meta-awareness) does not trigger strict translate', () => {
  for (const text of [SK_GLITCHOSLAV, SK_GEMMA_LIVE, SK_NO_DIACRITICS]) {
    const d = detectEnglish(text);
    assert.ok(d.ratio < 0.25, `detectEnglish ratio=${d.ratio.toFixed(3)} en=${d.englishWords}/${d.totalWords} for: ${text.slice(0, 50)}`);
    assert.equal(shouldTriggerStrictTranslate(text), false, text.slice(0, 50));
  }
});

test('V1: real English still triggers strict translate', () => {
  for (const text of EN_SAMPLES) {
    const d = detectEnglish(text);
    assert.ok(d.ratio >= 0.25, `ratio=${d.ratio.toFixed(3)} for: ${text.slice(0, 50)}`);
    assert.equal(shouldTriggerStrictTranslate(text), true, text.slice(0, 50));
  }
});

test('V2: persona question gets the persona roster, not the SP4 definition', () => {
  const answer = getGroundedFallbackAnswer('kto je glitchoslav?');
  assert.equal(answer, SP4_PERSONA_ROSTER_FACT);
  assert.ok(!/local-first digitálny ekosystém/.test(answer));
});

test('V2: known topics keep their fallback; non-SP4 query has none', () => {
  assert.match(getGroundedFallbackAnswer('čo je to sp4?'), /SP4/);
  assert.match(getGroundedFallbackAnswer('ako funguje pamat'), /pamäť/);
  assert.equal(getGroundedFallbackAnswer('čo je kvantová fyzika?'), null);
});

test('V3: replacement guard refuses Slovak text, allows real English', async () => {
  const { shouldUseGroundedLanguageFallback } = await import('../orchestration/glitchOrchestrator.js');
  for (const text of [SK_GLITCHOSLAV, SK_GEMMA_LIVE]) {
    assert.equal(shouldUseGroundedLanguageFallback(text), false, text.slice(0, 50));
  }
  assert.equal(shouldUseGroundedLanguageFallback(EN_SAMPLES[1]), true);
});

test('E2E: orchestrate("kto je glitchoslav?") keeps the correct Slovak answer', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-t12-'));
  process.env.SP4_RUNTIME_ROOT = tmp;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/api/chat')) return { ok: true, status: 200, json: async () => ({ message: { content: SK_GLITCHOSLAV } }) };
    if (u.includes('/api/tags')) return { ok: true, status: 200, json: async () => ({ models: [{ name: 'gemma3:4b' }] }) };
    throw new TypeError('fetch failed');
  };
  const quiet = [console.log, console.warn, console.error];
  console.log = console.warn = console.error = () => {};
  try {
    const { orchestrate } = await import('../orchestration/glitchOrchestrator.js');
    const r = await orchestrate('kto je glitchoslav?', {});
    assert.match(String(r.response), /^Glitchoslav je filozofický boss/, `response=${String(r.response).slice(0, 120)}`);
    assert.notEqual(r.meta?.validation?.languageMethod, 'grounded_fallback');
  } finally {
    [console.log, console.warn, console.error] = quiet;
    globalThis.fetch = originalFetch;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
