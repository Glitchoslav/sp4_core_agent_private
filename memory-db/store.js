import path from 'node:path';

import { createPrivateMemoryDatabase, createSharedMemoryDatabase } from './database.js';
import { fail, requireText } from './errors.js';
import { assertKeyReference } from './key-reference.js';

const SAFE_SUBJECT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const TIER_STRICTNESS = Object.freeze({ shared: 0, community: 1, private: 2 });

function assertSubjectId(userId) {
  requireText(userId, 'INVALID_USER_ID');
  if (!SAFE_SUBJECT.test(userId)) fail('INVALID_USER_ID');
  return userId;
}

function entryValues(entry) {
  return [
    entry.id,
    entry.content,
    entry.authorUser,
    entry.authorCred,
    entry.sig,
    entry.provenance,
    entry.derivedFrom,
    entry.minTier,
    entry.sourceChannel,
    entry.embeddingModel,
    entry.embeddingDim,
    entry.createdAt
  ];
}

export class MemoryStore {
  constructor({ catalog, identityDb, substrate, resolveKey, nodeEnv = process.env.NODE_ENV }) {
    if (!catalog || !identityDb || typeof substrate?.getCredentialPrincipal !== 'function') {
      throw new TypeError('catalog, identityDb, and identity substrate are required');
    }
    if (typeof resolveKey !== 'function') throw new TypeError('resolveKey is required');
    this.catalog = catalog;
    this.identityDb = identityDb;
    this.substrate = substrate;
    this.resolveKey = resolveKey;
    this.nodeEnv = nodeEnv;
    this.handles = new Map();
  }

  provisionShared({ createdAt = new Date().toISOString() } = {}) {
    if (this.catalog.get('shared')) fail('MEMORY_DB_ALREADY_EXISTS');
    const filePath = path.join(this.catalog.rootDir, 'sp4-shared.db');
    const db = createSharedMemoryDatabase({ path: filePath, createdAt });
    this.handles.set('shared', db);
    return this.catalog.register({
      dbId: 'shared', path: filePath, tier: 'shared', subjectId: null,
      keyRef: 'none', cipher: 'none', createdAt
    });
  }

  provisionPrivate({ userId, keyRef, createdAt = new Date().toISOString() }) {
    assertSubjectId(userId);
    assertKeyReference(keyRef);
    const dbId = `private:${userId}`;
    if (this.catalog.get(dbId)) fail('MEMORY_DB_ALREADY_EXISTS');
    const filePath = path.join(this.catalog.rootDir, `sp4-private-${userId}.db`);
    const key = this.resolveKey(keyRef);
    const db = createPrivateMemoryDatabase({
      path: filePath,
      userId,
      key,
      createdAt,
      environment: this.nodeEnv === 'production' ? 'production' : 'dev',
      nodeEnv: this.nodeEnv
    });
    this.handles.set(dbId, db);
    try {
      return this.catalog.register({
        dbId, path: filePath, tier: 'private', subjectId: userId,
        keyRef, cipher: 'sqlcipher-v4', createdAt
      });
    } catch (error) {
      db.close();
      this.handles.delete(dbId);
      throw error;
    }
  }

  credentialPrincipal(credentialId) {
    if (!credentialId) fail('CREDENTIAL_REQUIRED');
    return this.substrate.getCredentialPrincipal(this.identityDb, credentialId);
  }

  assertPrincipal(principal) {
    if (principal?.readOnly === true || !principal?.credentialId) fail('CREDENTIAL_REQUIRED');
    const verified = this.credentialPrincipal(principal.credentialId);
    if (verified.userId !== principal.userId) fail('AUTHOR_CREDENTIAL_MISMATCH');
    return verified;
  }

  openRecord(record) {
    if (!record || record.status !== 'active') fail('MEMORY_DB_UNAVAILABLE');
    if (this.handles.has(record.db_id)) return this.handles.get(record.db_id);
    let db;
    if (record.tier === 'shared') {
      db = createSharedMemoryDatabase({ path: record.path, existing: true });
    } else if (record.tier === 'private') {
      db = createPrivateMemoryDatabase({
        path: record.path,
        userId: record.subject_id,
        key: this.resolveKey(record.key_ref),
        existing: true,
        nodeEnv: this.nodeEnv
      });
    } else {
      fail('COMMUNITY_DB_OUT_OF_SCOPE');
    }
    this.handles.set(record.db_id, db);
    return db;
  }

  writeEntry(principal, dbId, entry) {
    const verified = this.assertPrincipal(principal);
    if (verified.userId !== entry.authorUser) fail('AUTHOR_CREDENTIAL_MISMATCH');
    const record = this.catalog.get(dbId);
    if (!record) fail('MEMORY_DB_UNAVAILABLE');
    if (TIER_STRICTNESS[entry.minTier] === undefined
        || TIER_STRICTNESS[record.tier] === undefined
        || TIER_STRICTNESS[entry.minTier] > TIER_STRICTNESS[record.tier]) {
      fail('MIN_TIER_VIOLATION');
    }
    const author = this.credentialPrincipal(entry.authorCred);
    if (author.userId !== entry.authorUser) fail('AUTHOR_CREDENTIAL_MISMATCH');
    if (record.tier === 'private' && record.subject_id !== entry.authorUser) fail('PRIVATE_OWNER_MISMATCH');
    const db = this.openRecord(record);
    db.prepare(`
      INSERT INTO entries (
        id, content, author_user, author_cred, sig, provenance, derived_from,
        min_tier, source_channel, embedding_model, embedding_dim, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...entryValues(entry));
    return entry;
  }

  readPrivateEntries(principal, userId) {
    const verified = this.assertPrincipal(principal);
    if (verified.userId !== userId) fail('PRIVATE_OWNER_MISMATCH');
    const record = this.catalog.get(`private:${userId}`);
    return this.openRecord(record).prepare('SELECT * FROM entries ORDER BY created_at, id').all();
  }

  searchAvailable(principal, query) {
    requireText(query, 'MISSING_QUERY');
    let dbIds;
    if (principal?.readOnly === true && principal?.credentialId === null) {
      requireText(principal.userId, 'CREDENTIAL_REQUIRED');
      dbIds = ['shared'];
    } else {
      const verified = this.assertPrincipal(principal);
      dbIds = ['shared', `private:${verified.userId}`];
    }
    const ftsQuery = `"${query.replaceAll('"', '""')}"`;
    const matches = [];
    for (const dbId of dbIds) {
      const record = this.catalog.get(dbId);
      if (!record || record.status !== 'active') continue;
      const rows = this.openRecord(record).prepare(`
        SELECT e.*, ? AS db_id
          FROM entries_fts f
          JOIN entries e ON e.rowid = f.rowid
         WHERE entries_fts MATCH ?
         ORDER BY e.created_at, e.id
      `).all(dbId, ftsQuery);
      matches.push(...rows);
    }
    return matches;
  }

  countEntries(dbId) {
    const record = this.catalog.get(dbId);
    return this.openRecord(record).prepare('SELECT count(*) AS count FROM entries').get().count;
  }

  close() {
    for (const db of this.handles.values()) db.close();
    this.handles.clear();
  }
}
