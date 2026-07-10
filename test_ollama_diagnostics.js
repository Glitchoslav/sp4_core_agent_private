// 🔍 OLLAMA DIAGNOSTICS - Minimal Reproduction Test
// Tests direct Ollama endpoint without routing/fallback logic

// Node.js 18+ has built-in fetch (no import needed)

const OLLAMA_HOST = 'http://localhost:11434';
const TEST_MODEL = 'llama3:8b';
const TEST_PROMPT = 'povedz "OK-OLLAMA" a nič viac';

console.log('🔍 SP4 OLLAMA DIAGNOSTICS\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📍 STEP 1: Test Ollama availability');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function testOllamaHealth() {
    try {
        const response = await fetch(`${OLLAMA_HOST}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            console.log(`❌ Ollama health check FAILED: HTTP ${response.status}`);
            return false;
        }

        const data = await response.json();
        console.log(`✅ Ollama is ONLINE`);
        console.log(`   Models available: ${data.models?.length || 0}`);

        if (data.models && data.models.length > 0) {
            console.log('   Installed models:');
            data.models.forEach(m => {
                console.log(`     - ${m.name} (${(m.size / 1024 / 1024 / 1024).toFixed(2)} GB)`);
            });
        }

        const modelExists = data.models?.some(m => m.name.startsWith(TEST_MODEL));
        if (!modelExists) {
            console.log(`\n⚠️ WARNING: Test model "${TEST_MODEL}" not found`);
            console.log(`   Install with: ollama pull ${TEST_MODEL}`);
            return false;
        }

        console.log(`\n✅ Test model "${TEST_MODEL}" is AVAILABLE\n`);
        return true;
    } catch (err) {
        console.log(`❌ Ollama health check ERROR: ${err.message}`);
        console.log(`   Is Ollama running? Check with: ollama serve`);
        return false;
    }
}

async function testOllamaGenerate() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 STEP 2: Test /api/generate (legacy endpoint)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const payload = {
        model: TEST_MODEL,
        prompt: TEST_PROMPT,
        stream: false
    };

    console.log(`📤 REQUEST:
   URL: ${OLLAMA_HOST}/api/generate
   Method: POST
   Payload: ${JSON.stringify(payload, null, 2)}\n`);

    const started = Date.now();

    try {
        const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(60000)
        });

        const duration = Date.now() - started;

        console.log(`📥 RESPONSE:
   Status: ${response.status} ${response.statusText}
   Duration: ${duration}ms\n`);

        if (!response.ok) {
            console.log(`❌ /api/generate FAILED: HTTP ${response.status}`);
            return false;
        }

        const data = await response.json();
        console.log(`   Raw response structure:`, Object.keys(data));
        console.log(`   Response field: ${data.response ? '✅ EXISTS' : '❌ MISSING'}`);

        if (data.response) {
            console.log(`   Response text (${data.response.length} chars):`);
            console.log(`   "${data.response.substring(0, 200)}${data.response.length > 200 ? '...' : ''}"\n`);
            console.log(`✅ /api/generate works correctly\n`);
            return true;
        } else {
            console.log(`❌ Response field is missing or empty`);
            console.log(`   Full response:`, JSON.stringify(data, null, 2));
            return false;
        }
    } catch (err) {
        const duration = Date.now() - started;
        console.log(`❌ /api/generate ERROR after ${duration}ms:`);
        console.log(`   ${err.message}\n`);
        return false;
    }
}

async function testOllamaChat() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 STEP 3: Test /api/chat (current SP4 endpoint)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const payload = {
        model: TEST_MODEL,
        messages: [
            { role: 'user', content: TEST_PROMPT }
        ],
        stream: false
    };

    console.log(`📤 REQUEST:
   URL: ${OLLAMA_HOST}/api/chat
   Method: POST
   Payload: ${JSON.stringify(payload, null, 2)}\n`);

    const started = Date.now();

    try {
        const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(60000)
        });

        const duration = Date.now() - started;

        console.log(`📥 RESPONSE:
   Status: ${response.status} ${response.statusText}
   Duration: ${duration}ms\n`);

        if (!response.ok) {
            console.log(`❌ /api/chat FAILED: HTTP ${response.status}`);
            const text = await response.text();
            console.log(`   Error body: ${text.substring(0, 200)}`);
            return false;
        }

        const data = await response.json();
        console.log(`   Raw response structure:`, Object.keys(data));
        console.log(`   Message field: ${data.message ? '✅ EXISTS' : '❌ MISSING'}`);

        if (data.message && data.message.content) {
            console.log(`   Content field: ✅ EXISTS`);
            console.log(`   Response text (${data.message.content.length} chars):`);
            console.log(`   "${data.message.content.substring(0, 200)}${data.message.content.length > 200 ? '...' : ''}"\n`);
            console.log(`✅ /api/chat works correctly\n`);
            return true;
        } else {
            console.log(`❌ message.content field is missing or empty`);
            console.log(`   Full response:`, JSON.stringify(data, null, 2));
            return false;
        }
    } catch (err) {
        const duration = Date.now() - started;
        console.log(`❌ /api/chat ERROR after ${duration}ms:`);
        console.log(`   ${err.message}\n`);
        return false;
    }
}

// Run all tests
(async () => {
    const healthOk = await testOllamaHealth();

    if (!healthOk) {
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔴 DIAGNOSTICS FAILED: Ollama not available');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        process.exit(1);
    }

    const generateOk = await testOllamaGenerate();
    const chatOk = await testOllamaChat();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DIAGNOSTICS SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`   Ollama Health:     ${healthOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   /api/generate:     ${generateOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   /api/chat:         ${chatOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log('');

    if (healthOk && generateOk && chatOk) {
        console.log('🟢 VERDICT: Ollama is FULLY OPERATIONAL');
        console.log('   Problem is likely in SP4 routing/fallback logic\n');
    } else {
        console.log('🔴 VERDICT: Ollama has ISSUES');
        console.log('   Fix Ollama before debugging SP4 routing\n');
    }
})();
