import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function formatLine(label, value) {
  const dots = '.'.repeat(Math.max(1, 22 - label.length));
  return `- ${label} ${dots} ${value ?? 'unknown'}`;
}

function readEpochs() {
  const epochPath = path.join(ROOT, 'data', 'epochs.json');
  if (!fs.existsSync(epochPath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(epochPath, 'utf-8'));
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw.jobs)) return raw.jobs;
    return null;
  } catch {
    return null;
  }
}

function detectFallbackMode(epochs, routerStats) {
  if (routerStats?.ollama?.unhealthy) return 'cloud-preemptive';
  if (!epochs || epochs.length === 0) return 'unknown';
  const recent = epochs.slice(-50).reverse();
  const hit = recent.find((item) => {
    const text = `${item.description || ''} ${item.error || ''}`.toLowerCase();
    return text.includes('fallback') || text.includes('cloud llm');
  });
  return hit ? 'cloud-fallback' : 'none';
}

function countTimeouts(epochs) {
  if (!epochs) return 'unknown';
  const count = epochs.slice(-100).filter((item) => {
    const description = String(item.description || '').toLowerCase();
    const type = String(item?.data?.errorType || '').toLowerCase();
    return description.includes('timeout') || type === 'timeout';
  }).length;
  return String(count);
}

function countErrors(epochs) {
  if (!epochs) return 'unknown';
  const count = epochs.slice(-100).filter((item) => {
    const description = String(item.description || '').toLowerCase();
    return description.includes('failed') || description.includes('error') || Boolean(item?.data?.error);
  }).length;
  return String(count);
}

export async function runStatus() {
  let provider = 'unknown';
  let cloudPolicy = 'unknown';
  let fallbackMode = 'unknown';
  let recentTimeouts = 'unknown';
  let recentErrors = 'unknown';
  let scheduler = 'unknown';
  let memory = 'unknown';
  let profile = 'unknown';

  try {
    const { resolvePolicy } = await import('../src/policy/policy.js');
    const policy = resolvePolicy({});
    provider = policy.allowCloud ? 'autonomous_cloud' : 'local_ollama';
    cloudPolicy = policy.allowCloud ? 'allowed' : 'blocked by default';
    profile = process.env.SP4_PROFILE || policy.route || 'unknown';
  } catch {}

  const epochs = readEpochs();
  try {
    const { getRouterStats } = await import('../src/llm/llmRouter.js');
    const routerStats = getRouterStats();
    fallbackMode = detectFallbackMode(epochs, routerStats);
  } catch {}
  recentTimeouts = countTimeouts(epochs);
  recentErrors = countErrors(epochs);

  try {
    const { getSchedulerStatus } = await import('../scheduler.js');
    const schedulerStatus = getSchedulerStatus();
    scheduler = schedulerStatus.initialized
      ? `active (current process, ${schedulerStatus.jobCount} jobs)`
      : 'not observable (process-local state)';
  } catch {
    scheduler = 'unknown';
  }

  try {
    const memoryPath = path.join(ROOT, 'data', 'memory.json');
    if (fs.existsSync(memoryPath)) {
      const { loadMemory } = await import('../memory.js');
      await loadMemory();
      memory = 'OK';
    } else {
      memory = 'missing';
    }
  } catch {
    memory = 'degraded';
  }

  console.log('SP4 STATUS');
  console.log(formatLine('provider', provider));
  console.log(formatLine('cloud policy', cloudPolicy));
  console.log(formatLine('fallback mode', fallbackMode));
  console.log(formatLine('recent timeouts', recentTimeouts));
  console.log(formatLine('recent errors', recentErrors));
  console.log(formatLine('scheduler', scheduler));
  console.log(formatLine('memory', memory));
  console.log(formatLine('profile', profile));

  return {
    provider,
    cloudPolicy,
    fallbackMode,
    recentTimeouts,
    recentErrors,
    scheduler,
    memory,
    profile
  };
}

if (process.argv[1] === __filename) {
  runStatus().then(() => process.exit(0));
}
