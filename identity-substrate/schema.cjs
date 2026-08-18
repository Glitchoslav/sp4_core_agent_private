'use strict';

const SP4_TABLES = Object.freeze([
  'sp4_users',
  'sp4_credentials',
  'sp4_devices',
  'sp4_invites',
  'sp4_member_links',
  'sp4_consents',
  'sp4_audit'
]);

const REQUIRED_COLUMNS = Object.freeze({
  sp4_users: ['user_id', 'status', 'created_at'],
  sp4_credentials: ['credential_id', 'user_id', 'public_key', 'type', 'status', 'revoked_at'],
  sp4_devices: ['device_id', 'user_id', 'credential_id', 'public_key', 'cert_json', 'revoked_at'],
  sp4_invites: ['token', 'community', 'target_person_uid', 'expires_at', 'status', 'accepted_by_user_id', 'acceptance_json'],
  sp4_member_links: ['id', 'sp4_user_id', 'dhz_person_uid', 'dhz_member_id', 'status', 'linked_at', 'left_at'],
  sp4_consents: ['id', 'sp4_user_id', 'member_link_id', 'field', 'allowed', 'consent_version', 'granted_at', 'revoked_at', 'provenance_json'],
  sp4_audit: ['id', 'event_type', 'user_id', 'actor', 'payload_json', 'created_at']
});

function handleOf(db) {
  const handle = db?.db || db;
  if (!handle?.prepare || !handle?.exec) throw new TypeError('identity database handle required');
  return handle;
}

function assertIdentitySchemaShape(db) {
  const handle = handleOf(db);
  for (const [table, required] of Object.entries(REQUIRED_COLUMNS)) {
    const columns = handle.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
    if (columns.length === 0) continue;
    const missing = required.filter((column) => !columns.includes(column));
    if (missing.length > 0) {
      throw new Error(`SP4 identity schema mismatch: ${table} missing [${missing.join(', ')}]`);
    }
  }
}

function ensureIdentitySchema(db) {
  const handle = handleOf(db);
  handle.exec('PRAGMA foreign_keys = ON');
  assertIdentitySchemaShape(handle);
  handle.exec(`
    CREATE TABLE IF NOT EXISTS sp4_users (
      user_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sp4_credentials (
      credential_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      public_key TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'root' CHECK (type IN ('root','rotation')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
      created_at TEXT DEFAULT (datetime('now')),
      revoked_at TEXT,
      FOREIGN KEY(user_id) REFERENCES sp4_users(user_id)
    );
    CREATE TABLE IF NOT EXISTS sp4_devices (
      device_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credential_id TEXT NOT NULL,
      public_key TEXT NOT NULL,
      cert_json TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES sp4_users(user_id),
      FOREIGN KEY(credential_id) REFERENCES sp4_credentials(credential_id)
    );
    CREATE TABLE IF NOT EXISTS sp4_invites (
      token TEXT PRIMARY KEY,
      community TEXT NOT NULL DEFAULT 'dhz',
      target_person_uid TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
      accepted_by_user_id TEXT REFERENCES sp4_users(user_id),
      acceptance_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sp4_member_links (
      id INTEGER PRIMARY KEY,
      sp4_user_id TEXT NOT NULL,
      dhz_person_uid TEXT NOT NULL,
      dhz_member_id INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','left')),
      linked_at TEXT DEFAULT (datetime('now')),
      left_at TEXT,
      FOREIGN KEY(sp4_user_id) REFERENCES sp4_users(user_id)
    );
    CREATE TABLE IF NOT EXISTS sp4_consents (
      id INTEGER PRIMARY KEY,
      sp4_user_id TEXT NOT NULL,
      member_link_id INTEGER NOT NULL,
      field TEXT NOT NULL,
      allowed INTEGER NOT NULL DEFAULT 0 CHECK (allowed IN (0,1)),
      consent_version TEXT NOT NULL,
      granted_at TEXT,
      revoked_at TEXT,
      provenance_json TEXT NOT NULL,
      UNIQUE(sp4_user_id, member_link_id, field),
      FOREIGN KEY(sp4_user_id) REFERENCES sp4_users(user_id),
      FOREIGN KEY(member_link_id) REFERENCES sp4_member_links(id)
    );
    CREATE TABLE IF NOT EXISTS sp4_audit (
      id INTEGER PRIMARY KEY,
      event_type TEXT NOT NULL,
      user_id TEXT,
      actor TEXT NOT NULL,
      payload_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sp4_member_links_active
      ON sp4_member_links(sp4_user_id, dhz_person_uid) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_sp4_member_links_member
      ON sp4_member_links(dhz_member_id, status);
    CREATE INDEX IF NOT EXISTS idx_sp4_audit_user_id ON sp4_audit(user_id);
    CREATE INDEX IF NOT EXISTS idx_sp4_audit_event_type ON sp4_audit(event_type);
    CREATE INDEX IF NOT EXISTS idx_sp4_audit_created_at ON sp4_audit(created_at);
  `);
  return db;
}

function getIdentityTables(db) {
  return handleOf(db)
    .prepare(String.raw`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sp4\_%' ESCAPE '\'`)
    .all()
    .map((row) => row.name);
}

module.exports = {
  SP4_TABLES,
  REQUIRED_COLUMNS,
  assertIdentitySchemaShape,
  ensureIdentitySchema,
  getIdentityTables,
  handleOf
};
