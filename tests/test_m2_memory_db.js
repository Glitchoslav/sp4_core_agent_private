import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, beforeEach, describe, test } from 'node:test';

import {
  MemoryDbCatalog,
  MemoryStore,
  assertIdentityEnvironment,
  createPrivateMemoryDatabase,
  createMemoryStoreFromEnvironment,
  createSharedMemoryDatabase,
  resolveKeyReference,
  validateSyncthingIgnore,
  uuidv7
} from '../memory-db/index.js';
import { inspectPrivateDatabase } from './helpers/inspect-private-db.js';

const require = createRequire(import.meta.url);
const substrate = require('../identity-substrate/index.cjs');

const CANARY_A = 'synthetic-novaka-canary-alpha';
const CANARY_B = 'synthetic-novaka-canary-bravo';
const FIXED_NOW = '2026-08-18T12:00:00.000Z';

function createIdentityFixture(rootDir) {
  const identityDb = substrate.openIdentityDatabase(path.join(rootDir, 'sp4-identity.db'));
  substrate.createUser(identityDb, { userId: 'user-a' });
  substrate.createUser(identityDb, { userId: 'user-b' });

  const keyA = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const keyB = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  const credentialA = substrate.addCredential(identityDb, { userId: 'user-a', publicKey: keyA });
  const credentialB = substrate.addCredential(identityDb, { userId: 'user-b', publicKey: keyB });
  return { credentialA, credentialB, identityDb };
}

function makeEntry(userId, credentialId, content) {
  return {
    id: uuidv7(),
    content,
    authorUser: userId,
    authorCred: credentialId,
    sig: Buffer.from(`synthetic-signature:${userId}`).toString('base64'),
    provenance: 'human',
    derivedFrom: null,
    minTier: 'private',
    sourceChannel: 'test',
    embeddingModel: null,
    embeddingDim: null,
    createdAt: FIXED_NOW
  };
}

describe('M2 memory databases', () => {
  let rootDir;
  let catalog;
  let identity;
  let store;
  let secrets;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp4-m2-synthetic-'));
    identity = createIdentityFixture(rootDir);
    secrets = {
      SP4_TEST_KEY_A: crypto.randomBytes(32).toString('hex'),
      SP4_TEST_KEY_B: crypto.randomBytes(32).toString('hex')
    };
    catalog = new MemoryDbCatalog(path.join(rootDir, 'sp4-index.db'));
    store = new MemoryStore({
      catalog,
      identityDb: identity.identityDb,
      substrate,
      nodeEnv: 'test',
      resolveKey: (keyRef) => resolveKeyReference(keyRef, { env: secrets })
    });
  });

  afterEach(() => {
    store?.close();
    catalog?.close();
    identity?.identityDb?.db?.close();
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  test('catalog has M2 tables and never creates member_identity', () => {
    const tables = catalog.tableNames();
    assert.deepEqual(tables.sort(), ['communities', 'community_members', 'memory_dbs']);
    assert.equal(tables.includes('member_identity'), false);

    catalog.close();
    catalog = new MemoryDbCatalog(path.join(rootDir, 'sp4-index.db'));
    assert.deepEqual(catalog.tableNames().sort(), ['communities', 'community_members', 'memory_dbs']);
  });

  test('shared DB contains entries, FTS triggers, shared_kb, and db_meta', () => {
    const dbPath = path.join(rootDir, 'sp4-shared.db');
    const db = createSharedMemoryDatabase({ path: dbPath, createdAt: FIXED_NOW });
    const objects = db.prepare("SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all();
    const names = new Set(objects.map(({ name }) => name));
    for (const name of ['entries', 'entries_fts', 'entries_fts_ai', 'entries_fts_ad', 'entries_fts_au', 'shared_kb', 'db_meta']) {
      assert.equal(names.has(name), true, `missing ${name}`);
    }
    assert.equal(names.has('entries_vec'), false);
    const sharedMetadata = Object.fromEntries(
      db.prepare('SELECT key, value FROM db_meta').all().map(({ key, value }) => [key, value])
    );
    assert.equal(sharedMetadata.cipher_profile, 'none');
    assert.equal(sharedMetadata.kdf_params, 'none');
    assert.equal(sharedMetadata.sig_verified, 'false');
    assert.equal(sharedMetadata.sig_status, 'stored-not-verified-until-M3');

    const insert = db.prepare(`INSERT INTO entries (
      id, content, author_user, author_cred, sig, provenance, derived_from,
      min_tier, source_channel, embedding_model, embedding_dim, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const entryId = uuidv7();
    insert.run(entryId, 'trigger insert canary', 'user-a', identity.credentialA.credential_id,
      'synthetic', 'human', null, 'shared', 'test', null, null, FIXED_NOW);
    assert.equal(db.prepare("SELECT count(*) AS count FROM entries_fts WHERE entries_fts MATCH 'insert'").get().count, 1);
    db.prepare('UPDATE entries SET content = ? WHERE id = ?').run('trigger update canary', entryId);
    assert.equal(db.prepare("SELECT count(*) AS count FROM entries_fts WHERE entries_fts MATCH 'insert'").get().count, 0);
    assert.equal(db.prepare("SELECT count(*) AS count FROM entries_fts WHERE entries_fts MATCH 'update'").get().count, 1);
    db.prepare('DELETE FROM entries WHERE id = ?').run(entryId);
    assert.equal(db.prepare("SELECT count(*) AS count FROM entries_fts WHERE entries_fts MATCH 'update'").get().count, 0);
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    assert.equal(
      fs.readFileSync(dbPath).subarray(0, 16).equals(Buffer.from('SQLite format 3\0')),
      true
    );
  });

  test('N4a finds own canary and N4b never searches another private DB', () => {
    store.provisionPrivate({ userId: 'user-a', keyRef: 'env:SP4_TEST_KEY_A', createdAt: FIXED_NOW });
    store.provisionPrivate({ userId: 'user-b', keyRef: 'env:SP4_TEST_KEY_B', createdAt: FIXED_NOW });
    const principalA = { userId: 'user-a', credentialId: identity.credentialA.credential_id };
    const principalB = { userId: 'user-b', credentialId: identity.credentialB.credential_id };
    store.writeEntry(principalA, 'private:user-a', makeEntry('user-a', identity.credentialA.credential_id, CANARY_A));
    store.writeEntry(principalB, 'private:user-b', makeEntry('user-b', identity.credentialB.credential_id, CANARY_B));

    assert.equal(store.searchAvailable(principalA, CANARY_A).length, 1);
    assert.equal(store.searchAvailable(principalA, CANARY_B).length, 0);
  });

  test('N20 and N21 private DB is encrypted with its FTS in the same file', () => {
    const dbPath = path.join(rootDir, 'sp4-private-user-a.db');
    const key = Buffer.from(secrets.SP4_TEST_KEY_A, 'hex');
    const db = createPrivateMemoryDatabase({
      path: dbPath,
      userId: 'user-a',
      key,
      createdAt: FIXED_NOW,
      environment: 'dev'
    });
    db.prepare(`INSERT INTO entries (
      id, content, author_user, author_cred, sig, provenance, derived_from,
      min_tier, source_channel, embedding_model, embedding_dim, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      uuidv7(), CANARY_A, 'user-a', identity.credentialA.credential_id, 'synthetic',
      'human', null, 'private', 'test', null, null, FIXED_NOW
    );
    assert.equal(
      db.prepare('SELECT count(*) AS count FROM entries_fts WHERE entries_fts MATCH ?')
        .get(`"${CANARY_A}"`).count,
      1
    );
    assert.equal(db.pragma('cipher', { simple: true }), 'sqlcipher');
    const metadata = Object.fromEntries(
      db.prepare('SELECT key, value FROM db_meta').all().map(({ key, value }) => [key, value])
    );
    assert.equal(metadata.cipher_profile, "cipher='sqlcipher';legacy=4");
    assert.match(metadata.kdf_params, /argon2id/);
    assert.equal(metadata.sig_verified, 'false');
    assert.equal(metadata.sig_status, 'stored-not-verified-until-M3');
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();

    const inspection = inspectPrivateDatabase(dbPath, { canary: CANARY_A });
    assert.equal(inspection.hasPlaintextHeader, false);
    assert.equal(inspection.containsCanary, false);
    const RawDatabase = createRequire(import.meta.url)('better-sqlite3-multiple-ciphers');
    assert.throws(() => {
      const unkeyed = new RawDatabase(dbPath, { readonly: true });
      try {
        unkeyed.prepare('SELECT count(*) FROM sqlite_master').get();
      } finally {
        unkeyed.close();
      }
    }, /encrypted|file is not a database|malformed/i);

    const reopened = createPrivateMemoryDatabase({ path: dbPath, userId: 'user-a', key, existing: true });
    const ftsSql = reopened.prepare("SELECT sql FROM sqlite_master WHERE name = 'entries_fts'").get().sql;
    assert.match(ftsSql, /USING fts5/);
    assert.doesNotMatch(ftsSql, /ATTACH|external/i);
    reopened.close();
    assert.throws(
      () => createPrivateMemoryDatabase({
        path: dbPath,
        userId: 'user-a',
        key: crypto.randomBytes(32),
        existing: true
      }),
      /MEMORY_DB_KEY_REJECTED/
    );
  });

  test('N22 stores only a key reference and no neighboring key file', () => {
    const record = store.provisionPrivate({ userId: 'user-a', keyRef: 'env:SP4_TEST_KEY_A', createdAt: FIXED_NOW });
    assert.equal(record.key_ref, 'env:SP4_TEST_KEY_A');
    assert.equal(record.key_ref.includes(secrets.SP4_TEST_KEY_A), false);
    assert.deepEqual(fs.readdirSync(rootDir).filter((name) => /key|secret|credential/i.test(name)), []);
    assert.throws(() => resolveKeyReference(`env:${secrets.SP4_TEST_KEY_A}`, { env: secrets }), /INVALID_KEY_REF/);
  });

  test('N23 requires private db, WAL, and SHM Syncthing exclusions', () => {
    const valid = 'sp4-private-*.db\nsp4-private-*.db-wal\nsp4-private-*.db-shm\n';
    assert.deepEqual(validateSyncthingIgnore(valid), { valid: true, missing: [] });
    assert.deepEqual(validateSyncthingIgnore('sp4-private-*.db\n').missing, [
      'sp4-private-*.db-wal',
      'sp4-private-*.db-shm'
    ]);
  });

  test('rejects unknown, revoked, mismatched, and foreign private authors atomically', () => {
    store.provisionPrivate({ userId: 'user-a', keyRef: 'env:SP4_TEST_KEY_A', createdAt: FIXED_NOW });
    const valid = makeEntry('user-a', identity.credentialA.credential_id, CANARY_A);
    const principalA = { userId: 'user-a', credentialId: identity.credentialA.credential_id };
    const principalB = { userId: 'user-b', credentialId: identity.credentialB.credential_id };
    assert.throws(() => store.writeEntry(principalA, 'private:user-a', { ...valid, authorCred: 'missing' }), /UNKNOWN_CREDENTIAL/);

    substrate.revokeCredential(identity.identityDb, identity.credentialA.credential_id);
    assert.throws(() => store.writeEntry(principalA, 'private:user-a', valid), /CREDENTIAL_REVOKED/);
    assert.throws(
      () => store.writeEntry(principalB, 'private:user-a', makeEntry('user-b', identity.credentialB.credential_id, CANARY_B)),
      /PRIVATE_OWNER_MISMATCH/
    );
    assert.equal(store.countEntries('private:user-a'), 0);
  });

  test('rejects an entry whose min_tier is stricter than the target DB', () => {
    store.provisionShared({ createdAt: FIXED_NOW });
    const principalA = { userId: 'user-a', credentialId: identity.credentialA.credential_id };
    assert.throws(
      () => store.writeEntry(
        principalA,
        'shared',
        makeEntry('user-a', identity.credentialA.credential_id, CANARY_A)
      ),
      /MIN_TIER_VIOLATION/
    );
    assert.equal(store.countEntries('shared'), 0);
  });

  test('shared provisioning is idempotency-safe', () => {
    store.provisionShared({ createdAt: FIXED_NOW });
    assert.throws(
      () => store.provisionShared({ createdAt: FIXED_NOW }),
      /MEMORY_DB_ALREADY_EXISTS/
    );
  });

  test('legacy read-only principals cannot read or write private entries', () => {
    store.provisionShared({ createdAt: FIXED_NOW });
    store.provisionPrivate({ userId: 'user-a', keyRef: 'env:SP4_TEST_KEY_A', createdAt: FIXED_NOW });
    const principalA = { userId: 'user-a', credentialId: identity.credentialA.credential_id };
    store.writeEntry(principalA, 'shared', {
      ...makeEntry('user-a', identity.credentialA.credential_id, 'synthetic legacy shared canary'),
      minTier: 'shared'
    });
    store.writeEntry(
      principalA,
      'private:user-a',
      makeEntry('user-a', identity.credentialA.credential_id, 'synthetic legacy private canary')
    );
    const legacy = { userId: 'user-a', credentialId: null, readOnly: true };
    assert.throws(() => store.readPrivateEntries(legacy, 'user-a'), /CREDENTIAL_REQUIRED/);
    assert.equal(store.searchAvailable(legacy, 'synthetic legacy shared canary').length, 1);
    assert.equal(store.searchAvailable(legacy, 'synthetic legacy private canary').length, 0);
    assert.throws(
      () => store.writeEntry(
        legacy,
        'private:user-a',
        makeEntry('user-a', identity.credentialA.credential_id, CANARY_A)
      ),
      /CREDENTIAL_REQUIRED/
    );
  });

  test('production refuses dev databases and identity startup requires both paths', () => {
    assert.throws(() => assertIdentityEnvironment({}), /SP4_IDENTITY_MODULE_PATH/);
    assert.throws(
      () => assertIdentityEnvironment({ SP4_IDENTITY_MODULE_PATH: 'identity-substrate/index.cjs' }),
      /SP4_IDENTITY_DB_PATH/
    );
    assert.deepEqual(assertIdentityEnvironment({
      SP4_IDENTITY_MODULE_PATH: 'identity-substrate/index.cjs',
      SP4_IDENTITY_DB_PATH: 'data/sp4-identity.db'
    }), {
      modulePath: 'identity-substrate/index.cjs',
      databasePath: 'data/sp4-identity.db'
    });

    const bootstrapped = createMemoryStoreFromEnvironment({
      env: {
        NODE_ENV: 'test',
        SP4_IDENTITY_MODULE_PATH: path.resolve('identity-substrate/index.cjs'),
        SP4_IDENTITY_DB_PATH: path.join(rootDir, 'startup-identity.db')
      },
      catalogPath: path.join(rootDir, 'startup-index.db')
    });
    assert.deepEqual(bootstrapped.catalog.tableNames().sort(), [
      'communities',
      'community_members',
      'memory_dbs'
    ]);
    bootstrapped.close();

    const dbPath = path.join(rootDir, 'sp4-private-user-a.db');
    const key = Buffer.from(secrets.SP4_TEST_KEY_A, 'hex');
    const db = createPrivateMemoryDatabase({ path: dbPath, userId: 'user-a', key, environment: 'dev' });
    db.close();
    assert.throws(
      () => createPrivateMemoryDatabase({ path: dbPath, userId: 'user-a', key, existing: true, nodeEnv: 'production' }),
      /DEV_DATABASE_IN_PRODUCTION/
    );
  });

  test('UUIDv7 values are valid and monotonic in one process', () => {
    const values = Array.from({ length: 100 }, () => uuidv7());
    for (const value of values) assert.match(value, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.deepEqual([...values].sort(), values);
    assert.equal(new Set(values).size, values.length);
  });
});
