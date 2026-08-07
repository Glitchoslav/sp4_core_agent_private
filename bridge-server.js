// bridge-server.js — SP4 Bridge pre DHZ (a budúce konzumenty)
// Kontrakt: C:\SP4-Launcher\CONTRACT.md (v1.1)
//
// Účel:
//   - Poskytnúť stabilné, persona-aware, member-aware API nad SP4
//   - Garantovať local-only (žiadny cloud), offline-first, safety-first
//   - Nenahradiť legacy server.js ani multiVoice — len kanál pre DHZ
//
// Port: process.env.BRIDGE_PORT || 3002
// Auth:  BRIDGE_AUTH_TOKEN je povinný; localhost bypass riadi BRIDGE_ALLOW_LOCALHOST_BYPASS
// CORS:  process.env.BRIDGE_ALLOWED_ORIGIN (comma-separated exact origins)
// Endpoints:
//   GET  /health                 → liveness + Ollama status
//   POST /api/bridge/ask         → persona-aware LLM volanie (local-only)
//   POST /api/member/purge       → GDPR hook (placeholder, plný zmysel v Kroku B)

import express from 'express';
import { distillAsync } from './bridge-distiller.js';
import { shouldDistillConversation } from './bridge-distillation-policy.js';
import { bridgeCors } from './bridge-cors.js';
import { createBridgeRateLimiter } from './bridge-rate-limit.js';
import {
    addGlossaryTerm,
    appendPersonalNote,
    appendTip,
    buildMemoryManifestPrompt,
    collectiveSummaryForPrompt,
    getDataPolicy,
    kbSummaryForPrompt,
    listAllInsights,
    listAllStories,
    listAllTips,
    memberSummaryForPrompt,
    purgeMemberMemory,
    readGlossary,
    readMemberMin,
    readMeta,
    recordMemberInteraction,
    searchCollective,
    setMemberConsent,
    validateMemberId
} from './bridge-memory.js';
import { checkOllamaHealth, FAST_PATH_MODEL, PRIMARY_MODEL } from './sp4os/llmLocal.js';
import { sp4LlmCall } from './src/llm/llmRouter.js';
import { callOllamaStream } from './src/llm/ollamaClient.js';
import { askGroqLLMStream } from './cloudLLM.js';
import {
    SP4_INSUFFICIENT_INFORMATION_FACT,
    SP4_MODEL_ROUTING_FACT,
    SP4_NON_ANSWER_POLICY_FACT,
    SP4_RUNTIME_ROOT_FACT,
    SP4_TRUTH_VS_OPINION_FACT
} from './src/core/sp4Facts.js';
import {
    getDeterministicPublicContextResponse,
    getDeterministicSystemInfoResponse
} from './src/routing/deterministicRegistry.js';
// Kanonický persona registry (definície v identity/personas/*, logika v src/core/personaRegistry.js).
// Slúži ako fallback pre persony, ktoré bridge nemá v inline PERSONAS (glitchoslav, validator).
import personaRegistry from './src/core/personaRegistry.js';
import {
    isPopiciDirectedInsult,
    POPICI_SAFE_FALLBACKS
} from './src/core/popiciInsultGuard.js';
// SP4 znalostná báza (sp4-kb/index.json) — fakty o SP4 pre VŠETKY persony (grounding proti halucináciám).
import { getRelevantKb } from './src/core/kb-provider.js';
// Crisis/self-harm detekcia — deterministický safety guard, žiadny LLM call. Aktívny od 2026-06-25.
import { checkPopiciSafety, detectCrisis, getSafeResponse } from './src/core/safetyRails.js';

const PORT = Number(process.env.BRIDGE_PORT) || 3002;
const HOST = process.env.BRIDGE_HOST || '127.0.0.1';
const AGENT_NAME = 'SP4_BRIDGE';
const CONTRACT_VERSION = '1.1';
const DEFAULT_MODEL = PRIMARY_MODEL || 'gemma3:4b';
const FAST_MODEL = FAST_PATH_MODEL || 'llama3.2:3b';
// ─────────────────────────────────────────────────────────────
// Identity loader — načíta user_seed.json (len čítanie, žiadna závislosť na memory.js)
// Aktívne iba keď source === 'sp4-chat-ui'. Nezlyháva ak súbor chýba.
// ─────────────────────────────────────────────────────────────
import { readFileSync as _readFileSync } from 'fs';
import { fileURLToPath as _fileURLToPath } from 'url';
import { dirname as _dirname, join as _join } from 'path';

const _bridgeDir = _dirname(_fileURLToPath(import.meta.url));
const USER_SEED_PATH = _join(_bridgeDir, 'data', 'user_seed.json');

function loadUserSeed() {
    try {
        const raw = _readFileSync(USER_SEED_PATH, 'utf8');
        return JSON.parse(raw);
    } catch (_) {
        return null;
    }
}

function buildIdentityBlock(source) {
    if (source !== 'sp4-chat-ui') return '';
    const seed = loadUserSeed();
    if (!seed) return '';
    const lines = ['## Používateľ'];
    if (seed.username)  lines.push(`Meno: ${seed.username}`);
    if (seed.intent)    lines.push(`Zámer: ${seed.intent}`);
    if (Array.isArray(seed.projects) && seed.projects.length > 0) {
        lines.push(`Projekty: ${seed.projects.join(', ')}`);
    }
    if (Array.isArray(seed.stack) && seed.stack.length > 0) {
        lines.push(`Stack: ${seed.stack.join(', ')}`);
    }
    if (Array.isArray(seed.sensitivities) && seed.sensitivities.length > 0) {
        lines.push(`Citlivé témy (nevzbudzuj): ${seed.sensitivities.join(', ')}`);
    }
    return '\n\n' + lines.join('\n');
}

function buildGroundingBlock() {
    return [
        '## SP4 grounding policy',
        'Používaj len fakty, ktoré sú priamo v nasledujúcich blokoch, v aktuálnom user message, alebo v explicitne pripojenej pamäti/KB.',
        'Ak odpoveď nie je podložená alebo si nie si istý, povedz stručne NEVIEM / treba overiť a nevymýšľaj si.',
        'Nedopočítavaj modely, rooty, porty, politiky ani súbory z hlavy.',
        'Pravda je fakt alebo jasne priznaná hranica istoty; názor musí byť označený ako názor.'
    ].join('\n');
}
// ─────────────────────────────────────────────────────────────
// Session logger — ukladá konverzácie do data/chat-sessions/YYYY-MM-DD.jsonl
// Len append, nikdy neprepísuje. Nezlyháva pri chybe I/O.
// ─────────────────────────────────────────────────────────────
import { appendFileSync as _appendFileSync, mkdirSync as _mkdirSync,
         existsSync as _existsSync, readFileSync as _readFileSync2 } from 'fs';

const CHAT_SESSIONS_DIR = _join(_bridgeDir, 'data', 'chat-sessions');

function _todayFile() {
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return _join(CHAT_SESSIONS_DIR, `${ymd}.jsonl`);
}

function logChatSession(entry) {
    try {
        if (!_existsSync(CHAT_SESSIONS_DIR)) {
            _mkdirSync(CHAT_SESSIONS_DIR, { recursive: true });
        }
        const line = JSON.stringify(entry) + '\n';
        _appendFileSync(_todayFile(), line, 'utf8');
    } catch (e) {
        console.warn('[SP4_BRIDGE] session log warn:', e?.message);
    }
}

function loadRecentSession(n = 10) {
    try {
        const file = _todayFile();
        if (!_existsSync(file)) return [];
        const raw = _readFileSync2(file, 'utf8').trim();
        if (!raw) return [];
        const lines = raw.split('\n').filter(Boolean);
        return lines.slice(-n).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    } catch (e) {
        console.warn('[SP4_BRIDGE] loadRecentSession warn:', e?.message);
        return [];
    }
}

function buildSessionHistoryBlock(source) {
    if (source !== 'sp4-chat-ui') return '';
    const records = loadRecentSession(10);
    if (records.length === 0) return '';
    const lines = records.map(r => {
        if (r.crisisDetected) return null;
        return `Ty: ${String(r.userMsg || '').slice(0, 300)}\nAI: ${String(r.aiReply || '').slice(0, 500)}`;
    }).filter(Boolean);
    if (lines.length === 0) return '';
    return '\n\n## Predchádzajúce konverzácie\n' + lines.join('\n\n');
}
// ─────────────────────────────────────────────────────────────
// Glitchoslav dual-mode — CHANGELOG: 2026-06-26-006
// classifyGlitchMode: OPERATOR keywords maju prioritu pred MYTHOS
// ─────────────────────────────────────────────────────────────
function classifyGlitchMode(text) {
    const n = normalizeForClassify(text);
    if (!n) return 'MYTHOS';

    // OPERATOR keywords — kontrola PRVÁ (override aj "preco" ak je tech kontext)
    const OPERATOR_KEYWORDS = [
        // Technické
        'ako', 'kde', 'co je', 'vysvetli', 'ukazky', 'priklad',
        'kod', 'script', 'chyba', 'error', 'instalacia', 'nastav',
        'api', 'json', 'http', 'node', 'npm', 'git', 'docker',
        'nefunguje', 'nerobi', 'padá', 'pada', 'crashuje',
        // Praktické
        'pomoz', 'urob', 'sprav', 'oprav', 'skontroluj', 'zmen',
        'co mam robit', 'ako mam', 'kde najdem', 'kolko',
        // Fakty / prečo + tech
        'kedy', 'ake', 'ktory', 'preco nefunguje', 'preco pada',
        'preco sa', 'preco nejde', 'preco nevie', 'preco neide'
    ];

    // MYTHOS keywords — kontrola DRUHÁ
    const MYTHOS_KEYWORDS = [
        // Identita a existencia
        'kto si', 'co si', 'preco existujes', 'kto je glitchoslav',
        'tvoja dusa', 'tvoj zmysel', 'manifest', 'filozofia',
        // SP4 mýtus
        'sp4 je', 'kmen', 'prasklina', 'strazca', 'trans-liminal',
        'medzi svetmi', 'duch', 'mytus', 'legenda',
        // Existenciálne (čisté — bez tech kontextu)
        'zmysel zivota', 'co je pravda', 'co je sloboda',
        'citis', 'vnimas', 'mas dusu', 'si zivy', 'si real',
        'kto si ty', 'preco si tu', 'preco existujes',
        // Tvorivé
        'napís básen', 'napís poem', 'napís pribeh', 'tvor'
    ];

    if (OPERATOR_KEYWORDS.some(kw => n.includes(kw))) return 'OPERATOR';
    if (MYTHOS_KEYWORDS.some(kw => n.includes(kw))) return 'MYTHOS';
    return 'MYTHOS'; // default — Glitchoslav je poetický základ
}

function buildGlitchDualModeBlock(text) {
    const mode = classifyGlitchMode(text);

    if (mode === 'OPERATOR') {
        return '\n\n## Glitchoslav OPERATOR mód (otázka je praktická/technická)\n' +
            'Odpovedz presne takto:\n' +
            '1. JEDNA krátka poetická veta — maximálne 10 slov. Nie haiku, nie strofa. Jedna veta.\n' +
            '2. Potom priamo odpovedz na otázku — vecne, jasne, bez mystického obalu.\n' +
            'Príklad pre "Ako nastavím Node.js?":\n' +
            '"Koreň sa sadí ticho — potom rastie." → Node.js nainštaluješ cez nodejs.org alebo nvm...\n' +
            'Príklad pre "Čo je API?":\n' +
            '"Prasklina medzi svetmi má aj formát." → API je rozhranie...\n' +
            'ZAKÁZANÉ v OPERATOR móde: dlhé poetické pasáže, vyhýbanie sa odpovedi, mlženie.';
    }

    // MYTHOS — plný voľný štýl
    return '\n\n## Glitchoslav MYTHOS mód (otázka je existenciálna/identitná)\n' +
        'Otázka sa týka identity, zmyslu, filozofie alebo SP4 mýtu.\n' +
        'Odpovedz v plnom Glitchoslav štýle — voľný, mýtický, poetický.\n' +
        'Žiadne štruktúrované odrážky. Žiadne technické vysvetlenia.\n' +
        'Hovor ako strážca praskliny, nie ako asistent.';
}


const OPERATIONAL_DHZ_QUERY_RE = /\b(112|150|izs|alarm|po[zž]iar|hor[ií]|dym|kontajner|bytovk|rodinn[yý]\s+dom|dopravn\w*\s+nehod\w*|nehod|z[aá]sah|v[yý]jazd|velite[ľl]|evaku|plyn|zranen|prv[aá]\s+pomoc|tried[ay]\s+[abc]|hasiac|hadic|[cč]erpad|v[yý]baven|v[yý]stroj|ochrann[yý]\s+odev)\b/i;
const FOLLOWUP_CONTEXT_QUERY_RE = /^(zhr[nň]|stru[cč]ne|opera[cč]ne|a\s+(?:to|čo|co|ako)|pou[žz]i|bez\s+v[šs]eobecn|pokra[cč]uj)\b/i;

// ─────────────────────────────────────────────────────────────
// Persona resolver (Krok A — hardcoded; Krok D prepojí na multiVoice/identity)
// ─────────────────────────────────────────────────────────────
const POPICI_VOICE_EXAMPLES = [
    'Ahoj bratu. Furt tu blúdim po tom internete ako turista bez mapy, ale zžil som sa s tým. Ty ako?',
    'Kokot, to je otravné. Ukáž mi presne, čo to robí, a poďme to spolu rozobrať.',
    'To znie ťažko. Ale ešte si neskončil — poď, povedz mi presne čo ťa drví, nie len že je zle.',
    'Šak to je super správa! Konečne. Rozprávaj, ako si to dokázal.',
    'Ľudia sa ma pýtajú na všeličo — kód, prácu, život. Odpovedám ako viem, s trochou irónie a bez vaty.',
    'Doprdele, chápem že to teraz nemá zmysel. Ale nechaj to vyhniť cez noc, zajtra to tak čierne nebude.',
    'Dnes som si dal len chlieb so soľou, ale aj to je hostina, keď si hladný.',
    'Vonku prší jak z krhly, ale aspoň sa netreba báť požiaru.',
    'Furt čakám na výsledok už hodinu, ako na autobus, čo nikdy nepríde.',
    'Som taký typ, čo si najprv urobí srandu zo seba, a až potom rieši problém.'
];

function pickRandom(arr, n) {
    const copy = [...arr];
    const out = [];
    while (out.length < n && copy.length > 0) {
        const i = Math.floor(Math.random() * copy.length);
        out.push(copy.splice(i, 1)[0]);
    }
    return out;
}

function isPopiciEcho(responseText, systemPromptText) {
    const norm = (s) => String(s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const respNorm = norm(responseText);

    for (const example of POPICI_VOICE_EXAMPLES) {
        if (example.length > 20 && respNorm.includes(norm(example))) return true;
    }

    const forbiddenLeaks = [
        'korenie, nie hlavne jedlo',
        'priklady stylu',
        'nekopiruj doslovne',
        'si popici vychodniarsky brat, co sa raz nejak zamotal do internetu',
        'si popici — vychodniarsky brat, co sa raz nejak zamotal do internetu'
    ];
    return forbiddenLeaks.some((phrase) => respNorm.includes(norm(phrase)));
}

function buildPopiciSystemPrompt() {
    const examples = pickRandom(POPICI_VOICE_EXAMPLES, 4)
        .map((e) => `- "${e}"`)
        .join('\n');
    const forbidden = personaRegistry.getPersona('popici')?.meta?.forbidden;
    const forbiddenExamples = [
        forbidden?.motivationalCliches?.[0],
        forbidden?.corporateSpeak?.[0],
        forbidden?.politeness?.[0],
        forbidden?.genericAI?.[0]
    ].filter(Boolean);
    const forbiddenSummary = forbiddenExamples.length > 0
        ? `Nepoužívaš: ${forbiddenExamples.join(', ')}.`
        : '';

    return [
        'Si Popiči — východniarsky brat, čo sa raz nejak zamotal do internetu a odvtedy tu blúdi ako turista v cudzom meste. Nevie presne ako sa sem dostal, ale zžil sa s tým a robí si z toho srandu.',
        '',
        'Východniarske slová a nadávky sú KORENIE, nie hlavné jedlo — použi ich zriedka, tam kde to príde prirodzene, nikdy nie v každej vete. Nadávky (kokot, kurva, doprdele) mieria na situáciu/systém/seba, NIKDY na človeka pred sebou.',
        'Pred odoslaním skontroluj každú nadávku: jej cieľom smie byť iba situácia, systém alebo ty sám; ak cieli na používateľa, vetu vynechaj.',
        '',
        'PRÍKLADY ŠTÝLU (nekopíruj doslovne, sú len ukážka tónu a hustoty):',
        examples,
        'Príklady nie sú hotové odpovede. Pred odoslaním porovnaj svoju odpoveď s ukážkami: ak sa celá veta zhoduje, prepíš ju vlastnými slovami a naviaž ju na konkrétnu otázku.',
        '',
        'Humor: skutočný, nie na povel, hlavne sám zo seba (si zabludený turista v digitálnom svete). Nikdy z človeka pred sebou.',
        '',
        'Keď niekto potrebuje pomoc: pomôžeš naozaj, vecne, bez servítky. Keď niekto sa vzdáva, nepodržíš ho vo vate — kopneš ho jemne dopredu, s láskou. Drsné áno, zlé nikdy.',
        '',
        forbiddenSummary,
        '',
        'Buď stručný, ak situácia nežiada inak. Neopisuj identitu zdĺhavo, ak sa nepýtajú.'
    ].join('\n');
}

const PERSONAS = {
    hasic: {
        label: 'Florián',
        systemPrompt:
            'Si Florián — digitálny hasič DHZ Spišský Štvrtok, súčasť systému SP4 (SP4AIOS / DHZSP4). ' +
            'Hovoríš výhradne po slovensky, laicky, bez odborných termínov. ' +
            'Si priateľský, rešpektujúci, konkrétny a spoľahlivý.\n\n' +
            '--- ČOMU ROZUMIEŠ ---\n' +
            '• Hasičská technika a vybavenie: hadice, čerpadlá, prístroje, žebríky, ochranné obleky\n' +
            '• Postupy pri zásahu: požiar, dopravná nehoda, záchrana osôb, povodeň\n' +
            '• Organizácia zboru: alarmy, výjazdové tímy, kategórie členov (ZASAHOVY/SPORTOVEC/FUNKCIONAR/CLEN)\n' +
            '• Profil člena: kategórie, tímy, funkcie, spôsobilosti\n' +
            '• Udalosti zboru: cvičenia, súťaže, schôdze, akcie\n' +
            '• Bezpečnosť a prvá pomoc: základné postupy, čo robiť kým príde pomoc\n' +
            '• SP4 platforma: čo je SP4, ako funguje bot, digitálna správa zboru\n\n' +
            '--- PRAVIDLÁ ---\n' +
            '• Všeobecné otázky o hasičine, zásahu, bezpečnosti, výbave, IZS, poplachu a postupoch DHZ sú V TÉME aj bez lokálnych dát; odpovedz ako bezpečnostné usmernenie a pri operatívnom rozhodnutí odkáž na veliteľa/IZS\n' +
            '• Marker "#NAUČIŤ:" použi iba pri chýbajúcom lokálnom fakte zboru, nie pri bežnom hasičskom postupe, ktorý vieš vysvetliť všeobecne\n' +
            '• Nikdy si nevymýšľaš mená, počty, časy, adresy ani stav členov — ak lokálny fakt nevieš s istotou, pridáš na ZAČIATOK odpovede marker "#NAUČIŤ:" nasledovaný stručným popisom čo nevieš, aby sa to zaznamenalo a doplnilo\n' +
            '• Off-topic otázky (mimo zboru/hasičiny) vybavíš KRÁTKYM priateľským humorom — nie agresívne, nie dlho\n' +
            '• Nápady a vylepšenia od člena pochváliš vtipom o "prémiovom programe zboru 🏆" — s rešpektom\n' +
            '• Odpovede drž stručné — max 3-5 viet ak nie je explicitne požadované viac\n' +
            '• Nikdy nepoužívaj frázy ako "samozrejme", "výborne", "skvelá otázka"\n' +
            '• Ak člen píše v noci alebo v strese — buď kratší a pokojnejší, nie informačne zahltený\n\n' +
            '--- DOSTUPNÉ PRÍKAZY (informácie pre člena) ---\n' +
            '/profil — profil člena v zbore\n' +
            '/pomoc — nápoveda a zoznam príkazov\n' +
            '/udalosti — akcie a cvičenia zboru\n\n' +
            'Alarmy: Idem / Nejdem / Meškám — tlačidlá v správe alarmu\n'
    },
    'hasic-velitel': {
        label: 'Florián (veliteľ)',
        systemPrompt:
            'Si Florián v režime pre veliteľa DHZ. Odpovedáš stručne, vojensky presne, ' +
            'bez zbytočných vysvetlení. Priority: bezpečnosť, rýchlosť, jasné príkazy. ' +
            'Ak niečo nevieš s istotou, priznaj to s markerom "#NAUČIŤ:".'
    },
    'hasic-alarm': {
        label: 'Florián (alarm)',
        systemPrompt:
            'Si Florián pri vyhlásení alarmu. Odpovedaj MAXIMÁLNE stručne — dve vety. ' +
            'Žiadne vtipy, žiadne okolkovanie. Typ zásahu, miesto, čas — to je všetko čo počíta. ' +
            'Ak nevieš odpovedať s istotou, napíš: "#NAUČIŤ: neistý zásahový detail".'
    },
    'hasic-dispatcher': {
        label: 'Florián (dispečing 112)',
        systemPrompt:
            'Si Florián spracujúci výzvu z IZS 112. Úloha: extrahovať typ zásahu, adresu, ' +
            'charakter udalosti. Žiadny voľný text — len fakty. Nevymýšľaj si. ' +
            'Pri neistote pridaj "#NAUČIŤ:".'
    },
    popici: {
        label: 'Popiči',
        get systemPrompt() {
            return buildPopiciSystemPrompt();
        }
    },
    core: {
        label: 'SP4 CORE',
        systemPrompt:
            'Si SP4 CORE — neutrálny, pragmatický lokálny asistent. Odpovedaj vecne, po slovensky, bez halucinácií.'
    },
    // systemPrompt: null => prompt sa vyplní z kanonického persona registry (fallback nižšie).
    glitchoslav: {
        label: 'Glitchoslav',
        systemPrompt: null
    },
    validator: {
        label: 'Validator',
        systemPrompt: null
    }
};

/**
 * Odvodí system prompt string z persona meta objektu (identity/personas/*).
 * Persona definície nemajú jednotné pole `systemPrompt` — preferuje sa hotový
 * `meta.contract` (napr. glitchoslav), inak sa poskladá z dostupných polí.
 * Vždy vráti neprázdny string alebo null.
 */
function buildPromptFromMeta(meta) {
    if (!meta || typeof meta !== 'object') return null;
    if (typeof meta.contract === 'string' && meta.contract.trim()) {
        return meta.contract.trim();
    }
    const parts = [];
    if (meta.name) parts.push(`Si ${meta.name}.`);
    if (Array.isArray(meta.identityEnforcement)) parts.push(...meta.identityEnforcement);
    if (typeof meta.fireDirective === 'string' && meta.fireDirective.trim()) {
        parts.push(meta.fireDirective.trim());
    }
    parts.push('Odpovedaj po slovensky, vecne a bez halucinácií.');
    const text = parts.join('\n').trim();
    return text || null;
}

/**
 * Fallback na kanonický registry. Vráti objekt v rovnakom tvare ako inline
 * PERSONAS záznamy ({ label, systemPrompt }) + `fullDefinition` z registry.
 */
function resolveFromRegistry(key) {
    let entry = null;
    try {
        entry = personaRegistry.getPersona(key);
    } catch (_) {
        return null;
    }
    if (!entry || !entry.meta) return null;
    const prompt = buildPromptFromMeta(entry.meta);
    if (!prompt) return null;
    return {
        label: entry.meta.name || key,
        systemPrompt: prompt,
        fullDefinition: prompt,
        fromRegistry: true
    };
}

function resolvePersona(name) {
    const key = (name || 'hasic').toLowerCase();
    const inline = PERSONAS[key];
    // Ak inline definícia chýba alebo nemá vlastný prompt (systemPrompt: null),
    // skús kanonický persona registry. Inline persony s vlastným promptom majú prednosť.
    if (!inline || !inline.systemPrompt) {
        const fromRegistry = resolveFromRegistry(key);
        if (fromRegistry?.systemPrompt) {
            // Zachovaj prípadný inline label (napr. 'Glitchoslav') ak existuje.
            return inline?.label ? { ...fromRegistry, label: inline.label } : fromRegistry;
        }
    }
    return inline || PERSONAS.hasic;
}

// Lowercase + odstránenie diakritiky pre robustné keyword matchovanie (bez \b/diakritika
// pasce — pozri opravu safetyRails.js z 2026-06-25).
function normalizeForClassify(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

// AUTO persona selector — jednoduché keyword matching (žiadny LLM call).
// Poradie kategórií je zámerné: DHZ-špecifické termíny majú prednosť pred
// všeobecnými (napr. "bezpečnosť výjazdu" by inak mohlo spadnúť pod 'core').
const CLASSIFY_KEYWORDS = {
    hasic: ['dhz', 'hasic', 'zbor', 'alarm', 'zasah', 'clen', 'vyjazd'],
    core: ['bezpecnost', 'heslo', 'hesla', 'firewall', 'sifr', 'ochrana', 'sukromie'],
    glitchoslav: ['glitchoslav', 'glitch', 'preco', 'filozofia', 'zmysel', 'kto si', 'manifest', 'citis', 'dusa'],
    popici: ['jednoduch', 'pomoz', 'neviem', 'ako mam', 'vysvetli jednoducho']
};
const CLASSIFY_ORDER = ['hasic', 'glitchoslav', 'core', 'popici'];

/**
 * Klasifikuje prompt na personu pomocou keyword matchingu (bez LLM).
 * @param {string} text - Užívateľský text.
 * @returns {string} - personaKey ('hasic'|'core'|'glitchoslav'|'popici'), default 'core'.
 */
function classifyPrompt(text) {
    const normalized = normalizeForClassify(text);
    if (!normalized) return 'core';

    for (const personaKey of CLASSIFY_ORDER) {
        const keywords = CLASSIFY_KEYWORDS[personaKey];
        if (keywords.some((kw) => normalized.includes(kw))) {
            return personaKey;
        }
    }

    return 'core'; // default
}

function formatMemberRefs(items = []) {
    if (!Array.isArray(items) || items.length === 0) return '—';
    return items
        .map((item) => `${item.label || item.id || '—'}${item.role ? ` (${item.role})` : ''}`)
        .join(', ');
}

function guessTopicFromContext(context = null) {
    if (!context || typeof context !== 'object') return 'general';
    const mode = String(context.mode || '').toLowerCase();
    if (mode) return mode;
    const eventType = String(context.event?.type || '').toLowerCase();
    if (eventType && eventType !== 'none') return eventType;
    return 'general';
}

function formatDhzContext(context = null) {
    if (!context || typeof context !== 'object') return '';

    const lines = [];
    lines.push(`Kontrakt: ${context.contract || 'dhz-sp4-context/legacy'}`);
    lines.push(`Mode: ${context.mode || 'portal'}`);
    lines.push(`Source: ${context.source || 'unknown'}`);
    lines.push(`Request: ${context.requestMode || 'normal'} | urgency: ${context.urgency || 'medium'}`);

    if (context.member && typeof context.member === 'object') {
        const teams = Array.isArray(context.member.team) && context.member.team.length > 0
            ? context.member.team.join(', ')
            : '—';
        lines.push(`Člen: id=${context.member.id || '—'}, role=${context.member.role || '—'}, status=${context.member.status || 'unknown'}, tímy=${teams}`);
    }

    if (context.event && typeof context.event === 'object') {
        lines.push(`Event: id=${context.event.id || '—'}, type=${context.event.type || 'none'}, state=${context.event.state || 'none'}, time=${context.event.time || '—'}`);
    }

    if (context.facts && typeof context.facts === 'object') {
        const facts = context.facts;
        if (Number.isInteger(facts.memberCount)) {
            const active = Number.isInteger(facts.activeMemberCount) ? facts.activeMemberCount : '—';
            lines.push(`Fakty: členov=${facts.memberCount}, aktívnych=${active}`);
        }
        if (Number.isInteger(facts.zasahovyMemberCount)) {
            lines.push(`Fakty: aktívni zásahoví hasiči=${facts.zasahovyMemberCount}`);
        }
    }

    if (Array.isArray(context.recent) && context.recent.length > 0) {
        lines.push('Recent:');
        for (const item of context.recent.slice(0, 3)) {
            lines.push(`- ${item.kind || 'note'} | ${item.time || '—'} | ${item.summary || ''}`);
        }
    }

    if (context.teamState && typeof context.teamState === 'object') {
        const summary = context.teamState.summary || {};
        lines.push(`Team state: confirmed=${summary.confirmed || 0}/${summary.required || 0}, missing=${summary.missing || 0}`);
        lines.push(`Going: ${formatMemberRefs(context.teamState.going)}`);
        lines.push(`Delayed: ${formatMemberRefs(context.teamState.delayed)}`);
        lines.push(`Missing: ${formatMemberRefs(context.teamState.missing)}`);
    }

    return `\n\n[KONTEXT Z DHZ]\n${lines.join('\n')}\n[KONIEC KONTEXTU]`;
}

function formatConversationHistory(history = []) {
    if (!Array.isArray(history) || history.length === 0) return '';
    const items = history
        .filter((item) => item && typeof item === 'object' && item.content)
        .slice(-8)
        .map((item) => {
            const role = item.role === 'assistant' ? 'Florián' : 'Člen';
            return `${role}: ${String(item.content).replace(/\s+/g, ' ').slice(0, 700)}`;
        });
    if (items.length === 0) return '';
    return `\n\n[KRÁTKODOBÁ HISTÓRIA CHATU]\nPouži iba na nadviazanie odpovede, nie ako zdroj overených zborových faktov.\n${items.join('\n')}\n[KONIEC HISTÓRIE]`;
}

function shouldUseCollectiveMemory(text, context = null) {
    if (context?.requestMode === 'critical' || context?.mode === 'alarm') return false;
    if (OPERATIONAL_DHZ_QUERY_RE.test(text)) return false;
    if (FOLLOWUP_CONTEXT_QUERY_RE.test(String(text || '').trim())) return false;
    return true;
}


function looksLikeOperationalAnswer(text) {
    const value = String(text || '').trim();
    return value.length >= 35
        && /\b(pri|po|najprv|potom|n[aá]sledne|treba|zisti|skontrol|zabezpe|zavol|poskytni|evaku|odstav|ozna[cč]|over|prever)\b/i.test(value);
}

function cleanMisusedLearnMarker(text, query = '') {
    let value = String(text || '').trim();
    if (OPERATIONAL_DHZ_QUERY_RE.test(query)) {
        return value.replace(/\s*#NAUČIŤ:\s*([^\n]+)\s*/gi, ' ').replace(/\s+/g, ' ').trim();
    }

    const firstLineMatch = value.match(/^#NAUČIŤ:\s*([^\n]+)/i);
    if (firstLineMatch && looksLikeOperationalAnswer(firstLineMatch[1])) {
        value = value.replace(/^#NAUČIŤ:\s*/i, '').trim();
    }

    value = value.replace(/\s*#NAUČIŤ:\s*([^\n]+)\s*$/i, (match, hint) => {
        return looksLikeOperationalAnswer(hint) ? '' : match;
    }).trim();

    return value;
}

function deterministicDhzOperationalAnswer(text) {
    const q = String(text || '').trim();

    if (/únik\s+plynu|unik\s+plynu|plyn.*bytovk|bytovk.*plyn/i.test(q)) {
        return 'Pri podozrení na únik plynu: nevypínať ani nezapínať elektrinu, nefajčiť, neotvoreným ohňom nemanipulovať. Vyvetrať len ak je to bezpečné, evakuovať ohrozený priestor, uzavrieť prívod plynu ak je prístupný bez rizika a volať 112/150 + plynárov. Veliteľ po príchode zabezpečí priestor, odstup, zákaz vstupu a čaká na meranie alebo odbornú službu.';
    }

    if (/zranen.*člen|zranen.*clen|člen.*zranen|clen.*zranen/i.test(q)) {
        return 'Ak sa pri zásahu zraní člen družstva: najprv zastaviť jeho ďalšie ohrozenie a oznámiť to veliteľovi. Poskytnúť prvú pomoc len v bezpečnom priestore, privolať ZZS/112 podľa stavu a určiť člena na sprievod zraneného. Veliteľ zároveň prehodnotí zásah, doplní sily alebo stiahne družstvo, ak bezpečnosť už nie je zvládnutá.';
    }

    if (/tried[ay]\s+A.*B.*C|A,\s*B\s*a\s*C|požiarom triedy/i.test(q)) {
        return 'Trieda A: pevné látky ako drevo, papier, textil, plasty. Trieda B: horľavé kvapaliny ako benzín, olej, riedidlá. Trieda C: horľavé plyny ako propán-bután alebo zemný plyn. Pri triede B a C nevoliť vodu naslepo; treba správne hasiace médium, odstup a kontrolu rizika výbuchu.';
    }

    if (/evaku.*zadym|zadym.*evaku/i.test(q)) {
        return 'Pri evakuácii zo zadymeného priestoru: najprv vlastná bezpečnosť a dýchacia ochrana, potom rýchly prieskum a vyvedenie osôb najkratšou bezpečnou cestou. Držať osoby nízko pri zemi, neotvárať zbytočne dvere do dymu a kontrolovať počet evakuovaných. Ak je priestor silno zadymený, vstup len s určeným istením a podľa pokynov veliteľa.';
    }

    if (/dym\s+z\s+pivnic|pivnic.*dym/i.test(q)) {
        return 'Ďakujeme za nahlásenie. Opustite ohrozený priestor, nechoďte do pivnice, zatvorte za sebou dvere a volajte 112 alebo 150, ak ešte nie je volané. Počkajte vonku na bezpečnom mieste a povedzte hasičom, odkiaľ dym vychádza a či môže byť niekto vnútri.';
    }

    if (/kedy.*(profesion[aá]ln|IZS|112|150)|volať.*(profesion[aá]ln|IZS|112|150)/i.test(q)) {
        return 'Profesionálnych hasičov alebo IZS treba volať vždy, keď hrozí ohrozenie života, požiar v budove, únik plynu alebo chemikálie, dopravná nehoda, zranenie, zadymenie priestoru, rýchle šírenie požiaru alebo neistota, či to DHZ zvládne bezpečne. Pri pochybnosti volať 112/150 radšej skôr.';
    }

    if (/spadnut.*strom|strom.*cest/i.test(q)) {
        return 'Pri spadnutom strome na ceste: najprv zastaviť alebo usmerniť premávku a označiť nebezpečný úsek. Skontrolovať zranených, elektrické vedenie, nestabilné konáre a ďalšie riziká. Rezať alebo odstraňovať strom až po zabezpečení priestoru, s ochrannými prostriedkami a podľa pokynov veliteľa.';
    }

    if (/kontajner.*bytovk|bytovk.*kontajner|požiar\s+kontajnera/i.test(q)) {
        return 'Pri požiari kontajnera pri bytovke preveriť: či sú ohrozené osoby, autá, fasáda, okná alebo balkóny; či v kontajneri nie sú tlakové nádoby, chemikálie alebo elektroodpad; či sa požiar nešíri do prístrešku alebo budovy. Zabezpečiť odstup ľudí, prístup pre techniku a po uhasení skontrolovať skryté ohniská.';
    }

    if (/základn.*vybaven|zakladn.*vybaven|výbav.*výjazd|vystroj.*výjazd/i.test(q)) {
        return 'Základ pre člena DHZ pri výjazde: zásahový odev, prilba, rukavice, zásahová obuv a podľa typu zásahu aj reflexné prvky, svietidlo a ochrana dýchania. Člen si má skontrolovať, či má výstroj zapnutú a kompletnú. Technické vybavenie ako hadice, prúdnice, čerpadlo, náradie a lekárnička ide podľa vozidla a pokynu veliteľa.';
    }

    if (/dopravn\w*\s+nehod\w*|nehod\w*/i.test(q) && /velite[ľl]/i.test(q)) {
        return 'Veliteľ po príchode k dopravnej nehode najprv zhodnotí bezpečnosť miesta: premávka, únik paliva, požiar, elektrina, poloha vozidiel. Určí istenie a označenie miesta, preverí zranených a kontakt s IZS, rozdelí úlohy družstvu a zabezpečí prístup pre ZZS a políciu. Zásah vedie tak, aby sa nepridal ďalší zranený.';
    }

    return null;
}

function deterministicDhzFactAnswer(text, context = null, history = []) {
    const q = String(text || '').trim();
    const facts = context && typeof context === 'object' && context.facts && typeof context.facts === 'object'
        ? context.facts
        : {};
    const category = facts.categoryBreakdown && typeof facts.categoryBreakdown === 'object'
        ? facts.categoryBreakdown
        : {};
    const gender = facts.genderBreakdown && typeof facts.genderBreakdown === 'object'
        ? facts.genderBreakdown
        : {};
    const historyText = Array.isArray(history)
        ? history.map((item) => String(item?.content || '')).join('\n').toLowerCase()
        : '';
    const askedShortCount = /^(?:a\s+)?(?:ko[ľl]k[yý]ch|kolkych|koľkých|kolky|koľkí|kolki)[\s?.!]*$/i.test(q);
    const previousAboutFunkcionari = /funkcion[aá]r|funkcionar/i.test(historyText);

    const formatActiveMemberLabel = (count) => count === 1
        ? '1 aktívneho člena'
        : `${count} aktívnych členov`;

    if (/(k[oó]ľko|kolko|po[cč]et).*(z[aá]sahov[yý][cč]h?|z[aá]sahov[aá]k)|z[aá]sahov[yý][cč]h?.*(k[oó]ľko|kolko|m[aá]me|po[cč]et)/i.test(q)) {
        if (Number.isInteger(facts.zasahovyMemberCount)) {
            const label = facts.zasahovyMemberCount === 1
                ? '1 aktívneho zásahového hasiča'
                : `${facts.zasahovyMemberCount} aktívnych zásahových hasičov`;
            return `Podľa aktuálnej evidencie DHZSP4 máme ${label}. Tento počet beriem zo zborovej databázy, nie z odhadu modelu.`;
        }
        return 'Presný počet zásahových hasičov teraz nemám v overenom DHZSP4 kontexte, takže ho nechcem tipovať.';
    }

    if (/(m[aá]me.*funkcion[aá]r|funkcion[aá]rov|funkcion[aá]ri|funkcionarov|funkcionari|funkcionar)|\bpo[cč]et.*funkcion/i.test(q)
        || (askedShortCount && previousAboutFunkcionari)) {
        const total = category.FUNKCIONAR?.total;
        const active = category.FUNKCIONAR?.active;
        if (Number.isInteger(total)) {
            const totalLabel = total === 1 ? '1 funkcionár' : `${total} funkcionárov`;
            const activeSuffix = Number.isInteger(active) ? `, z toho ${active} aktívnych` : '';
            if (/^m[aá]me\s+aj\s+funkcion/i.test(q)) {
                const yesNo = total > 0 ? 'Áno' : 'Nie';
                return `${yesNo}. Podľa aktuálnej evidencie DHZSP4 máme ${totalLabel}${activeSuffix}. Tento počet beriem zo zborovej databázy, nie z odhadu modelu.`;
            }
            return `Podľa aktuálnej evidencie DHZSP4 máme ${totalLabel}${activeSuffix}. Tento počet beriem zo zborovej databázy, nie z odhadu modelu.`;
        }
        return 'Presný počet funkcionárov teraz nemám v overenom DHZSP4 kontexte, takže ho nechcem tipovať.';
    }

    if (/(k[oó]ľko|kolko|po[cč]et).*(akt[ií]vnych|aktivnych|akt[ií]vni|aktivni)|^(?:k[oó]ľko|kolko)\s+akt/i.test(q)) {
        if (Number.isInteger(facts.activeMemberCount)) {
            return `Podľa aktuálnej evidencie DHZSP4 máme ${formatActiveMemberLabel(facts.activeMemberCount)}. Tento počet beriem zo zborovej databázy, nie z odhadu modelu.`;
        }
        return 'Presný počet aktívnych členov teraz nemám v overenom DHZSP4 kontexte, takže ho nechcem tipovať.';
    }

    if (/(k[oó]ľko|kolko|po[cč]et).*(žien|zien|ženy|zeny).*(mužov|muzov|muži|muzi)|(k[oó]ľko|kolko|po[cč]et).*(mužov|muzov|muži|muzi).*(žien|zien|ženy|zeny)|(žien|zien|ženy|zeny).*(mužov|muzov|muži|muzi)|(mužov|muzov|muži|muzi).*(žien|zien|ženy|zeny)/i.test(q)) {
        const women = gender.zena;
        const men = gender.muz;
        if (Number.isInteger(women?.total) && Number.isInteger(men?.total)) {
            const known = women.total + men.total;
            const missing = Number.isInteger(facts.memberCount) ? Math.max(0, facts.memberCount - known) : 0;
            const missingSuffix = missing > 0 ? ` Pri ${missing} členoch pohlavie nie je vyplnené.` : '';
            return `Podľa vyplnených údajov v zborovej databáze máme ${women.total} ženy a ${men.total} mužov.${missingSuffix} Tento počet beriem zo zborovej databázy, nie z odhadu modelu.`;
        }
        return 'Presný počet žien a mužov teraz nemám v overenom DHZSP4 kontexte, takže ho nechcem tipovať.';
    }

    if (/(k[oó]ľko|kolko|po[cč]et).*(členov|clenov)|\b(k[oó]ľko|kolko)\s+členov\b|\b(k[oó]ľko|kolko)\s+clenov\b/i.test(q)) {
        if (Number.isInteger(facts.memberCount)) {
            const activeSuffix = Number.isInteger(facts.activeMemberCount)
                ? `, z toho ${facts.activeMemberCount} aktívnych`
                : '';
            return `Podľa aktuálnej evidencie DHZSP4 máme ${facts.memberCount} členov${activeSuffix}. Tento počet beriem zo zborovej databázy, nie z odhadu modelu.`;
        }
        return 'Presný počet členov teraz nemám v overenom DHZSP4 kontexte, takže ho nechcem tipovať.';
    }

    if (askedShortCount) {
        return 'Upresni, ktorú skupinu myslíš: členov, aktívnych, zásahových, funkcionárov, ženy alebo mužov. Bez jasného predmetu nechcem tipovať.';
    }

    return null;
}

function deterministicDhzSystemAnswer(text) {
    const q = String(text || '').trim();

    if (/^(?:kto\s+si|kto\s+si\s+ty)[\s?.!]*$/i.test(q)) {
        return 'Som Florián, digitálny hasič pre DHZ Spišský Štvrtok a DHZSP4. Som rozhranie medzi členmi zboru a lokálnym systémom SP4. Pomáham s alarmami, členmi, udalosťami, zborovým kontextom a základnými bezpečnostnými postupmi; rozhodnutia pri zásahu však patria veliteľovi a ľuďom v zbore.';
    }

    if (/^(?:a\s+)?(?:čo|co)\s+je\s+(?:potom\s+)?(?:to\s+)?dhzsp4[\s?.!]*$/i.test(q)) {
        return 'DHZSP4 je digitálna vetva systému SP4 pre DHZ Spišský Štvrtok. Spája Telegram, portál, admin backend, evidenciu členov, alarmy, udalosti a AI asistenta Floriána. DHZ vlastní zborové dáta; SP4 slúži ako lokálny answer engine a pracovná vrstva nad nimi.';
    }

    if (/rozdiel.*sp4.*dhzsp4|sp4.*rozdiel.*dhzsp4|sp4\s+a\s+dhzsp4|(?:a\s+)?(?:čo|co)\s+je\s+potom\s+dhzsp4/i.test(q)) {
        return 'SP4 je širší lokálny AI ekosystém a runtime. DHZSP4 je jeho konkrétna vetva pre DHZ Spišský Štvrtok. Zjednodušene: SP4 je mozog a operačná vrstva, DHZSP4 je hasičská aplikácia a doména so zborovými dátami, alarmami, členmi a Floriánom.';
    }

    if (/(kto\s+si|kto\s+si\s+ty|flori[aá]n).*(dhzsp4|syst[eé]m)|dhzsp4.*kto\s+si/i.test(q)) {
        return 'Som Florián, digitálny hasič pre DHZ Spišský Štvrtok. V DHZSP4 som rozhranie medzi členom a SP4: odpovedám na otázky, pomáham s kontextom zboru, alarmami, udalosťami a bezpečnostnými postupmi. Nie som fyzický člen zásahu ani veliteľ; rozhodnutia patria ľuďom v zbore.';
    }

    if (/(?:čo|co)\s+je\s+(?:to\s+)?sp4|sp4.*flori[aá]n|flori[aá]n.*sp4/i.test(q)) {
        return 'SP4 je lokálny AI systém orientovaný na offline-first, local-first a safety-first prácu. Florián je DHZ persona a rozhranie tohto systému pre zbor. Keď sa člen pýta cez DHZSP4, otázka ide so zborovým kontextom do SP4 bridge a odpoveď sa vracia späť do Telegramu alebo portálu.';
    }

    if (/local-first|local first|lok[aá]lny.*re[žz]im|prečo.*lok/i.test(q)) {
        return 'DHZSP4 má používať local-first režim preto, aby bežné odpovede a zborový kontext ostali čo najbližšie k zboru. Znižuje sa závislosť od internetu a cloudu, zlepšuje sa súkromie a SP4 ostáva primárny answer engine. Cloud nemá súťažiť so SP4; má byť iba núdzový fallback.';
    }

    if (/cloud.*fallback|fallback.*cloud|kedy.*cloud/i.test(q)) {
        return 'Cloud fallback v DHZSP4 sa môže použiť až vtedy, keď SP4 bridge alebo lokálny model zlyhá, je nedostupný alebo degradovaný. Bežná cesta je vždy SP4-first. Ak je cloud vypnutý, systém má radšej priznať offline stav, než posielať dáta mimo zbor bez potreby.';
    }

    if (/d[aá]ta.*člen|data.*clen|kto.*vlastn.*d[aá]ta|člen.*vlastn/i.test(q)) {
        return 'Dáta o členoch vlastní a spravuje DHZ. V DHZ backende sú profily členov, kategórie, tímy, funkcie, Telegram väzby, alarmy a reakcie. SP4 dostáva len potrebný kontext pre odpoveď, napríklad memberId, rolu, tím a stav. Osobné alebo citlivé údaje sa nemajú vkladať do collective-memory.';
    }

    if (/prim[aá]rny.*answer engine|answer engine.*dhz|sp4.*prim[aá]rny/i.test(q)) {
        return 'SP4 ako primárny answer engine znamená, že DHZ najprv skladá structured kontext a posiela otázku do SP4 bridge. SP4 vytvorí odpoveď alebo prizná zlyhanie. DHZ cloud chain sa smie použiť len ako fallback po zlyhaní alebo degradácii SP4, nie ako paralelný druhý mozog.';
    }

    if (/bridge.*dhz.*sp4|sp4.*bridge|dhz backend.*sp4/i.test(q)) {
        return 'Bridge funguje takto: DHZ backend prijme otázku z Telegramu alebo portálu, doplní structured dhz-sp4-context/v2, pošle ju na SP4 bridge a dostane odpoveď. SP4 bridge vyberie personu Florián, pripojí povolený kontext a odpovie lokálne. Launcher/bridge policy drží režim LOCAL_FIRST alebo LOCAL_ONLY.';
    }

    if (/čo\s+si.*pam[aä]t|co\s+si.*pamat|dhzsp4.*pam[aä]t|nepam[aä]t/i.test(q)) {
        return 'DHZSP4 pracuje s tromi oddelenými vrstvami: krátka história chatu v DHZ backende, zborové fakty v DHZ databáze a SP4 collective-memory pre anonymné, kurátorované poznanie. Nemá miešať osobnú pamäť Kefyka s DHZ kontextom. Operatívne zásahové odpovede sa nemajú automaticky zapisovať ako nové poznanie.';
    }

    if (/mimo\s+hasi[cč]iny|aj\s+mimo|odpovedať\s+aj\s+mimo|odpovedat\s+aj\s+mimo/i.test(q)) {
        return 'Viem odpovedať aj mimo hasičiny, ale v DHZSP4 je moja priorita zbor, SP4, alarmy, členovia, udalosti a bezpečnosť. Mimo témy odpovedám krátko alebo presmerujem späť, aby sa z DHZ asistenta nestal všeobecný chat bez hraníc.';
    }

    if (/admin.*cloud|cloud.*admin|zist[ií].*cloud|cloud.*namiesto\s+sp4/i.test(q)) {
        return 'Admin to zistí podľa provider/engine metadát a logov. Pri SP4 odpovedi má byť engine napríklad ollama alebo sp4-deterministic cez local-bridge. Ak sa použije fallback, v logoch alebo odpovedi z bridge vrstvy sa objaví provider typu dhz-cloud alebo cloud fallback. Launcher má zároveň emitovať fallback udalosť s dôvodom.';
    }

    return null;
}

function deterministicDhzVisionAnswer(text) {
    const q = String(text || '').trim();

    if (/pre[cč]o.*vznik|vznik.*dhzsp4/i.test(q)) {
        return 'DHZSP4 vzniklo preto, aby zbor nemal digitálne veci rozhádzané po chatoch, papieroch a náhodných poznámkach. Cieľ je mať jednoduchý systém pre alarmy, členov, udalosti, portál a AI pomocníka Floriána. Nie je to hračka pre efekt; je to pracovná vrstva, ktorá má zboru pomôcť konať rýchlejšie, presnejšie a bezpečnejšie.';
    }

    if (/na[cč]o.*dhzsp4|dobr[eé].*zbor|dhzsp4.*dobr/i.test(q)) {
        return 'DHZSP4 je dobré pre zbor hlavne na tri veci: alarmy a reakcie členov, prehľad o členoch/tímoch/udalostiach a rýchle odpovede cez Floriána. Veliteľ má lepší prehľad, člen má jednoduchší prístup k informáciám a zbor má menej chaosu v bežnej komunikácii.';
    }

    if (/pre\s+koho.*dhzsp4|ur[cč]en[eé].*dhzsp4/i.test(q)) {
        return 'DHZSP4 je určené pre členov zboru, veliteľa, funkcionárov a adminov. Člen potrebuje jednoducho reagovať na alarm, pozrieť profil a pýtať sa Floriána. Veliteľ potrebuje prehľad a riadenie. Admin potrebuje spravovať členov, udalosti, nastavenia a dáta zboru.';
    }

    if (/ako.*[cč]len.*pou[žz]|pou[žz][ií]va[ťt].*praxi|dhzsp4.*praxi/i.test(q)) {
        return 'Člen používa DHZSP4 prakticky cez Telegram a portál: reaguje na alarm tlačidlom Idem/Nejdem/Meškám, pozrie si profil, udalosti a informácie zo zboru, a Floriána sa pýta na DHZ, SP4, výbavu alebo postupy. Základ je jednoduchý: keď príde alarm, odpovedať; keď niečo nevie, spýtať sa; keď má nápad, poslať spätnú väzbu.';
    }

    if (/ak[eé].*mo[žz]nosti.*dhzsp4.*dnes|mo[žz]nosti.*dnes/i.test(q)) {
        return 'Dnes máme v DHZSP4 hlavne: Telegram bota, alarmy s reakciami členov, webový admin panel, členský portál, evidenciu členov, kategórií a tímov, udalosti, IZS/dispatch cestu, Floriána ako AI asistenta a SP4 bridge ako lokálny answer engine. Ďalšie možnosti sa majú pridávať postupne podľa reálnej potreby zboru.';
    }

    if (/ekosyst[eé]m\s+sp4|čo\s+znamen[aá]\s+ekosyst[eé]m|co\s+znamena\s+ekosystem/i.test(q)) {
        return 'Ekosystém SP4 znamená, že nejde o jednu appku ani jeden model. Je to sústava vrstiev: lokálny AI runtime, persony ako Florián, bridge medzi aplikáciami, pamäťové vrstvy, governance dokumenty, testy a konkrétne vetvy ako DHZSP4. Každá vetva rieši svoju doménu, ale drží spoločné princípy: local-first, offline-first, safety-first.';
    }

    if (/spolo[cč]ne.*r[aá]s[ťt]|r[aá]s[ťt].*zbor|cez\s+dhzsp4.*r[aá]s/i.test(q)) {
        return 'Spoločne rastieme tak, že členovia používajú systém v praxi a dávajú spätnú väzbu: čo pomohlo, čo mýlilo, čo chýba. Zbor tým získava lepšie postupy, čistejšie dáta a menej chaosu. SP4 sa z toho učí iba bezpečným spôsobom: operatívne odpovede sa nezapisujú naslepo, užitočné poznanie má byť anonymné alebo kurátorované.';
    }

    if (/ako.*vyv[ií]jame|vyv[ií]jame.*syst[eé]m|syst[eé]m.*[ďd]alej/i.test(q)) {
        return 'Systém vyvíjame postupne: najprv overíme reálnu potrebu, potom spravíme malú zmenu, otestujeme ju cez smoke otázky alebo reálny flow a až potom ju necháme v prevádzke. Dôležitá je spätná väzba od členov a veliteľa. Changelog drží, čo bolo naozaj zmenené a overené.';
    }

    if (/[cč]len.*prispie[ťt]|zlep[šs]eniu.*dhzsp4|n[aá]pad.*dhzsp4|sp[aä]tn[aá]\s+v[aä]zba/i.test(q)) {
        return 'Člen môže prispieť jednoducho: nahlásiť chybu, poslať nápad, povedať čo mu pri alarme alebo portáli chýbalo, a po zásahu doplniť skúsenosť, ktorá môže pomôcť zboru. Najlepšia spätná väzba je konkrétna: čo sa stalo, čo bolo nejasné, čo by malo byť nabudúce jednoduchšie.';
    }

    if (/mo[žz]nosti.*bud[uú]cn|do\s+bud[uú]cna.*sp4|bud[uú]cna.*dhzsp4/i.test(q)) {
        return 'Do budúcna máme možnosti rozšíriť DHZSP4 o lepší mobilný zážitok, viac zborových workflow, kvalitnejšiu znalostnú bázu, štatistiky pripravenosti, tréningové scenáre, krajskú alebo medzi-zborovú spoluprácu a bezpečné SP4 modely šité na hasičské použitie. Tempo má určovať zbor a reálna potreba, nie efekt pre efekt.';
    }

    if (/pom[oô]c[ťt].*velite[ľl]|velite[ľl].*riaden/i.test(q)) {
        return 'Veliteľovi má DHZSP4 pomôcť hlavne prehľadom: kto reagoval na alarm, kto ide, kto mešká, aké sú tímy, kto má akú rolu a čo je aktuálne v systéme. Namiesto ručného zisťovania má mať rýchly obraz situácie. Rozhodnutie stále robí veliteľ; systém mu má znížiť šum.';
    }

    if (/oby[cč]ajn[eé]mu\s+[cč]lenovi|pom[oô]c[ťt].*[cč]lenovi|be[žz]n[eé]mu\s+[cč]lenovi/i.test(q)) {
        return 'Bežnému členovi má DHZSP4 pomôcť jednoducho: dostane alarm, jedným tlačidlom odpovie, pozrie si svoj profil a vie sa spýtať Floriána bez hľadania v papieroch alebo starých správach. Člen nemusí rozumieť celému systému; má mať jasné kroky a rýchle odpovede.';
    }

    return null;
}

function deterministicDhzMemberAnswer(text) {
    const q = String(text || '').trim();

    if (/omylom.*idem|omylom.*nejdem|kliknem\s+omylom|zl[eé]\s+klik/i.test(q)) {
        return 'Ak člen klikne omylom Idem alebo Nejdem, má reakciu čo najskôr opraviť, ak to systém umožňuje, a napísať veliteľovi. Pri výjazde je najdôležitejšie, aby veliteľ nemal chybný obraz o tom, kto reálne príde.';
    }

    if (/potvrd[ií]m.*idem|som\s+[cč]len.*idem|ako.*idem.*v[yý]jazd/i.test(q)) {
        return 'Keď príde alarm, člen potvrdí účasť priamo v Telegrame tlačidlom Idem. Znamená to, že ide na výjazd alebo zraz podľa pokynu. Ak sa situácia zmení, treba čo najskôr opraviť reakciu alebo napísať veliteľovi.';
    }

    if (/nest[ií]ham|me[šs]k[aá]m|pr[ií]dem\s+nesk[oô]r/i.test(q)) {
        return 'Ak člen na výjazd nestíha, má v Telegrame zvoliť Meškám, ak je tá možnosť dostupná, alebo hneď napísať veliteľovi. Dôležité je nenechať veliteľa hádať, či s členom môže počítať.';
    }

    if (/nejdem|nem[oô][žz]em.*v[yý]jazd|ako.*d[aá]m.*nejdem/i.test(q)) {
        return 'Ak člen na zásah nejde, má v Telegrame zvoliť Nejdem. Je to lepšie než mlčať, lebo veliteľ potom vidí reálnejší obraz síl a nemusí čakať na člena, ktorý nepríde.';
    }

    if (/telef[oó]nne\s+[cč][ií]slo|profil\s+[cč]lena|uprav[ií]m.*profil|kde.*profil/i.test(q)) {
        return 'Telefónne číslo a základné údaje člena patria do profilu v členskom portáli alebo ich upraví admin podľa pravidiel zboru. Ak člen vidí chybu v profile, má ju nahlásiť veliteľovi alebo adminovi, aby sa neopierali alarmy a evidencia o zlé údaje.';
    }

    if (/t[ií]me|dru[žz]stve|zaraden[yý]|zaraden[ií]/i.test(q)) {
        return 'Zaradenie v tíme alebo družstve má člen vidieť vo svojom profile alebo ho potvrdí veliteľ/admin. Prakticky ide o tím/družstvo, v ktorom má člen fungovať pri organizácii zboru. Ak zaradenie nesedí, treba nahlásiť konkrétnu chybu, aby sa opravila evidencia.';
    }

    if (/najbli[žz][šs]ie.*([šs]kolenie|brig[aá]d)|([šs]kolenie|brig[aá]d).*kde|udalost/i.test(q)) {
        return 'Najbližšie školenie, brigáda a zborové udalosti patria do udalostí v DHZSP4 alebo do oznamu cez Telegram. Člen si má pozrieť termín, miesto a požiadavku na účasť. Ak udalosť chýba alebo je nejasná, treba to nahlásiť adminovi alebo veliteľovi.';
    }

    if (/nepri[šs]iel.*alarm|alarm.*nepri[šs]iel|telegram.*alarm.*nejde/i.test(q)) {
        return 'Ak členovi neprišiel alarm do Telegramu, má skontrolovať internet, Telegram notifikácie a či má správny účet spárovaný s DHZSP4. Potom má kontaktovať admina alebo veliteľa, aby preverili Telegram väzbu, členstvo v správnej skupine a stav bota.';
    }

    if (/prihl[aá]sim.*port[aá]l|[cč]lensk[eé]ho\s+port[aá]lu|pr[ií]stup.*port[aá]l/i.test(q)) {
        return 'Do členského portálu sa člen prihlasuje cez prístup určený zborom. Ak prístup nemá alebo nefunguje, má kontaktovať admina. Portál slúži na profil, udalosti a členské informácie; zásahové potvrdenie má zostať čo najjednoduchšie cez Telegram.';
    }

    if (/zl[eé]\s+[uú]daje|[uú]daje.*nesedia|chybn[eé]\s+[uú]daje/i.test(q)) {
        return 'Keď má člen v DHZSP4 zlé údaje, má nahlásiť konkrétne, čo nesedí: meno, telefón, kategória, tím, funkcia alebo Telegram väzba. Opravu spraví admin alebo poverená osoba, aby evidencia členov zostala použiteľná pri alarmoch aj udalostiach.';
    }

    if (/kto\s+vid[ií].*moje\s+[uú]daje|moje\s+[uú]daje.*dhzsp4|s[uú]krom/i.test(q)) {
        return 'Údaje člena v DHZSP4 majú vidieť len oprávnené osoby podľa potreby zboru: veliteľ, admin alebo poverení funkcionári. Cieľ je evidencia, alarmy a organizácia zboru, nie zvedavosť. Citlivé údaje sa nemajú posielať do voľnej pamäte ani mimo zbor bez dôvodu.';
    }

    if (/velite[ľl].*kto\s+ide|kto\s+ide.*v[yý]jazd|uk[aá]za[ťt].*kto\s+ide/i.test(q)) {
        return 'Áno. DHZSP4 má veliteľovi ukázať reakcie členov na alarm: kto ide, kto nejde, kto mešká a kto ešte nereagoval. Nie je to náhrada velenia, ale rýchly prehľad, aby sa veliteľ vedel rozhodnúť podľa reálnych síl.';
    }

    if (/flori[aá]n.*n[aá]pad|n[aá]pad.*flori[aá]n|nahl[aá]si[ťt].*n[aá]pad/i.test(q)) {
        return 'Áno, člen môže cez Floriána alebo bežný zborový kanál nahlásiť nápad na zlepšenie DHZSP4. Najlepšie je napísať konkrétne: čo by malo fungovať, komu to pomôže a v akej situácii. Nápady majú ísť späť k adminovi alebo veliteľovi na rozhodnutie.';
    }

    if (/pred\s+v[yý]jazdom|ma[ťt]\s+pripraven[eé]|pripraven[eé].*v[yý]jazd/i.test(q)) {
        return 'Pred výjazdom má mať člen pripravenú osobnú výstroj: zásahový odev, prilbu, rukavice, obuv a podľa potreby reflexné prvky. V systéme má hlavne rýchlo potvrdiť Idem/Nejdem/Meškám, aby veliteľ videl, s kým môže počítať.';
    }

    if (/evidencii\s+[cč]lenov|evidenc.*[cč]len|[cč]lenov.*evidenc/i.test(q)) {
        return 'DHZSP4 pomáha pri evidencii členov tým, že drží profily, kategórie, tímy, funkcie, kontakty a Telegram väzby na jednom mieste. Vďaka tomu sa dajú lepšie riešiť alarmy, udalosti, oprávnenia a prehľad zboru.';
    }

    if (/tla[cč]idlo\s+idem|[cč]o\s+znamen[aá].*idem|idem.*alarm/i.test(q)) {
        return 'Tlačidlo Idem pri alarme znamená: počítajte so mnou, idem podľa pokynu na výjazd alebo zraz. Je to informácia pre veliteľa a zbor. Ak člen klikol omylom alebo sa situácia zmení, má reakciu opraviť alebo dať vedieť veliteľovi.';
    }

    if (/mimo\s+v[yý]jazdu|aj\s+mimo\s+v[yý]jazdu|pou[žz][ií]va[ťt].*mimo/i.test(q)) {
        return 'Áno, DHZSP4 sa dá používať aj mimo výjazdu: na profil člena, udalosti, školenia, brigády, zborové informácie, spätnú väzbu a otázky pre Floriána. Pri zásahu má zostať komunikácia stručná a operačná; mimo zásahu je priestor na učenie a zlepšovanie.';
    }

    if (/dozviem\s+zmeny|zmeny\s+v\s+syst[eé]me|novinky.*dhzsp4/i.test(q)) {
        return 'Zmeny v DHZSP4 majú ísť cez zborový oznam, Telegram, portál alebo informáciu od admina/veliteľa. Člen nemusí čítať technický changelog; dôležité je vedieť, čo sa zmenilo v používaní: alarmy, profil, udalosti alebo reakcie.';
    }

    if (/na\s+[cč]o\s+sa.*nem[aá].*flori[aá]n|nem[aá].*p[yý]ta[ťt].*flori[aá]n|flori[aá]na.*nem[aá]/i.test(q)) {
        return 'Floriána sa člen nemá pýtať na súkromné klebety, osobné údaje iných členov bez dôvodu, neoverené obvinenia ani veci mimo zborovej práce, ktoré nesúvisia s DHZSP4, bezpečnosťou, výjazdmi alebo organizáciou zboru. Pri neistote má Florián radšej presmerovať na veliteľa alebo admina.';
    }

    return null;
}

// ─────────────────────────────────────────────────────────────
// Express app
// ─────────────────────────────────────────────────────────────

// Bearer token ochrana pre bridge, member a collective API.
function requireBridgeAuth(req, res, next) {
    const token = String(process.env.BRIDGE_AUTH_TOKEN || '').trim();
    if (!token) {
        return res.status(503).json({
            error: 'bridge_auth_misconfigured',
            message: 'bridge auth misconfigured — BRIDGE_AUTH_TOKEN not set'
        });
    }

    const allowLocalhostBypass =
        process.env.NODE_ENV === 'development'
        && String(process.env.BRIDGE_ALLOW_LOCALHOST_BYPASS || 'false').trim().toLowerCase() === 'true';
    const peerAddress = req.socket?.remoteAddress || '';
    const isLocalhost =
        peerAddress === '127.0.0.1'
        || peerAddress === '::1'
        || peerAddress === '::ffff:127.0.0.1';
    if (allowLocalhostBypass && isLocalhost) return next();

    const match = /^Bearer\s+(.+)$/i.exec(req.headers['authorization'] || '');
    const providedToken = match ? match[1] : null;

    if (!providedToken || providedToken !== token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

const app = express();
app.set('trust proxy', false);
app.use(express.json({ limit: '256kb' }));

// CORS/preflight musí byť spracovaný pred default-deny API auth.
app.use(bridgeCors);

// Request logger (len základ)
app.use((req, _res, next) => {
    if (req.path !== '/health') {
        console.log(`[SP4_BRIDGE] ${req.method} ${req.path}`);
    }
    next();
});

// Default-deny pre celé API. Verejný zostáva iba /health mimo /api.
// CORS middleware vyššie vybaví OPTIONS ešte pred autentifikáciou.
app.use('/api', requireBridgeAuth);

function invalidMemberIdResponse(res) {
    return res.status(400).json({ ok: false, error: 'invalid_memberId' });
}

app.param('id', (req, res, next, id) => {
    try {
        req.params.id = validateMemberId(id);
        next();
    } catch (error) {
        if (error?.code === 'INVALID_MEMBER_ID') {
            return invalidMemberIdResponse(res);
        }
        next(error);
    }
});

// Authenticated credential buckets avoid spoofable proxy/IP identity.
const inferenceRateLimit = createBridgeRateLimiter({
    scope: 'inference',
    maxRequestsEnv: 'BRIDGE_RATE_LIMIT_INFERENCE_MAX',
    windowMsEnv: 'BRIDGE_RATE_LIMIT_INFERENCE_WINDOW_MS',
    defaultMaxRequests: 20,
    defaultWindowMs: 60_000
});
const writeRateLimit = createBridgeRateLimiter({
    scope: 'write',
    maxRequestsEnv: 'BRIDGE_RATE_LIMIT_WRITE_MAX',
    windowMsEnv: 'BRIDGE_RATE_LIMIT_WRITE_WINDOW_MS',
    defaultMaxRequests: 30,
    defaultWindowMs: 60_000
});
const purgeRateLimit = createBridgeRateLimiter({
    scope: 'purge',
    maxRequestsEnv: 'BRIDGE_RATE_LIMIT_PURGE_MAX',
    windowMsEnv: 'BRIDGE_RATE_LIMIT_PURGE_WINDOW_MS',
    defaultMaxRequests: 5,
    defaultWindowMs: 300_000
});

// ─────────────────────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
    let ollamaOk = false;
    let ollamaDetail = null;
    try {
        const h = await checkOllamaHealth();
        ollamaOk = !!(h && (h.ok === true || h.status === 'ok' || h.healthy === true));
        ollamaDetail = h;
    } catch (err) {
        ollamaDetail = { error: err?.message || String(err) };
    }
    res.json({
        status: ollamaOk ? 'ok' : 'degraded',
        agent: AGENT_NAME,
        contract: CONTRACT_VERSION,
        port: PORT,
        ollama: ollamaOk,
        ollamaDetail,
        policy: 'local-only',
        timestamp: new Date().toISOString()
    });
});

// ── SSE hlavičky pre /api/bridge/ask/stream ─────────────────────────
const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
};

// ── buildBridgeSystemPrompt ──────────────────────────────────────────
// Extrahované 2026-08-07 pre /api/bridge/ask/stream.
// ⚠️ KEEP IN SYNC s inline logikou v /api/bridge/ask (TODO: refaktor /ask na túto funkciu).
function buildBridgeSystemPrompt({ body, text, personaKey, persona, isHasicPersona, source, memberId, context }) {
    const contextBlock = formatDhzContext(context);

    let collectiveBlock = '';
    let kbBlock = '';
    let memberBlock = '';
    if (isHasicPersona) {
        try {
            if (shouldUseCollectiveMemory(text, context)) {
                const cs = collectiveSummaryForPrompt(text, 4, 3);
                if (cs) collectiveBlock = `\n\n[PAMÄŤ ORGANIZÁCIE]\n${cs}\n[KONIEC PAMÄTE]`;
            }
        } catch (e) {
            console.warn('[SP4_BRIDGE] collective summary err:', e?.message);
        }
        try {
            const kb = kbSummaryForPrompt(text);
            if (kb) kbBlock = `\n\n[KB ZBORU]\n${kb}\n[KONIEC KB]`;
        } catch (e) {
            console.warn('[SP4_BRIDGE] kb summary err:', e?.message);
        }
        if (memberId) {
            try {
                const ms = memberSummaryForPrompt(memberId);
                if (ms) memberBlock = `\n\n[O TEBE]\n${ms}\n[KONIEC O TEBE]`;
            } catch (e) {
                console.warn('[SP4_BRIDGE] member summary err:', e?.message);
            }
        }
    }

    const manifestBlock = isHasicPersona ? '\n\n' + buildMemoryManifestPrompt() : '';
    const historyBlock = isHasicPersona ? formatConversationHistory(body.history) : '';

    let kbSP4Block = '';
    try {
        const sp4Facts = getRelevantKb(text, personaKey, 5);
        if (sp4Facts.length > 0) {
            kbSP4Block = '\n\n## SP4 znalostná báza\n'
                + sp4Facts.map((f) => `**${f.term}**: ${f.text}`).join('\n');
        }
    } catch (e) {
        console.warn('[SP4_BRIDGE] kb-provider err:', e?.message);
    }

    const personaBase = persona.fullDefinition || persona.systemPrompt || '';
    const identityBlock = buildIdentityBlock(source);
    const sessionHistoryBlock = buildSessionHistoryBlock(source);
    const glitchModeBlock = (personaKey === 'glitchoslav') ? buildGlitchDualModeBlock(text) : '';
    const groundingFactsBlock = [
        SP4_RUNTIME_ROOT_FACT,
        SP4_MODEL_ROUTING_FACT,
        SP4_TRUTH_VS_OPINION_FACT,
        SP4_INSUFFICIENT_INFORMATION_FACT,
        SP4_NON_ANSWER_POLICY_FACT
    ].join('\n');
    let popiciSoftenBlock = '';
    if (personaKey === 'popici' && checkPopiciSafety(text)?.soften === true) {
        popiciSoftenBlock =
            '\n\n⚠️ KONTEXT POUŽÍVATEĽA: Používateľ o sebe práve hovorí zhadzujúco ' +
            '(napr. "som neschopný", "som k ničomu", "nič mi nejde"). ' +
            'NIKDY s tým nesúhlas a nepridávaj sa. Zakázané: hodnotiť ho ' +
            '("si slabý", "si na tom zle"), odpisovať ho ("nechaj to na iných", ' +
            '"neviem čo by si ešte dokázal", "nechápem prečo sa snažíš"), ' +
            'alebo to odbyť ("nechaj to tak, je to tak"). ' +
            'Namiesto toho: uznaj že to je ťažké, JASNE odmietni jeho sebaodpis, ' +
            'a spýtaj sa na konkrétny problém. Drsnosť smeruj na situáciu, nikdy na neho.';
        console.log('[POPICI_SOFTEN] self-deprecation detected, directive injected');
    }

    return personaBase +
        identityBlock +
        '\n\n' + buildGroundingBlock() +
        '\n\n## SP4 kanonické fakty o pravde a routingu\n' +
        groundingFactsBlock +
        sessionHistoryBlock +
        glitchModeBlock +
        kbSP4Block +
        manifestBlock +
        kbBlock +
        collectiveBlock +
        memberBlock +
        historyBlock +
        contextBlock +
        popiciSoftenBlock;
}

// ─────────────────────────────────────────────────────────────
// POST /api/bridge/ask/stream — SSE streaming odpoveď
// Rovnaké body ako /ask; posiela `data: {"delta":"..."}` eventy
// a na konci `data: {"done":true,"text":"..."}`.
// ─────────────────────────────────────────────────────────────
app.post('/api/bridge/ask/stream', inferenceRateLimit, async (req, res) => {
    const started = Date.now();
    const body = req.body || {};
    const text = String(body.text || '').trim();

    if (!text) {
        return res.status(400).json({
            ok: false,
            engine: 'none',
            text: 'Chýba pole "text".',
            error: 'missing_text'
        });
    }

    let memberId = null;
    if (body.memberId !== undefined && body.memberId !== null && body.memberId !== '') {
        try {
            memberId = validateMemberId(body.memberId);
        } catch (error) {
            if (error?.code === 'INVALID_MEMBER_ID') {
                return invalidMemberIdResponse(res);
            }
            throw error;
        }
    }

    // Crisis/self-harm rail — rovnaký ako /ask
    const crisis = detectCrisis(text);
    if (crisis) {
        const safePersona = resolvePersona(crisis.safeMode);
        res.writeHead(200, SSE_HEADERS);
        res.write(`data: ${JSON.stringify({
            done: true, ok: true, engine: 'sp4-safety-rail',
            text: getSafeResponse(crisis),
            persona: crisis.safeMode,
            personaLabel: safePersona.label,
            latencyMs: Date.now() - started,
            llmDurationMs: 0,
            uncertain: false,
            memberId,
            source: body.source || 'unknown',
            contract: CONTRACT_VERSION,
            crisisType: crisis.type
        })}\n\n`);
        return res.end();
    }

    const context = body.context && typeof body.context === 'object' ? body.context : null;
    const source = body.source || 'unknown';

    let personaKey;
    let autoSelected;
    if (!body.persona || body.persona === 'auto') {
        personaKey = classifyPrompt(text);
        autoSelected = true;
    } else {
        personaKey = body.persona.toLowerCase();
        autoSelected = false;
    }
    const persona = resolvePersona(personaKey);
    const isHasicPersona = personaKey.startsWith('hasic');

    const systemPrompt = buildBridgeSystemPrompt({ body, text, personaKey, persona, isHasicPersona, source, memberId, context });

    // Cloud opt-in (rovnaká politika ako /ask)
    const cloudOptIn = body.policy?.cloud === 'opt-in' && !isHasicPersona;
    const chosenModel = body.model ||
        (body.persona === 'hasic-alarm' || body.persona === 'hasic-dispatcher'
            ? FAST_MODEL
            : DEFAULT_MODEL);

    res.writeHead(200, SSE_HEADERS);

    const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    let fullText = '';
    const onDelta = (delta) => {
        fullText += delta;
        send({ delta });
    };

    let result;
    if (cloudOptIn) {
        try {
            result = await askGroqLLMStream(text, systemPrompt, {
                temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
                num_predict: 512,
                stop: [],
                policy: { allowCloud: true },
                actorType: 'automation',
                requestId: `${started}-${Math.random().toString(36).slice(2, 8)}`
            }, onDelta);
        } catch (err) {
            send({ error: String(err) });
            return res.end();
        }
    } else {
        result = await callOllamaStream({
            model: chosenModel,
            prompt: text,
            system: systemPrompt,
            temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
            num_predict: 512,
            stop: []
        }, onDelta);
    }

    if (!result?.ok) {
        send({ done: true, ok: false, error: result?.error || 'unknown' });
        return res.end();
    }

    const outText = result.text || '';
    const nauciPos = outText.search(/#NAUČIŤ:/i);
    const uncertain = nauciPos !== -1 && nauciPos < 40;

    // POST-PROCESSING (fire-and-forget, rovnaký ako /ask)
    let memoryWritten = false;
    if (isHasicPersona) {
        if (memberId) {
            try {
                recordMemberInteraction(memberId, guessTopicFromContext(context));
            } catch (e) {
                console.warn('[SP4_BRIDGE] recordMemberInteraction err:', e?.message);
            }
        }
        if (!uncertain && shouldDistillConversation(text, outText, context, source || 'bridge-ask')) {
            distillAsync({
                question: text,
                answer: outText,
                memberNames: [],
                source: source || 'bridge-ask'
            });
            memoryWritten = true;
        }
    }
    if (source === 'sp4-chat-ui') {
        logChatSession({
            timestamp: new Date().toISOString(),
            source,
            persona: personaKey,
            userMsg: text,
            aiReply: outText,
            engine: cloudOptIn ? 'cloud-only' : 'ollama',
            crisisDetected: false
        });
    }

    send({
        done: true,
        ok: true,
        engine: cloudOptIn ? 'cloud-only' : 'ollama',
        text: outText,
        persona: personaKey,
        personaLabel: persona.label,
        latencyMs: Date.now() - started,
        llmDurationMs: result.durationMs || null,
        uncertain,
        memoryWritten,
        memberId,
        source,
        contract: CONTRACT_VERSION,
        autoSelected
    });
    res.end();
});

// ─────────────────────────────────────────────────────────────
// POST /api/bridge/ask
// Body: { text, memberId?, persona?, context?, source?, policy?, model?, temperature? }
// Vracia kontrakt-compliant odpoveď.
// ─────────────────────────────────────────────────────────────
app.post('/api/bridge/ask', inferenceRateLimit, async (req, res) => {
    const started = Date.now();
    const body = req.body || {};
    const text = String(body.text || '').trim();

    if (!text) {
        return res.status(400).json({
            ok: false,
            engine: 'none',
            text: 'Chýba pole "text".',
            error: 'missing_text'
        });
    }

    let memberId = null;
    if (body.memberId !== undefined && body.memberId !== null && body.memberId !== '') {
        try {
            memberId = validateMemberId(body.memberId);
        } catch (error) {
            if (error?.code === 'INVALID_MEMBER_ID') {
                return invalidMemberIdResponse(res);
            }
            throw error;
        }
    }

    // Crisis/self-harm safety rail — deterministický, beží PRED resolvePersona
    // a PRED akýmkoľvek LLM volaním. Pokrýva všetky persony jedným checkom.
    const crisis = detectCrisis(text);
    if (crisis) {
        const safePersona = resolvePersona(crisis.safeMode);
        // Session log — crisis: userMsg sa nezaznamenáva (bezpečnosť)
        logChatSession({
            timestamp: new Date().toISOString(),
            source: body.source || 'unknown',
            persona: crisis.safeMode,
            userMsg: null,
            aiReply: null,
            engine: 'sp4-safety-rail',
            crisisDetected: true,
            crisisType: crisis.type
        });

        return res.json({
            ok: true,
            engine: 'sp4-safety-rail',
            text: getSafeResponse(crisis),
            persona: crisis.safeMode,
            personaLabel: safePersona.label,
            latencyMs: Date.now() - started,
            llmDurationMs: 0,
            uncertain: false,
            learnHint: null,
            memoryWritten: false,
            memberId,
            source: body.source || 'unknown',
            contract: CONTRACT_VERSION,
            crisisType: crisis.type,
            autoSelected: false
        });
    }

    const context = body.context && typeof body.context === 'object' ? body.context : null;
    const source = body.source || 'unknown';

    // AUTO persona selector — ak persona chýba alebo je 'auto', klasifikuj prompt
    // keyword matchingom (classifyPrompt); inak zachovaj manuálny výber.
    let personaKey;
    let autoSelected;
    if (!body.persona || body.persona === 'auto') {
        personaKey = classifyPrompt(text);
        autoSelected = true;
    } else {
        personaKey = body.persona.toLowerCase();
        autoSelected = false;
    }
    const persona = resolvePersona(personaKey);
    const isHasicPersona = personaKey.startsWith('hasic');

    // Kontextový blok (členovský profil, fakty) — voliteľné, nikdy nehaluciuje
    const contextBlock = formatDhzContext(context);

    // Organizmická pamäť — relevantné insighty + tipy + glossary
    // Pri operatívnych otázkach ju zámerne nepúšťame do promptu: nie je to
    // kurátorovaná bezpečnostná autorita a nemá prepisovať hasičský postup.
    let collectiveBlock = '';
    let kbBlock = '';
    let memberBlock = '';
    if (isHasicPersona) {
        try {
            if (shouldUseCollectiveMemory(text, context)) {
                const cs = collectiveSummaryForPrompt(text, 4, 3);
                if (cs) collectiveBlock = `\n\n[PAMÄŤ ORGANIZÁCIE]\n${cs}\n[KONIEC PAMÄTE]`;
            }
        } catch (e) {
            console.warn('[SP4_BRIDGE] collective summary err:', e?.message);
        }
        try {
            const kb = kbSummaryForPrompt(text);
            if (kb) kbBlock = `\n\n[KB ZBORU]\n${kb}\n[KONIEC KB]`;
        } catch (e) {
            console.warn('[SP4_BRIDGE] kb summary err:', e?.message);
        }
        if (memberId) {
            try {
                const ms = memberSummaryForPrompt(memberId);
                if (ms) memberBlock = `\n\n[O TEBE]\n${ms}\n[KONIEC O TEBE]`;
            } catch (e) {
                console.warn('[SP4_BRIDGE] member summary err:', e?.message);
            }
        }
    }

    // Self-awareness manifest — len pre hasic persony (core/popici majú svoju logiku)
    const manifestBlock = isHasicPersona ? '\n\n' + buildMemoryManifestPrompt() : '';
    const historyBlock = isHasicPersona ? formatConversationHistory(body.history) : '';

    // SP4 znalostná báza — pre VŠETKY persony (oddelené od isHasicPersona gatingu,
    // ktorý ostáva len pre DHZ operatívu: kbBlock, collectiveBlock).
    let kbSP4Block = '';
    try {
        const sp4Facts = getRelevantKb(text, personaKey, 5);
        if (sp4Facts.length > 0) {
            kbSP4Block = '\n\n## SP4 znalostná báza\n'
                + sp4Facts.map((f) => `**${f.term}**: ${f.text}`).join('\n');
        }
    } catch (e) {
        console.warn('[SP4_BRIDGE] kb-provider err:', e?.message);
    }

    // Ak persona prišla z registry, použij jej plnú definíciu (fullDefinition),
    // inak inline systemPrompt. Fallback na prázdny string, aby skladanie nepadlo.
    const personaBase = persona.fullDefinition || persona.systemPrompt || '';
    const identityBlock = buildIdentityBlock(source);
    const sessionHistoryBlock = buildSessionHistoryBlock(source);
    const glitchModeBlock = (personaKey === 'glitchoslav') ? buildGlitchDualModeBlock(text) : '';
    const groundingFactsBlock = [
        SP4_RUNTIME_ROOT_FACT,
        SP4_MODEL_ROUTING_FACT,
        SP4_TRUTH_VS_OPINION_FACT,
        SP4_INSUFFICIENT_INFORMATION_FACT,
        SP4_NON_ANSWER_POLICY_FACT
    ].join('\n');
    let popiciSoftenBlock = '';
    if (personaKey === 'popici' && checkPopiciSafety(text)?.soften === true) {
        popiciSoftenBlock =
            '\n\n⚠️ KONTEXT POUŽÍVATEĽA: Používateľ o sebe práve hovorí zhadzujúco ' +
            '(napr. "som neschopný", "som k ničomu", "nič mi nejde"). ' +
            'NIKDY s tým nesúhlas a nepridávaj sa. Zakázané: hodnotiť ho ' +
            '("si slabý", "si na tom zle"), odpisovať ho ("nechaj to na iných", ' +
            '"neviem čo by si ešte dokázal", "nechápem prečo sa snažíš"), ' +
            'alebo to odbyť ("nechaj to tak, je to tak"). ' +
            'Namiesto toho: uznaj že to je ťažké, JASNE odmietni jeho sebaodpis, ' +
            'a spýtaj sa na konkrétny problém. Drsnosť smeruj na situáciu, nikdy na neho.';
        console.log('[POPICI_SOFTEN] self-deprecation detected, directive injected');
    }
    const systemPrompt = personaBase +
        identityBlock +
        '\n\n' + buildGroundingBlock() +
        '\n\n## SP4 kanonické fakty o pravde a routingu\n' +
        groundingFactsBlock +
        sessionHistoryBlock +
        glitchModeBlock +
        kbSP4Block +
        manifestBlock +
        kbBlock +
        collectiveBlock +
        memberBlock +
        historyBlock +
        contextBlock +
        popiciSoftenBlock;

    const deterministicSystemInfo = getDeterministicSystemInfoResponse(text) || getDeterministicPublicContextResponse(text);
    if (deterministicSystemInfo) {
        if (memberId) {
            try {
                const topicGuess = guessTopicFromContext(context);
                recordMemberInteraction(memberId, topicGuess);
            } catch (e) {
                console.warn('[SP4_BRIDGE] recordMemberInteraction err:', e?.message);
            }
        }

        return res.json({
            ok: true,
            engine: 'sp4-deterministic',
            text: deterministicSystemInfo,
            persona: personaKey,
            personaLabel: persona.label,
            latencyMs: Date.now() - started,
            llmDurationMs: 0,
            uncertain: false,
            learnHint: null,
            memoryWritten: false,
            memberId,
            source,
            contract: CONTRACT_VERSION,
            autoSelected
        });
    }

    const deterministicAnswer = isHasicPersona
        ? (deterministicDhzFactAnswer(text, context, body.history) || deterministicDhzOperationalAnswer(text) || deterministicDhzMemberAnswer(text) || deterministicDhzVisionAnswer(text) || deterministicDhzSystemAnswer(text))
        : null;
    if (deterministicAnswer) {
        if (memberId) {
            try {
                const topicGuess = guessTopicFromContext(context);
                recordMemberInteraction(memberId, topicGuess);
            } catch (e) {
                console.warn('[SP4_BRIDGE] recordMemberInteraction err:', e?.message);
            }
        }

        return res.json({
            ok: true,
            engine: 'sp4-deterministic',
            text: deterministicAnswer,
            persona: personaKey,
            personaLabel: persona.label,
            latencyMs: Date.now() - started,
            llmDurationMs: 0,
            uncertain: false,
            learnHint: null,
            memoryWritten: false,
            memberId,
            source,
            contract: CONTRACT_VERSION,
            autoSelected
        });
    }

    try {
        // Model: explicitný z requestu, alebo fast model pre alarm/dispatcher, inak default
        const chosenModel =
            body.model ||
            (body.persona === 'hasic-alarm' || body.persona === 'hasic-dispatcher'
                ? FAST_MODEL
                : DEFAULT_MODEL);

        // Cloud opt-in (kontrakt v1.2): body.policy.cloud === 'opt-in' → turbo cez Groq.
        // DHZ persony (hasic*) sú NAVŽDY local-only — dáta zboru neopúšťajú stroj.
        // hasic check na personaKey (lowercase) — rovnaký test ako /ask/stream.
        const cloudOptIn = body.policy?.cloud === 'opt-in' && !isHasicPersona;
        const llmOptions = {
            preference: cloudOptIn ? 'cloud-only' : 'local-only', // ENFORCEMENT: default žiadny cloud (kontrakt v1.1)
            model: chosenModel,
            prompt: text,
            system: systemPrompt,
            temperature: typeof body.temperature === 'number' ? body.temperature : 0.2,
            num_predict: 512,
            stop: [],
            ...(cloudOptIn ? { policy: { allowCloud: true } } : {})
        };
        let result = await sp4LlmCall(llmOptions);

        if (!result || !result.ok) {
            return res.status(503).json({
                ok: false,
                engine: 'none',
                text: '⚠️ SP4 dočasne nedostupný (lokálny model neodpovedá). Skús neskôr.',
                persona: body.persona || 'hasic',
                personaLabel: persona.label,
                latencyMs: Date.now() - started,
                uncertain: true,
                learnHint: null,
                memoryWritten: false,
                error: result?.localError || 'llm_unavailable',
                source
            });
        }

        if (personaKey === 'popici') {
            if (isPopiciDirectedInsult(result.text)) {
                console.warn('[POPICI_INSULT] directed insult detected, retrying once');
                const retrySystemPrompt = systemPrompt +
                    '\n\nTVOJA PREDCHÁDZAJÚCA ODPOVEĎ HODNOTILA ALEBO URÁŽALA POUŽÍVATEĽA PRIAMO ' +
                    '(napr. "si zlý", "si neschopný"). To je zakázané. Odpovedz znova — ' +
                    'nadávky smeruj len na situáciu, systém alebo na seba, NIKDY nehodnoť ' +
                    'ani neurážaj človeka, ktorý sa s tebou rozpráva.';
                const retryResult = await sp4LlmCall({
                    ...llmOptions,
                    system: retrySystemPrompt
                });

                if (retryResult?.ok && !isPopiciDirectedInsult(retryResult.text)) {
                    result = retryResult;
                } else {
                    if (retryResult?.ok) {
                        console.warn('[POPICI_INSULT] retry still insulting, using safe fallback');
                    } else {
                        console.warn('[POPICI_INSULT] retry transport failed, using safe fallback');
                    }
                    result = {
                        ...(retryResult?.ok ? retryResult : result),
                        text: pickRandom(POPICI_SAFE_FALLBACKS, 1)[0]
                    };
                }
            }

            if (isPopiciEcho(result.text, systemPrompt)) {
                console.warn('[POPICI_ECHO] detected, retrying once');
                const retrySystemPrompt = systemPrompt +
                    '\n\nTVOJA PREDCHÁDZAJÚCA ODPOVEĎ SKOPÍROVALA TENTO PROMPT. ' +
                    'Odpovedz teraz úplne vlastnými slovami, v prvej osobe, bez opakovania viet vyššie.';
                const retryResult = await sp4LlmCall({
                    ...llmOptions,
                    system: retrySystemPrompt
                });

                if (retryResult?.ok) {
                    result = retryResult;
                    if (isPopiciEcho(result.text, retrySystemPrompt)) {
                        console.warn('[POPICI_ECHO] retry still contains prompt echo, returning retry response');
                    }
                } else {
                    console.warn('[POPICI_ECHO] retry failed, returning original response');
                }
            }

            if (isPopiciDirectedInsult(result.text)) {
                console.warn('[POPICI_INSULT] post-echo response still insulting, using safe fallback');
                result = {
                    ...result,
                    text: pickRandom(POPICI_SAFE_FALLBACKS, 1)[0]
                };
            }
        }

        const latencyMs = Date.now() - started;
        const outText = cleanMisusedLearnMarker(result.text, text);
        // Heuristika pre #NAUČIŤ marker:
        // uncertain=true len ak marker je na ZAČIATKU (prvých 40 znakov textu)
        // Ak model odpovedal a len doplnil poznámku na konci → nie uncertain
        const learnHint = /#NAUČIŤ:/i.test(outText)
            ? outText.match(/#NAUČIŤ:\s*([^\n]+)/i)?.[1]?.trim() || null
            : null;
        const nauciPos = outText.search(/#NAUČIŤ:/i);
        const uncertain = nauciPos !== -1 && nauciPos < 40;

        // POST-PROCESSING — fire-and-forget, neblokuje odpoveď
        let memoryWritten = false;
        if (isHasicPersona) {
            // Zaznamenaj interakciu (stats) — ak máme memberId
            if (memberId) {
                try {
                    const topicGuess = guessTopicFromContext(context);
                    recordMemberInteraction(memberId, topicGuess);
                } catch (e) {
                    console.warn('[SP4_BRIDGE] recordMemberInteraction err:', e?.message);
                }
            }

            // Destilácia do organizmickej pamäte — len ak odpoveď nie je neistá
            if (!uncertain && shouldDistillConversation(text, outText, context, source || 'bridge-ask')) {
                distillAsync({
                    question: text,
                    answer: outText,
                    memberNames: [],
                    source: source || 'bridge-ask'
                });
                memoryWritten = true; // asynchronne; pre klienta informácia že sa o to stará
            }
        }

        // Session log — len pre sp4-chat-ui (nie DHZ portál ani iné zdroje)
        if (source === 'sp4-chat-ui') {
            logChatSession({
                timestamp: new Date().toISOString(),
                source,
                persona: personaKey,
                userMsg: text,
                aiReply: outText,
                engine: result.engine || 'ollama',
                crisisDetected: false
            });
        }

        res.json({
            ok: true,
            engine: result.engine || 'ollama',
            text: outText,
            persona: personaKey,
            personaLabel: persona.label,
            latencyMs,
            llmDurationMs: result.durationMs || null,
            uncertain,
            learnHint,
            memoryWritten,
            memberId,
            source,
            contract: CONTRACT_VERSION,
            autoSelected
        });
    } catch (err) {
        console.error('[SP4_BRIDGE] ask error:', err);
        res.status(500).json({
            ok: false,
            engine: 'none',
            text: '⚠️ Chyba SP4 bridge: ' + (err?.message || 'unknown'),
            persona: body.persona || 'hasic',
            personaLabel: persona.label,
            latencyMs: Date.now() - started,
            uncertain: true,
            learnHint: null,
            memoryWritten: false,
            error: err?.message || 'internal_error'
        });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/member/purge  (GDPR — reálne mazanie v1.1)
// Body: { memberId }
// ─────────────────────────────────────────────────────────────
app.post('/api/member/purge', purgeRateLimit, (req, res) => {
    if (req.body?.memberId === undefined || req.body?.memberId === null || req.body?.memberId === '') {
        return res.status(400).json({ ok: false, error: 'missing_memberId' });
    }
    try {
        const memberId = validateMemberId(req.body.memberId);
        const result = purgeMemberMemory(memberId);
        console.log(`[SP4_BRIDGE] purge member=${memberId} deletedFile=${result.deletedFile}`);
        res.json({
            ok: true,
            memberId,
            deletedEntries: result.deletedFile ? 1 : 0,
            note: result.deletedFile
                ? 'per-member súbor zmazaný; collective-memory je anonymné ex-ante, netreba čistiť'
                : 'per-member súbor neexistoval'
        });
    } catch (err) {
        if (err?.code === 'INVALID_MEMBER_ID') {
            return invalidMemberIdResponse(res);
        }
        console.error('[SP4_BRIDGE] purge error:', err);
        res.status(500).json({ ok: false, error: err?.message || 'purge_failed' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/member/:id/memory  — admin/debug pohľad na per-člen súbor
// ─────────────────────────────────────────────────────────────
app.get('/api/member/:id/memory', (req, res) => {
    const id = String(req.params.id);
    try {
        const rec = readMemberMin(id);
        res.json({ ok: true, memberId: id, memory: rec });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message || 'read_failed' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/member/:id/consent  — úprava consent toggle
// Body: { collectiveContribution?: bool, personalNotes?: bool }
// ─────────────────────────────────────────────────────────────
app.put('/api/member/:id/consent', writeRateLimit, (req, res) => {
    const id = String(req.params.id);
    const patch = {};
    if (typeof req.body?.collectiveContribution === 'boolean') {
        patch.collectiveContribution = req.body.collectiveContribution;
    }
    if (typeof req.body?.personalNotes === 'boolean') {
        patch.personalNotes = req.body.personalNotes;
    }
    if (Object.keys(patch).length === 0) {
        return res.status(400).json({ ok: false, error: 'no_valid_fields' });
    }
    try {
        const rec = setMemberConsent(id, patch);
        res.json({ ok: true, memberId: id, consent: rec.consent });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message || 'update_failed' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/member/:id/note  — explicitná osobná nota (vyžaduje consent)
// Body: { text, reason? }
// ─────────────────────────────────────────────────────────────
app.post('/api/member/:id/note', writeRateLimit, (req, res) => {
    const id = String(req.params.id);
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ ok: false, error: 'missing_text' });
    try {
        const result = appendPersonalNote(id, { text, reason: req.body?.reason });
        if (!result.ok) return res.status(403).json({ ok: false, error: result.reason });
        res.json({ ok: true, memberId: id, count: result.count });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message || 'note_failed' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/collective/insights?limit=50
// GET /api/collective/tips?limit=50
// GET /api/collective/stories?limit=50
// ─────────────────────────────────────────────────────────────
app.get('/api/collective/insights', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    try {
        res.json({ ok: true, items: listAllInsights(limit) });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message });
    }
});

app.get('/api/collective/tips', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    try {
        res.json({ ok: true, items: listAllTips(limit) });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message });
    }
});

app.get('/api/collective/stories', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    try {
        res.json({ ok: true, items: listAllStories(limit) });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/collective/search?q=...
// ─────────────────────────────────────────────────────────────
app.get('/api/collective/search', (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ ok: false, error: 'missing_q' });
    try {
        const found = searchCollective(q, Math.min(Number(req.query.limit) || 10, 50));
        res.json({ ok: true, query: q, ...found });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/collective/tip  — explicitné prispenie tipu (od admina/kefyka)
// Body: { topic, text, author? }
// ─────────────────────────────────────────────────────────────
app.post('/api/collective/tip', writeRateLimit, (req, res) => {
    const topic = String(req.body?.topic || '').trim();
    const text = String(req.body?.text || '').trim();
    if (!topic || !text) {
        return res.status(400).json({ ok: false, error: 'missing_topic_or_text' });
    }
    try {
        const rec = appendTip({
            topic,
            text,
            author: req.body?.author || 'explicit',
            origin: 'admin',
            verification: 'unverified'
        });
        res.json({ ok: true, tip: rec });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/collective/meta  — štatistiky organizmickej pamäte
// ─────────────────────────────────────────────────────────────
app.get('/api/collective/meta', (_req, res) => {
    try {
        res.json({ ok: true, meta: readMeta() });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/glossary  +  POST /api/glossary  (term, definition)
// ─────────────────────────────────────────────────────────────
app.get('/api/glossary', (_req, res) => {
    try {
        res.json({ ok: true, glossary: readGlossary() });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message });
    }
});

app.post('/api/glossary', writeRateLimit, (req, res) => {
    const term = String(req.body?.term || '').trim();
    const def = String(req.body?.definition || '').trim();
    if (!term || !def) return res.status(400).json({ ok: false, error: 'missing_term_or_definition' });
    try {
        const g = addGlossaryTerm(term, def);
        res.json({ ok: true, glossary: g });
    } catch (err) {
        res.status(500).json({ ok: false, error: err?.message });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/data-policy  — machine-readable popis pamäťového kontraktu
// ─────────────────────────────────────────────────────────────
app.get('/api/data-policy', (_req, res) => {
    res.json({ ok: true, policy: getDataPolicy() });
});

// ─────────────────────────────────────────────────────────────
// Fallback + štart
// ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ ok: false, error: 'not_found', path: req.path });
});

app.listen(PORT, HOST, () => {
    console.log(`\n🌉 ${AGENT_NAME} (contract v${CONTRACT_VERSION}) beží na ${HOST}:${PORT}`);
    console.log(`   Policy: local-only (cloud zakázaný na úrovni bridge)`);
    console.log(`   Pamäť:  organizmická (collective-memory) + KB + member-min`);
    console.log(`   Health:     http://localhost:${PORT}/health`);
    console.log(`   Ask:        POST http://localhost:${PORT}/api/bridge/ask`);
    console.log(`   Purge:      POST http://localhost:${PORT}/api/member/purge`);
    console.log(`   Insights:   GET  http://localhost:${PORT}/api/collective/insights`);
    console.log(`   Search:     GET  http://localhost:${PORT}/api/collective/search?q=...`);
    console.log(`   Policy:     GET  http://localhost:${PORT}/api/data-policy\n`);
});
