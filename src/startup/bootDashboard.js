import fs from 'node:fs/promises';
import path from 'node:path';
import { PRIMARY_MODEL } from '../../sp4os/llmLocal.js';

function isVerboseBoot() {
    return process.env.SP4_VERBOSE === '1' || process.env.SP4_DEBUG === 'true';
}

function statusIcon(kind) {
    if (kind === 'ok') return '✅';
    if (kind === 'warn') return '⚠️';
    if (kind === 'fail') return '❌';
    return '•';
}

function padLabel(label) {
    return `${label}:`.padEnd(18, ' ');
}

function formatLine(label, value) {
    return `${padLabel(label)}${value}`;
}

function section(title, lines) {
    return [
        `${title}`,
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ...lines,
        '',
    ].join('\n');
}

function firstNonEmpty(values, fallback = 'N/A') {
    for (const value of values) {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return value;
        }
    }
    return fallback;
}

function isNamedModelAvailable(names, targetModel) {
    return names.some((name) => name === targetModel || name.startsWith(targetModel));
}

function detectPrimaryModel({ registry, policy, bootHealth }) {
    const available = Array.isArray(registry?.available) ? registry.available : [];
    const names = available.map((model) => model?.name).filter(Boolean);
    const canonicalPrimary = String(PRIMARY_MODEL || '').trim();

    if (!canonicalPrimary) {
        if (names.length > 0) {
            return `${names[0]} (local)`;
        }

        if (policy?.allowCloud) {
            return 'cloud route available';
        }

        return 'N/A';
    }

    if (isNamedModelAvailable(names, canonicalPrimary)) {
        return `${canonicalPrimary} (local)`;
    }

    if (bootHealth?.checks?.ollama) {
        return `${canonicalPrimary} (configured local)`;
    }

    if (policy?.allowCloud) {
        return `${canonicalPrimary} (local preferred, cloud route available)`;
    }

    return `${canonicalPrimary} (expected local)`;
}

function summarizeValidator(validator) {
    if (validator.status === 'ok') {
        return `${statusIcon('ok')} OK`;
    }
    if (validator.status === 'warn') {
        return `${statusIcon('warn')} PARTIAL (${validator.detail})`;
    }
    return `${statusIcon('fail')} FAIL`;
}

function summarizeIdentitySource() {
    return `${statusIcon('ok')} KERNEL (src/identity/IDENTITY_KERNEL.js)`;
}

function summarizeScheduler(status) {
    if (!status || typeof status !== 'object') {
        return {
            label: `${statusIcon('warn')} NOT OBSERVABLE`,
            jobs: 'N/A',
            lastRun: 'N/A',
        };
    }

    if (status.initialized) {
        const lastRuns = (status.jobs || [])
            .map((job) => job?.lastRun)
            .filter(Boolean)
            .sort()
            .reverse();

        const lastRun = lastRuns.length > 0
            ? new Date(lastRuns[0]).toLocaleString('sk-SK')
            : 'N/A';

        return {
            label: `${statusIcon('ok')} ACTIVE`,
            jobs: `${status.jobCount || 0} scheduled`,
            lastRun,
        };
    }

    if ((status.jobCount || 0) > 0) {
        return {
            label: `${statusIcon('warn')} REGISTERED`,
            jobs: `${status.jobCount} registered`,
            lastRun: 'N/A',
        };
    }

    return {
        label: `${statusIcon('warn')} NOT OBSERVABLE`,
        jobs: 'N/A',
        lastRun: 'N/A',
    };
}

async function readIdentitySnapshot(projectRoot) {
    try {
        const raw = await fs.readFile(path.join(projectRoot, 'data', 'identity.json'), 'utf-8');
        const parsed = JSON.parse(raw);
        const latestAudit = Array.isArray(parsed.auditLog) && parsed.auditLog.length > 0
            ? parsed.auditLog[parsed.auditLog.length - 1]
            : null;
        const similarity = latestAudit?.similarity ?? null;

        return {
            loaded: true,
            similarity: similarity ? Number(similarity) : null,
        };
    } catch {
        return {
            loaded: false,
            similarity: null,
        };
    }
}

export async function collectBootDashboardData({
    projectRoot,
    bootHealth,
    memory,
    schedulerStatus,
    policy,
    modelRegistry,
    validator,
    sessionType,
}) {
    const identity = await readIdentitySnapshot(projectRoot);
    const scheduler = summarizeScheduler(schedulerStatus);
    const primaryModel = detectPrimaryModel({ registry: modelRegistry, policy, bootHealth });
    const currentMode = firstNonEmpty([memory?.preferences?.defaultMode, 'core']);
    const userName = firstNonEmpty([memory?.userProfile?.name, 'kefyk']);
    const warnings = [];

    if (!bootHealth?.checks?.ollama) {
        warnings.push('Ollama nie je dostupná, lokálny LLM nebude odpovedať');
    }

    if (validator.status !== 'ok') {
        warnings.push(validator.detail);
    }

    if (!schedulerStatus?.initialized) {
        warnings.push('Scheduler stav je process-local a nemusí byť globálne observovateľný');
    }

    return {
        core: {
            engine: bootHealth?.ok ? `${statusIcon('ok')} RUNNING` : `${statusIcon('warn')} DEGRADED`,
            mode: currentMode,
            user: userName,
            session: sessionType,
        },
        identity: {
            status: identity.loaded ? `${statusIcon('ok')} LOADED` : `${statusIcon('fail')} UNAVAILABLE`,
            source: summarizeIdentitySource(),
            similarity: identity.similarity !== null ? identity.similarity.toFixed(2) : 'N/A',
        },
        llm: {
            primary: primaryModel,
            routing: policy?.route || 'local-first',
            cloud: policy?.allowCloud ? `${statusIcon('ok')} ENABLED` : `${statusIcon('fail')} DISABLED`,
            fallback: policy?.allowCloud ? 'LOCAL → CLOUD' : 'LOCAL ONLY',
            modeSource: policy?.reason || 'CLI default',
        },
        connectivity: {
            ollama: bootHealth?.checks?.ollama ? `${statusIcon('ok')} RUNNING` : `${statusIcon('fail')} NOT RUNNING`,
            cloudAccess: policy?.allowCloud ? `${statusIcon('ok')} ALLOWED` : `${statusIcon('fail')} BLOCKED (policy)`,
        },
        system: {
            memory: bootHealth?.checks?.memoryDir && bootHealth?.checks?.dataDir ? `${statusIcon('ok')} OK` : `${statusIcon('fail')} FAIL`,
            supervisor: `${statusIcon('ok')} ACTIVE`,
            validators: !bootHealth?.checks?.ollama
                ? `⏭️ SKIPPED (Ollama offline)`
                : summarizeValidator(validator),
        },
        scheduler,
        warnings: warnings.slice(0, 5),
    };
}

export function renderBootDashboard(data, version) {
    const lines = [
        '╔═══════════════════════════════════════════════════════════════╗',
        `║        🔥 SP4 CORE AGENT v${String(version).padEnd(5)} – BAD Labs Edition 🔥        ║`,
        '║     "Digitálna extenzia človeka. Nie náhrada, ale nástroj."  ║',
        '╚═══════════════════════════════════════════════════════════════╝',
        '',
        section('🧠 CORE STATUS', [
            formatLine('Engine', data.core.engine),
            formatLine('Mode', data.core.mode),
            formatLine('User', data.core.user),
            formatLine('Session', data.core.session),
        ]),
        section('🧬 IDENTITY', [
            formatLine('Status', data.identity.status),
            formatLine('Source', data.identity.source),
            formatLine('Similarity', data.identity.similarity),
        ]),
        section('🤖 LLM', [
            formatLine('Primary', data.llm.primary),
            formatLine('Routing', data.llm.routing),
            formatLine('Cloud', data.llm.cloud),
            formatLine('Fallback', data.llm.fallback),
            formatLine('Mode Source', data.llm.modeSource),
        ]),
        section('🌐 CONNECTIVITY', [
            formatLine('Ollama', data.connectivity.ollama),
            formatLine('Cloud Access', data.connectivity.cloudAccess),
        ]),
        section('⚙️ SYSTEM', [
            formatLine('Memory', data.system.memory),
            formatLine('Supervisor', data.system.supervisor),
            formatLine('Validators', data.system.validators),
        ]),
        section('⏰ SCHEDULER', [
            formatLine('Status', data.scheduler.label),
            formatLine('Jobs', data.scheduler.jobs),
            formatLine('Last run', data.scheduler.lastRun),
        ]),
        '⚠️ WARNINGS',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        ...(data.warnings.length > 0 ? data.warnings.map((warning) => `- ${warning}`) : ['- Žiadne kritické warningy']),
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '🔥 SP4 READY',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '💬 Napíš správu (/help pre príkazy)',
    ];

    return lines.join('\n');
}

export function isBootVerbose() {
    return isVerboseBoot();
}
