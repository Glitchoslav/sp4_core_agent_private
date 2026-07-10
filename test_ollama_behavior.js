// 🔍 TEST: Ollama behavior po úprave parametrov (v1.3.1)

// Test 1: Jednoduchý short prompt
const OLLAMA_HOST = 'http://localhost:11434';
const TEST_MODEL = 'llama3:8b';

async function testWithNewParams() {
    console.log('🔍 TEST: Ollama s novými parametrami (temp=0.5, max_tokens=512, strong system prompt)\n');

    const systemPrompt = `🇸🇰 RESPOND IN SLOVAK. Be concise (max 3-5 sentences). Follow instructions exactly.

🚨 ABSOLUTE RULES:
- RESPOND IN SLOVAK ONLY
- BE DIRECT AND CONCISE (max 3-5 sentences)
- NO EXPLANATIONS unless asked
- NO ENGLISH words except technical terms (API, JSON, LLM)
- FOLLOW USER'S INSTRUCTIONS EXACTLY`;

    const testCases = [
        { prompt: 'povedz "OK" a nič viac', expected: 'should say OK only' },
        { prompt: 'ahoj. fungujeme?', expected: 'short greeting response' },
        { prompt: 'kto si?', expected: 'brief identity statement' }
    ];

    for (const test of testCases) {
        console.log(`\n━━━ TEST: "${test.prompt}" ━━━`);
        console.log(`Expected: ${test.expected}\n`);

        const started = Date.now();
        try {
            const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
                method: 'POST',
                signal: AbortSignal.timeout(30000),
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: TEST_MODEL,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: test.prompt }
                    ],
                    stream: false,
                    temperature: 0.5,
                    num_predict: 512,
                    top_k: 40,
                    top_p: 0.9,
                    repeat_penalty: 1.1
                })
            });

            const data = await response.json();
            const duration = Date.now() - started;
            const text = data.message?.content || '';

            console.log(`✅ Response (${duration}ms, ${text.length} chars):`);
            console.log(`   "${text}"\n`);

            if (text.length > 300) {
                console.log(`⚠️  WARNING: Response too long (${text.length} chars)`);
            }

            const hasEnglish = /\b(the|and|of|is|that|with|popular|phrase|expression)\b/gi.test(text);
            if (hasEnglish) {
                console.log(`⚠️  WARNING: English words detected`);
            }

        } catch (err) {
            console.log(`❌ ERROR: ${err.message}`);
        }
    }
}

testWithNewParams().catch(console.error);
