// Quick integration test - verify confidence scoring works
import { sp4Agent } from './integration.js';

console.log('🧪 Testing SP4 System Integration\n');

// Use longer query to bypass short_reply_guard
const testQuery = 'Vysvetli mi podrobne, ako funguje SP4 memory system a aké má vrstvy?';

try {
    console.log('🔄 Initializing agent...');
    await sp4Agent.initialize();
    console.log('✅ Agent initialized\n');

    console.log(`📝 Query: "${testQuery}"\n`);

    const result = await sp4Agent.processMessage(testQuery, 'core', {
        // processMessage expects policy flags at top level options
        forceLocal: true,
        bypassAutonomous: true,
        testMode: true
    });

    console.log('\n📊 RESULT STRUCTURE:');
    console.log('─'.repeat(60));
    console.log(JSON.stringify(result, null, 2).substring(0, 1500));

    console.log('\n📊 METADATA CHECK:');
    console.log('─'.repeat(60));

    console.log('Result keys:', Object.keys(result));

    if (result.metadata) {
        console.log('✅ metadata exists');
        console.log('metadata keys:', Object.keys(result.metadata));

        if (result.metadata.execution) {
            console.log('✅ metadata.execution exists');
            console.log(`   cloudUsed: ${result.metadata.execution.cloudUsed}`);
            console.log(`   provider: ${result.metadata.execution.provider}`);
            console.log(`   accuracyFallback: ${result.metadata.execution.accuracyFallback}`);
            console.log(`   confidenceScore: ${result.metadata.execution.confidenceScore}`);
            console.log(`   confidenceLabel: ${result.metadata.execution.confidenceLabel}`);
        } else {
            console.log('❌ metadata.execution missing!');
        }

        if (result.metadata.grounding !== undefined) {
            console.log(`✅ grounding: ${result.metadata.grounding}`);
        }
    } else {
        console.log('❌ metadata missing!');
    }

    console.log('\n📝 Response preview:');
    console.log(result.response?.substring(0, 200) + '...');

    // 🔥 FIX #2: Grounding validation test
    console.log('\n🔍 GROUNDING VALIDATION:');
    console.log('─'.repeat(60));

    if (result.metadata?.grounding === true) {
        console.log('✅ Grounding was applied');

        // Check if response contains SP4 facts (not CPU hallucinations)
        const hasCorrectFacts = /\b(Raw Log|Summaries|Seeds|záznamy|zhrnutia|momenty)\b/i.test(result.response);
        const hasForbiddenTerms = /\b(L[1234]|cache|AMD|Ryzen|Intel|procesor|CPU)\b/gi.test(result.response);

        if (hasCorrectFacts && !hasForbiddenTerms) {
            console.log('✅ Response contains SP4 facts (correct)');
        } else if (hasForbiddenTerms) {
            console.error('❌ GROUNDING VIOLATION: Response contains CPU hallucinations!');
            console.error(`   Forbidden terms: ${result.response.match(/\b(L[1234]|cache|AMD|Ryzen|Intel|procesor|CPU)\b/gi)?.join(', ')}`);

            // Check if fallback was triggered
            if (result.metadata?.execution?.accuracyFallback === true) {
                console.log('✅ accuracyFallback=true (validator caught it)');
            } else {
                console.error('❌ CRITICAL: accuracyFallback=false (validator FAILED!)');
                process.exit(1);
            }
        } else {
            console.warn('⚠️  Response missing SP4 facts (incomplete but not wrong)');
        }

        // Check confidence adjustment
        if (result.metadata?.execution?.accuracyFallback === true) {
            if (result.metadata.execution.confidenceScore < 0.7) {
                console.log(`✅ Confidence lowered to ${result.metadata.execution.confidenceScore} (correct)`);
            } else {
                console.error(`❌ CRITICAL: Confidence still ${result.metadata.execution.confidenceScore} despite fallback!`);
                process.exit(1);
            }
        }
    } else {
        console.log('ℹ️  Grounding not applied (query not SP4-related)');
    }

    console.log('\n✅ TEST COMPLETE');
    process.exit(0);

} catch (err) {
    console.error('❌ TEST FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
}
