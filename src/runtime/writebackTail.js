import { runtimeLog, runtimeWarn } from '../core/runtimeLogging.js';
import { runMemoryWritebackStep } from '../pipeline/memoryWritebackStep.js';
import { saveMemory } from '../../memory.js';

export async function runWritebackTail({
    userMessage,
    output,
    mode,
    resultMetadata,
    finalMode,
    detectedMode,
    emotionalAnalysis,
    loadMemory,
    extractMemoryMetadata,
    addLogEntry,
    processResponseActions,
    evaluateRelationshipProgression,
    ruleMiningPipeline,
    identityManager
}) {
    const { memoryState, metadata, writeDecision, stageTraceUpdate } = await runMemoryWritebackStep({
        userMessage,
        output,
        mode,
        resultMetadata,
        loadMemory,
        extractMemoryMetadata,
        addLogEntry
    });

    if (resultMetadata) {
        resultMetadata.memoryWriteTailRan = true;
        resultMetadata.memoryWritePersisted = writeDecision?.written === true;
        resultMetadata.memoryWriteBlocked = writeDecision?.written === false;
        resultMetadata.memoryWriteBlockReason = writeDecision?.blockReason || null;

        // Stage Trace: doplň writeDecision + retrievalPolicy do stageTrace v metadata
        if (resultMetadata.stageTrace && stageTraceUpdate) {
            resultMetadata.stageTrace.writeDecision = stageTraceUpdate.writeDecision;
            resultMetadata.stageTrace.retrievalPolicy = stageTraceUpdate.retrievalPolicy;
        }
    }

    runtimeLog('🎯 Checking for actions in response...');
    try {
        const actionResult = await processResponseActions(output, {
            persona: finalMode,
            userMessage
        });

        if (actionResult.actionsFound > 0) {
            runtimeLog(`   ⚡ Processed ${actionResult.executed}/${actionResult.actionsFound} action(s)`);

            actionResult.results.forEach(result => {
                if (!result.success) {
                    runtimeWarn(`   ⚠️ Action ${result.action} failed: ${result.error}`);
                }
            });
        } else {
            runtimeLog('   ℹ️  No actions detected in response');
        }
    } catch (actionError) {
        console.error('❌ Action processing error:', actionError.message);
    }

    runtimeLog('🔍 Evaluujem memory triggers...');
    try {
        const { evaluateTriggers } = await import('../../memory/triggerEngine.js');
        const rawMemoryLog = memoryState.rawMemory?.log || memoryState.rawMemory || [];
        const recentHistory = rawMemoryLog.slice(-10);

        const triggerContext = {
            message: userMessage,
            emotion: emotionalAnalysis,
            intensity: emotionalAnalysis.intensity,
            recentHistory,
            patterns: {
                techQuestionsInRow: 0,
                sameTopicCount: 0
            }
        };

        const triggerResult = evaluateTriggers(triggerContext);

        if (triggerResult.triggered) {
            runtimeLog(`   ⚠️ Triggers activated: ${triggerResult.events.length}`);
            triggerResult.events.forEach(event => {
                runtimeLog(`   📌 ${event.trigger}: ${event.message.substring(0, 60)}...`);
            });
        } else {
            runtimeLog('   ✅ No triggers activated');
        }
    } catch (triggerError) {
        runtimeWarn('⚠️ Trigger evaluation failed:', triggerError.message);
    }

    const updatedMemory = await loadMemory();
    const rawLogLength = updatedMemory.rawMemory?.log?.length || 0;

    if (resultMetadata) {
        resultMetadata.contaminatedMemoryIgnored = updatedMemory.metaReflection?.memoryHygiene?.contaminatedIgnoredCount || 0;
    }

    if (rawLogLength > 0 && rawLogLength % 10 === 0) {
        runtimeLog('🔍 Vykonávam pravidelný identity audit...');
        await identityManager.performAudit();

        const { detectIdentityDrift } = await import('../../identityDrift.js');
        const driftResult = detectIdentityDrift(updatedMemory);
        if (driftResult.drifted) {
            runtimeLog(`⚠️  Identity drift detekovaný: ${(driftResult.driftScore * 100).toFixed(1)}%`);
            // SP4-056: driftResult.direction môže byť objekt {traits, values, style, language}
            const rawDir = driftResult.direction;
            const dirStr = typeof rawDir === 'string'
                ? rawDir
                : (typeof rawDir === 'object' && rawDir !== null)
                    ? (Object.keys(rawDir).find(k => (rawDir[k] ?? 0) > 0.1) || 'mixed')
                    : 'mixed';
            runtimeLog(`   Status: ${driftResult.status}, Direction: ${dirStr}`);
        }
    }

    if (rawLogLength > 0 && rawLogLength % 5 === 0) {
        runtimeLog('💕 Vyhodnocujem progres vzťahu...');
        try {
            const newRelationship = await evaluateRelationshipProgression(updatedMemory);
            if (newRelationship && newRelationship !== updatedMemory.relationship) {
                updatedMemory.relationship = newRelationship;
                await saveMemory(updatedMemory);
            }
        } catch (err) {
            runtimeWarn('⚠️ Relationship tracking error:', err.message);
        }
    }

    if (!ruleMiningPipeline.initialized) {
        await ruleMiningPipeline.initialize();
    }

    ruleMiningPipeline.processConversation(
        userMessage,
        output,
        finalMode || detectedMode || mode,
        emotionalAnalysis
    ).catch(err => {
        runtimeWarn('⚠️ Rule mining error:', err.message);
    });

    return {
        memoryState,
        metadata,
        updatedMemory,
        writeDecision
    };
}
