'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { ensureIdentitySchema } = require('./schema.cjs');

function defaultIdentityDbPath() {
  const runtimeRoot = process.env.SP4_RUNTIME_ROOT
    ? path.resolve(process.env.SP4_RUNTIME_ROOT)
    : path.resolve(__dirname, '..');
  return path.join(runtimeRoot, 'data', 'identity', 'sp4-identity.db');
}

function openIdentityDatabase(dbPath = process.env.SP4_IDENTITY_DB_PATH || defaultIdentityDbPath()) {
  const resolved = path.resolve(dbPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const handle = new DatabaseSync(resolved);
  const db = { db: handle, path: resolved };
  ensureIdentitySchema(db);
  return db;
}

module.exports = { defaultIdentityDbPath, openIdentityDatabase };
