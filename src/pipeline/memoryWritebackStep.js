import { runtimeLog } from '../core/runtimeLogging.js';

export async function runMemoryWritebackStep({
    userMessage,
    output,
    mode,
    resultMetadata,
    loadMemory,
    extractMemoryMetadata,
    addLogEntry
}) {
    runtimeLog('💾 Ukladám do pamäte s metadátami...');
    const memoryState = await loadMemory();
    const metadata = await extractMemoryMetadata(userMessage, output, memoryState);

    // SP4-056: fallback/refusal responses dostanú tagy do_not_retrieve + importance:0
    // aby sa z pamäte nevytiahli ako vzorové odpovede
    const isFallbackResponse = resultMetadata?.accuracyFallback === true
        || resultMetadata?.action === 'SAFE_REFUSAL_META'
        || resultMetadata?.action === 'SAFE_RELEVANCE_FALLBACK'
        || resultMetadata?.action === 'RETRY_ONCE_OR_SAFE_REWRITE'
        || resultMetadata?.responseControlApplied === true;

    // Stage Trace: vytiahni stageTrace pred zápisom — nesmie ísť do dlhodobej pamäte ako balast
    const { stageTrace: _stageTraceFromMeta, ...resultMetadataWithoutTrace } = (resultMetadata || {});

    const mergedMetadata = {
        ...metadata,
        ...resultMetadataWithoutTrace,
        memoryContext: metadata?.context || null,
        ...(isFallbackResponse ? {
            importance: 0,
            tags: ['fallback', 'do_not_retrieve'],
            skipIndex: true
        } : {}),
    };
    const writeDecision = await addLogEntry(userMessage, output, mode, mergedMetadata);

    // Stage Trace: doplň write/retrieval polia a vráť pre integráciu
    const retrievalPolicy = isFallbackResponse ? 'do_not_retrieve' : 'normal';
    const writeOutcome = writeDecision ? 'written' : 'blocked';

    return {
        memoryState,
        metadata: mergedMetadata,
        writeDecision,
        stageTraceUpdate: {
            writeDecision: writeOutcome,
            retrievalPolicy
        }
    };
}
