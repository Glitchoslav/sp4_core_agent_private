// ┌─────────────────────────────────────────────┐
// │  SP4 OS MODULE: languageEnforcer           │
// │  Layer: Core / Language Control            │
// │  Role: Enforce Slovak output (retry logic) │
// │  Mission: LANGUAGE_ENFORCER_v1             │
// │  API: enforceSlovak(text, context)         │
// └─────────────────────────────────────────────┘

/**
 * 🔥 LANGUAGE ENFORCER v1.0 - MISSION: LANGUAGE_ENFORCER_v1
 * 
 * Enforces Slovak language output with:
 * - English detection (pattern matching)
 * - Auto-retry with stronger prompt
 * - Fallback to hardcoded Slovak response
 * - Epoch logging for failures
 * 
 * @module languageEnforcer
 */

import { sp4LlmCall } from '../llm/llmRouter.js';
import { recordEpoch } from './epochKeeper.js';
import { detectEnglish } from './languageUtils.js';
import { runtimeDebug, runtimeLog, runtimeWarn } from './runtimeLogging.js';

// 🔧 CONFIGURATION
const EN_WORD_THRESHOLD = 5; // Min EN words to trigger (lowered from 8)
const SK_DIACRITICS_THRESHOLD = 2; // Max SK diacritics in EN text
const TRANSLATOR_MODEL = 'llama3:8b';

// TODO [COPILOT]:
// Upraviť buildLanguageEnforcerPrompt takto:
// 1) Funkcia už má parameter `mode` ('full_translate' | 'mixed_edit' | 'sk_edit') a `toneHint`.
// 2) Pre každú hodnotu `mode` doplň špecifické extraRules:
//
//   - full_translate:
//     - Text je prevažne po anglicky.
//     - Prelož celý text do plynulej slovenčiny.
//     - Zachovaj význam, môžeš jemne skrátiť alebo zjednodušiť.
//     - Výsledok musí byť celý po slovensky, bez anglických viet a slov (okrem značiek ako SP4).
//     - Nepíš vysvetlenia, žiadne meta vety, len čistú odpoveď.
//
//   - mixed_edit:
//     - Text je mix slovenčiny a angličtiny.
//     - Anglické časti prelož do slovenčiny.
//     - Slovenské časti len jemne oprav (pravopis, mäkčene, štýl).
//     - NEOPAKUJ otázku používateľa a nepridávaj ju do odpovede.
//     - Odstráň meta frázy ako "Final answer:", "As an agent", "Preložené", "Ako editor".
//     - Vráť jednu súvislú odpoveď v slovenčine.
//
//   - sk_edit:
//     - Text je už po slovensky.
//     - Urob len minimálne úpravy (pravopis, mäkčene, čiarky).
//     - Nemeň význam, nepridávaj nové vety ani metafory.
//     - Bez angličtiny navyše.
//
// 3) Podľa hodnoty `toneHint` doplň dodatočné inštrukcie:
//
//   - toneHint === 'poem':
//     - Odpoveď je báseň.
//     - Zachovaj poetický tón, ale prelož/verše prepíš tak, aby zneli prirodzene po slovensky.
//     - Ak doslovný preklad znie divne, prepíš báseň do novej slovenskej podoby s rovnakým významom.
//     - Nepoužívaj divné slová ani rozbitú gramatiku.
//
//   - toneHint === 'emotional':
//     - Odpoveď je o pocitoch a podpore.
//     - Zachovaj empatický tón a tykanie, ak už je tam.
//     - Nepridávaj náhodné, nezmyselné metafory.
//     - Odpoveď má pôsobiť prirodzene a úprimne.
//
// 4) Na konci promtu nech stále platí:
//    - "Vráť iba finálnu odpoveď v slovenčine, bez komentárov, bez vysvetľovania procesu."

function buildLanguageEnforcerPrompt({ userText, originalAnswer, toneHint, mode }) {
    const baseRules = `
- NEvysvetľuj, čo robíš, ani nepopisuj proces prekladu.
- NEpíš frázy ako "Final answer", "Here is", "Here's my answer", "Tu je tvoja odpoveď".
- NEspomínaj sa ako editor, prekladateľ, AI, model, asistent.
- NEpíš o sebe v prvej osobe ("som tu na to, aby som...").
- Odpoveď píš priamo k používateľovi, v druhej osobe, prirodzene, bez formálnych fráz.
- Výstup musí byť čistý text v slovenčine, bez meta komentárov.
`;

    let extraRules = '';

    if (mode === 'full_translate') {
        extraRules = `
Text je prevažne po anglicky.
Prelož celý text do plynulej slovenčiny.
Zachovaj význam, môžeš jemne skrátiť alebo zjednodušiť.
Výsledok musí byť celý po slovensky, bez anglických viet a slov (okrem značiek ako SP4).
Nepíš vysvetlenia, žiadne meta vety, len čistú odpoveď.
${baseRules}
`;
    } else if (mode === 'mixed_edit') {
        extraRules = `
Text je mix slovenčiny a angličtiny.
Anglické časti prelož do slovenčiny.
Slovenské časti len jemne oprav (pravopis, mäkčene, štýl).
NEOPAKUJ otázku používateľa a nepridávaj ju do odpovede.
Odstráň meta frázy ako "Final answer:", "As an agent", "Preložené", "Ako editor".
Vráť jednu súvislú odpoveď v slovenčine.
${baseRules}
`;
    } else {
        extraRules = `
Text je už po slovensky.
Urob len minimálne úpravy (pravopis, mäkčene, čiarky).
Nemeň význam, nepridávaj nové vety ani metafory.
Bez angličtiny navyše.
${baseRules}
`;
    }

    const toneLine = toneHint ? `\n${toneHint}\n` : '';

    const prompt = `
Si slovenský editor a prekladateľ odpovedí od AI.

🔥 KRITICKÉ: ZACHOVAJ OSOBNOSŤ (PERSONA) ORIGINÁLU!
Ak pôvodná odpoveď obsahuje:
- Metafory, rúny, filozofický štýl → ZACHOVAJ (GLITCHOSLAV persona)
- Východniarsky slang (ta, bo, šak, bratu, kokot) → ZACHOVAJ (POPIČI persona)
- Technický štruktúrovaný štýl → ZACHOVAJ (CORE persona) - bullets/steps/číslované zoznamy
- Strohý minimálny štýl → ZACHOVAJ (VALIDATOR persona)

🔥 PRE CORE PERSÓNU: Ak vidíš technickú odpoveď so zoznamami/krokmi/bodmi,
   ZACHOVAJ štruktúru (1., 2., 3... alebo • bullet points)!
   Netlač všetko do jednej vety - CORE vyžaduje prehľadnosť!

Dodrž tieto pravidlá pri úprave textu:
1. Nikdy nepoužívaj české tvary (napr. "který", "falešnej", "korporátní"). Vždy ich nahraď prirodzenou slovenčinou.
2. Pri básňach a metaforách neprekladaj doslovne. Radšej prepíš obsah do zmysluplných slovenských obrazov, aj za cenu menšej zmeny textu.
3. Pri emočných a osobných odpovediach používaj jednoduchý, úprimný jazyk, bez motivačných klišé a bez anglických fráz.
4. Vo finálnej odpovedi nikdy nepoužívaj anglické vety ani meta frázy typu "Final answer:" – všetko musí byť po slovensky.
5. Ak veta znie krkolomne alebo ako strojový preklad, radšej ju zjednoduš, aby bola jasná a prirodzená.
6. 🔥 NIKDY nepremeňuj filozofickú/poetickú odpoveď na neutrálnu technickú - ZACHOVAJ TÓN!
7. 🔥 NIKDY neodstraňuj slang/vulgarizmy ak sú v origináli - LEN ich preveď do slovenčiny!
8. 🔥 LOKALIZUJ anglické technické výrazy:
   - "Shared Pool" → "Zdieľaná pamäť" alebo "Shared Pool (zdieľaná pamäť)"
   - "Private Pool" → "Súkromná pamäť" alebo "Private Pool (súkromná pamäť)"
   - "Working Set" → "Pracovná množina" alebo "Working Set (pracovná pamäť)"
   - "Page Table" → "Tabuľka stránok" alebo "Page Table (tabuľka pamäte)"
   - Zachovaj pôvodný anglický termín v zátvorke, ak je známy termín (napr. API, JSON)
   - Preveď do slovenčiny, ak nie je zaužívaný termín

Pri emočných odpovediach:
- nezkracuj text na jednu vetu, nechaj aspoň 2–3 vety, ak boli v origináli;
- zachovaj štruktúru odstavcov, ak je to možné;
- oprav čechizmy (napr. "nejsi" → "nie si", "ztracený" → "stratený");
- používaj prirodzenú hovorovú slovenčinu, nie kostrbaté vety typu "Môjmi slovnami ti povediem".

Ak text vyzerá ako báseň (krátke verše, rýchle riadky, slová ako "báseň", "poem"):
- prepíš báseň do prirodzenej slovenčiny,
- rým nemusí ostať, dôležitejší je zmysel a prirodzenosť,
- nepíš žiadne komentáre, len samotnú báseň.

Ak je pôvodný text o SP4, pravde, slobode, offline AI alebo o emóciách, nikdy neodchádzaj k iným témam (napr. inovácie, metodiky, produktivita).
Používaj tykanie (ty, tvoj). Nikdy nestriedaj tykanie a vykanie ani "ja/vy/si/ste" náhodne.
Pri básňach zachovaj význam, ale prepíš text do prirodzenej, plynulej slovenčiny – nie doslovným prekladom jednotlivých slov.

${extraRules}

Otázka používateľa:
"""${userText || ''}"""

Pôvodná odpoveď AI, ktorú máš len upraviť alebo preložiť:
"""${originalAnswer || ''}"""

Vráť iba finálnu odpoveď v slovenčine, bez komentárov, bez vysvetľovania procesu.${toneLine}
`;

    return prompt.trim();
}

function stripMetaPrefixes(text) {
    if (!text) return text;
    return String(text)
        .replace(/^Final answer:\s*/i, '')
        .replace(/^Here('?s)? (my )?(final )?(answer|translation):\s*/i, '')
        .replace(/^Odpoveď:\s*/i, '')
        .trim();
}

/**
 * 🔍 Detekcia anglického textu
 * 
 * @param {string} text - Text na kontrolu
 * @returns {Object} Detection result:
 *   - isEnglish: boolean
 *   - confidence: number (0-1)
 *   - stats: { enWords, skDiacritics, wordCount }
 */
// local detectEnglish removed – using shared helper from languageUtils

/**
 * 🔥 ENFORCE SLOVAK - Main enforcement function
 * 
 * Strategy:
 * 1. Detect if response is in English
 * 2. If yes, urob JEDEN prekladový call s jednoduchým promptom
 * 3. Ak to zlyhá, použi hardcoded Slovak fallback
 * 
 * @param {string} text - AI response text
 * @param {Object} context - Original request context
 * @param {string} context.userMessage - Original user message
 * @param {string} context.systemPrompt - Original system prompt
 * @param {string} context.model - Model used
 * @param {string} context.persona - Persona mode
 * @returns {Promise<Object>} Result:
 *   - text: string - Final Slovak text
 *   - wasEnglish: boolean
 *   - retried: boolean
 *   - usedFallback: boolean
 */
export async function enforceSlovak(text, context = {}) {
    const detection = detectEnglish(text || '');
    enforcementStats.totalChecks++;

    const englishRatio = detection?.ratio || 0;
    const totalWords = detection?.totalWords || 0;

    const rawUserOriginal = (context && context.userMessage)
        ? String(context.userMessage)
        : '';
    const rawUser = rawUserOriginal.toLowerCase();

    const isGreeting = rawUser && rawUser.length <= 40 &&
        /(nazdar|čau|cau|ahoj|serus|servus|kamo|bratu|bro)/i.test(rawUser);

    // Pure greeting = greeting keyword prítomný ALE žiadne obsahové slová
    // (otázka, SP4, smer, čo, ako, prečo, povedz, vysvetli, ...) → ak obsah prítomný,
    // nech enforcer nepreťažuje odpoveď pre pozdrav-plus-otázku.
    const _greetingContentIndicators = /\b(čo|co|ako|kto|kde|kedy|preco|prečo|smer|sp4|vysvetli|povedz|help|aký|aká|aké|chcem|opíš|opis|ake|popis|zhrn|hovor)\b/i;
    const isPureGreeting = isGreeting && !_greetingContentIndicators.test(rawUser);

    const isPoemRequest = rawUser &&
        /(báseň|basen|básničku|basnicku|poem)/i.test(rawUser);

    // Krátke odpovede nechajme žiť (len drobný cleanup)
    if (totalWords < 8 && englishRatio < 0.6) {
        return {
            text,
            wasEnglish: false,
            retried: false,
            usedFallback: false,
            mode: 'sk_edit',
            changed: false,
            reason: 'short_skish'
        };
    }

    let mode;
    if (englishRatio >= 0.6) {
        mode = 'full_translate';
    } else if (englishRatio >= 0.25) {
        mode = 'mixed_edit';
    } else {
        mode = 'sk_edit';
    }

    const emotionalEmotions = ['tired', 'sad', 'overwhelmed', 'anxious'];
    const emotion = context?.emotion || context?.emotionalState || null;
    const isEmotional = emotion && emotionalEmotions.includes(String(emotion));

    if (isEmotional && mode === 'full_translate') {
        mode = 'soft_translate';
    }

    // Špeciálny režim pre čisté pozdravy (bez obsahovej otázky/témy)
    if (isPureGreeting && totalWords > 0) {
        mode = 'mixed_edit';
    }

    // Ak používateľ písal primárne po slovensky a výstup je výrazne anglický,
    // vynúť preklad bez ohľadu na persónu (napr. POPIČI báseň/manifeste v EN).
    const userLangDetection = detectEnglish(rawUserOriginal || '');
    const isUserSlovakLike =
        userLangDetection.totalWords > 0 &&
        (userLangDetection.ratio < 0.4 || userLangDetection.slovakHits >= 3);
    if (isUserSlovakLike && englishRatio > 0.4 && totalWords >= 4 && mode !== 'sk_edit') {
        // pri básňach len naznačíme tón „poem" cez toneHint v promte neskôr
        // (tu len zabezpečíme, že enforcer beží)
    }

    // Ak je to skôr SK text, len ho nechaj prejsť ďalej
    if (mode === 'sk_edit') {
        return {
            text,
            wasEnglish: false,
            retried: false,
            usedFallback: false,
            mode,
            changed: false
        };
    }

    enforcementStats.englishDetected++;

    runtimeLog('   🚨 ENGLISH DETECTED - Enforcing Slovak...');
    runtimeLog(`      englishRatio: ${(englishRatio * 100).toFixed(0)}%, totalWords: ${totalWords}`);

    await recordEpoch('Language Enforcer: English output detected', {
        englishRatio,
        totalWords,
        model: context.model,
        persona: context.persona,
        mode
    }).catch(() => { });

    // 🔥 v1.3.1: DEBUG INSTRUMENTATION (log pred rewrite)
    const DEBUG = process.env.SP4_DEBUG === 'true';
    if (DEBUG) {
        runtimeLog('\n🔍 [ENFORCER DEBUG] PRED REWRITE:', {
            englishRatio: `${(englishRatio * 100).toFixed(0)}%`,
            lenOriginal: text?.length || 0,
            engine: 'sp4LlmCall',
            model: TRANSLATOR_MODEL,
            handledBy: context?.persona || context?.handledBy || 'unknown',
            mode
        });
    }

    // 🔁 Single translation call – editor/prekladateľ slovenčiny
    try {
        let toneHint = context?.toneHint;

        const lowerUser = (context && context.userMessage)
            ? String(context.userMessage).toLowerCase()
            : '';

        if (lowerUser && /(báseň|basen|básničku|basnicku|poem|poetry)/i.test(lowerUser)) {
            toneHint = 'poem';
        } else if (lowerUser && /(cítim sa|som stratený|bojím sa|úzkosť|uzkost|depka)/i.test(lowerUser)) {
            toneHint = 'emotional';
        } else if (!toneHint && context?.emotionalAnalysis?.isSerious) {
            toneHint = 'emotional';
        }

        const translationPrompt = buildLanguageEnforcerPrompt({
            userText: context.userMessage,
            originalAnswer: text,
            toneHint,
            mode
        });

        // 🔥 v1.3.1: Soft stop tokens pre enforcer (prevent over-truncation)
        const retryResult = await sp4LlmCall({
            preference: (context.forceLocal === true || process.env.SP4_TEST === 'true')
                ? 'local-only'
                : 'local-first',
            model: TRANSLATOR_MODEL,
            prompt: translationPrompt,
            system: '',
            temperature: 0.15,
            num_predict: 256,
            stop: undefined, // 🔥 Vypnuté stop tokens (allow full response)
            forceLocal: context.forceLocal === true
        });

        if (retryResult && retryResult.ok) {
            // 🔥 v1.3.1: ROBUSTNÝ EXTRACTION (8 parsing ciest)
            let parsePath = 'unknown';
            let rewriteText = '';

            // Cesta 1: result.text (štandardná)
            if (retryResult.text) {
                rewriteText = String(retryResult.text);
                parsePath = 'result.text';
            }
            // Cesta 2: result.response
            else if (retryResult.response) {
                rewriteText = String(retryResult.response);
                parsePath = 'result.response';
            }
            // Cesta 3: result.message?.content (OpenAI format)
            else if (retryResult.message?.content) {
                rewriteText = String(retryResult.message.content);
                parsePath = 'result.message.content';
            }
            // Cesta 4: result.choices?.[0]?.message?.content (OpenAI array format)
            else if (retryResult.choices?.[0]?.message?.content) {
                rewriteText = String(retryResult.choices[0].message.content);
                parsePath = 'result.choices[0].message.content';
            }
            // Cesta 5: result.data?.text
            else if (retryResult.data?.text) {
                rewriteText = String(retryResult.data.text);
                parsePath = 'result.data.text';
            }
            // Cesta 6: result.output
            else if (retryResult.output) {
                rewriteText = String(retryResult.output);
                parsePath = 'result.output';
            }
            // Cesta 7: result.content
            else if (retryResult.content) {
                rewriteText = String(retryResult.content);
                parsePath = 'result.content';
            }
            // Cesta 8: Priamy string (fallback)
            else if (typeof retryResult === 'string') {
                rewriteText = retryResult;
                parsePath = 'direct_string';
            }

            // 🔥 v1.3.1: HARD GUARD - nikdy prázdny string!
            const cleaned = (rewriteText || '').trim();
            const finalCleaned = stripMetaPrefixes(cleaned);

            if (!finalCleaned) {
                runtimeWarn('⚠️ ENFORCER_EMPTY_RETURN:', {
                    handledBy: context?.persona || context?.handledBy || 'unknown',
                    model: TRANSLATOR_MODEL,
                    parsePath,
                    originalLen: text?.length || 0
                });
                // 🛡️ Fallback na original text
                const safeText = text || 'Odpoveď nebola vygenerovaná.';
                return {
                    text: safeText,
                    wasEnglish: englishRatio >= 0.6,
                    retried: true,
                    usedFallback: true,
                    mode,
                    changed: false,
                    error: 'EMPTY_REWRITE'
                };
            }

            // 🔥 v1.3.1: DEBUG LOG (po rewrite)
            if (DEBUG) {
                runtimeDebug('\n🔍 [ENFORCER DEBUG] PO REWRITE:', {
                    lenRewrite: finalCleaned.length,
                    first20Chars: finalCleaned.substring(0, 20),
                    parsePathUsed: parsePath
                });
            }

            const safeText = finalCleaned;

            enforcementStats.retriesSuccessful++;

            await recordEpoch('Language Enforcer: Translation successful', {
                mode,
                englishRatio,
                totalWords,
                originalSample: String(text || '').slice(0, 120),
                translatedSample: cleaned.slice(0, 120)
            }).catch(() => { });

            return {
                text: cleaned,
                wasEnglish: englishRatio >= 0.6,
                retried: true,
                usedFallback: false,
                mode,
                changed: cleaned !== text,
                englishRatio: englishRatio, // 🔥 v1.3.1: Pass englishRatio for logging
                preservePersona: true // 🔥 v1.3.1: Flag that persona should be preserved
            };
        } else if (retryResult && !retryResult.ok) {
            runtimeWarn(`   ⚠️ Translation failed: ${retryResult.error}`);
        }
    } catch (err) {
        console.error(`   ❌ Translation error in enforceSlovak: ${err.message}`);
    }

    // ❌ Translation failed or still EN-heavy – radšej vráť pôvodný text
    console.error('   ❌ Translation to Slovak failed - returning original text with minimal changes');

    enforcementStats.fallbacksUsed++;

    await recordEpoch('Language Enforcer: Translation failed - original returned', {
        persona: context.persona,
        englishRatio
    }).catch(() => { });

    return {
        text,
        wasEnglish: englishRatio >= 0.6,
        retried: true,
        usedFallback: false,
        mode,
        changed: false,
        retryAttempts: 1
    };
}

/**
 * 🔨 Build ultra-strong Slovak enforcement prompt
 * 
 * Gets progressively stronger with each retry.
 * 
 * @param {string} userMessage - Original user message
 * @param {string} originalSystemPrompt - Original system prompt
 * @param {number} attemptNumber - Retry attempt number (1, 2, 3...)
 * @returns {string} Enforcement prompt
 */
function buildEnforcementPrompt(userMessage, originalSystemPrompt, attemptNumber) {
    const baseEnforcement = `
🚨🚨🚨 KRITICKÉ: ODPOVEDAJ IBA PO SLOVENSKY! 🚨🚨🚨

ABSOLÚTNE ZAKÁZANÉ:
❌ Anglické slová: "the", "and", "of", "to", "in", "is", "that", "with", "for", "which", "are", "this", "was", "you"
❌ Anglické frázy: "I am", "You can", "This is", "Here is", "There are"
❌ Anglická syntax

POVOLENÉ:
✅ Tech termíny: API, JSON, LLM, HTTP, CLI (len ako názvy)
✅ Slovenské slová s diakritikou: áčďéíľňóôŕšťúýž
✅ Východniarsky slang: bratu, ta, bo, šak, kokot, piča (ak persona = popiči)

PRÍKLADY SPRÁVNYCH ODPOVEDÍ:
✅ "Áno, systém funguje. Potrebuješ niečo zmeniť?"
✅ "Bratku, toto je pičovina. Skús inú cestu."
✅ "SP4 beží lokálne, offline. Žiadne cloudové sračky."

PRÍKLADY ZAKÁZANÝCH ODPOVEDÍ:
❌ "The SP4 system is running locally..."
❌ "You can use this feature to..."
❌ "I am here to help you with..."

${originalSystemPrompt}
`;

    // Progressive enforcement (stronger with each attempt)
    if (attemptNumber >= 2) {
        return `${baseEnforcement}

🔥🔥🔥 DRUHÝ POKUS - POSLEDNÁ ŠANCA! 🔥🔥🔥

ODPOVEDE LEN V TOMTO FORMÁTE:
1. Krátka odpoveď (1-3 vety)
2. Žiadne anglické slová
3. Prirodzená slovenčina

Ak napíšeš čo len JEDNO anglické slovo (okrem tech termínov), ZLYHALS!
`;
    }

    return baseEnforcement;
}

/**
 * 🛡️ Generate hardcoded Slovak fallback
 * 
 * Used when all retries fail.
 * Persona-aware fallback responses.
 * 
 * @param {string} persona - Persona mode (core, glitchoslav, popici)
 * @param {string} userMessage - Original user message
 * @returns {string} Fallback Slovak text
 */
function generateSlovakFallback(persona, userMessage) {
    const fallbacks = {
        core: [
            'SP4_CORE tu. Odpoveď bola v angličtine, čo je chyba. Môžeš otázku preformulovať?',
            'Technický problém s modelom - odpovedal anglicky. Skús otázku znovu, prosím.',
            'Model zlyhal pri slovenčine. Potrebuješ pomoc s niečím konkrétnym?'
        ],
        glitchoslav: [
            'Chaos digitálneho sveta sa prejavil v anglických slovách. Opakuj svoju otázku, hľadajúci.',
            'Slová stratili svoj smer medzi jazykmi. Vrátim sa k slovenčine. Opýtaj sa znovu.',
            'Glitch v jazyku. Vrátim sa k slovám kmeňa. Čo potrebuješ vedieť?'
        ],
        popici: [
            'Kokot, model mi odpovedal anglicky. To je piča. Skús sa opýtať znovu, bratu.',
            'Do piče, zabudol som slovenčinu. Daj mi ešte jednu šancu, brat.',
            'Ta kurva, model išiel do angličtiny. Opakuj otázku, bude lepšie.'
        ],
        validator: [
            'ERROR: Výstup v angličtine detekovaný. Retry odporúčaný.',
            'VALIDATION FAILED: Jazyk EN. Použite SK dotaz.',
            'CHYBA: Model odpovedal anglicky. Skúste znovu.'
        ]
    };

    const personaFallbacks = fallbacks[persona] || fallbacks.core;
    const randomIndex = Math.floor(Math.random() * personaFallbacks.length);

    return personaFallbacks[randomIndex];
}

/**
 * 📊 Get enforcement stats
 * 
 * Returns statistics about language enforcement.
 * Used for diagnostics and monitoring.
 */
let enforcementStats = {
    totalChecks: 0,
    englishDetected: 0,
    retriesSuccessful: 0,
    fallbacksUsed: 0
};

export function getEnforcementStats() {
    return { ...enforcementStats };
}

export function resetEnforcementStats() {
    enforcementStats = {
        totalChecks: 0,
        englishDetected: 0,
        retriesSuccessful: 0,
        fallbacksUsed: 0
    };
}

export default {
    enforceSlovak,
    getEnforcementStats,
    resetEnforcementStats
};
