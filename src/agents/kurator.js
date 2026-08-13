// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: kurator                    │
// │  Layer: Agents                             │
// │  Role: Kurátor v0 — navrhuje KB fakty z    │
// │        nepokrytých otázok (LEN číta/NAVRHUJE)│
// │  Mission: KURATOR_v0 — bez zápisu do indexu│
// │  API: run(options) + čisté funkcie         │
// └─────────────────────────────────────────────┘

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callOllama } from '../llm/ollamaClient.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LOG_PATH = process.env.SP4_UNANSWERED_LOG
    || path.resolve(__dirname, '../../logs/unanswered-questions.jsonl');
const PROPOSALS_DIR = process.env.SP4_KB_PROPOSALS_DIR
    || path.resolve(__dirname, '../../kb/proposals');

const MIN_QUESTIONS = 5;      // aspoň 5 nepokrytých otázok, inak no-op
const MAX_CLUSTERS = 5;       // max 5 návrhov na beh
const DEFAULT_WINDOW_H = 24;  // posledných 24 h

// Slová, ktoré nenesú tému (stopwords) — slovenčina + bežné
const STOPWORDS = new Set([
    'a', 'ako', 'aky', 'aka', 'ake', 'co', 'ze', 'je', 'to', 'ten', 'ta', 'te',
    'na', 'v', 'vo', 's', 'z', 'o', 'do', 'pre', 'po', 'i', 'aj', 'ale', 'alebo',
    'vsak', 'uz', 'este', 'kto', 'kde', 'kedy', 'preco', 'tak', 'mi', 'ma', 'moj',
    'svoj', 'ktory', 'ktora', 'ktore', 'nie', 'ano', 'nieco', 'niekto', 'len',
    'iba', 'teda', 'potom', 'teraz', 'vsetko', 'dnes', 'zajtra', 'vcera', 'mam',
    'mas', 'mame', 'mate', 'maju', 'aby', 'ked', 'kedze', 'bude', 'akoze', 'com',
]);

function normalize(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // odstrániť diakritiku
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function significantTokens(text) {
    return normalize(text).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

/**
 * Jednoväzbové zhlukovanie: otázky zdieľajúce aspoň 1 kľúčový token idú spolu.
 */
export function clusterQuestions(entries) {
    const clusters = [];
    for (const e of entries || []) {
        const toks = significantTokens(e.text);
        if (toks.length === 0) continue;
        let placed = false;
        for (const c of clusters) {
            if (c.keywords.some((k) => toks.includes(k))) {
                c.questions.push(e.text);
                for (const t of toks) if (!c.keywords.includes(t)) c.keywords.push(t);
                placed = true;
                break;
            }
        }
        if (!placed) clusters.push({ keywords: [...toks], questions: [e.text] });
    }
    return clusters;
}

/**
 * Ponechá len záznamy mladšie ako windowMs.
 */
export function filterRecent(entries, now = Date.now(), windowMs = DEFAULT_WINDOW_H * 3600 * 1000) {
    return (entries || []).filter((e) => {
        const t = Date.parse(e.ts);
        return !Number.isNaN(t) && (now - t) <= windowMs;
    });
}

/**
 * Prompt pre lokálny LLM — navrhni 1 fakt + aliasy.
 */
export function buildProposalPrompt(cluster) {
    const qs = (cluster.questions || []).map((q, i) => `${i + 1}. ${q}`).join('\n');
    return [
        'Si kurátor znalostnej bázy SP4 (lokálny, offline-first komunitný ekosystém).',
        'Nasledujúce otázky dnes bot NEVEDEL zodpovedať (žiadny zásah v KB):',
        '',
        qs,
        '',
        'Navrhni JEDEN stručný fakt (1-2 vety, spisovná slovenčina), ktorý by ich pokryl,',
        'a 2-4 aliasy (alternatívne formulácie otázky). Odpovedz presne v tomto formáte:',
        'FAKT: <fakt>',
        'ALIASY: <alias1>; <alias2>; <alias3>',
        '',
        'NEVYMÝŠĽAJ konkrétne dátumy, časy, mená ani čísla — ak ich nepoznáš, napíš:',
        'FAKT: NEVIEM — treba overiť z oficiálneho zdroja obce.',
    ].join('\n');
}

/**
 * Sformátuje LLM odpoveď do štruktúrovaného návrhu. Návrh je vždy status
 * 'proposed' — NIKDY sa tu nezapisuje do index.json (to robí človek).
 */
export function formatProposal(cluster, llmText) {
    const raw = String(llmText || '').trim();
    let fact = raw;
    let aliases = [];
    const factMatch = raw.match(/FAKT\s*:\s*([^\n]+)/i);
    if (factMatch) fact = factMatch[1].trim();
    const aliasMatch = raw.match(/ALIASY\s*:\s*([^\n]+)/i);
    if (aliasMatch) aliases = aliasMatch[1].split(';').map((a) => a.trim()).filter(Boolean);
    return {
        date: new Date().toISOString().slice(0, 10),
        status: 'proposed',
        keywords: cluster.keywords || [],
        questions: cluster.questions || [],
        proposedFact: fact,
        aliases,
        source: 'kurator-v0',
    };
}

/**
 * Celý beh Kurátora: číta log → filtruje → zhlukuje → LLM navrhne → zapíše
 * `kb/proposals/<date>.json`. NIKDY nepíše do index.json, NEPUSH-uje.
 */
export async function run(options = {}) {
    const logPath = options.logPath || LOG_PATH;
    const proposalsDir = options.proposalsDir || PROPOSALS_DIR;
    const sinceHours = options.sinceHours || DEFAULT_WINDOW_H;
    const maxClusters = options.maxClusters || MAX_CLUSTERS;

    let entries = [];
    try {
        const rawLog = fs.readFileSync(logPath, 'utf8').trim();
        entries = rawLog ? rawLog.split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    } catch {
        return { status: 'no-data', reason: 'log-unreadable', count: 0 };
    }

    entries = filterRecent(entries, Date.now(), sinceHours * 3600 * 1000);
    if (entries.length < MIN_QUESTIONS) {
        return { status: 'no-op', reason: 'too-few-questions', count: entries.length };
    }

    const clusters = clusterQuestions(entries).slice(0, maxClusters);
    const proposals = [];

    for (const c of clusters) {
        const prompt = buildProposalPrompt(c);
        let llmText = '';
        try {
            const res = await callOllama({
                model: options.model || 'qwen3:8b',
                prompt,
                temperature: 0.3,
                num_predict: 200,
                stop: [],
            });
            llmText = res?.text || '';
        } catch (_) {
            llmText = '';
        }
        proposals.push(formatProposal(c, llmText));
    }

    fs.mkdirSync(proposalsDir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(proposalsDir, `${date}.json`);
    fs.writeFileSync(file, JSON.stringify(proposals, null, 2), 'utf8');

    return { status: 'proposed', count: proposals.length, file };
}

export default run;
