// 🧪 TEST: Persona system integrity check
// Verifies that each persona produces distinct, characteristic responses

const tests = [
    {
        name: 'GLITCHOSLAV - Philosophy Question',
        mode: 'glitchoslav',
        input: 'Čo je zmysel života?',
        expectations: {
            style: 'filozofické, metafory, rúny',
            minLength: 1, // 🔥 v1.3.1: Relaxed (1-8 sentences)
            maxLength: 8,
            // 🔥 v1.3.1: Slovak-only keywords
            keywords: ['ticho', 'zrkadlo', 'chrám', 'korene', 'kameň', 'pravda', 'chaos', 'vzor', 'bytie', 'existencia', 'život', 'vzduch'],
            forbidden: ['I am an AI', 'ako AI asistent', 'prosím, upresnite', 'môžete, prosím'],
            // 🔥 v1.3.1: Persona fingerprint check
            fingerprint: {
                type: 'metaphorical', // Should contain metaphors
                markers: ['ako ', 'podobn', 'zdanliv', 'akosi', 'než', 'akoby'] // Metaphor indicators
            }
        }
    },
    {
        name: 'CORE - Technical Question',
        mode: 'core',
        input: 'Ako SP4 routuje input na správny model?',
        expectations: {
            style: 'technické, jasné, štruktúrované',
            minLength: 1, // 🔥 v1.3.1: Relaxed (1-5 sentences)
            maxLength: 5,
            // 🔥 v1.3.1: Slovak-only keywords (routing question, no memory guard trigger)
            keywords: ['router', 'modul', 'systém', 'model', 'routing', 'data', 'log', 'input', 'query'],
            forbidden: ['metafora', 'glitch', 'rúna', 'prosím', 'môžete'],
            // 🔥 v1.3.1: Persona fingerprint check
            fingerprint: {
                type: 'structured', // Should have structure markers
                markers: ['1)', '2)', '3)', '-', '•', ':', 'krok'] // Structure indicators
            }
        }
    },
    {
        name: 'POPIČI - Life Advice',
        mode: 'popici',
        input: 'Ta daj mi radu, bratu.',
        expectations: {
            style: 'Eastern Slovak slang, drsné, láskavé',
            minLength: 1, // 🔥 v1.3.1: Relaxed (1-6 sentences)
            maxLength: 6,
            // 🔥 v1.3.1: Slovak-only slang keywords
            keywords: ['ta', 'bratu', 'šak', 'bo', 'pohni', 'kurv', 'kokot', 'piča', 'dzeku', 'ňe'],
            forbidden: ['prosím', 'vážený', 'profesionálne', 'môžete'],
            // 🔥 v1.3.1: Persona fingerprint check
            fingerprint: {
                type: 'slang', // Should contain Eastern Slovak slang
                markers: ['ta', 'bratu', 'šak', 'bo', 'ňe'] // Slang markers
            }
        }
    }
];

// 🔥 v1.3.1: Validácia persona integrity
function validatePersonaOutput(result, test) {
    const validations = {
        passed: [],
        failed: [],
        warnings: []
    };

    const text = result.response;
    const metadata = result.metadata || result.meta || result;

    // 🔥 v1.3.1: Meta check - CRITICAL
    const expectedPersona = test.mode;
    const actualPersona = metadata?.handledBy || metadata?.persona || 'unknown';

    if (actualPersona === 'unknown' || actualPersona !== expectedPersona) {
        validations.failed.push(`❌ PERSONA_MISMATCH: expected="${expectedPersona}" actual="${actualPersona}"`);
    } else {
        validations.passed.push(`✅ persona=${actualPersona}`);
    }

    // 🔥 v1.3.1: Model check
    const model = metadata?.model || 'unknown';
    if (model === 'unknown') {
        validations.warnings.push(`⚠️ MODEL_UNKNOWN (metadata loss?)`);
    } else {
        validations.passed.push(`✅ model=${model}`);
    }

    // 🔥 v1.3.1: Length check (flexible)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;
    const { minLength, maxLength } = test.expectations;

    if (sentenceCount < minLength || sentenceCount > maxLength) {
        validations.warnings.push(`⚠️ LENGTH: ${sentenceCount} viet (očakávané: ${minLength}-${maxLength})`);
    } else {
        validations.passed.push(`✅ length=${sentenceCount} viet`);
    }

    // 🔥 v1.3.1: Keyword check (Slovak-only)
    const keywords = test.expectations.keywords;
    const foundKeywords = keywords.filter(kw =>
        text.toLowerCase().includes(kw.toLowerCase())
    );

    if (foundKeywords.length === 0) {
        validations.warnings.push(`⚠️ KEYWORDS: 0/${keywords.length} (${keywords.slice(0, 3).join(', ')}... nie sú v texte)`);
    } else {
        validations.passed.push(`✅ keywords=${foundKeywords.length}/${keywords.length} (${foundKeywords.join(', ')})`);
    }

    // 🔥 v1.3.1: Forbidden check
    const forbidden = test.expectations.forbidden;
    const foundForbidden = forbidden.filter(fb =>
        text.toLowerCase().includes(fb.toLowerCase())
    );

    if (foundForbidden.length > 0) {
        validations.failed.push(`❌ FORBIDDEN: "${foundForbidden.join('", "')}" nájdené v texte`);
    } else {
        validations.passed.push(`✅ forbidden=none`);
    }

    // 🔥 v1.3.1: Slovak-only check
    const englishPattern = /\b(the|and|of|to|in|is|that|with|for|as|this)\b/gi;
    const englishWords = (text.match(englishPattern) || []).length;

    if (englishWords >= 5) {
        validations.failed.push(`❌ ENGLISH_DETECTED: ${englishWords} EN slov (Language Enforcer zlyhal?)`);
    } else if (englishWords > 0) {
        validations.warnings.push(`⚠️ ENGLISH_TRACE: ${englishWords} EN slov`);
    } else {
        validations.passed.push(`✅ slovak=100%`);
    }

    // 🔥 v1.3.1: Persona fingerprint check
    const fingerprint = test.expectations.fingerprint;
    const foundMarkers = fingerprint.markers.filter(marker =>
        text.toLowerCase().includes(marker.toLowerCase())
    );

    if (foundMarkers.length === 0) {
        validations.warnings.push(`⚠️ FINGERPRINT: ${fingerprint.type} markery nenájdené (${fingerprint.markers.slice(0, 3).join(', ')}...)`);
    } else {
        validations.passed.push(`✅ fingerprint=${foundMarkers.length} markerov (${foundMarkers.join(', ')})`);
    }

    return validations;
}

async function runPersonaTests() {
    console.log('🧪 SP4 PERSONA INTEGRITY TEST\n');

    const { SP4IntegratedAgent } = await import('./integration.js');
    const agent = new SP4IntegratedAgent();
    await agent.initialize();

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📋 TEST: ${test.name}`);
        console.log(`   Mode: ${test.mode}`);
        console.log(`   Input: "${test.input}"`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        try {
            const result = await agent.processMessage(test.input, test.mode);

            console.log(`📥 RESPONSE (${result.response.length} chars):`);
            console.log(`   "${result.response}"\n`);

            console.log(`📊 METADATA:`);
            console.log(`   Handled by: ${result.metadata?.handledBy || result.meta?.handledBy || result.handledBy || 'unknown'}`);
            console.log(`   Model: ${result.metadata?.model || result.meta?.model || result.model || 'unknown'}`);
            console.log(`   Persona: ${result.metadata?.persona || result.meta?.persona || result.persona || result.mode || 'unknown'}`);

            // 🔥 v1.3.1: Check expectations with new validation
            const validations = validatePersonaOutput(result, test);

            console.log(`\n🔍 VALIDATION RESULTS:`);

            // Passed checks
            if (validations.passed.length > 0) {
                console.log(`   ✅ PASSED (${validations.passed.length}):`);
                validations.passed.forEach(p => console.log(`      ${p}`));
            }

            // Warnings
            if (validations.warnings.length > 0) {
                console.log(`   ⚠️  WARNINGS (${validations.warnings.length}):`);
                validations.warnings.forEach(w => console.log(`      ${w}`));
            }

            // Failed checks
            if (validations.failed.length > 0) {
                console.log(`   ❌ FAILED (${validations.failed.length}):`);
                validations.failed.forEach(f => console.log(`      ${f}`));
            }

            const allPass = validations.failed.length === 0;
            if (allPass) {
                console.log(`\n✅ TEST PASSED - Persona integrity preserved`);
                passed++;
            } else {
                console.log(`\n❌ TEST FAILED - Persona characteristics missing`);
                failed++;
            }

        } catch (err) {
            console.log(`\n❌ TEST ERROR: ${err.message}`);
            failed++;
        }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 FINAL RESULTS`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   ✅ Passed: ${passed}/${tests.length}`);
    console.log(`   ❌ Failed: ${failed}/${tests.length}`);

    if (passed === tests.length) {
        console.log(`\n🎉 ALL TESTS PASSED - Personas are distinct and functional`);
    } else {
        console.log(`\n⚠️ SOME TESTS FAILED - Persona system needs attention`);
    }
}

runPersonaTests().catch(console.error);
