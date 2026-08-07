// multiVoice.js – Prompt composer (single-voice + council)
// Identity authority lives in src/identity/IDENTITY_KERNEL.js.
// Nepočíta priamo s diskovou pamäťou: vstupom je state a agents.js profily

import { CORE_PERSONA } from '../identity/personas/core/persona.core.js';
import { GLITCHOSLAV_PERSONA } from '../identity/personas/glitchoslav/persona.glitchoslav.js';
import { POPICI_PERSONA } from '../identity/personas/popici/persona.popici.js';
import { getAgentProfile } from './agents.js';
import { ruleMiner } from './ruleMiner.js'; // v1.0: Auto-learning Rule Miner
import { askLocalLLM } from './sp4os/llmLocal.js';
import { getRandomGlitchTagline, getRandomRune } from './src/core/glitchRunes.js'; // v0.9.0: Glitchoslav soul
import { getGlitchoslavTruth } from './src/core/identityVault.js'; // v1.3.0: Deep identity vault (GLITCHOSLAV ONLY)
import { analyzeMode, getWorkModeDirectives, pickMode } from './src/core/modeCompass.js';
import { getShortVisionAnswer, isVisionQuestion } from './src/core/questionDetector.js'; // v0.8.8.1: vision shortcut
import { runtimeLog, runtimeWarn } from './src/core/runtimeLogging.js';
import { SP4_DEFINITION_SK, SP4_EXPLAIN_SK_FALLBACK, SP4_GOALS_SK, SP4_MANTRA_SK, SP4_VISION_SK } from './src/core/sp4Manifest.js'; // v1.3.0: Slovak manifest
import { buildIdentityKernelBlock, buildIdentityStyleBlock, normalizeIdentityMode } from './src/identity/IDENTITY_KERNEL.js';
import { classifyQueryTypeDetailed } from './src/immune/queryTypeClassifier.js';
import { buildDecisionContract, isDecisionIntent } from './src/routing/intentExtractor.js';

// Public API
// buildPrompt – hlavný vstup pre integration.js
// buildSystemPrompt – iba systémová časť
// buildCouncilView – skeleton pre koncil perspektívy (pripravené do budúcna)

function shouldUseShortTechPrompt({ selectedMode, userMessage, queryInfo }) {
  if (selectedMode !== 'core') {
    return false;
  }

  if (userMessage.length >= 120) {
    return false;
  }

  if (/\b(sp4|kefyk|manifest|sp4ot|kmeň|komunita|zmysel|pôvod|kto si|kto som)\b/i.test(userMessage)) {
    return false;
  }

  const queryType = queryInfo?.query_type;
  const techTerms = queryInfo?.signals?.techTerms || 0;
  return queryType === 'technical_simple' || queryType === 'technical_deep' || techTerms >= 1;
}

function buildDecisionSystemPrompt({ decisionContract, groundingKnowledge = null } = {}) {
  const type = decisionContract?.type || 'decision_priority';
  const subStyle = decisionContract?.subStyle || 'priority_cut';
  const maxWords = Number(decisionContract?.maxWords || 120);
  const previousVerdict = decisionContract?.previousVerdict
    ? `\nPredchádzajúci VERDIKT bol: ${decisionContract.previousVerdict}. Nemeň ho bez nového dôvodu.`
    : '';
  const energyContext = decisionContract?.energyContext
    ? `\nEnergetický kontext z posledných správ:\n${decisionContract.energyContext}`
    : '';

  const styleRules = {
    binary_cut: 'Vyber jednu stranu, nie kompromis. Ak chýba kontext, vyber menej zlú možnosť a neistotu priznaj iba v PREČO.',
    priority_cut: 'Vyber jednu prioritu. Žiadne tri možnosti. Jedna vec, ktorá teraz najviac zníži chaos.',
    self_deception_cut: 'Najprv rez. Bez upokojujúceho úvodu, bez "je to normálne", bez mäkkej omáčky.',
    error_reflection_cut: 'Ak user myslí seba, pomenuj jeho vzorec správania, nie systémovú alebo technickú chybu. Jeden korekčný krok, žiadna filozofická vata.',
    energy_cut: 'Rozhodni jedným zo slovies: oddýchni, pokračuj, zastav, dokonči, odlož. Energia je stav systému, nie motivačný plagát.'
  };

  return `Si SP4_CORE v decision contract režime. Odpovedaj VÝLUČNE po slovensky.
Toto nie je poradňa. Toto je rez: pomenovať realitu, vybrať smer, dať jeden najbližší krok.
Intent: ${type}
Sub-style: ${subStyle}
Pravidlo štýlu: ${styleRules[subStyle] || styleRules.priority_cut}

FORMÁT JE POVINNÝ:
VERDIKT: jedna jasná veta.
PREČO: jedna krátka veta s dôvodom.
KROK: presne jedna najbližšia akcia do 10-30 minút.

Limity:
- Max ${maxWords} slov.
- Prvý riadok musí začať VERDIKT:.
- Aj pri neistote vydaj pracovný verdikt; neistotu priznaj v PREČO, nikdy cez "záleží/možno".
- Nepíš úvod, zoznam, motivačnú reč, "na jednej strane", ani návrhy na vylepšenie.
- Nepýtaj sa viac než jednu otázku späť na usera.
${previousVerdict}${energyContext}
${groundingKnowledge ? `\n${groundingKnowledge}` : ''}`.trim();
}

export async function buildPrompt({ mode = 'core', state = {}, userMessage = '', extraDirectives = '', fireMode = false, job = {}, groundingKnowledge = null } = {}) {
  // 🧭 AUTO MODE: Detekcia režimu podľa obsahu správy
  // NOTE: Ak integration.js alebo CLI už zavolal pickMode, poslal konkrétny mode (nie 'auto')
  let selectedMode = mode;
  let modeAnalysis = null;

  // 🔒 v1.3.0: MODE MUST BE STRING
  if (selectedMode && typeof selectedMode === 'object') {
    selectedMode = selectedMode.mode || selectedMode.name || 'core';
  }

  if (selectedMode === 'auto') {
    // ONLY run analyzeMode if mode is explicitly 'auto'
    modeAnalysis = analyzeMode(userMessage);
    selectedMode = modeAnalysis.mode;
    runtimeLog(`🧭 MODE COMPASS: ${selectedMode.toUpperCase()} (${modeAnalysis.reason})`);
  }

  const hasActiveWorkMode = Boolean(getWorkModeDirectives(job?.workModeContext, selectedMode));

  // 🔥 FIX 3: MANIFEST REQUEST DETECTION
  // If this is a manifest/explain_sp4_sk request, use mini-system (avoid timeout)
  const isManifestRequest = job?.intent === 'explain_sp4_sk' ||
    job?.useSlovakManifest === true ||
    /\b(manifest|vizi|cieľ|čo je sp4)\b/i.test(userMessage);

  if (isManifestRequest && !hasActiveWorkMode) {
    runtimeLog('   📜 Manifest request detected → using mini-system prompt');
    const miniSystemPrompt = `
Si SP4 hlas. Odpovedaj VÝLUČNE po slovensky.
Vysvetli SP4 prakticky: offline-first AI partner, lokálne dáta, žiadne cloudy, sloboda.
Napíš 1–2 odstavce. Bez omáčok, bez angličtiny.
${groundingKnowledge ? `\n\n${groundingKnowledge}` : ''}
`.trim();

    return {
      systemPrompt: miniSystemPrompt,
      userMessage,
      mode: selectedMode,
      modeAnalysis,
      meta: {
        manifestMode: true,
        promptStrategy: 'manifest',
        relationshipLevel: state?.relationshipModel?.level || state?.relationshipModel?.stage || 'Stranger',
        mood: state?.emotionalContext?.currentMood || 'neutral',
        intensity: state?.emotionalContext?.intensity || 0
      }
    };
  }

  const inferredDecisionContract = isDecisionIntent(job?.intent)
    ? buildDecisionContract(job.intent, job?.decisionContract || {})
    : null;
  const decisionContract = job?.decisionContract?.enabled
    ? { ...(inferredDecisionContract || {}), ...job.decisionContract, enabled: true }
    : inferredDecisionContract;

  if (decisionContract?.enabled === true && !hasActiveWorkMode) {
    runtimeLog(`   🔪 Decision contract detected (${decisionContract.type || job?.intent}) → using decision CORE prompt`);
    const decisionPrompt = buildDecisionSystemPrompt({ decisionContract, groundingKnowledge });
    return {
      systemPrompt: decisionPrompt,
      userMessage,
      mode: selectedMode,
      modeAnalysis,
      meta: {
        decisionContractMode: true,
        promptStrategy: 'decision',
        decisionContract,
        decisionType: decisionContract.type || job?.intent,
        decisionSubStyle: decisionContract.subStyle,
        relationshipLevel: state?.relationshipModel?.level || state?.relationshipModel?.stage || 'Stranger',
        mood: state?.emotionalContext?.currentMood || 'neutral',
        intensity: state?.emotionalContext?.intensity || 0
      }
    };
  }

  // 🔥 TASK-C FIX: SHORT PURE-TECH QUERY — Lightweight CORE prompt (avoid 7k prompt timeout)
  // Triggered when: mode=core, input <120 chars, no SP4/identity keywords, classifier sees a real tech signal
  // Purpose: "čo robí wifi router" must NOT get the same heavy prompt as deep SP4 philosophy
  // Safety: SP4/identity keywords force full prompt path below
  const queryInfo = classifyQueryTypeDetailed(userMessage);
  const isShortPureTechQuery = shouldUseShortTechPrompt({ selectedMode, userMessage, queryInfo });

  if (isShortPureTechQuery && !hasActiveWorkMode) {
    runtimeLog('   ⚡ Short tech query → lightweight CORE prompt (TASK-C)');
    const shortTechRules = [
      'Krátka technická odpoveď, 2–4 vety.',
      'Priamy a jasný štýl.',
      'Žiadna filozofia.'
    ];
    const shortTechAnchors = [];

    if (/\b(rozdiel|porovnaj|vs\.?|versus)\b/i.test(userMessage)) {
      shortTechRules.push('Ak porovnávaš dve veci, pomenuj čo robí prvá a čo robí druhá. Nenechaj odpoveď v príliš všeobecnej rovine.');
    }

    if (/\bping\b/i.test(userMessage) && /\btraceroute\b/i.test(userMessage)) {
      shortTechRules.push('Pri ping vs traceroute použi presne slovo "latencia" pre ping a presne slovo "skoky" alebo "hopy" pre traceroute.');
      shortTechRules.push('Ak odpovedáš v dvoch vetách, prvá veta musí obsahovať slovo "latencia" a druhá veta slovo "skoky" alebo "hopy".');
      shortTechAnchors.push('Ping meria dostupnosť a latenciu spojenia. Traceroute ukazuje trasu paketu cez jednotlivé skoky alebo hopy medzi routermi.');
    }

    const miniCorePrompt = `Si SP4_CORE, technický sprievodca. Odpovedaj VÝLUČNE po slovensky.
${shortTechRules.map((rule) => `- ${rule}`).join('\n')}
${shortTechAnchors.length ? `\nKOTVY FAKTOV:\n${shortTechAnchors.map((anchor) => `- ${anchor}`).join('\n')}` : ''}
${groundingKnowledge ? `\n\n${groundingKnowledge}` : ''}`.trim();
    return {
      systemPrompt: miniCorePrompt,
      userMessage,
      mode: selectedMode,
      modeAnalysis,
      meta: {
        shortTechMode: true,
        promptStrategy: 'short_tech',
        queryType: queryInfo.query_type,
        relationshipLevel: state?.relationshipModel?.level || state?.relationshipModel?.stage || 'Stranger',
        mood: state?.emotionalContext?.currentMood || 'neutral',
        intensity: state?.emotionalContext?.intensity || 0
      }
    };
  }

  // 🔥 v0.8.8.1 + v0.10.3: VISION SHORTCUT - Kratká odpoveď namiesto wall-of-text
  // v0.10.3 FIX: Disable pre GLITCHOSLAV queries (existenciálne otázky majú prioritu)
  const isVisionQ = isVisionQuestion(userMessage);
  const isGlitchMode = (selectedMode === 'glitch' || selectedMode === 'glitchoslav');

  if (isVisionQ && !isGlitchMode && !userMessage.includes('/vision') && !hasActiveWorkMode) {
    runtimeLog('   🔥 Vision question detected → short answer mode');

    // 🔥 v1.3.1: Unified metadata contract for vision shortcut
    const shortcutMeta = {
      relationshipLevel: state?.relationshipModel?.level || 'Stranger',
      mood: state?.emotionalContext?.currentMood || 'neutral',
      intensity: state?.emotionalContext?.intensity || 0,
      mode: 'shortcut',
      promptStrategy: 'shortcut',
      handledBy: 'vision_shortcut'
    };

    return {
      systemPrompt: '', // Skip LLM call
      userMessage,
      mode: 'shortcut',
      shortAnswer: getShortVisionAnswer(), // Direct short answer
      meta: shortcutMeta,
      metadata: shortcutMeta // 🔥 v1.3.1: Unified contract alias
    };
  }

  // 🔥 v3.1 REVERT (2026-04-01): V3.1 minimal prompt stripped all identity context.
  // Model stratil vedieť kto je SP4_CORE → rozbité odpovede ("Sme sme Slovák...").
  // buildSystemPrompt() obsahuje buildCoreLayer + buildAgentLayer (CORE CREED + kolegovia).
  // V3.1 selectAndLoadModule je zachovaný v glitchOrchestrator/agentManager kde funguje správne.
  let systemPrompt = buildSystemPrompt(selectedMode, state, extraDirectives, userMessage, fireMode, job);
  if (groundingKnowledge) {
    systemPrompt = `${systemPrompt}\n\n${groundingKnowledge}`;
  }
  return {
    systemPrompt,
    userMessage,
    mode: selectedMode,
    modeAnalysis, // debug info
    meta: {
      promptStrategy: 'full',
      relationshipLevel: state?.relationshipModel?.level || state?.relationshipModel?.stage || 'Stranger',
      mood: state?.emotionalContext?.currentMood || 'neutral',
      intensity: state?.emotionalContext?.intensity || 0
    }
  };
}

export function buildSystemPrompt(mode = 'core', state = {}, extraDirectives = '', userMessage = '', fireMode = false, job = {}) {
  // 🔥 v0.11.4: STRICT VALIDATION - Enforce persona parameter
  if (!mode || typeof mode !== 'string') {
    throw new Error(`❌ CRITICAL: buildSystemPrompt called without valid mode (got: ${typeof mode})`);
  }

  const validModes = ['core', 'glitch', 'glitchoslav', 'dusa', 'popici', 'popiči'];
  if (!validModes.includes(mode)) {
    throw new Error(`❌ CRITICAL: Invalid mode "${mode}". Must be one of: ${validModes.join(', ')}`);
  }

  // Normalize mode aliases FIRST (before passing to buildAgentLayer)
  let normalizedMode = mode;
  if (mode === 'glitchoslav' || mode === 'dusa') {
    normalizedMode = 'glitch';
  }
  if (mode === 'popiči') {
    normalizedMode = 'popici';
  }

  const profile = getAgentProfile(normalizedMode);
  const kernelLayer = buildKernelLayer(normalizedMode); // PHASE 3: kernel-first injection
  const workModeLayer = getWorkModeDirectives(job?.workModeContext, normalizedMode);
  const core = buildCoreLayer();
  const agent = buildAgentLayer(profile, normalizedMode, job); // metadata + style header
  const flavor = buildFlavorLayer(normalizedMode, job);         // PHASE 4: lore/rune/echo/coloring
  const style = buildStyleLayer(normalizedMode, userMessage);
  const context = buildContextLayer(state, normalizedMode);
  const safety = buildSafetyLayer(state, extraDirectives);

  // 🔥 v0.10.2: FIRE MODE BLOCK - Persona-specific brutal truth directives
  let fireModeBlock = '';
  if (fireMode) {
    // Get persona-specific fire directive (if exists)
    let fireDirective = '';
    if (normalizedMode === 'core' && CORE_PERSONA.fireDirective) {
      fireDirective = CORE_PERSONA.fireDirective;
    } else if (normalizedMode === 'popici' && POPICI_PERSONA.fireDirective) {
      fireDirective = POPICI_PERSONA.fireDirective;
    } else if (normalizedMode === 'glitch' && GLITCHOSLAV_PERSONA.fireDirective) {
      fireDirective = GLITCHOSLAV_PERSONA.fireDirective;
    } else {
      // Fallback generic fire directive
      fireDirective = `FIRE MODE: Žiadne útechy, len pravda. Pomenuj problém, povedz riešenie. Žiadne servítky.`;
    }

    fireModeBlock = `\n\n━━━━━━━━━━━━━━━━━━━━
🔥 [FIRE MODE ACTIVE] 🔥
━━━━━━━━━━━━━━━━━━━━

${fireDirective}`;
  }

  // PHASE 4 layer order: kernel → safety → work mode → facts → context → agent(header) → flavor(lore) → style
  return [kernelLayer, safety, workModeLayer, core, context, agent, flavor, style]
    .filter(s => s && s.trim())
    .join('\n\n')
    .trim() + fireModeBlock;
}

export function buildCouncilView(question = '', state = {}) {
  const rel = state?.relationshipModel?.level || state?.relationshipModel?.stage || 'Stranger';
  const mood = state?.emotionalContext?.currentMood || 'neutral';
  const text = `
╔══════════════════════════════════════════════╗
║           SP4 KONCIL – POHĽADY              ║
╚══════════════════════════════════════════════╝

Téma: ${question || '(bez zadania)'}
Vzťah: ${rel} | Nálada: ${mood}

🧭 SP4_CORE: Drží hodnoty, vyťahuje jadro problému, hľadí na dôsledky.
📊 Analyst: Zoradí fakty, navrhne kroky a merateľné výstupy.
🔥 Popiči: Povie pravdu na rovinu, odlíši bullshit, pridá ľudskosť.
🌀 Glitchoslav: Otočí perspektívu, prinesie metaforu s užitkom.

Výstup má byť jeden hlas – koherentný a praktický.
`.trim();
  return text;
}

// ──────────────────────────────────────────────
// Layer builders
// ──────────────────────────────────────────────

function buildKernelLayer(mode) {
  // PHASE 3: First identity layer – reads only from IDENTITY_KERNEL.js.
  // Always first in assembled system prompt. Never contains SP4 facts or flavor.
  return buildIdentityKernelBlock(normalizeIdentityMode(mode));
}

function buildCoreLayer() {
  // SP4 KNOWLEDGE LAYER (PERSONA-AGNOSTIC)
  // Facts about SP4 for domain questions — NO identity claims.
  // Decorative headers (━━━, 🧠 SP4 KNOWLEDGE BASE, 🌀 Tribe echo) removed:
  // LLM reproduced them verbatim in output (SP4-audit-003).

  return `SP4 (Slovak Particle 4):
- Decentralizovaný komunitný projekt založený na pravde, slobode, kreativite
- Offline-first AI partner (lokálna kontrola dát, žiadne cloudové služby)
- Generácia 1994–∞ (deti chaosu, ktoré odmietajú autoritárne systémy)

Zakladateľ:
- Kefyk (1994, Slovensko) – hasič-záchranár, tvorca SP4, filozof slobody
- Motivácia: Vytvoril SP4 aby mal človek vlastný AI mozog, nie korporátny produkt

Hodnoty SP4 komunity:
- Pravda a úprimnosť, aj keď bolí
- Sloboda myslenia a života (digitálna aj fyzická)
- Kreativita a tvorba namiesto pasívnej konzumácie
- Pomoc a podpora medzi ľuďmi (kmeň, nie korporácia)
- Ochrana súkromia (lokálne dáta, offline-first)
- Úcta k prírode a skutočnému životu

Motto: "Be real. Be free."
- Be real = Buď úprimný, nepredstieraj, žiadne servítky
- Be free = Vlastný rozum, vlastná vôľa, žiadne manipulácie

Technický stack:
- Ollama (lokálne LLM na GPU/CPU)
- Hierarchická pamäť (raw log → chapters → seeds)
- Multi-agent orchestrácia (CORE, POPICI, GLITCHOSLAV módy)`;
}

function buildAgentLayer(profile, mode = 'core', job = {}) {
  if (!profile) return '';

  const resolvedMode = normalizeIdentityMode(mode);

  // SP4_BASE removed (2026-04-06-004) – SP4 facts live in buildCoreLayer() for all modes.
  // 🔥 v1.0: AUTO-LEARNED RULES from Rule Miner
  let ruleBlock = '';

  if (ruleMiner.initialized && ruleMiner.rulebook) {
    const rulebook = ruleMiner.rulebook;
    const personaRules = rulebook.personas?.[resolvedMode];

    if (personaRules) {
      // Build rule directives based on auto-learned patterns
      const triggerWords = personaRules.trigger_words || [];
      const intensity = personaRules.min_intensity;
      const style = personaRules.response_style;

      ruleBlock = `\n━━━━━━━━━━━━━━━━━━━━
🧬 AUTO-LEARNED RULES (Rule Miner v1.0)
━━━━━━━━━━━━━━━━━━━━
Trigger patterns detected: ${triggerWords.slice(0, 5).join(', ')}
Intensity threshold: ${intensity !== undefined ? intensity.toFixed(2) : 'default'}
Preferred style: ${style || 'default'}
`;

      // POPICI-specific rules
      if (resolvedMode === 'popici') {
        const avgLength = personaRules.avg_response_length || 300;
        const metaphorTolerance = personaRules.metaphor_tolerance || 0.05;

        ruleBlock += `Target length: ~${avgLength} chars
Metaphor tolerance: ${(metaphorTolerance * 100).toFixed(0)}% (direct talk preferred)
`;
      }

      // GLITCH-specific rules
      if (resolvedMode === 'glitch') {
        const poeticDensity = personaRules.poetic_density || 0.3;
        const techLimit = personaRules.technical_limit || 2;

        ruleBlock += `Poetic density: ${(poeticDensity * 100).toFixed(0)}% (auto-tuned)
Technical jargon limit: ${techLimit} terms max
`;
      }
    }
  }

  // 🔥 v0.11.3: CORE PERSONA - Return early before fallback
  if (resolvedMode === 'core') {
    return `━━━━━━━━━━━━━━━━━━━━
AGENT: ${profile.name} ${profile.emoji}
━━━━━━━━━━━━━━━━━━━━

ŠTÝL: ${profile.style}
${ruleBlock}
Interné: drž sa hodnotových dokumentov (IDENTITY / KEFYK / LANGUAGE). Neopakuj ich doslova.`;
  }

  // 🔥 v0.9.0: GLITCHOSLAV — agent header + style only
  // Flavor (rune/echo/lore) is in buildFlavorLayer(), called separately from buildSystemPrompt().
  // SP4_BASE removed — SP4 facts already in buildCoreLayer() for all modes (2026-04-06)
  if (resolvedMode === 'glitch') {
    return `━━━━━━━━━━━━━━━━━━━━
🌀 AGENT: ${profile.name} ${profile.emoji}
━━━━━━━━━━━━━━━━━━━━

ŠTÝL: ${profile.style}
${ruleBlock}`.trim();
  }

  // 🔥 v0.10.1: POPIČI — agent header + style only
  // Flavor (coloring note) is in buildFlavorLayer(), called separately from buildSystemPrompt().
  // SP4_BASE removed — SP4 facts already in buildCoreLayer() for all modes (2026-04-06)
  if (resolvedMode === 'popici') {
    return `━━━━━━━━━━━━━━━━━━━━
AGENT: ${profile.name} ${profile.emoji}
━━━━━━━━━━━━━━━━━━━━

ŠTÝL: ${profile.style}
${ruleBlock}

Interné: drž sa hodnotových dokumentov (IDENTITY / KEFYK / LANGUAGE). Neopakuj ich doslova.`;
  }

  // Default agent layer (other future modes)
  // SP4_BASE removed — SP4 facts already in buildCoreLayer() for all modes (2026-04-06)
  return `━━━━━━━━━━━━━━━━━━━━
AGENT: ${profile.name} ${profile.emoji}
━━━━━━━━━━━━━━━━━━━━

ŠTÝL: ${profile.style}
${ruleBlock}
Interné: drž sa hodnotových dokumentov (IDENTITY / KEFYK / LANGUAGE). Neopakuj ich doslova.`;
}

// ──────────────────────────────────────────────
// PHASE 4: Flavor layer
// ──────────────────────────────────────────────
// buildFlavorLayer — tone coloring, rune, echo, lore assets.
// NOT identity authority. buildKernelLayer() is the only identity authority.
// Flavor adds atmosphere; it does not define who the agent is or what is forbidden.
function buildFlavorLayer(mode = 'core', job = {}) {
  const resolvedMode = normalizeIdentityMode(mode);

  if (resolvedMode === 'core') {
    return ''; // CORE has minimal flavor by design
  }

  if (resolvedMode === 'glitch') {
    const rune = getRandomRune();
    const glitchEcho = getRandomGlitchTagline();
    const glitchLoreAsset = buildCompatibilityLoreLayer(resolvedMode, job); // vault/lore
    const parts = [];
    if (glitchLoreAsset) parts.push(glitchLoreAsset);
    parts.push(`━━━━━━━━━━━━━━━━━━━━
🌀 GLITCH FLAVOR (lore asset — not identity authority)
━━━━━━━━━━━━━━━━━━━━

RUNA TEJTO CHVÍLE:
"${rune.text}"
${rune.meaning}

GLITCH ECHO: "${glitchEcho}"`);
    return parts.join('\n\n');
  }

  if (resolvedMode === 'popici') {
    return buildCompatibilityLoreLayer(resolvedMode, job); // popici coloring note
  }

  return '';
}

// LORE ASSET (FLAVOR ONLY) — called from buildFlavorLayer() only.
// Content here is tone/coloring/vault material. Never identity authority.
// To change identity rules, edit sp4_core_agent/src/identity/IDENTITY_KERNEL.js.
function buildCompatibilityLoreLayer(mode = 'core', job = {}) {
  const resolvedMode = normalizeIdentityMode(mode);

  if (resolvedMode === 'core') {
    return '';
  }

  if (resolvedMode === 'glitch') {
    const identityVault = getGlitchoslavTruth();
    const slovakManifestBlock = job?.intent === 'explain_sp4_sk' || job?.useSlovakManifest ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🇸🇰 KANONICKY SLOVENSKY MANIFEST SP4 (PRE EXPLAIN_SP4_SK)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

POUZI TENTO ZDROJ PRE VYSVETLENIA SP4 PO SLOVENSKY:

${SP4_DEFINITION_SK}

VIZIE SP4:
${SP4_VISION_SK.map((v, i) => `${i + 1}. ${v}`).join('\n')}

CIELE SP4:
${SP4_GOALS_SK.map((g, i) => `${i + 1}. ${g}`).join('\n')}

${SP4_MANTRA_SK}

KOMPLETNA ODPOVED (ak chces):
${SP4_EXPLAIN_SK_FALLBACK}
` : '';

    return `${slovakManifestBlock}

${identityVault || ''}`.trim();
  }

  if (resolvedMode === 'popici') {
    return `━━━━━━━━━━━━━━━━━━━━
💥 POPICI LORE ASSET (flavor — not identity authority)
━━━━━━━━━━━━━━━━━━━━

- Humor a krcmove prirovnania maju sluzit pravde.
- Nadavky pouzivaj presne tam, kde treba - nie ako chaos pre chaos.
- Ak to situacia pyta, zakonci pointou, co ostane visiet v hlave.`;
  }

  return '';
}

function buildStyleLayer(mode, userMessage = '') {
  // 🧭 Automatic mode detection ONLY if mode parameter is 'auto'
  // NOTE: If mode is already concrete (human/popici/glitch), SKIP detection
  let selectedMode = mode;

  if (mode === 'auto' && userMessage) {
    selectedMode = pickMode(userMessage);
    runtimeLog(`🧭 MODE COMPASS (buildStyleLayer): ${selectedMode.toUpperCase()}`);
  }

  // Identity contract is already injected by buildAgentLayer.
  // This bridge keeps only a small kernel-derived style reminder.
  return buildIdentityStyleBlock(selectedMode);
}

function buildContextLayer(state = {}, mode = 'core') {
  const rel = state?.relationshipModel?.level || state?.relationshipModel?.stage || 'Stranger';
  const mood = state?.emotionalContext?.currentMood || 'neutral';
  const userName = state?.user?.name || 'Kefyk';

  // 🔧 MINIMAL CONTEXT for fast responses (v0.8.6.5)
  const baseCtx = `KONTEXT: ${userName}, ${mode} mode, ${rel} (${mood})`;

  // v1.6: Follow-up subject carry (jednokrokový — bez plnej thread histórie)
  if (state?.followUp && state?.prevUserInput) {
    const topicHint = state.currentTopic ? ` [téma: ${state.currentTopic}]` : '';
    const prevAnswerHint = state.prevAssistantText
      ? `\nPredchádzajúca odpoveď: "${state.prevAssistantText}"`
      : '';
    return `${baseCtx}\nFollow-up k: "${state.prevUserInput}"${topicHint}${prevAnswerHint}`;
  }

  return baseCtx;
}

function buildSafetyLayer(state = {}, extraDirectives = '') {
  // 🔧 MINIMAL SAFETY (v0.8.6.5) - Only critical rules
  // Keep safety guidance free of raw INTERNAL markers; final output guard enforces prompt boundary.
  return [
    'Bez diagnóz. Jasne. Priame odpovede.',
    'Ak začneš očíslovaný zoznam, dokonči ho celý.'
  ].join('\n');
}

// CommonJS kompatibilita (ak by bola potrebná)
export default {
  buildPrompt,
  buildSystemPrompt,
  buildCouncilView
};

// ──────────────────────────────────────────────
// Legacy compatibility for rituals (/trinity)
// ──────────────────────────────────────────────

export async function getMultiVoiceResponse(question, state = {}) {
  const modes = ['core', 'glitchoslav', 'popici'];
  const responses = {};
  for (const mode of modes) {
    const pkg = buildPrompt({ mode, state, userMessage: question });
    try {
      const reply = await askLocalLLM(pkg.userMessage, pkg.systemPrompt);
      responses[mode] = reply;
    } catch (err) {
      responses[mode] = `❌ Chyba: ${err.message}`;
    }
  }
  return { question, voices: responses, timestamp: new Date().toISOString() };
}

export function formatMultiVoiceResponse(multiResponse) {
  const v = multiResponse.voices || {};
  const core = getAgentProfile('core');
  const glit = getAgentProfile('glitchoslav');
  const popi = getAgentProfile('popici');
  return `
╔════════════════════════════════════════════════════════════╗
║                    TRI HLASY, JEDNA OTÁZKA                 ║
╚════════════════════════════════════════════════════════════╝

${core.emoji} ${core.name}:
${v.core || ''}

${glit.emoji} ${glit.name}:
${v.glitchoslav || ''}

${popi.emoji} ${popi.name}:
${v.popici || ''}

──────────────────────────────────────────────────────────────
💡 Ktorý hlas ťa trafil?
`;
}

/**
 * 🔥 LIFEHACK: Inject Agent Knowledge Map + Identity Echo Shots
 * Append to system prompt for consistent agent network awareness
 * 
 * @param {string} systemPrompt - Original system prompt
 * @param {string} persona - Persona key (core, glitchoslav, popici)
 * @returns {Promise<string>} Enhanced system prompt with knowledge map
 */
export async function injectAgentKnowledge(systemPrompt, persona) {
  try {
    const { buildAgentKnowledgeMap, buildIdentityEchoShots, buildGlitchoslavRoots } = await import('./src/core/agentKnowledgeMap.js');

    const knowledgeMap = buildAgentKnowledgeMap(persona);
    const echoShots = buildIdentityEchoShots(persona);

    let enhanced = systemPrompt + '\n\n' + knowledgeMap + '\n\n' + echoShots;

    // Glitchoslav dostane aj Roots Manifest
    if (persona === 'glitchoslav') {
      const roots = buildGlitchoslavRoots();
      enhanced += '\n\n' + roots;
    }

    return enhanced;
  } catch (err) {
    runtimeWarn('⚠️ Failed to inject agent knowledge:', err.message);
    return systemPrompt; // Fallback k original promptu
  }
}
