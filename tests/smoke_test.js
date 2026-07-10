// tests/smoke_test.js - SP4 OS Smoke Test
// Simple validation that core system loads without crashes

console.log('🔥 SP4 OS SMOKE TEST\n');

async function runSmokeTest() {
    const results = {
        total: 0,
        passed: 0,
        failed: 0
    };

    // Test 1: Module imports
    try {
        results.total++;
        console.log('1️⃣ Testing module imports...');

        // Test only core modules that should always work
        const { loadMemory, saveMemory } = await import('../memory.js');
        const { initScheduler } = await import('../scheduler.js');

        console.log('   ✅ Core modules loaded\n');
        results.passed++;
    } catch (error) {
        console.log('   ❌ Module import failed:', error.message, '\n');
        results.failed++;
    }

    // Test 2: Memory system
    try {
        results.total++;
        console.log('2️⃣ Testing memory system...');

        const { loadMemory } = await import('../memory.js');
        const memory = await loadMemory();

        if (memory && memory.userProfile) {
            console.log('   ✅ Memory loaded (user:', memory.userProfile.name || 'unknown', ')\n');
            results.passed++;
        } else {
            throw new Error('Memory structure invalid');
        }
    } catch (error) {
        console.log('   ❌ Memory load failed:', error.message, '\n');
        results.failed++;
    }

    // Test 3: Persona registry
    try {
        results.total++;
        console.log('3️⃣ Testing persona registry...');

        const { PERSONA_REGISTRY } = await import('../src/core/personaRegistry.js');
        const personas = Object.keys(PERSONA_REGISTRY);

        if (personas.length >= 3) {
            console.log('   ✅ Personas available:', personas.join(', '), '\n');
            results.passed++;
        } else {
            throw new Error('Insufficient personas registered');
        }
    } catch (error) {
        console.log('   ❌ Persona registry failed:', error.message, '\n');
        results.failed++;
    }

    // Test 4: Identity Bible check
    try {
        results.total++;
        console.log('4️⃣ Testing Identity Bible existence...');

        const fs = await import('fs');
        const biblePath = 'docs/SP4_IDENTITY_BIBLE.md';

        if (fs.existsSync(biblePath)) {
            const stats = fs.statSync(biblePath);
            console.log('   ✅ Bible found (', Math.round(stats.size / 1024), 'KB )\n');
            results.passed++;
        } else {
            throw new Error('Bible not found');
        }
    } catch (error) {
        console.log('   ❌ Bible check failed:', error.message, '\n');
        results.failed++;
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SMOKE TEST RESULTS:');
    console.log(`   Total:  ${results.total}`);
    console.log(`   Passed: ${results.passed} ✅`);
    console.log(`   Failed: ${results.failed} ${results.failed > 0 ? '❌' : ''}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (results.failed === 0) {
        console.log('🎉 SP4 SMOKE TEST: OK – core sa načítal bez chyby.\n');
        process.exit(0);
    } else {
        console.log('⚠️  SP4 SMOKE TEST: FAILED – niektoré testy zlyhali.\n');
        process.exit(1);
    }
}

// Run test
runSmokeTest().catch((error) => {
    console.error('💥 CRITICAL ERROR:', error);
    process.exit(1);
});
