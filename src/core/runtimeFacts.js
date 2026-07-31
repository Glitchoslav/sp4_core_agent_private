import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getCloudLLMInfo } from '../../cloudLLM.js';
import { MEMORY_FILE } from '../../config/paths.js';
import { getOllamaHealthStatus } from '../llm/ollamaClient.js';
import { getRouterStats } from '../llm/llmRouter.js';
import { resolvePolicy } from '../policy/policy.js';
import { getRetrievableMemoryLog } from '../runtime/memoryHygiene.js';

const UNKNOWN = 'UNKNOWN';
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function readFact(getter) {
    try {
        return getter();
    } catch {
        return UNKNOWN;
    }
}

function buildMemoryFilePath() {
    const relativePath = path.relative(PROJECT_ROOT, MEMORY_FILE);
    return relativePath ? relativePath.split(path.sep).join('/') : UNKNOWN;
}

export function buildRuntimeFacts(memory, { seed, liveOllamaHealth } = {}) {
    const retrievableMemory = getRetrievableMemoryLog(memory);
    const rawLog = Array.isArray(memory?.rawMemory?.log) ? memory.rawMemory.log : [];
    const routingPolicy = readFact(() => resolvePolicy({}));
    const cloud = readFact(() => getCloudLLMInfo());
    const router = readFact(() => getRouterStats());
    const lastKnownOllamaHealth = readFact(() => getOllamaHealthStatus());

    return {
        retrievableCount: retrievableMemory.entries.length,
        ignoredCount: retrievableMemory.ignoredCount,
        rawLogCount: rawLog.length,
        maxLogEntries: memory?.preferences?.maxLogEntries ?? 500,
        seedCount: Array.isArray(memory?.seeds) ? memory.seeds.length : 0,
        relationshipStage: memory?.relationship?.stage || 'stranger',
        lifetimeInteractions: memory?.relationship?.metrics?.interactionCount || 0,
        primaryModel: process.env.PRIMARY_MODEL || 'gemma3:4b',
        fastPathModel: process.env.FAST_PATH_MODEL || 'llama3.2:3b',
        memoryFilePath: buildMemoryFilePath(),
        routingPolicy,
        cloud,
        router,
        ollamaHealth: {
            liveCheck: liveOllamaHealth ?? UNKNOWN,
            lastKnown: lastKnownOllamaHealth,
        },
        userSources: {
            memoryProfile: memory?.userProfile || UNKNOWN,
            seed: seed ?? UNKNOWN,
        },
    };
}

export function buildRuntimeFactsBlock(memory, opts = {}) {
    const facts = buildRuntimeFacts(memory, opts);
    const allowCloud = facts.routingPolicy === UNKNOWN
        ? UNKNOWN
        : facts.routingPolicy.allowCloud;
    const policyReason = facts.routingPolicy === UNKNOWN
        ? UNKNOWN
        : facts.routingPolicy.reason;
    const lastKnownUnhealthy = facts.ollamaHealth.lastKnown === UNKNOWN
        ? UNKNOWN
        : facts.ollamaHealth.lastKnown.unhealthy;

    return [
        'RUNTIME FACTS (deterministický snapshot):',
        `Pamäť: retrievable=${facts.retrievableCount}, ignored=${facts.ignoredCount}, raw=${facts.rawLogCount}/${facts.maxLogEntries}, seeds=${facts.seedCount}, lifetime=${facts.lifetimeInteractions}.`,
        `Konfigurované modely: primary=${facts.primaryModel}, fast-path=${facts.fastPathModel}.`,
        `Routing politika: allowCloud=${allowCloud}, reason=${policyReason}.`,
        `Ollama zdravie: live=${facts.ollamaHealth.liveCheck === UNKNOWN ? UNKNOWN : JSON.stringify(facts.ollamaHealth.liveCheck)}, lastKnownUnhealthy=${lastKnownUnhealthy}.`,
        `Pamäťový súbor: ${facts.memoryFilePath}.`,
    ].join('\n');
}
