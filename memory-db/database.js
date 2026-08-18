import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3-multiple-ciphers';

import { fail, requireText } from './errors.js';
import { MEMORY_SCHEMA, SHARED_KB_SCHEMA } from './schema.js';

const SCHEMA_VERSION = '1';
const SQLCIPHER_PROFILE = "cipher='sqlcipher';legacy=4";
const KDF_PARAMS = 'external-kek=argon2id;dek=256-bit;sqlcipher-kdf=PBKDF2;kdf_algorithm=SHA512(2);hmac_algorithm=SHA512(2);kdf_iter=256000';

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

function configureCommon(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
}

function configureSqlCipherProfile(db) {
  db.pragma("cipher = 'sqlcipher'");
  db.pragma('legacy = 4');
  db.pragma('kdf_algorithm = 2');
  db.pragma('hmac_algorithm = 2');
  db.pragma('kdf_iter = 256000');
}

function applySqlCipherKey(db, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) fail('INVALID_DEK_FORMAT');
  configureSqlCipherProfile(db);
  db.pragma(`key = "x'${key.toString('hex')}'"`);
  try {
    db.prepare('SELECT count(*) AS count FROM sqlite_master').get();
  } catch (error) {
    db.close();
    fail('MEMORY_DB_KEY_REJECTED', error);
  }
}

function insertMetadata(db, metadata) {
  const insert = db.prepare('INSERT INTO db_meta (key, value) VALUES (?, ?)');
  const transaction = db.transaction(() => {
    for (const [key, value] of Object.entries(metadata)) insert.run(key, String(value));
  });
  transaction();
}

function metadataMap(db) {
  return Object.fromEntries(db.prepare('SELECT key, value FROM db_meta').all().map(({ key, value }) => [key, value]));
}

export function createSharedMemoryDatabase({ path: filePath, createdAt = new Date().toISOString(), existing = false }) {
  ensureParent(filePath);
  const db = new Database(filePath);
  configureSqlCipherProfile(db);
  db.prepare('SELECT count(*) AS count FROM sqlite_master').get();
  configureCommon(db);
  if (!existing) {
    db.exec(MEMORY_SCHEMA);
    db.exec(SHARED_KB_SCHEMA);
    insertMetadata(db, {
      tier: 'shared',
      schema_version: SCHEMA_VERSION,
      cipher_profile: 'none;driver-profile=sqlcipher',
      kdf_params: 'none',
      created_at: createdAt
    });
  }
  return db;
}

export function createPrivateMemoryDatabase({
  path: filePath,
  userId,
  key,
  createdAt = new Date().toISOString(),
  environment = 'dev',
  existing = false,
  nodeEnv = process.env.NODE_ENV
}) {
  requireText(userId, 'INVALID_USER_ID');
  ensureParent(filePath);
  if (!existing && fs.existsSync(filePath)) fail('MEMORY_DB_ALREADY_EXISTS');
  const db = new Database(filePath);
  applySqlCipherKey(db, key);
  configureCommon(db);
  if (!existing) {
    db.exec(MEMORY_SCHEMA);
    insertMetadata(db, {
      tier: 'private',
      owner_user_id: userId,
      schema_version: SCHEMA_VERSION,
      cipher_profile: SQLCIPHER_PROFILE,
      kdf_params: KDF_PARAMS,
      created_at: createdAt,
      env: environment
    });
  }
  const metadata = metadataMap(db);
  if (metadata.tier !== 'private' || metadata.owner_user_id !== userId) {
    db.close();
    fail('PRIVATE_DB_METADATA_MISMATCH');
  }
  if (nodeEnv === 'production' && metadata.env === 'dev') {
    db.close();
    fail('DEV_DATABASE_IN_PRODUCTION');
  }
  return db;
}

export function inspectPrivateDatabase(filePath, { canary }) {
  const bytes = fs.readFileSync(filePath);
  return {
    hasPlaintextHeader: bytes.subarray(0, 16).equals(Buffer.from('SQLite format 3\0')),
    containsCanary: bytes.includes(Buffer.from(canary, 'utf8'))
  };
}
