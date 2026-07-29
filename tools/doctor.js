import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { callOllama, ollamaHealthCheck } from '../src/llm/ollamaClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function compactReason(error, debug = false) {
  if (!error) return '';
  if (debug) return error.stack || error.message || String(error);
  const message = error.message || String(error);
  return message.split('\n')[0].trim();
}

function formatLine(label, status, reason = '') {
  const dots = '.'.repeat(Math.max(1, 22 - label.length));
  return `- ${label} ${dots} ${status}${reason ? ` (${reason})` : ''}`;
}

async function tryImport(importPath) {
  await import(importPath);
}

export async function runDoctor({ debug = false } = {}) {
  const checks = [];
  const add = (label, status, reason = '') => checks.push({ label, status, reason });

  const nodeModulesOk = fs.existsSync(path.join(ROOT, 'node_modules'));
  add('node_modules', nodeModulesOk ? 'OK' : 'FAIL', nodeModulesOk ? '' : 'missing directory');

  try {
    const health = await ollamaHealthCheck();
    add('Ollama', health.healthy ? 'OK' : 'FAIL', health.healthy ? '' : (health.error || 'unreachable'));

    if (health.healthy && Array.isArray(health.models) && health.models.length > 0) {
      const installedModels = health.models.map((model) => model.name).filter(Boolean);
      const configuredPrimary = process.env.PRIMARY_MODEL;
      const model = configuredPrimary && installedModels.includes(configuredPrimary)
        ? configuredPrimary
        : installedModels[0];
      const result = await callOllama({
        model,
        prompt: 'Odpovedz iba slovom OK.',
        temperature: 0,
        num_predict: 20,
        timeoutMs: 15000,
        maxRetries: 0,
      });
      const hasText = result.ok && typeof result.text === 'string' && result.text.trim().length > 0;
      const fallbackReason = configuredPrimary && model !== configuredPrimary
        ? `; PRIMARY_MODEL ${configuredPrimary} unavailable`
        : '';
      add(
        'Local model',
        hasText ? 'OK' : 'FAIL',
        hasText ? `${model}${fallbackReason}` : (result.error || `${model} returned empty text`)
      );
    } else {
      add('Local model', 'WARN', 'not detected or configured');
    }
  } catch (error) {
    add('Ollama', 'FAIL', compactReason(error, debug));
    add('Local model', 'WARN', 'unknown');
  }

  const aiosBridgeLocal = path.join(ROOT, 'SP4AIOSBridge.js');
  const aiosBridgeSibling = path.resolve(ROOT, '..', 'SP4AIOS', 'src', 'bridge.js');
  const aiosConfig = path.join(ROOT, 'config', 'aios.config.json');
  const hasBridge = fs.existsSync(aiosBridgeLocal) || fs.existsSync(aiosBridgeSibling);
  const hasConfig = fs.existsSync(aiosConfig);
  add('SP4AIOS bridge', (hasBridge && hasConfig) ? 'OK' : 'WARN', (hasBridge && hasConfig) ? '' : 'bridge path or config missing');

  const requiredPaths = ['data', 'memory', 'logs'];
  const missingPaths = requiredPaths.filter((name) => !fs.existsSync(path.join(ROOT, name)));
  add('Memory paths', missingPaths.length === 0 ? 'OK' : 'WARN', missingPaths.length === 0 ? '' : `missing: ${missingPaths.join(', ')}`);

  try {
    const envExample = path.join(ROOT, '.env.example');
    if (!fs.existsSync(envExample)) {
      add('Environment', 'WARN', '.env.example missing');
    } else {
      const envPath = path.join(ROOT, '.env');
      if (!fs.existsSync(envPath)) {
        add('Environment', 'OK', '.env not set (using defaults)');
      } else {
        const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
        const invalid = lines
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'))
          .find((line) => !line.includes('=') || line.startsWith('='));
        add('Environment', invalid ? 'FAIL' : 'OK', invalid ? `invalid line: ${invalid}` : '');
      }
    }
  } catch (error) {
    add('Environment', 'FAIL', compactReason(error, debug));
  }

  try {
    await tryImport('../scheduler.js');
    await tryImport('../schedulerJobs.js');
    add('Scheduler', 'OK');
  } catch (error) {
    add('Scheduler', 'FAIL', compactReason(error, debug));
  }

  try {
    await tryImport('../memory.js');
    await tryImport('../src/policy/policy.js');
    await tryImport('../src/llm/llmRouter.js');
    await tryImport('../integration.js');
    add('Critical imports', 'OK');
  } catch (error) {
    add('Critical imports', 'FAIL', compactReason(error, debug));
  }

  const hasFail = checks.some((c) => c.status === 'FAIL');
  const hasWarn = checks.some((c) => c.status === 'WARN');
  const finalStatus = hasFail ? 'UNHEALTHY' : hasWarn ? 'DEGRADED' : 'HEALTHY';

  console.log('SP4 DOCTOR');
  for (const check of checks) {
    console.log(formatLine(check.label, check.status, check.reason));
  }
  console.log('');
  console.log(`FINAL STATUS: ${finalStatus}`);

  return { finalStatus, checks };
}

if (process.argv[1] === __filename) {
  runDoctor({ debug: process.argv.includes('--debug') }).then((result) => {
    process.exit(result.finalStatus === 'HEALTHY' ? 0 : 1);
  });
}
