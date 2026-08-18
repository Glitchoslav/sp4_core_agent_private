export const INDEX_SCHEMA = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS memory_dbs (
    db_id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    tier TEXT NOT NULL CHECK(tier IN ('private','community','shared')),
    subject_id TEXT,
    key_ref TEXT NOT NULL,
    cipher TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active','archived','revoked'))
  );
  CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_user_id TEXT NOT NULL,
    dhz_zbor_id INTEGER,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS community_members (
    community_id TEXT NOT NULL REFERENCES communities(id),
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner','admin','member')),
    added_by TEXT NOT NULL,
    added_at TEXT NOT NULL,
    PRIMARY KEY(community_id, user_id)
  );
`;

export const MEMORY_SCHEMA = `
  CREATE TABLE entries (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    author_user TEXT NOT NULL,
    author_cred TEXT NOT NULL,
    sig TEXT NOT NULL,
    provenance TEXT NOT NULL
      CHECK(provenance IN ('human','local_model','cloud_model','derived','imported')),
    derived_from TEXT,
    min_tier TEXT NOT NULL CHECK(min_tier IN ('private','community','shared')),
    source_channel TEXT,
    embedding_model TEXT,
    embedding_dim INTEGER,
    created_at TEXT NOT NULL,
    CHECK (provenance <> 'derived' OR derived_from IS NOT NULL)
  );
  CREATE VIRTUAL TABLE entries_fts USING fts5(
    content, content='entries', content_rowid='rowid',
    tokenize='unicode61 remove_diacritics 2'
  );
  CREATE TRIGGER entries_fts_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
  END;
  CREATE TRIGGER entries_fts_ad AFTER DELETE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
  END;
  CREATE TRIGGER entries_fts_au AFTER UPDATE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, content) VALUES ('delete', old.rowid, old.content);
    INSERT INTO entries_fts(rowid, content) VALUES (new.rowid, new.content);
  END;
  CREATE TABLE db_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

export const SHARED_KB_SCHEMA = `
  CREATE TABLE shared_kb (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source TEXT NOT NULL,
    origin_provenance TEXT NOT NULL
      CHECK(origin_provenance IN ('human','local_model','cloud_model','imported')),
    curated_by TEXT NOT NULL,
    curated_sig TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`;
