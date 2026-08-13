// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: classify                   │
// │  Layer: Core / Routing                     │
// │  Role: Deterministický klasifikátor náročnosti otázky │
// │  Mission: AI_ROUTING_v1 — max kvalita za min cenu   │
// │  API: classify(text, ctx)                  │
// └─────────────────────────────────────────────┘

/**
 * Deterministický scoring (0 €, 0 ms) — rozhoduje, ktorý engine/model
 * zodpovie otázku. Žiadne volanie LLM. Výstup:
 *   { engine: 'local'|'budget'|'quality', score, num_predict, model, reason }
 *
 * engine = 'local'  → lokálny Ollama (bez cloudu)
 * engine = 'budget' → LiteLLM budget (DeepSeek v3.2)
 * engine = 'quality'→ LiteLLM quality (DeepSeek Reasoner)
 */

const DEEP_RE = /(prečo|vysvetli\s+hlbšie|porovnaj|navrhni|analyzuj|aký\s+je\s+rozdiel|čo\s+ak|zmysel|etika|filozof|fyzikálne|hlbšie)/i;
const GREETING_RE = /^(ahoj|čau|čaute|dobrý|dobry|dobrý\s+deň|dobry\s+den|díky|dakujem|ďakujem|vďaka|hello|hi|ciao|servus|nazdar)\b/i;

/**
 * @param {string} text — vstupná otázka/správa
 * @param {object} [ctx] — kontext
 * @param {string} [ctx.persona] — aktívna persona (glitchoslav = koherencia)
 * @param {number} [ctx.kbHit] — skóre zásahu KB (Herbár/index.json) 0..1
 * @param {boolean} [ctx.hlbsie] — explicitný /hlbsie príkaz
 */
export function classify(text, ctx = {}) {
    const t = String(text || '').trim();
    const words = t.split(/\s+/).filter(Boolean).length;
    let score = 0;
    const reasons = [];

    // Hard override — explicitné /hlbsie = vždy quality (hlboké myslenie)
    if (ctx.hlbsie === true || /\/hlbsie\b/i.test(t)) {
        return { engine: 'quality', score: 10, num_predict: 700, model: undefined, reason: 'hlbsie-override' };
    }

    // Dĺžka — dlhšie = náročnejšie
    if (words > 40) { score += 4; reasons.push('dlhy-text'); }
    else if (words >= 20) { score += 2; reasons.push('stredny-text'); }

    // Hlboké kľúčové slová — najsilnejší signál (tu je lokálny 4b najslabší)
    if (DEEP_RE.test(t)) { score += 4; reasons.push('hlboke-klucove-slovo'); }

    // Viacero otázok naraz
    if ((t.match(/\?/g) || []).length >= 2) { score += 2; reasons.push('viac-otazok'); }

    // Persona glitchoslav vyžaduje štýl + koherenciu
    if (ctx.persona === 'glitchoslav') { score += 2; reasons.push('persona-glitchoslav'); }

    // KB zásah — ak máme priamu odpoveď, netreba cloud
    if (ctx.kbHit !== undefined && ctx.kbHit >= 0.85) { score -= 4; reasons.push('kb-hit'); }

    // Pozdrav/poďakovanie — triviálne
    if (words < 6 && GREETING_RE.test(t)) { score -= 3; reasons.push('pozdrav'); }

    if (score <= 0) {
        return { engine: 'local', score, num_predict: 150, model: 'gemma3:4b', reason: reasons.join(',') || 'trivial' };
    }
    if (score <= 3) {
        return { engine: 'local', score, num_predict: 250, model: 'qwen3:8b', reason: reasons.join(',') || 'bezny' };
    }
    if (score <= 7) {
        return { engine: 'budget', score, num_predict: 400, model: undefined, reason: reasons.join(',') || 'komplexny' };
    }
    return { engine: 'quality', score, num_predict: 700, model: undefined, reason: reasons.join(',') || 'hlboka-analyza' };
}

export default classify;
