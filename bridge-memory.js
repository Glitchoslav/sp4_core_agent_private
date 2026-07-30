// bridge-memory.js — SP4 Bridge pamäťová vrstva (kolektívny organizmus)
// Kontrakt: C:\SP4-Launcher\CONTRACT.md (v1.1 pamäťový kontrakt)
//
// Filozofia: Pamäť nie je vlastníctvo jednotlivca — je to živé poznanie organizácie.
// SP4 + DHZ rastú spoločne cez anonymizované insighty, kurátorovanú KB a minimálne
// per-člen stopy.
//
// VRSTVY (v tomto module):
//   1. collective-memory/  — anonymné insighty, tipy, vzory, glossary, stories
//   2. shared-kb/          — kurátorovaná KB (explicitné postupy, miestny kontext)
//   3. dhz-members/<id>.json — MINIMÁLNE per-člen (consent + stats + explicit notes)
//
// NEDOTÝKAME SA: memory.js, memoryHelpers.js, memoryLayers.js (osobná pamäť kefyka).
// Tento modul neimportuje žiadny z nich — absolútna izolácia.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─────────────────────────────────────────────────────────────
// Cesty
// ─────────────────────────────────────────────────────────────
const DATA_ROOT = process.env.SP4_BRIDGE_DATA_ROOT
    ? path.resolve(process.env.SP4_BRIDGE_DATA_ROOT)
    : path.join(__dirname, 'data');
const COLLECTIVE_DIR = path.join(DATA_ROOT, 'collective-memory');
const SHARED_KB_DIR = path.join(DATA_ROOT, 'shared-kb');
const MEMBERS_DIR = path.join(DATA_ROOT, 'dhz-members');

const COLLECTIVE_FILES = {
    insights: path.join(COLLECTIVE_DIR, 'insights.jsonl'),
    tips: path.join(COLLECTIVE_DIR, 'tips.jsonl'),
    stories: path.join(COLLECTIVE_DIR, 'stories.jsonl'),
    patterns: path.join(COLLECTIVE_DIR, 'patterns.json'),
    glossary: path.join(COLLECTIVE_DIR, 'glossary.json'),
    meta: path.join(COLLECTIVE_DIR, 'meta.json')
};

const SHARED_KB_FILES = {
    dhzKnowledge: path.join(SHARED_KB_DIR, 'dhz-knowledge.json'),
    sp4Philosophy: path.join(SHARED_KB_DIR, 'sp4-philosophy.json'),
    localContext: path.join(SHARED_KB_DIR, 'local-context.json')
};

// ─────────────────────────────────────────────────────────────
// Inicializácia — vytvorí adresáre a prázdne štruktúry pri prvom spustení
// ─────────────────────────────────────────────────────────────
function ensureDirs() {
    for (const dir of [COLLECTIVE_DIR, SHARED_KB_DIR, MEMBERS_DIR]) {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    // JSONL súbory (insights, tips, stories) stačí dotknúť
    for (const f of [COLLECTIVE_FILES.insights, COLLECTIVE_FILES.tips, COLLECTIVE_FILES.stories]) {
        if (!fs.existsSync(f)) fs.writeFileSync(f, '', 'utf8');
    }

    // JSON súbory s defaultnou štruktúrou
    if (!fs.existsSync(COLLECTIVE_FILES.patterns)) {
        fs.writeFileSync(COLLECTIVE_FILES.patterns, JSON.stringify({ topics: {}, schemaVersion: 1 }, null, 2));
    }
    if (!fs.existsSync(COLLECTIVE_FILES.glossary)) {
        fs.writeFileSync(COLLECTIVE_FILES.glossary, JSON.stringify({
            terms: {
                'DHZ': 'Dobrovoľný hasičský zbor',
                'DHZSP4': 'DHZ Spišský Štvrtok',
                'HaZZ': 'Hasičský a záchranný zbor (profesionálny)',
                'IZS': 'Integrovaný záchranný systém',
                'OR HaZZ': 'Okresné riaditeľstvo HaZZ',
                'SP4': 'Systém Plánovania 4 (lokálny AI operačný systém)',
                'Florián': 'Digitálny hasič — AI asistent DHZSP4'
            },
            schemaVersion: 1
        }, null, 2));
    }
    if (!fs.existsSync(COLLECTIVE_FILES.meta)) {
        fs.writeFileSync(COLLECTIVE_FILES.meta, JSON.stringify({
            schemaVersion: 1,
            createdAt: new Date().toISOString(),
            lastDistillationAt: null,
            stats: { insightsCount: 0, tipsCount: 0, storiesCount: 0 }
        }, null, 2));
    }

    // Shared KB — prázdne štruktúry
    if (!fs.existsSync(SHARED_KB_FILES.dhzKnowledge)) {
        fs.writeFileSync(SHARED_KB_FILES.dhzKnowledge, JSON.stringify({
            procedures: [],
            techniques: [],
            equipment: [],
            schemaVersion: 1
        }, null, 2));
    }
    if (!fs.existsSync(SHARED_KB_FILES.sp4Philosophy)) {
        fs.writeFileSync(SHARED_KB_FILES.sp4Philosophy, JSON.stringify({
            principles: [
                'local-first — lokálne modely sú prioritou',
                'offline-first — funkčnosť bez internetu',
                'safety-first — obsah a odpovede nesmú ublížiť',
                'organizmická pamäť — spoločný rast cez anonymné poznanie'
            ],
            schemaVersion: 1
        }, null, 2));
    }
    if (!fs.existsSync(SHARED_KB_FILES.localContext)) {
        fs.writeFileSync(SHARED_KB_FILES.localContext, JSON.stringify({
            obec: 'Spišský Štvrtok',
            okres: 'Levoča',
            kraj: 'Prešovský',
            specifika: [],
            schemaVersion: 1
        }, null, 2));
    }
}

// ─────────────────────────────────────────────────────────────
// Atomický zápis JSON (tmp + rename)
// ─────────────────────────────────────────────────────────────
function atomicWriteJson(filePath, obj) {
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
}

// Append do JSONL (atomický pre jeden riadok)
function appendJsonl(filePath, obj) {
    const line = JSON.stringify(obj) + '\n';
    fs.appendFileSync(filePath, line, 'utf8');
}

// Bezpečné čítanie JSONL — každý riadok parsnutý samostatne
function readJsonl(filePath, limit = Infinity) {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const lines = raw.split('\n').filter(l => l.trim());
    const out = [];
    for (const l of lines) {
        try {
            out.push(JSON.parse(l));
        } catch {
            /* poškodený riadok — ignoruj */
        }
        if (out.length >= limit) break;
    }
    return out;
}

function readJson(filePath, fallback = null) {
    if (!fs.existsSync(filePath)) return fallback;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return fallback;
    }
}

// ─────────────────────────────────────────────────────────────
// ANONYMIZÁCIA — regex scrub PII
// ─────────────────────────────────────────────────────────────
const PII_PATTERNS = [
    // Telefón SK (09xx, +421...)
    { re: /\b(?:\+?421|0)\s?\d{3}\s?\d{3}\s?\d{3}\b/g, replace: '[tel]' },
    // Email
    { re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi, replace: '[email]' },
    // Dátum narodenia / rodné číslo podobné (6 číslic / 10 číslic)
    { re: /\b\d{6}\/?\d{3,4}\b/g, replace: '[id]' },
    // Adresa s číslom domu — heuristika: slovo s veľkým písmenom + číslo
    // (ponechávame jemné, aby sa nemazali veci ako "120 m hadica")
];

/**
 * Aplikuje PII scrub na text.
 * @param {string} text
 * @param {string[]} extraNames — dodatočné mená z DHZ SQLite (pred zápisom)
 */
export function scrubPii(text, extraNames = []) {
    if (!text || typeof text !== 'string') return text;
    let out = text;
    for (const { re, replace } of PII_PATTERNS) {
        out = out.replace(re, replace);
    }
    // Mená členov — case-insensitive whole-word nahradenie
    for (const name of extraNames) {
        if (!name || name.length < 3) continue;
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escaped}\\b`, 'gi');
        out = out.replace(re, '[člen]');
    }
    return out;
}

// ─────────────────────────────────────────────────────────────
// VRSTVA 1 — COLLECTIVE MEMORY
// ─────────────────────────────────────────────────────────────

const VALID_ORIGINS = new Set(['ai-distilled', 'admin', 'human']);
const VALID_VERIFICATIONS = new Set(['unverified', 'verified', 'rejected']);

function normalizeOrigin(value) {
    return VALID_ORIGINS.has(value) ? value : 'ai-distilled';
}

function normalizeVerification(value) {
    return VALID_VERIFICATIONS.has(value) ? value : 'unverified';
}

function normalizeConfidence(value, defaultValue = 0.7) {
    if (!Number.isFinite(value)) return defaultValue;
    return Math.min(1, Math.max(0, value));
}

function normalizeSource(value) {
    const normalized = String(value ?? 'unknown').trim().slice(0, 256);
    return normalized || 'unknown';
}

/**
 * Pridá anonymizovaný insight do organizmickej pamäte.
 * @param {object} insight — { topic, text, confidence, source }
 * @returns {object} uložený záznam s id
 */
export function appendInsight(insight) {
    ensureDirs();
    const id = 'ins_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const record = {
        id,
        type: 'insight',
        topic: String(insight.topic || 'general').slice(0, 64),
        text: String(insight.text || '').slice(0, 2000),
        confidence: normalizeConfidence(insight.confidence),
        origin: normalizeOrigin(insight.origin),
        verification: normalizeVerification(insight.verification),
        source: normalizeSource(insight.source),
        createdAt: new Date().toISOString(),
        useCount: 0,
        lastUsedAt: null
    };
    appendJsonl(COLLECTIVE_FILES.insights, record);
    bumpMetaCounter('insightsCount');
    return record;
}

export function appendTip(tip) {
    ensureDirs();
    const id = 'tip_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const record = {
        id,
        type: 'tip',
        topic: String(tip.topic || 'general').slice(0, 64),
        text: String(tip.text || '').slice(0, 1000),
        confidence: normalizeConfidence(tip.confidence),
        origin: normalizeOrigin(tip.origin),
        verification: normalizeVerification(tip.verification),
        source: normalizeSource(tip.source),
        author: tip.author || 'anonymous',
        createdAt: new Date().toISOString()
    };
    appendJsonl(COLLECTIVE_FILES.tips, record);
    bumpMetaCounter('tipsCount');
    return record;
}

export function appendStory(story) {
    ensureDirs();
    const id = 'story_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const record = {
        id,
        topic: String(story.topic || 'general').slice(0, 64),
        text: String(story.text || '').slice(0, 4000),
        createdAt: new Date().toISOString()
    };
    appendJsonl(COLLECTIVE_FILES.stories, record);
    bumpMetaCounter('storiesCount');
    return record;
}

/**
 * Vyhľadá relevantné insighty/tipy pre danú otázku.
 * Jednoduchý keyword match — na začiatok stačí; neskôr sa dá pridať embedding.
 * @param {string} query
 * @param {number} limit
 * @returns {{insights: object[], tips: object[]}}
 */
function collectiveQueryTokens(query) {
    const q = String(query || '').toLowerCase();
    return q.split(/\s+/).filter(t => t.length >= 2);
}

function rankCollectiveRecords(records, tokens, limit) {
    if (tokens.length === 0) return [];
    const scoreRecord = (r) => {
        const hay = `${String(r?.text || '')} ${String(r?.topic || '')}`.toLowerCase();
        let s = 0;
        for (const t of tokens) if (hay.includes(t)) s++;
        return s;
    };

    return records
        .map(r => ({ r, s: scoreRecord(r) }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit)
        .map(x => x.r);
}
export function searchCollective(query, limit = 5) {
    ensureDirs();
    const tokens = collectiveQueryTokens(query);
    if (tokens.length === 0) return { insights: [], tips: [] };


    const allInsights = readJsonl(COLLECTIVE_FILES.insights);
    const allTips = readJsonl(COLLECTIVE_FILES.tips);

    const insights = rankCollectiveRecords(allInsights, tokens, limit);
    const tips = rankCollectiveRecords(allTips, tokens, limit);

    return { insights, tips };
}

export function listAllInsights(limit = 200) {
    ensureDirs();
    return readJsonl(COLLECTIVE_FILES.insights, limit);
}

export function listAllTips(limit = 200) {
    ensureDirs();
    return readJsonl(COLLECTIVE_FILES.tips, limit);
}

export function listAllStories(limit = 100) {
    ensureDirs();
    return readJsonl(COLLECTIVE_FILES.stories, limit);
}

export function readGlossary() {
    ensureDirs();
    return readJson(COLLECTIVE_FILES.glossary, { terms: {} });
}

export function addGlossaryTerm(term, definition) {
    ensureDirs();
    const g = readJson(COLLECTIVE_FILES.glossary, { terms: {}, schemaVersion: 1 });
    g.terms[term] = definition;
    atomicWriteJson(COLLECTIVE_FILES.glossary, g);
    return g;
}

export function readPatterns() {
    ensureDirs();
    return readJson(COLLECTIVE_FILES.patterns, { topics: {} });
}

/**
 * Zaznamená že niekto sa pýtal na topic — slúži na detekciu vzorov.
 */
export function recordTopicHit(topic) {
    ensureDirs();
    const p = readJson(COLLECTIVE_FILES.patterns, { topics: {}, schemaVersion: 1 });
    const t = String(topic || 'general').slice(0, 64);
    if (!p.topics[t]) p.topics[t] = { count: 0, lastAt: null };
    p.topics[t].count++;
    p.topics[t].lastAt = new Date().toISOString();
    atomicWriteJson(COLLECTIVE_FILES.patterns, p);
    return p;
}

/**
 * Zhrnutie organizmickej pamäte pre vloženie do systemPromptu.
 * Vyberie top insights + tipy + relevantné glossary termíny pre danú query.
 */
export function collectiveSummaryForPrompt(query, maxInsights = 4, maxTips = 3) {
    ensureDirs();
    const tokens = collectiveQueryTokens(query);
    const isVerified = (record) => record?.verification === 'verified';
    const insights = rankCollectiveRecords(
        readJsonl(COLLECTIVE_FILES.insights).filter(isVerified),
        tokens,
        maxInsights
    );
    const tips = rankCollectiveRecords(
        readJsonl(COLLECTIVE_FILES.tips).filter(isVerified),
        tokens,
        maxTips
    );
    const glossary = readGlossary();

    // Relevantné glossary termíny (ktoré sa v query vyskytujú)
    const qLower = String(query || '').toLowerCase();
    const relevantTerms = [];
    for (const [term, def] of Object.entries(glossary.terms || {})) {
        if (qLower.includes(term.toLowerCase())) {
            relevantTerms.push(`${term} = ${def}`);
        }
    }

    const parts = [];
    if (insights.length > 0) {
        parts.push('Insighty zo zboru:');
        for (const i of insights) {
            parts.push(`  • ${i.text}`);
        }
    }
    if (tips.length > 0) {
        parts.push('Tipy zo zboru:');
        for (const t of tips) {
            parts.push(`  • ${t.text}`);
        }
    }
    if (relevantTerms.length > 0) {
        parts.push('Slovník:');
        for (const rt of relevantTerms) parts.push(`  • ${rt}`);
    }

    return parts.join('\n');
}

// ─────────────────────────────────────────────────────────────
// VRSTVA 2 — SHARED KB
// ─────────────────────────────────────────────────────────────

export function readSharedKb() {
    ensureDirs();
    return {
        dhzKnowledge: readJson(SHARED_KB_FILES.dhzKnowledge, {}),
        sp4Philosophy: readJson(SHARED_KB_FILES.sp4Philosophy, {}),
        localContext: readJson(SHARED_KB_FILES.localContext, {})
    };
}

export function appendToSharedKb(bucket, category, entry) {
    ensureDirs();
    const file = SHARED_KB_FILES[bucket];
    if (!file) throw new Error(`Unknown bucket: ${bucket}`);
    const doc = readJson(file, {});
    if (!Array.isArray(doc[category])) doc[category] = [];
    doc[category].push({
        ...entry,
        createdAt: new Date().toISOString()
    });
    atomicWriteJson(file, doc);
    return doc;
}

/**
 * KB zhrnutie pre systemPrompt — relevantné pre query + vždy zopár princípov.
 */
export function kbSummaryForPrompt(query) {
    ensureDirs();
    const kb = readSharedKb();
    const parts = [];

    // Vždy pridaj principy SP4 (sú krátke)
    const phi = kb.sp4Philosophy || {};
    if (Array.isArray(phi.principles) && phi.principles.length > 0) {
        parts.push('Princípy SP4:');
        for (const p of phi.principles.slice(0, 4)) parts.push(`  • ${p}`);
    }

    // DHZ knowledge — keyword filter
    const qLower = String(query || '').toLowerCase();
    const dk = kb.dhzKnowledge || {};
    for (const cat of ['procedures', 'techniques', 'equipment']) {
        const items = Array.isArray(dk[cat]) ? dk[cat] : [];
        const matched = items.filter(it => {
            const hay = JSON.stringify(it).toLowerCase();
            return qLower.split(/\s+/).some(tok => tok.length >= 4 && hay.includes(tok));
        }).slice(0, 3);
        if (matched.length > 0) {
            parts.push(`Oficiálne ${cat}:`);
            for (const m of matched) parts.push(`  • ${m.title || m.name || JSON.stringify(m).slice(0, 120)}`);
        }
    }

    return parts.join('\n');
}

// ─────────────────────────────────────────────────────────────
// VRSTVA 3 — MEMBER MINIMAL
// ─────────────────────────────────────────────────────────────

function memberFilePath(memberId) {
    return path.join(MEMBERS_DIR, `${String(memberId)}.json`);
}

function defaultMemberRecord(memberId) {
    return {
        memberId: String(memberId),
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        consent: {
            collectiveContribution: false, // explicit opt-in; nikdy nie súhlas udelený za člena
            personalNotes: false,          // opt-in pre osobné fakty
            askedAt: null,
            version: 1
        },
        stats: {
            conversations: 0,
            lastInteraction: null,
            favoriteTopics: {}
        },
        personalNotes: [] // naplnené LEN ak člen explicitne požiada
    };
}

export function readMemberMin(memberId) {
    ensureDirs();
    const file = memberFilePath(memberId);
    if (!fs.existsSync(file)) return defaultMemberRecord(memberId);
    return readJson(file, defaultMemberRecord(memberId));
}

export function recordMemberInteraction(memberId, topic = 'general') {
    if (!memberId) return null;
    ensureDirs();
    const rec = readMemberMin(memberId);
    rec.stats.conversations++;
    rec.stats.lastInteraction = new Date().toISOString();
    const t = String(topic).slice(0, 64);
    rec.stats.favoriteTopics[t] = (rec.stats.favoriteTopics[t] || 0) + 1;
    rec.updatedAt = new Date().toISOString();
    atomicWriteJson(memberFilePath(memberId), rec);
    return rec;
}

export function setMemberConsent(memberId, consentPatch) {
    ensureDirs();
    const rec = readMemberMin(memberId);
    rec.consent = { ...rec.consent, ...consentPatch, askedAt: new Date().toISOString() };
    rec.updatedAt = new Date().toISOString();
    atomicWriteJson(memberFilePath(memberId), rec);
    return rec;
}

export function appendPersonalNote(memberId, note) {
    ensureDirs();
    const rec = readMemberMin(memberId);
    if (!rec.consent.personalNotes) {
        return { ok: false, reason: 'no_consent_for_personal_notes' };
    }
    rec.personalNotes.push({
        text: String(note.text || '').slice(0, 1000),
        reason: note.reason || 'user_request',
        createdAt: new Date().toISOString()
    });
    rec.updatedAt = new Date().toISOString();
    atomicWriteJson(memberFilePath(memberId), rec);
    return { ok: true, count: rec.personalNotes.length };
}

/**
 * GDPR purge — zmaže per-member súbor.
 * Insighty z collective už neobsahujú jeho meno (ex-ante anonymizované).
 */
export function purgeMemberMemory(memberId) {
    ensureDirs();
    const file = memberFilePath(memberId);
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        return { ok: true, deletedFile: true, path: file };
    }
    return { ok: true, deletedFile: false };
}

/**
 * Zhrnutie per-člena pre systemPrompt — minimálne, len stats + personalNotes (ak sú).
 */
export function memberSummaryForPrompt(memberId) {
    if (!memberId) return '';
    const rec = readMemberMin(memberId);
    const parts = [];
    if (rec.stats.conversations > 0) {
        parts.push(`Štatistika: ${rec.stats.conversations} konverzácií, posledná ${rec.stats.lastInteraction || 'neznámy čas'}.`);
    }
    if (Array.isArray(rec.personalNotes) && rec.personalNotes.length > 0) {
        parts.push('Osobné poznámky (ktoré ma člen výslovne požiadal si zapamätať):');
        for (const n of rec.personalNotes.slice(-5)) parts.push(`  • ${n.text}`);
    }
    return parts.join('\n');
}

// ─────────────────────────────────────────────────────────────
// META
// ─────────────────────────────────────────────────────────────

function bumpMetaCounter(key) {
    const meta = readJson(COLLECTIVE_FILES.meta, {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        lastDistillationAt: null,
        stats: { insightsCount: 0, tipsCount: 0, storiesCount: 0 }
    });
    meta.stats[key] = (meta.stats[key] || 0) + 1;
    meta.lastDistillationAt = new Date().toISOString();
    atomicWriteJson(COLLECTIVE_FILES.meta, meta);
}

export function readMeta() {
    ensureDirs();
    return readJson(COLLECTIVE_FILES.meta, null);
}

// ─────────────────────────────────────────────────────────────
// DATA POLICY — machine-readable popis čo kde ukladáme
// ─────────────────────────────────────────────────────────────

export function getDataPolicy() {
    return {
        version: '1.1',
        updatedAt: '2026-04-23',
        philosophy:
            'Pamäť nie je vlastníctvo jednotlivca — je to živé poznanie organizácie. ' +
            'SP4 a DHZ rastú spoločne cez anonymizované insighty, kurátorovanú KB a minimálne per-člen stopy.',
        layers: [
            {
                id: 'dhz-sqlite-members',
                location: 'DHZ backend SQLite: members, member_categories, teams, member_teams',
                stores: 'Oficiálne profily členov (meno, kontakt, kategórie, tímy, funkcie)',
                authority: 'DHZ',
                accessibleTo: ['admin', 'bridge-read-only']
            },
            {
                id: 'dhz-sqlite-conversations',
                location: 'DHZ backend SQLite: ai_conversations (posledných 30 per člen)',
                stores: 'Konverzácie člena s Floriánom — rolling window',
                authority: 'DHZ',
                accessibleTo: ['admin', 'člen sám']
            },
            {
                id: 'dhz-sqlite-feedback',
                location: 'DHZ backend SQLite: ai_feedback',
                stores: '#NAUČIŤ záznamy + návrhy od členov',
                authority: 'DHZ',
                accessibleTo: ['admin']
            },
            {
                id: 'sp4-collective-memory',
                location: 'SP4 data/collective-memory/',
                stores: 'ANONYMIZOVANÉ insighty, tipy, vzory, stories, glossary',
                authority: 'SP4 bridge',
                accessibleTo: ['všetky persony hasic*', 'admin', 'kefyk cez CLI /zbor'],
                note: 'Ex-ante anonymné — nikdy neobsahuje mená, telefóny, adresy, emaily, rodné čísla'
            },
            {
                id: 'sp4-shared-kb',
                location: 'SP4 data/shared-kb/',
                stores: 'Kurátorovaná KB: oficiálne postupy, filozofia SP4, lokálny kontext',
                authority: 'admin + kefyk',
                accessibleTo: ['všetky persony hasic*', 'admin']
            },
            {
                id: 'sp4-dhz-members-min',
                location: 'SP4 data/dhz-members/<id>.json',
                stores: 'MINIMUM: consent, conversations count, topic stats, explicit personal notes (opt-in)',
                authority: 'SP4 bridge',
                accessibleTo: ['bridge', 'admin', 'daný člen'],
                note: 'Personal notes len s výslovným súhlasom člena.'
            },
            {
                id: 'sp4-kefyk-personal',
                location: 'SP4 data/memory.json, identity.json, epochs.json',
                stores: 'Osobná pamäť zakladateľa SP4 — mimo DHZ kontextu',
                authority: 'kefyk',
                accessibleTo: ['iba SP4 CLI / legacy server'],
                note: 'Bridge-server nemá prístup. Izolovaná vrstva.'
            }
        ],
        anonymization: {
            applied: 'Pred zápisom do collective-memory sa aplikuje PII scrub (regex + mená z DHZ SQLite)',
            patterns: ['telefón', 'email', 'rodné číslo', 'mená členov']
        },
        consent: {
            mode: 'AUTO + transparentnosť',
            rationale:
                'Destilácia je natoľko anonymná že samotný akt prispenia neidentifikuje osobu. ' +
                'Člen má v portáli prehľad čo zbor vie (read-only) a môže kedykoľvek vypnúť collectiveContribution.',
            optOutEndpoint: 'DHZ: PUT /api/members/:id/consent (plánované)'
        },
        retention: {
            insights: 'bez limitu (anonymné)',
            tips: 'bez limitu',
            stories: 'bez limitu',
            memberStats: '365 dní rolling',
            personalNotes: 'kým je člen v DHZ; pri DELETE sa maže'
        }
    };
}

// ─────────────────────────────────────────────────────────────
// SELF-AWARENESS PROMPT — vkladá sa do každého persona systemPromptu
// ─────────────────────────────────────────────────────────────

export function buildMemoryManifestPrompt() {
    return `
[TVOJA PAMÄŤ — VIEŠ O NEJ]
Máš prístup k:
1. ORGANIZMICKEJ PAMÄTI ZBORU (anonymné insighty, tipy, vzory, glossary) — čítaš ju pri každej otázke
2. KURÁTOROVANEJ KB (oficiálne postupy, princípy SP4, lokálny kontext) — zdroj pravdy
3. AKTUÁLNY KONTEXT ČLENA (meno + rola + tímy) — z DHZ SQLite, dodaný v [KONTEXT Z DHZ]

Nemáš prístup k:
• Osobnej pamäti kefyka (zakladateľ SP4) — tá je separátna a chránená
• Súkromným údajom členov (zdravie, rodina, financie) — tie sa neukladajú
• Konverzáciám iných členov — vidíš iba ich destilované anonymné insighty

Čo sa z nás dvoch zapíše:
• Automatický zápis z konverzácií je vypnutý.
• Do spoločnej pamäte ide len kurátorované, overené poznanie, ktoré explicitne zapíše administrátor.

Filozofia: Pamäť nie je vlastníctvo jednotlivca. Je to živé poznanie zboru. Každá dobrá odpoveď zvyšuje múdrosť organizácie — a tá sa vracia všetkým členom aj samotnému SP4.
`.trim();
}

// ─────────────────────────────────────────────────────────────
// Init on import
// ─────────────────────────────────────────────────────────────
ensureDirs();
