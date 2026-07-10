// SP4 OS — Prompt Layer Profiler (read-only)
// Zmeria skutočné char-dĺžky systémového promptu po rozoznaných sekciách.
// Pre GLITCH mode zobrazí aj vault slot breakdown (getIdentitySlotSizes).
// Spustiť z adresára sp4_core_agent/

import { buildSystemPrompt } from '../multiVoice.js';
import { getIdentitySlotSizes } from '../src/core/identityVault.js';

const SEPARATOR = '─'.repeat(60);

function profilePrompt(mode, label, userMsg = '') {
  let prompt;
  try {
    prompt = buildSystemPrompt(mode, {}, '', userMsg, false, {});
  } catch (err) {
    console.error(`[${label}] buildSystemPrompt FAILED: ${err.message}`);
    return;
  }

  const total = prompt.length;

  // Rozoznaj sekcie podľa hláv idk markerov
  const sections = {
    'kernel (IDENTITY)':   /#+\s*(IDENTITA|IDENTITY|SP4_CORE|GLITCHOSLAV|POPICI|network_label)/i,
    'safetyLayer':         /BEZPECNOST|SAFETY|JAZYKOV|language policy|language enforcement/i,
    'coreLayer (SP4 KB)':  /SP4 KNOWLEDGE BASE|SP4 \(Slovak Particle/i,
    'contextLayer':        /KONTEXT|KONTEXT VZŤAHU|relationshipLevel|Vzťah:/i,
    'agentLayer header':   /AGENT:\s*(SP4_CORE|GLITCHOSLAV|POPICI|\w+)\s/i,
    'SP4_BASE/FACTS dup':  /SP4 CORE FACTS|📌 SP4 CORE FACTS/i,
    'flavorLayer':         /GLITCH FLAVOR|RUNA TEJTO/i,
    'ruleLayer':           /AUTO-LEARNED RULES/i,
    'fireMode':            /FIRE MODE ACTIVE/i,
  };

  const hits = {};
  for (const [name, re] of Object.entries(sections)) {
    hits[name] = re.test(prompt) ? '✅ prítomná' : '—';
  }

  // Measure segments by splitting on ━━━ delimiters
  const blocks = prompt.split(/━{10,}/).map(b => b.trim()).filter(Boolean);
  const blockSizes = blocks.map((b, i) => {
    const preview = b.slice(0, 60).replace(/\n/g, ' ');
    return `  blok ${String(i + 1).padStart(2, '0')}: ${String(b.length).padStart(5)} chars  │ ${preview}`;
  });

  console.log(`\n${SEPARATOR}`);
  console.log(`PROFIL: ${label} (mode=${mode})`);
  console.log(SEPARATOR);
  console.log(`CELKOM: ${total} chars`);
  console.log(`Blokov (━━ delimited): ${blocks.length}`);
  console.log('');
  console.log('Sekcie:');
  for (const [k, v] of Object.entries(hits)) {
    console.log(`  ${v.padEnd(16)} ${k}`);
  }
  console.log('');
  console.log('Rozpad blokov:');
  blockSizes.forEach(l => console.log(l));
  console.log('');

  // Highlight duplicity
  const hasCoreKB  = /SP4 KNOWLEDGE BASE/.test(prompt);
  const hasFACTS   = /SP4 CORE FACTS/.test(prompt);
  if (hasCoreKB && hasFACTS) {
    const kbMatch   = prompt.match(/━{10,}[\s\S]*?SP4 KNOWLEDGE BASE[\s\S]*?(?=━{10,}|$)/);
    const factsMatch = prompt.match(/SP4 CORE FACTS[\s\S]*?(?=━{10,}|$)/);
    const kbLen     = kbMatch   ? kbMatch[0].length   : '?';
    const factsLen  = factsMatch ? factsMatch[0].length : '?';
    console.log(`⚠️  DUPLICITA DETEKOVANÁ: SP4 KB (~${kbLen} chars) + SP4_FACTS_BLOCK (~${factsLen} chars)`);
    console.log(`   Potenciálna úspora: ~${typeof factsLen === 'number' ? factsLen : '?'} chars`);
  } else if (!hasFACTS) {
    console.log('✅ SP4_FACTS_BLOCK ABSENTUJE — žiadna duplicita v tejto vetve');
  }

  // Vault slot breakdown — len pre GLITCH, kde vault exploduje
  if (mode === 'glitch' || mode === 'glitchoslav') {
    console.log('');
    console.log('Vault slot breakdown (getIdentitySlotSizes):');
    try {
      const slots = getIdentitySlotSizes();
      let vaultTotal = 0;
      for (const s of slots) {
        vaultTotal += s.chars;
        const bar = '█'.repeat(Math.min(40, Math.round(s.chars / 100)));
        console.log(`  ${s.source === 'missing' ? '⚠️ ' : '  '} ${String(s.chars).padStart(5)} chars │ ${bar} │ ${s.slotId} (${s.label})`);
      }
      console.log(`  ${'─'.repeat(58)}`);
      console.log(`  ${String(vaultTotal).padStart(5)} chars │ VAULT TOTAL`);
      console.log(`  Podiel z celkového promptu: ${((vaultTotal / total) * 100).toFixed(1)}%`);
    } catch (err) {
      console.log(`  [slot profiler] FAILED: ${err.message}`);
    }
  }
}

// --- Spusti pre oba módy ---
profilePrompt('core',    'CORE — tech query',    'Ako funguje wifi router?');
profilePrompt('glitch',  'GLITCH — meta query',  'Kto som ja v tomto kmeni?');
profilePrompt('popici',  'POPICI — reality check','Čo mám robiť keď mi nič nefunguje?');

console.log(`\n${SEPARATOR}`);
console.log('Profiling hotový. Žiadne súbory neboli zmenené.');
console.log(SEPARATOR);
