// modelRouting.js
// 🧠 SP4 Model Selection Logic - správny model pre správnu situáciu

export const SP4_MODELS = {
    primary: 'qwen2.5:7b',         // Phase 6: primary local runtime model
    popici: 'llama3:8b',       // 🔥 Fast & stable (was: Slovak LLM - removed due to RAM)
    reasoning: 'llama3:8b',    // English reasoning fallback
    fast: 'llama3:8b',         // Was: gemma3:1b (not available on RunPod)
};

/**
 * Vyberá správny model podľa režimu, úlohy a emocionálneho kontextu
 * @param {object} options - { mode, task, emotion }
 * @returns {string} - názov modelu pre Ollama
 */
export function chooseModel({ mode, task, emotion } = {}) {
    // 🚨 EMPATIA AUTO-ROUTING: Ťažké emócie → force EMPATIA mode + primary model
    const empathyEmotions = ['empty', 'lonely', 'lost', 'tired', 'no_sense', 'deep_pain', 'trauma', 'grief', 'despair'];
    if (emotion && empathyEmotions.includes(emotion)) {
        console.log(`💙 EMPATIA auto-routing: emotion (${emotion}) → ${SP4_MODELS.primary}`);
        // FORCE EMPATIA MODE (caller should respect this)
        return SP4_MODELS.primary;
    }

    // 🔒 CORE / identita / SP4 filozofia
    if (mode === 'core') {
        return SP4_MODELS.primary;
    }

    // 💙 EMPATIA – bolesť, láska, samota, tma
    if (mode === 'empatia') {
        return SP4_MODELS.primary;
    }

    // 🔥 POPIČI – drzosť, nasranosť, motivácia
    if (mode === 'popici') {
        return SP4_MODELS.popici;
    }

    // 🌑 GLITCH / glitchoslav – existenciálne otázky, ťažká filozofia
    if (mode === 'glitch' || mode === 'glitchoslav') {
        return SP4_MODELS.primary;
    }

    // ⚡ Validator / rýchle technické veci / cleanup
    if (task === 'validator' || task === 'cleanup' || task === 'quick_sanitize') {
        return SP4_MODELS.fast;
    }

    // 🧑 HUMAN / analyst / technické otázky
    if (mode === 'human' || mode === 'analyst') {
        return SP4_MODELS.primary; // aj tech otázky zaslúžia kvalitný model
    }

    // ✅ Default: vždy radšej veľký mozog než malá opička
    console.log(`🧠 Default model selection → ${SP4_MODELS.primary}`);
    return SP4_MODELS.primary;
}

/**
 * Debug helper - zobrazí reasoning pre výber modelu
 */
export function explainModelChoice({ mode, task, emotion }) {
    const model = chooseModel({ mode, task, emotion });
    return {
        selectedModel: model,
        reason: getSelectionReason({ mode, task, emotion, model }),
        mode,
        task,
        emotion
    };
}

function getSelectionReason({ mode, task, emotion, model }) {
    const deepEmotions = ['deep_pain', 'empty', 'lonely', 'trauma', 'grief', 'despair'];

    if (emotion && deepEmotions.includes(emotion)) {
        return `Deep emotion (${emotion}) requires primary model`;
    }

    if (mode === 'popici' && model === SP4_MODELS.popici) {
        return 'POPIČI mode uses LLaMA3 with enhanced personality (fixed truncation issue)';
    }

    if (task === 'validator' || task === 'cleanup') {
        return 'Fast model sufficient for simple cleanup tasks';
    }

    if (mode === 'core' || mode === 'empatia' || mode === 'glitch') {
        return `${mode.toUpperCase()} mode requires primary model`;
    }

    return 'Default: primary model for quality responses';
}
