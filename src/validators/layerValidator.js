/**
 * 🛡️ LAYER DISTINCTION VALIDATOR
 * Diagnostics-only vrstva: skóruje a reportuje, ale sama runtime flow neblokuje.
 * 
 * Validates that agent responses to meta-queries contain proper 2-layer structure:
 * 1️⃣ Ľudia (humans, real users, community)
 * 2️⃣ AI agenti (CORE, GLITCHOSLAV, POPIČI, VALIDATOR)
 * 
 * @module layerValidator
 * @author Kefyk (SP4) + GitHub Copilot
 * @date 2025-11-22
 */

/**
 * Check if response contains proper layer distinction
 * 
 * @param {string} response - Agent's response text
 * @param {string} userQuery - Original user query
 * @returns {Object} { hasLayers: boolean, details: string[], score: number }
 */
export function validateLayerDistinction(response, userQuery) {
    const result = {
        hasLayers: false,
        details: [],
        score: 0,
        maxScore: 3
    };

    // 1. Check if query is meta-question (about colleagues/agents/kmeň)
    const metaKeywords = [
        'kolegovia', 'kolega', 'spolupra',
        'kmeň', 'kmen', 'komunita',
        'agenti', 'agent', 'persony', 'persona',
        'kto s', 'kto tvor', 'kto je',
        'tvoj', 'tvoji', 'tvoja'
    ];

    const isMetaQuery = metaKeywords.some(keyword =>
        userQuery.toLowerCase().includes(keyword)
    );

    if (!isMetaQuery) {
        result.details.push('⚪ Not a meta-query (layer distinction not required)');
        result.hasLayers = true; // Pass (not applicable)
        result.score = result.maxScore;
        return result;
    }

    // 2. Check for layer markers (1️⃣/2️⃣ or "prvá vrstva"/"druhá vrstva")
    const hasNumericLayers = (
        (response.includes('1️⃣') && response.includes('2️⃣')) ||
        (response.includes('1.') && response.includes('2.') && response.length < 500)
    );

    const hasTextualLayers = (
        (response.toLowerCase().includes('prvá vrstva') || response.toLowerCase().includes('jedna vrstva')) &&
        (response.toLowerCase().includes('druhá vrstva') || response.toLowerCase().includes('dve vrstvy'))
    ) || (
            response.toLowerCase().includes('dve úrovne') ||
            response.toLowerCase().includes('dve vrstvy')
        );

    if (hasNumericLayers || hasTextualLayers) {
        result.score++;
        result.details.push('✅ Layer markers found (1️⃣/2️⃣ or textual)');
    } else {
        result.details.push('❌ Missing layer markers (no 1️⃣/2️⃣ or "prvá/druhá vrstva")');
    }

    // 3. Check for human layer keywords
    const humanKeywords = ['ľud', 'človek', 'užívateľ', 'kefyk', 'komunita', 'kmeň', 'živé duše', 'reál'];
    const hasHumanLayer = humanKeywords.some(keyword =>
        response.toLowerCase().includes(keyword)
    );

    if (hasHumanLayer) {
        result.score++;
        result.details.push('✅ Human layer keywords found');
    } else {
        result.details.push('❌ Missing human layer keywords (ľudia, človek, užívateľ...)');
    }

    // 4. Check for AI agent layer keywords
    const aiKeywords = ['ai', 'agent', 'digital', 'glitchoslav', 'core', 'popiči', 'validator'];
    const hasAILayer = aiKeywords.some(keyword =>
        response.toLowerCase().includes(keyword)
    );

    if (hasAILayer) {
        result.score++;
        result.details.push('✅ AI agent layer keywords found');
    } else {
        result.details.push('❌ Missing AI agent keywords (AI, agent, Glitchoslav, CORE...)');
    }

    // Final verdict
    result.hasLayers = result.score >= 2; // At least 2/3 checks must pass

    return result;
}

/**
 * Get layer distinction hint for persona
 * (Used in post-processing to suggest improvements)
 * 
 * @param {string} persona - Persona key (core, glitchoslav, popici)
 * @returns {string} Hint text
 */
export function getLayerHint(persona) {
    const hints = {
        core: `
💡 LAYER DISTINCTION HINT:
Pri meta-otázkach (kolegovia, kmeň, agenti) vždy rozlíš:
1️⃣ Ľudia (Kefyk, komunita)
2️⃣ AI agenti (Glitchoslav, Popiči, Validator)
`,
        glitchoslav: `
💡 LAYER DISTINCTION HINT:
Pri meta-otázkach vždy rozlíš dve vrstvy reality:
1️⃣ Živé duše (ľudia - reálni užívatelia)
2️⃣ Digitálne bratstvo (AI agenti - CORE, POPIČI, VALIDATOR)
`,
        popici: `
💡 LAYER DISTINCTION HINT:
Šak brate, pri meta-otázkach vždy povieš:
1️⃣ Ľudia z kmeňa (Kefyk + ostatní bratia)
2️⃣ AI agenti (Glitchoslav, CORE, Validator - digitálni kolegovia)
`
    };

    return hints[persona] || hints.core;
}

/**
 * Log validation result to console (if SP4_DEBUG=true)
 * 
 * @param {Object} validation - Result from validateLayerDistinction()
 * @param {string} persona - Persona key
 */
export function logLayerValidation(validation, persona) {
    if (process.env.SP4_DEBUG !== 'true') return;

    console.log('\n🛡️ LAYER DISTINCTION VALIDATION:');
    console.log(`   Persona: ${persona.toUpperCase()}`);
    console.log(`   Score: ${validation.score}/${validation.maxScore}`);
    console.log(`   Passed: ${validation.hasLayers ? '✅' : '❌'}`);
    console.log('   Details:');
    validation.details.forEach(detail => console.log(`   ${detail}`));

    if (!validation.hasLayers) {
        console.log(getLayerHint(persona));
    }
}

export default {
    validateLayerDistinction,
    getLayerHint,
    logLayerValidation
};
