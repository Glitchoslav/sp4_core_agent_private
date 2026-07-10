#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SP4_VERSION } from './src/version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const START_ENTRY = 'index_v07.js';
const SMOKE_TEST_ENTRY = 'tests/smoke_test.js';

function printUsage() {
  console.log('SP4 operator launcher');
  console.log('Usage: node sp4.js <start|doctor|status|test>');
}

function runNodeScript(scriptPath, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: 'inherit',
      env: process.env,
      cwd: __dirname,
    });
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

function resolveLauncherPath(relativePath) {
  return path.resolve(__dirname, relativePath);
}

async function main() {
  const command = process.argv[2];
  const verbose = process.env.SP4_VERBOSE === '1' || process.env.SP4_DEBUG === 'true';

  if (!command || ['-h', '--help', 'help'].includes(command)) {
    printUsage();
    process.exit(0);
  }

  if (command === 'start') {
    if (verbose) {
      console.log('[BOOT] entrypoint=' + START_ENTRY);
      console.log('[BOOT] command=start');
      console.log('[BOOT] version=' + SP4_VERSION);
      console.log('[BOOT] version_source=src/version.js');
      console.log('[BOOT] mirror_trigger_detector=disabled');
    }
    const code = await runNodeScript(resolveLauncherPath(START_ENTRY));
    process.exit(code);
  }

  if (command === 'doctor') {
    const { runDoctor } = await import('./tools/doctor.js');
    const result = await runDoctor({ debug: process.argv.includes('--debug') });
    process.exit(result.finalStatus === 'HEALTHY' ? 0 : 1);
  }

  if (command === 'status') {
    const { runStatus } = await import('./tools/status.js');
    await runStatus();
    process.exit(0);
  }

  if (command === 'test') {
    console.log('SP4 TEST');
    console.log(`- smoke path .......... ${SMOKE_TEST_ENTRY}`);
    console.log(`- command ............. node ${SMOKE_TEST_ENTRY}`);
    const code = await runNodeScript(resolveLauncherPath(SMOKE_TEST_ENTRY));
    process.exit(code);
  }

  console.error(`Unknown command: ${command}`);
  printUsage();
  process.exit(1);
}

main().catch((error) => {
  console.error(`SP4 launcher error: ${error?.message || String(error)}`);
  process.exit(1);
});
