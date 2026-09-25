// Guard proti neexistujucim model tagom v kode (incident qwen3:8b -> 404 -> OLLAMA_UNHEALTHY).
// Skenuje src/, sp4os/ a root monolit (*.js) na string literaly tvaru <model>:<tag>.
// Zdroj pravdy pre tagy je .env a src/core/localModelRegistry.js — tie sa neskenuju.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// `ollama list` — pri instalacii/odstraneni modelu aktualizuj.
const INSTALLED = new Set([
  'qwen2.5-coder:7b', 'phi4-mini:3.8b', 'qwen3.5:4b', 'qwen3.5:0.8b', 'qwen3:4b',
  'gemma3:4b', 'deepseek-coder:6.7b', 'llama3.2:3b', 'phi3:mini', 'sp4-popici:latest',
  'gemma3:1b', 'gemma:7b-instruct', 'qwen2.5:7b', 'llama3:8b',
]);

const EXCLUDED = new Set([
  path.join('src', 'core', 'localModelRegistry.js'),
]);

const MODEL_LITERAL = /['"`]((?:qwen|gemma|llama|phi|deepseek|mistral|mixtral|codellama|sp4-popici)[a-z0-9._-]*:[a-z0-9._-]+)['"`]/gi;

function listFiles(dir, recursive) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive && entry.name !== 'node_modules') out.push(...listFiles(full, true));
    } else if (/\.(m?js|cjs)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function scan() {
  const files = [
    ...listFiles(ROOT, false),
    ...listFiles(path.join(ROOT, 'src'), true),
    ...listFiles(path.join(ROOT, 'sp4os'), true),
  ];
  const violations = [];
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (EXCLUDED.has(rel)) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const match of line.matchAll(MODEL_LITERAL)) {
        if (!INSTALLED.has(match[1].toLowerCase())) {
          violations.push(`${rel.split(path.sep).join('/')}:${i + 1} ${match[1]}`);
        }
      }
    });
  }
  return violations;
}

test('code references only installed Ollama model tags', () => {
  const violations = scan();
  assert.deepEqual(violations, [], `Non-installed model tags:\n  ${violations.join('\n  ')}`);
});

test('scanner catches known-bad tags', () => {
  const sample = `const a = 'qwen3:8b'; const b = "qwen2.5:14b"; const c = \`gemma3:12b\`; const ok = 'gemma3:4b';`;
  const hits = [...sample.matchAll(MODEL_LITERAL)].map((m) => m[1]).filter((m) => !INSTALLED.has(m));
  assert.deepEqual(hits, ['qwen3:8b', 'qwen2.5:14b', 'gemma3:12b']);
});
