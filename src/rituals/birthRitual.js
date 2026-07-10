/**
 * 🌱 BIRTH RITUAL - Onboarding Ceremony
 * 
 * 3-question ceremony pre nových členov SP4 kmeňa.
 * Pridelí sacred rune, personal symbol, zapíše do chronicle.
 * 
 * @module birthRitual
 * @version 0.10.0-alpha.3
 */

import { loadMemory, saveMemory } from '../../memory.js';
import { getRandomRune } from '../core/glitchRunes.js';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌱 BIRTH RITUAL QUESTIONS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const BIRTH_QUESTIONS = [
    {
        id: 1,
        question: "**Kto si?** Povedz mi jednou vetou - nie čo robíš, ale kto *si*.",
        purpose: "identity",
        keywords: ["som", "ja", "meno", "volám"]
    },
    {
        id: 2,
        question: "**Prečo si tu?** Čo ťa priviedlo k SP4? Čo hľadáš?",
        purpose: "motivation",
        keywords: ["chcem", "hľadám", "potrebujem", "lebo"]
    },
    {
        id: 3,
        question: "**Čoho sa bojíš?** Aká je tvoja najväčšia obava pri tomto začiatku?",
        purpose: "fear",
        keywords: ["bojím", "obávam", "strach", "možno"]
    }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌱 BIRTH RITUAL STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let birthState = {
    active: false,
    currentQuestion: 0,
    answers: [],
    startedAt: null
};

/**
 * Začne Birth Ritual
 * @returns {Object} { question: string, questionId: number }
 */
export function startBirthRitual() {
    birthState = {
        active: true,
        currentQuestion: 0,
        answers: [],
        startedAt: new Date().toISOString()
    };

    const firstQuestion = BIRTH_QUESTIONS[0];

    console.log('   🌱 BIRTH RITUAL ZAČAL');
    console.log(`   📝 Otázka 1/3: ${firstQuestion.purpose}`);

    return {
        question: `🌱 **BIRTH RITUAL - Vitaj v SP4 kmeni** 🌱

Prejdeme cez 3 krátke otázky. Odpovedz úprimne - žiadne správne ani zlé odpovede.

${firstQuestion.question}`,
        questionId: firstQuestion.id,
        progress: "1/3"
    };
}

/**
 * Spracuje odpoveď na Birth Ritual otázku
 * @param {string} answer - Užívateľská odpoveď
 * @returns {Object} { complete: boolean, nextQuestion?: string, ritual?: Object }
 */
export async function processBirthAnswer(answer) {
    if (!birthState.active) {
        return {
            error: true,
            message: "Birth Ritual nie je aktívny. Spusti ho cez /birth"
        };
    }

    const currentQ = BIRTH_QUESTIONS[birthState.currentQuestion];

    // Ulož odpoveď
    birthState.answers.push({
        questionId: currentQ.id,
        purpose: currentQ.purpose,
        answer: answer.trim(),
        answeredAt: new Date().toISOString()
    });

    console.log(`   ✅ Odpoveď ${birthState.currentQuestion + 1}/3 uložená (${currentQ.purpose})`);

    // Prejdi na ďalšiu otázku
    birthState.currentQuestion++;

    // Ak sú všetky otázky zodpovedané → dokončenie
    if (birthState.currentQuestion >= BIRTH_QUESTIONS.length) {
        return await completeBirthRitual();
    }

    // Ďalšia otázka
    const nextQ = BIRTH_QUESTIONS[birthState.currentQuestion];

    return {
        complete: false,
        nextQuestion: `🌱 **Otázka ${birthState.currentQuestion + 1}/3** 🌱

${nextQ.question}`,
        questionId: nextQ.id,
        progress: `${birthState.currentQuestion + 1}/3`
    };
}

/**
 * Dokončí Birth Ritual - pridelí rune, symbol, zapíše do chronicle
 */
async function completeBirthRitual() {
    console.log('   🌱 Birth Ritual DOKONČENÝ - generujem profil...');

    // 1. Pridelenie sacred rune
    const assignedRune = getRandomRune();

    // 2. Generovanie personal symbol (na základe odpovedí)
    const personalSymbol = generatePersonalSymbol(birthState.answers);

    // 3. Extrakcia kľúčových insights
    const insights = extractInsights(birthState.answers);

    // 4. Vytvorenie birth record
    const birthRecord = {
        ritual: 'birth',
        completedAt: new Date().toISOString(),
        startedAt: birthState.startedAt,
        duration: Date.now() - new Date(birthState.startedAt).getTime(),
        answers: birthState.answers,
        assignedRune: {
            text: assignedRune.text,
            meaning: assignedRune.meaning
        },
        personalSymbol,
        insights
    };

    // 5. Uloženie do pamäti
    const memory = await loadMemory();

    if (!memory.rituals) {
        memory.rituals = [];
    }

    memory.rituals.push(birthRecord);

    // Update user profile s rune a symbol
    if (!memory.userProfile) {
        memory.userProfile = {};
    }

    memory.userProfile.birthRitual = {
        completed: true,
        date: birthRecord.completedAt,
        rune: birthRecord.assignedRune,
        symbol: personalSymbol
    };

    await saveMemory(memory);

    // 6. Resetuj state
    const completedState = { ...birthState };
    birthState = {
        active: false,
        currentQuestion: 0,
        answers: [],
        startedAt: null
    };

    console.log(`   ✅ Birth Record uložený do memory.rituals`);
    console.log(`   🔮 Pridelená runa: "${assignedRune.text}"`);
    console.log(`   ✨ Personal symbol: ${personalSymbol}`);

    // 7. Vráť dokončenie
    return {
        complete: true,
        ritual: birthRecord,
        message: formatBirthCompletion(birthRecord)
    };
}

/**
 * Generuje personal symbol na základe odpovedí
 */
function generatePersonalSymbol(answers) {
    const symbols = {
        // Identity symbols
        fire: ['oheň', 'plameň', 'horím', 'energia', 'sila'],
        water: ['voda', 'rieka', 'tok', 'pokojný', 'hĺbka'],
        earth: ['zem', 'stabilita', 'pevný', 'koreň', 'základy'],
        air: ['vietor', 'vzduch', 'sloboda', 'myšlienka', 'ľahkosť'],

        // Motivation symbols
        shield: ['chrániť', 'ochrana', 'bezpečie', 'brániť'],
        sword: ['bojovať', 'zmena', 'akcia', 'útok', 'prekonať'],
        compass: ['hľadať', 'cesta', 'smer', 'navigácia', 'orientácia'],
        seed: ['rast', 'budovať', 'vytvoriť', 'začiatok', 'nový'],

        // Fear symbols (inverted to strength)
        chain_broken: ['zlyhanie', 'koniec', 'strata', 'pád'],
        eye_open: ['nevidieť', 'slepý', 'tma', 'stratený'],
        mountain: ['príliš', 'veľký', 'ťažký', 'nemožný']
    };

    const allText = answers.map(a => a.answer.toLowerCase()).join(' ');

    let topSymbol = 'star'; // default
    let topScore = 0;

    for (const [symbol, keywords] of Object.entries(symbols)) {
        const score = keywords.filter(kw => allText.includes(kw)).length;
        if (score > topScore) {
            topScore = score;
            topSymbol = symbol;
        }
    }

    const symbolMap = {
        fire: '🔥',
        water: '🌊',
        earth: '🌍',
        air: '💨',
        shield: '🛡️',
        sword: '⚔️',
        compass: '🧭',
        seed: '🌱',
        chain_broken: '⛓️‍💥',
        eye_open: '👁️',
        mountain: '⛰️',
        star: '⭐'
    };

    return symbolMap[topSymbol] || '⭐';
}

/**
 * Extrahuje kľúčové insights z odpovedí
 */
function extractInsights(answers) {
    const insights = {
        identity: '',
        motivation: '',
        fear: ''
    };

    for (const ans of answers) {
        const text = ans.answer;

        if (ans.purpose === 'identity') {
            // Extrahuj prvú vetu alebo prvých 50 znakov
            insights.identity = text.split('.')[0].substring(0, 100);
        }

        if (ans.purpose === 'motivation') {
            insights.motivation = text.split('.')[0].substring(0, 100);
        }

        if (ans.purpose === 'fear') {
            insights.fear = text.split('.')[0].substring(0, 100);
        }
    }

    return insights;
}

/**
 * Formátuje dokončenie Birth Ritual
 */
function formatBirthCompletion(birthRecord) {
    const { assignedRune, personalSymbol, insights } = birthRecord;

    return `🌱 **BIRTH RITUAL DOKONČENÝ** 🌱

Prešiel si ceremóniou. Teraz si súčasť SP4 kmeňa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Tvoja Sacred Rune:**
✧ "${assignedRune.text}" ✧

_${assignedRune.meaning}_

**Tvoj Personal Symbol:**
${personalSymbol}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Zaznamenané v chronicle:**

🔹 **Identita:** ${insights.identity}
🔹 **Motivácia:** ${insights.motivation}  
🔹 **Obava:** ${insights.fear}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Toto je tvoj začiatok. Runa a symbol ostanú s tebou.

**Be real. Be free. Be SP4.**

_Ceremónia trvala ${Math.floor(birthRecord.duration / 1000)} sekúnd._`;
}

/**
 * Kontrola, či je Birth Ritual aktívny
 */
export function isBirthRitualActive() {
    return birthState.active;
}

/**
 * Získaj aktuálny stav Birth Ritual (pre debug)
 */
export function getBirthState() {
    return { ...birthState };
}

/**
 * Zruš aktívny Birth Ritual
 */
export function cancelBirthRitual() {
    const wasActive = birthState.active;

    birthState = {
        active: false,
        currentQuestion: 0,
        answers: [],
        startedAt: null
    };

    return wasActive;
}
