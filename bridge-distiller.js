// bridge-distiller.js — Anonymizátor a destilátor konverzácií pre SP4 bridge
// Kontrakt: C:\SP4-Launcher\CONTRACT.md
//
// Úloha:
//   Po každej konverzácii člena s Floriánom sa asynchrónne zavolá destilátor.
//   Pozrie sa na (otázka + odpoveď), pokúsi sa extrahovať abstraktný insight/tip,
//   aplikuje PII scrub a zapíše do organizmickej pamäte (collective-memory).
//
// Beží fire-and-forget — nikdy neblokuje odpoveď členovi.
// Používa FAST_MODEL (llama3.2:3b) aby to bolo lacné.

import {
    appendInsight,
    appendTip,
    recordTopicHit,
    scrubPii
} from './bridge-memory.js';
import { FAST_PATH_MODEL } from './sp4os/llmLocal.js';
import { sp4LlmCall } from './src/llm/llmRouter.js';

const DISTILL_MODEL = FAST_PATH_MODEL || 'llama3.2:3b';

const DISTILLER_SYSTEM_PROMPT = `Si DESTILÁTOR SP4. Tvoja úloha: pozri konverzáciu (otázka člena DHZ + odpoveď asistenta) a rozhodni, či z nej vznikne UŽITOČNÉ POZNANIE pre celý zbor.

PRAVIDLÁ:
1. NIKDY nezachovaj mená, priezviská, dátumy, adresy, telefóny, emaily. Namiesto toho použi "jeden člen", "niektorý hasič", "nedávno".
2. Výstup musí byť ABSTRAKTNÝ — nie "Peter sa pýtal na X", ale "užitočné je vedieť X".
3. Ak konverzácia neobsahuje nič nové/užitočné, vráť {"skip": true}.
4. Typy poznania:
   - "insight" — pozorovanie, vzor, fakt ("pri mraze hadice popraskajú rýchlejšie")
   - "tip" — konkrétna rada ("hadicu pred mrazom treba poriadne vyprázdniť")
5. Topic = jedna stručná kategória (napr. "vybavenie", "komunikácia", "zásah", "tréning", "postup").
6. Confidence 0.0-1.0 — ako si si istý že je to skutočne užitočné.

VÝSTUP (striktný JSON, nič navyše):
{"skip": false, "type": "insight"|"tip", "topic": "...", "text": "...", "confidence": 0.0-1.0}
alebo
{"skip": true, "reason": "..."}`;

/**
 * Pokús sa parsnúť JSON z odpovede LLM (niekedy obalí do ```json).
 */
function parseDistillerOutput(raw) {
    if (!raw) return null;
    let t = String(raw).trim();

    // Odstráň ```json ... ``` obal
    const codeBlockMatch = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) t = codeBlockMatch[1].trim();

    // Nájdi prvú { a poslednú }
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first === -1 || last === -1 || last < first) return null;

    try {
        return JSON.parse(t.slice(first, last + 1));
    } catch {
        return null;
    }
}

/**
 * Hlavná destilácia — volaná fire-and-forget z bridge-server.js.
 * @param {object} params
 * @param {string} params.question — otázka člena
 * @param {string} params.answer — odpoveď Floriána
 * @param {string[]} params.memberNames — mená, ktoré treba scrubnúť (z DHZ kontextu)
 * @param {string} params.source — zdroj (napr. 'dhz-member-conversation')
 */
export async function distillConversation({ question, answer, memberNames = [], source = 'dhz-member-conversation' }) {
    try {
        if (!question || !answer) return { ok: false, reason: 'missing_input' };

        // Krok 1: pre-scrub vstupov (aby ani LLM nevidela mená)
        const safeQ = scrubPii(question, memberNames);
        const safeA = scrubPii(answer, memberNames);

        const prompt = `OTÁZKA ČLENA:\n${safeQ}\n\nODPOVEĎ ASISTENTA:\n${safeA}\n\nVyhodnoť a vráť JSON.`;

        const result = await sp4LlmCall({
            preference: 'local-only',
            model: DISTILL_MODEL,
            prompt,
            system: DISTILLER_SYSTEM_PROMPT,
            temperature: 0.2,
            num_predict: 256,
            stop: []
        });

        if (!result?.ok) {
            return { ok: false, reason: 'llm_unavailable', detail: result?.localError };
        }

        const parsed = parseDistillerOutput(result.text);
        if (!parsed) return { ok: false, reason: 'parse_failed', raw: String(result.text || '').slice(0, 200) };

        if (parsed.skip) {
            return { ok: true, skipped: true, reason: parsed.reason || 'no_insight' };
        }

        // Druhé kolo scrub — aj výstupu destilátora
        const finalText = scrubPii(parsed.text || '', memberNames);
        const topic = String(parsed.topic || 'general').toLowerCase().slice(0, 64);

        // Zaznamenaj topic hit pre pattern tracking
        recordTopicHit(topic);

        let record;
        if (parsed.type === 'tip') {
            record = appendTip({
                topic,
                text: finalText,
                author: 'anonymous-conversation',
                origin: 'ai-distilled',
                verification: 'unverified'
            });
            return { ok: true, type: 'tip', record };
        } else {
            record = appendInsight({
                topic,
                text: finalText,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.6,
                source,
                origin: 'ai-distilled',
                verification: 'unverified'
            });
            return { ok: true, type: 'insight', record };
        }
    } catch (err) {
        return { ok: false, reason: 'exception', error: err?.message || String(err) };
    }
}

/**
 * Wrapper — fire-and-forget, nelogguje do stdoutu ak nie je problem.
 */
export function distillAsync(params) {
    distillConversation(params)
        .then(r => {
            if (r.ok && !r.skipped) {
                console.log(`[DISTILLER] uložený ${r.type} id=${r.record?.id} topic=${r.record?.topic}`);
            } else if (!r.ok) {
                console.warn(`[DISTILLER] zlyhanie: ${r.reason}${r.detail ? ' — ' + r.detail : ''}`);
            }
            // skipped=true logovať netreba — je to normálny prípad
        })
        .catch(err => {
            console.error('[DISTILLER] exception:', err?.message || err);
        });
}
