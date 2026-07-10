#!/usr/bin/env node
// ┌─────────────────────────────────────────────────────────────────┐
// │  SP4 OS TOOL: immuneReport                                     │
// │  Layer: Tools                                                  │
// │  Role: Analyzuje immune log + routing learning summary         │
// │  CLI: node tools/immuneReport.mjs [logPath] [summaryPath]      │
// │  Dependencies: none beyond Node.js built-ins                   │
// └─────────────────────────────────────────────────────────────────┘

import { createReadStream, existsSync } from 'fs';
import { dirname, join } from 'path';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { analyzeRoutingLearning, writeRoutingLearningSummary } from '../src/immune/routingLearning.js';

const __here = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = process.argv[2] ?? join(__here, '../data/immune_log.jsonl');
const SUMMARY_PATH = process.argv[3] ?? join(__here, '../data/routing_learned_summary.json');
const TREND_WINDOW = 100;

function inc(map, key) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedDesc(map) {
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function pct(n, total) {
    if (!total) return '0.0%';
    return `${((n / total) * 100).toFixed(1)}%`;
}

function bar(n, max, width = 20) {
    const filled = Math.round((n / (max || 1)) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
}

async function parseLog(logPath) {
    const events = [];
    let skipped = 0;

    return new Promise((resolve) => {
        if (!existsSync(logPath)) {
            resolve({ events, skipped, missing: true });
            return;
        }

        const rl = createInterface({
            input: createReadStream(logPath, { encoding: 'utf8' }),
            crlfDelay: Infinity,
        });

        rl.on('line', (line) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            try {
                events.push(JSON.parse(trimmed));
            } catch {
                skipped++;
            }
        });

        rl.on('close', () => resolve({ events, skipped, missing: false }));
        rl.on('error', () => resolve({ events, skipped, missing: false }));
    });
}

function analyze(events) {
    const total = events.length;
    const severity = new Map();
    const confidence = new Map();
    const reasonCodes = new Map();
    const profiles = new Map();
    const handlers = new Map();
    const modes = new Map();
    const modeHard = new Map();

    for (const ev of events) {
        inc(severity, ev.severity ?? 'unknown');
        inc(confidence, ev.immune_confidence ?? 'unknown');
        inc(profiles, ev.immune_profile ?? 'unknown');
        inc(handlers, ev.handledBy ?? 'unknown');
        inc(modes, ev.mode ?? 'unknown');

        if (ev.severity === 'hard') {
            inc(modeHard, ev.mode ?? 'unknown');
        }

        for (const code of (ev.reason_codes ?? [])) {
            inc(reasonCodes, code);
        }
    }

    let trend = null;
    if (total >= 20) {
        const mid = Math.floor(total / 2);
        const older = events.slice(0, mid);
        const recent = events.slice(-Math.min(TREND_WINDOW, mid));
        const hardRate = (arr) => arr.filter((event) => event.severity === 'hard').length / arr.length;
        const olderRate = hardRate(older);
        const recentRate = hardRate(recent);
        const delta = recentRate - olderRate;

        trend = {
            older_count: older.length,
            recent_count: recent.length,
            older_hard_rate: olderRate,
            recent_hard_rate: recentRate,
            delta,
            direction: delta > 0.02 ? '↑ WORSE' : delta < -0.02 ? '↓ BETTER' : '→ STABLE',
        };
    }

    const routing = analyzeRoutingLearning(events);
    return { total, severity, confidence, reasonCodes, profiles, handlers, modes, modeHard, trend, routing };
}

function printRoutingSection(routing, sep, sep2) {
    console.log('\n' + sep);
    console.log('  SP4 ROUTING LEARNING REPORT');
    console.log(sep);

    const queryTypes = Object.entries(routing.stats.query_type)
        .filter(([key]) => key !== 'unclassified')
        .sort((a, b) => (b[1].hard_fail_rate + b[1].soft_fail_rate) - (a[1].hard_fail_rate + a[1].soft_fail_rate));

    console.log('\n' + sep2);
    console.log('  QUERY TYPE BREAKDOWN');
    console.log(sep2);
    if (queryTypes.length === 0) {
        console.log('  (zatiaľ bez query_type coverage)');
    } else {
        queryTypes.forEach(([queryType, value]) => {
            console.log(
                `  ${queryType.padEnd(18)} total=${String(value.total_count).padStart(4)} ` +
                `hard=${String(value.hard_fail_rate).padStart(5)}% soft=${String(value.soft_fail_rate).padStart(5)}% ` +
                `retry=${String(value.retry_rate).padStart(5)}% success=${String(value.retry_success_rate).padStart(5)}% ` +
                `dom=${value.dominant_reason_code || 'n/a'}`
            );
        });
    }

    console.log('\n' + sep2);
    console.log('  RETRY STATS');
    console.log(sep2);
    console.log(`  Primary events:       ${routing.meta.primary_events}`);
    console.log(`  Retry attempts:       ${routing.meta.retry_events}`);
    console.log(`  Retry applied:        ${routing.meta.primary_retry_applied_count}`);
    console.log(`  Retry improved:       ${routing.meta.primary_retry_success_count}`);
    console.log(`  Unclassified primary: ${routing.meta.unclassified_primary_events}`);

    console.log('\n' + sep2);
    console.log('  TOP FAIL COMBINATIONS');
    console.log(sep2);
    if (routing.top_fail_combinations.length === 0) {
        console.log('  (žiadne kombinácie)');
    } else {
        routing.top_fail_combinations.slice(0, 5).forEach((entry, index) => {
            console.log(
                `  ${index + 1}. ${entry.query_type} + ${entry.mode} ` +
                `(${entry.total_count} events, hard=${entry.hard_fail_rate}%, soft=${entry.soft_fail_rate}%, dom=${entry.dominant_reason_code || 'n/a'})`
            );
        });
    }

    console.log('\n' + sep2);
    console.log('  SUGGESTED HINTS');
    console.log(sep2);
    if (routing.routing_hints.length === 0) {
        console.log('  (žiadne hinty)');
    } else {
        routing.routing_hints.slice(0, 8).forEach((hint) => {
            console.log(`  - ${hint.query_type} → ${hint.suggested_action} [${hint.confidence}] | ${hint.reason}`);
        });
    }
}

function printReport(logState, stats) {
    const { skipped, missing } = logState;
    const sep = '═'.repeat(52);
    const sep2 = '─'.repeat(52);

    console.log('\n' + sep);
    console.log('  SP4 IMMUNE REPORT');
    console.log('  ' + new Date().toISOString());
    console.log('  Source: ' + LOG_PATH);
    console.log('  Routing summary: ' + SUMMARY_PATH);
    console.log(sep);

    if (missing) {
        console.log('\n  ⚠  Log file not found — no immune events logged yet.');
        console.log(`     Expected: ${LOG_PATH}`);
        console.log('\n' + sep + '\n');
        return;
    }

    const { total, severity, confidence, reasonCodes, profiles, handlers, modes, modeHard, trend, routing } = stats;

    if (total === 0) {
        console.log('\n  Log file empty — no immune events yet.');
        if (skipped > 0) console.log(`  Skipped ${skipped} invalid lines.`);
        printRoutingSection(routing, sep, sep2);
        console.log('\n' + sep + '\n');
        return;
    }

    if (skipped > 0) {
        console.log(`\n  ⚠  Skipped ${skipped} invalid JSON lines.`);
    }

    console.log(`\n  Total events logged:  ${total}`);

    console.log('\n' + sep2);
    console.log('  SEVERITY BREAKDOWN');
    console.log(sep2);
    const maxSev = Math.max(...severity.values(), 1);
    for (const [sev, count] of sortedDesc(severity)) {
        console.log(`  ${sev.padEnd(10)} ${String(count).padStart(5)}  ${bar(count, maxSev)}  ${pct(count, total)}`);
    }

    console.log('\n' + sep2);
    console.log('  CONFIDENCE BREAKDOWN');
    console.log(sep2);
    const maxConf = Math.max(...confidence.values(), 1);
    for (const [conf, count] of sortedDesc(confidence)) {
        console.log(`  ${conf.padEnd(10)} ${String(count).padStart(5)}  ${bar(count, maxConf)}  ${pct(count, total)}`);
    }

    console.log('\n' + sep2);
    console.log('  TOP REASON CODES  (max 10)');
    console.log(sep2);
    const topCodes = sortedDesc(reasonCodes).slice(0, 10);
    if (topCodes.length === 0) {
        console.log('  (žiadne reason_codes)');
    } else {
        const maxCode = topCodes[0][1];
        topCodes.forEach(([code, count], index) => {
            console.log(`  ${String(index + 1).padStart(2)}. ${code.padEnd(28)} ${String(count).padStart(4)}  ${bar(count, maxCode, 15)}`);
        });
    }

    console.log('\n' + sep2);
    console.log('  IMMUNE PROFILE BREAKDOWN');
    console.log(sep2);
    if (profiles.size === 0) {
        console.log('  (žiadne immune_profile data)');
    } else {
        const maxProf = Math.max(...profiles.values(), 1);
        for (const [profile, count] of sortedDesc(profiles)) {
            console.log(`  ${profile.padEnd(16)} ${String(count).padStart(5)}  ${bar(count, maxProf)}  ${pct(count, total)}`);
        }
    }

    console.log('\n' + sep2);
    console.log('  HANDLER ANALYSIS  (handledBy)');
    console.log(sep2);
    for (const [handler, count] of sortedDesc(handlers)) {
        console.log(`  ${handler.padEnd(24)} ${String(count).padStart(5)}  ${pct(count, total)}`);
    }

    console.log('\n' + sep2);
    console.log('  PERSONA / MODE ANALYSIS  (mode)');
    console.log(sep2);
    const maxMode = Math.max(...modes.values(), 1);
    for (const [persona, count] of sortedDesc(modes)) {
        const hardCount = modeHard.get(persona) ?? 0;
        const hardTag = hardCount > 0 ? `  ⚠ hard=${hardCount}` : '';
        console.log(`  ${persona.padEnd(16)} total=${String(count).padStart(4)}  ${bar(count, maxMode)}  ${pct(count, total)}${hardTag}`);
    }

    console.log('\n' + sep2);
    console.log('  TIME TREND  (hard fail rate)');
    console.log(sep2);
    if (!trend) {
        console.log(`  (nedostatok dát — potrebujem ≥20, mám ${total})`);
    } else {
        const fmt = (rate) => `${(rate * 100).toFixed(1)}%`;
        console.log(`  Staré  (prvých  ${String(trend.older_count).padStart(4)}):  hard rate = ${fmt(trend.older_hard_rate)}`);
        console.log(`  Nové   (posledných ${String(trend.recent_count).padStart(3)}):  hard rate = ${fmt(trend.recent_hard_rate)}`);
        console.log(`  Delta:   ${trend.delta > 0 ? '+' : ''}${(trend.delta * 100).toFixed(1)} pp`);
        console.log(`  Trend:   ${trend.direction}`);
    }

    console.log('\n' + sep);
    console.log('  EXECUTIVE SUMMARY');
    console.log(sep);

    const hardCount = severity.get('hard') ?? 0;
    const softCount = severity.get('soft') ?? 0;
    const unknownCount = severity.get('unknown') ?? 0;
    const passCount = severity.get('none') ?? 0;

    console.log(`\n  Total events:  ${total}`);
    console.log(`  Hard fails:    ${hardCount}  (${pct(hardCount, total)})`);
    console.log(`  Soft fails:    ${softCount}  (${pct(softCount, total)})`);
    console.log(`  Unknown:       ${unknownCount}  (${pct(unknownCount, total)})`);
    console.log(`  Pass:          ${passCount}  (${pct(passCount, total)})`);

    const worstCodes = sortedDesc(reasonCodes).slice(0, 3);
    if (worstCodes.length) {
        console.log('\n  Top issues:');
        worstCodes.forEach(([code, count], index) => {
            console.log(`    ${index + 1}. ${code} (${count})`);
        });
    }

    if (routing.top_risky_modes.length) {
        console.log('\n  Top risky modes:');
        routing.top_risky_modes.slice(0, 3).forEach((entry) => {
            console.log(`    - ${entry.mode}: hard=${entry.hard_fail_rate}% soft=${entry.soft_fail_rate}% dom=${entry.dominant_reason_code || 'n/a'}`);
        });
    }

    if (trend) {
        console.log(`\n  System trend:  ${trend.direction}`);
    }

    printRoutingSection(routing, sep, sep2);
    console.log('\n' + sep + '\n');
}

const logState = await parseLog(LOG_PATH);
const stats = analyze(logState.events);
writeRoutingLearningSummary(SUMMARY_PATH, stats.routing);
printReport(logState, stats);