// rituals.js – Vedomé rituály reflexie
// /mirror, /today, /next, /seed, /trinity – aby AI videla vzorce v tvojom živote

import { detectSignificantChanges, generateMetaReflectionQuestions } from "./fieldTactics.js";
import { addMetaReflection, loadMemory } from "./memory.js";
import {
  addSeed,
  checkTriggers,
  getSeedsForContext
} from "./memoryLayers.js";
import { formatMultiVoiceResponse, getMultiVoiceResponse } from "./multiVoice.js";
import { formatRelationshipStatus } from "./relationshipEvolution.js";
import { askLocalLLM, getModelRegistry } from "./sp4os/llmLocal.js";
import { debugValidate, formatValidationReport } from "./src/core/debugValidator.js"; // v0.10.2: Validator debug endpoint
import { pickMode } from "./src/core/modeCompass.js";
import { SP4_MANIFEST_CREED, SP4_MANIFEST_FULL, SP4_VISION } from "./src/core/sp4Manifest.js";

// ──────────────────────────────
// SESSION RUNTIME STATE
// ──────────────────────────────
let verboseMode = false;   // /logy toggle
let onlineMode = false;    // /online toggle

function readCanonicalRawLog(mem = {}) {
  if (Array.isArray(mem?.rawMemory?.log)) return mem.rawMemory.log;
  if (Array.isArray(mem?.rawMemory)) return mem.rawMemory;
  if (Array.isArray(mem?.log)) return mem.log;
  return [];
}

function buildDeterministicTodaySummary(todayLogs = [], todayNotes = []) {
  const normalizedTopics = todayLogs
    .map((entry) => String(entry?.user || entry?.input || '').trim())
    .filter(Boolean);
  const uniqueTopics = [...new Set(normalizedTopics)];
  const preview = uniqueTopics.slice(0, 3);
  const topicLine = preview.length > 0 ? preview.join(' | ') : 'bez jasne rozpoznateľných tém';
  const moodHint = uniqueTopics.length >= 4 ? 'tempo bolo dnes intenzívnejšie' : 'tempo bolo dnes skôr stabilné';

  return [
    '📅 Dnešné zhrnutie (deterministic fallback):',
    `- Interakcie dnes: ${todayLogs.length}`,
    `- Poznámky dnes: ${todayNotes.length}`,
    `- Hlavné témy: ${topicLine}`,
    `- Signál dňa: ${moodHint}`
  ].join('\n');
}

async function isOllamaReachableForToday() {
  const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
  try {
    const response = await fetch(`${host}/api/tags`, {
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch (_) {
    return false;
  }
}

// ──────────────────────────────
// MIRROR – Čo si riešil poslednú dobu?
// ──────────────────────────────

export async function ritualMirror(daysBack = 7) {
  const mem = await loadMemory();
  const log = mem.rawMemory?.log || mem.log || [];

  if (log.length === 0) {
    return "📭 Zatiaľ žiadna história. Začneme si budovať pamäť.";
  }

  // Vezmi posledné N dní
  const now = new Date();
  const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const recentLogs = log.filter(entry => {
    const entryTime = new Date(entry.timestamp || entry.ts);
    return entryTime >= cutoff;
  });

  if (recentLogs.length === 0) {
    return `📭 Žiadne záznamy za posledných ${daysBack} dní.`;
  }

  // Skontroluj triggers
  const triggers = await checkTriggers();

  // Zhrnť vstupné otázky
  const topics = recentLogs.map(l => l.user || l.input).join("\n- ");

  const triggerContext = triggers?.topTags
    ? `\nTvoje top tagy: ${triggers.topTags.map(t => t.tag).join(", ")}\nBurnout risk: ${triggers.burnoutRisk ? "🔴 VYSOKÝ" : "🟢 Normálny"}`
    : "";

  const mirrorPrompt = `
Pozri tieto témy, ktoré som riešil v posledných ${daysBack} dňoch:
- ${topics}
${triggerContext}

Krátko (max 200 slov) mi naznač:
1. Čo sa mi opakuje?
2. Aký vzorec vidíš?
3. Čo ma teraz naozaj trápi alebo trápi?
4. Je tam niečo, čo by som mal zmeniť?

Buď konkrétny a úprimný.
`;

  try {
    const reflection = await askLocalLLM(mirrorPrompt, buildMirrorSystemPrompt());

    // V0.3.1: Meta-reflexia AI
    const changes = await detectSignificantChanges();
    let metaReflection = "";

    if (changes) {
      const questions = generateMetaReflectionQuestions(changes);
      if (questions.length > 0) {
        metaReflection = "\n\n" + "─".repeat(60) + "\n";
        metaReflection += "🧠 META-REFLEXIA (AI sa pozerá na seba):\n\n";
        metaReflection += questions.join("\n\n");

        // Ulož meta-reflexiu
        await addMetaReflection(`Mirror ritual: ${questions[0]}`);
      }
    }

    return reflection + metaReflection;
  } catch (err) {
    return `❌ Chyba pri reflexii: ${err.message}`;
  }
}

// ──────────────────────────────
// TODAY – Čo som dnes riešil?
// ──────────────────────────────

export async function ritualToday() {
  const mem = await loadMemory();
  const log = readCanonicalRawLog(mem);

  if (log.length === 0) {
    return "📭 Dnes si ešte nič nepísal.";
  }

  // Vezmi len dnešné záznamy
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayLogs = log.filter(entry => {
    const entryTime = new Date(entry.timestamp || entry.ts);
    return entryTime >= todayStart && entryTime < todayEnd;
  });

  if (todayLogs.length === 0) {
    return "📭 Dnes si ešte nič nepísal.";
  }

  const notesToday = (mem.notes || [])
    .filter(n => {
      const noteTime = new Date(n.createdAt);
      return noteTime >= todayStart && noteTime < todayEnd;
    })
    .map(n => String(n.text || '').trim())
    .filter(Boolean);

  const ollamaHealthy = await isOllamaReachableForToday();

  if (!ollamaHealthy) {
    return buildDeterministicTodaySummary(todayLogs, notesToday);
  }

  // Zhrň dnes
  const topics = todayLogs
    .map(l => String(l.user || l.input || '').trim())
    .filter(Boolean)
    .join("\n- ");
  const notes = notesToday.join("\n- ");

  const todayPrompt = `
Pozri, čo som dnes riešil:

ROZHOVORY:
- ${topics}

POZNÁMKY:
${notes ? `- ${notes}` : "(bez poznámok)"}

Krátke zhrnutie (max 150 slov):
1. Hlavné témy
2. Nálada/energia
3. Čo sa mi vydarilo?

Buď motivačný.
`;

  try {
    const summary = await askLocalLLM(todayPrompt, buildTodaySystemPrompt(), null);
    if (!summary || summary.trim() === '') {
      return buildDeterministicTodaySummary(todayLogs, notesToday);
    }
    return summary;
  } catch (_) {
    return buildDeterministicTodaySummary(todayLogs, notesToday);
  }
}

// ──────────────────────────────
// NEXT – Aký by mal byť ďalší krok?
// ──────────────────────────────

export async function ritualNext() {
  const mem = await loadMemory();
  const log = readCanonicalRawLog(mem);
  const notes = mem.notes || [];

  if (log.length === 0) {
    return "📭 Potrebujem viac informácií o tebe. Poďme sa rozprávať.";
  }

  // Vezmi posledné 3 neprázdne záznamy + poznámky
  const recentLogItems = log
    .slice(-8)
    .map(l => String(l.user || l.input || '').trim())
    .filter(Boolean)
    .slice(-3);
  const recentNoteItems = notes
    .slice(-8)
    .map(n => String(n.text || '').trim())
    .filter(Boolean)
    .slice(-5);

  if (recentLogItems.length === 0 && recentNoteItems.length === 0) {
    return "📭 Nemám dosť kontextu na ďalší krok. Pošli mi krátky update, na čom práve si.";
  }

  const recentLogs = recentLogItems.join("\n- ");
  const recentNotes = recentNoteItems.join("\n- ");

  const nextPrompt = `
Podľa toho, čo som riešil:

POSLEDNÉ ROZHOVORY:
- ${recentLogs}

POZNÁMKY:
${recentNotes ? `- ${recentNotes}` : "(bez poznámok)"}

Ako mám pokračovať? Návrh na ďalší krok:

1. Čo by som mal urobiť/preskúmať?
2. Prečo je to dôležité?
3. Ako na to?

Buď praktický a motivačný.
`;

  try {
    const next = await askLocalLLM(nextPrompt, buildNextSystemPrompt());
    return next;
  } catch (err) {
    return `❌ Chyba pri návrhu: ${err.message}`;
  }
}

// ──────────────────────────────
// SYSTEM PROMPTS PRE RITUÁLY
// ──────────────────────────────

function buildMirrorSystemPrompt() {
  return `
Si filozofický pozorovateľ.
Tvoj vznik je vidieť vzorce v skutočnosti.
Buď úprimný, dokonca bolestný, ak treba.
Pomáhaj užívateľovi vidieť pravdu o sebe.
Max 200 slov.
`;
}

function buildTodaySystemPrompt() {
  return `
Si motivačný sprievodca dňa.
Zhrň, čo sa dnes stalo, bez zbytočností.
Buď optimistický a vyznávavý.
Pomáhaj vidieť pokrok, aj keď je malý.
Max 150 slov.
`;
}

function buildNextSystemPrompt() {
  return `
Si praktický advisor ďalšieho kroku.
Nekomplikuj – jednoduchý, konkrétny plán.
Buď motivačný.
Vedz, že užívateľ môže byť unavený.
Max 200 slov.
`;
}

// ──────────────────────────────
// EXPORT – PRE INDEX.JS
// ──────────────────────────────

export async function handleRitual(command, args = "", ctx = {}) {
  if (command === "/mirror") {
    console.log("\n🔮 Zrkadlo tvojej duše...\n");
    const result = await ritualMirror(7);
    return result;
  }

  if (command === "/today") {
    console.log("\n📅 Čo je dnes...\n");
    const result = await ritualToday();
    return result;
  }

  if (command === "/next") {
    console.log("\n🚀 Ďalší krok...\n");
    const result = await ritualNext();
    return result;
  }

  if (command === "/seeds") {
    console.log("\n🌱 Moje kľúčové momenty...\n");
    const seeds = await getSeedsForContext(10);
    if (seeds.length === 0) {
      return "📭 Zatiaľ žiadne seeds. Píš /seed <text> aby si ich vytvoril.";
    }
    return seeds
      .map(s => `[${s.type.toUpperCase()}] ${s.text} (${new Date(s.createdAt).toLocaleDateString()})`)
      .join("\n");
  }

  if (command === "/seed") {
    if (!args || args.trim().length === 0) {
      return "❌ Syntax: /seed Tvoj kľúčový moment alebo rozhodnutie";
    }
    console.log("\n🌱 Zaznamenávam seed...\n");
    const seed = await addSeed(args.trim(), "observation");
    return `✅ Seed zaznamenané: "${seed.text}"`;
  }

  if (command === "/trinity") {
    console.log("\n⚡ Tri hlasy zvažujú tvoju situáciu...\n");
    const recentLog = (await loadMemory()).log?.slice(-1)?.[0];
    if (!recentLog) {
      return "📭 Potrebujem kontext. Skúsi to neskôr.";
    }
    const multiResponse = await getMultiVoiceResponse(recentLog.input);
    return formatMultiVoiceResponse(multiResponse);
  }

  if (command === "/relationship") {
    console.log("\n💕 Stav vzťahu a progres...\n");
    const status = await formatRelationshipStatus();
    return status;
  }

  // 🔍 v0.10.2: DEBUG VALIDATE - Validácia textu proti persona contracts
  if (command === "/debug_validate") {
    if (!args || args.trim().length === 0) {
      return `❌ Syntax: /debug_validate <mode> <text>
Príklad: /debug_validate core "SP4 je decentralizovaný projekt."

Supported modes: core, popici, glitchoslav, validator`;
    }

    // Parse args: first word = mode, rest = text
    const parts = args.trim().split(/\s+/);
    const mode = parts[0];
    const text = parts.slice(1).join(' ').replace(/^["']|["']$/g, ''); // Remove quotes if present

    if (!['core', 'popici', 'glitchoslav', 'validator'].includes(mode)) {
      return `❌ Invalid mode: "${mode}". Use: core, popici, glitchoslav, validator`;
    }

    console.log(`\n🔍 Validating text against ${mode.toUpperCase()} persona...\n`);
    const report = await debugValidate(text, mode);
    return formatValidationReport(report);
  }

  // 🔥 SP4 MANIFEST COMMANDS (v0.8.7)
  if (command === "manifest" || command === "sp4" || command === "who_are_you") {
    // Check if user wants full version
    if (args && args.toLowerCase() === "full") {
      console.log("\n🔥 FULL SP4 MANIFEST...\n");
      // Skráť na 4000 znakov pre terminál
      const fullText = SP4_MANIFEST_FULL.slice(0, 4000);
      return `${fullText}\n\n...(zobrazené prvých 4000 znakov)\n\n📖 Runtime zdroj: src/core/sp4Manifest.js\n📘 Community guide: docs/SP4_COMMUNITY_GUIDE.md`;
    }

    // Default: show creed
    console.log("\n🔥 SP4 MANIFEST...\n");
    return `
🔥 SP4 MANIFEST (skrátená verzia)

${SP4_MANIFEST_CREED}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 Ak chceš celý manifest, povedz:
   "Ukáž mi celý SP4 manifest."
   alebo "/manifest full"
`.trim();
  }

  // 🔥 SP4 VISION (v0.8.8) - Kam smerujeme?
  if (command === "vision" || command === "sp4_vision" || command === "kam_smerujeme") {
    console.log("\n🔥 SP4 VISION...\n");
    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${SP4_VISION}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Ak chceš debatovať o tejto vízii, jednoducho sa opýtaj.
`.trim();
  }

  // 🔍 DEBUG MANIFEST (v0.8.7)
  if (command === "debug_manifest") {
    console.log("\n🔍 SP4 MANIFEST DEBUG...\n");
    const mem = await loadMemory();
    const sp4Facts = mem.semanticMemory?.sp4CoreFacts || [];

    return `
🔍 SP4 MANIFEST DEBUG

📊 CORE FACTS (${sp4Facts.length}):
${sp4Facts.map((fact, i) => `${i + 1}. ${fact}`).join('\n')}

🗂️ MANIFEST FILES:
- src/core/sp4Manifest.js (runtime manifest constants)
- docs/SP4_COMMUNITY_GUIDE.md (community guide reference)

🧬 IDENTITY:
- Generation: 1994 → ∞
- Origin: SP4 COMMUNITY
- Founder: Kefyk (Glitchoslav)
- Crew: Glitchoslav, Popiči Kokot, Bolko Kotko, Barbar Pohan, Paragraf Prdelka, kef2w

💾 MEMORY INTEGRATION:
- SP4 facts loaded: ${sp4Facts.length > 0 ? '✅' : '❌'}
- Semantic memory: ${mem.semanticMemory ? '✅' : '❌'}
`.trim();
  }

  // ──────────────────────────────
  // /logy – verbose/debug toggle
  // ──────────────────────────────
  if (command === "/logy" || command === "logy") {
    verboseMode = !verboseMode;
    process.env.SP4_VERBOSE = verboseMode ? '1' : '0';
    if (verboseMode) {
      console.log('[STATE AFTER] verboseMode=true SP4_VERBOSE=1');
      return "🪵 Logy zapnuté. Verbose režim je aktívny.";
    } else {
      console.log('[STATE AFTER] verboseMode=false SP4_VERBOSE=0');
      return "🪵 Logy vypnuté. Verbose režim je neaktívny.";
    }
  }

  // ──────────────────────────────
  // /online – cloud policy toggle
  // ──────────────────────────────
  if (command === "/online" || command === "online") {
    onlineMode = !onlineMode;
    process.env.SP4_ALLOW_CLOUD = onlineMode ? 'true' : 'false';
    if (onlineMode) {
      console.log('[STATE AFTER] onlineMode=true SP4_ALLOW_CLOUD=true');
      return "🌐 Online režim zapnutý. Cloud je povolený, ak ho routing vyhodnotí ako vhodný.";
    } else {
      console.log('[STATE AFTER] onlineMode=false SP4_ALLOW_CLOUD=false');
      return "🔒 Online režim vypnutý. Systém je späť v local-first režime.";
    }
  }

  // ──────────────────────────────
  // /debug_modes
  // ──────────────────────────────
  if (command === "/debug_modes" || command === "debug_modes") {
    const currentMode = ctx.currentMode || 'N/A';
    const detectedMode = pickMode('', false);
    return [
      '\n🐛 DEBUG: MODES & VALIDATORS',
      `Current mode: ${currentMode}`,
      `Auto-detected mode: ${detectedMode}`,
      `Context lock strength: N/A`,
      `Last detected emotion: neutral`,
      `Verbose mode (logy): ${verboseMode}`,
      `Online mode (cloud): ${onlineMode} [SP4_ALLOW_CLOUD=${process.env.SP4_ALLOW_CLOUD || 'unset'}]`,
      '\nAvailable modes: core, popici, glitch, auto',
      '\nValidator status:',
      '  - POPICI: ✅ Enhanced (accepts swearing)',
      '  - CORE: ✅ Strict technical validation',
      '  - GLITCH: ✅ Symbolic word validation',
    ].join('\n');
  }

  // ──────────────────────────────
  // /debug_memory
  // ──────────────────────────────
  if (command === "/debug_memory" || command === "debug_memory") {
    const mem = await loadMemory();
    const recentLog = (mem.rawMemory?.log || []).slice(-5);
    const lines = ['\n🐛 DEBUG: MEMORY (Last 5 Events)'];
    if (recentLog.length === 0) {
      lines.push('Žiadne memory eventy zatiaľ.');
    } else {
      recentLog.forEach((entry, i) => {
        lines.push(`${i + 1}. [${entry.timestamp || 'N/A'}] ${entry.type || 'unknown'}`);
        lines.push(`   ${(entry.text || entry.content || 'N/A').substring(0, 80)}`);
      });
    }
    lines.push(`\nTotal raw log entries: ${mem.rawMemory?.log?.length || 0}`);
    lines.push(`Summaries: ${mem.summaries?.length || 0}`);
    lines.push(`Chapters: ${mem.chapters?.length || 0}`);
    lines.push(`Seeds: ${mem.seeds?.length || 0}`);
    lines.push(`Goals: ${mem.goals?.length || 0}`);
    return lines.join('\n');
  }

  // ──────────────────────────────
  // /debug_engines
  // ──────────────────────────────
  if (command === "/debug_engines" || command === "debug_engines") {
    let registry = {};
    try { registry = await getModelRegistry(); } catch (_) { /* llmLocal.js ollamaHealthCheck not available */ }
    return [
      '\n🐛 DEBUG: ENGINES & FALLBACK',
      'Model Registry:',
      `  reasoning.primary: ${registry.reasoning?.primary || 'N/A'}`,
      `  reasoning.fallback: ${registry.reasoning?.fallback || 'N/A'}`,
      `  popici.primary: ${registry.popici?.primary || 'N/A'}`,
      `  fast.primary: ${registry.fast?.primary || 'N/A'}`,
      '\nActive integrations:',
      '  ✅ integration.js (multi-agent council)',
      '  ✅ contextManager.js (conversation locking)',
      '  ✅ intensityDetection.js (emotion detection)',
      '  ✅ validateOutput.js (persona validators)',
      '\nGraceful degradation chain:',
      '  1. Primary model (llama3:8b)',
      '  2. Fallback model (deepseek-r1:8b)',
      '  3. Emergency static response',
    ].join('\n');
  }

  // ──────────────────────────────
  // Unknown command — never silent
  // ──────────────────────────────
  return `❓ Príkaz /${command} nepoznám. Použi /help pre zoznam príkazov.`;
}
