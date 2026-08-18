import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { INDEX_SCHEMA } from './schema.js';

export class MemoryDbCatalog {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.rootDir = path.dirname(this.filePath);
    this.db = new DatabaseSync(this.filePath);
    this.db.exec(INDEX_SCHEMA);
  }

  register(record) {
    this.db.prepare(`
      INSERT INTO memory_dbs (db_id, path, tier, subject_id, key_ref, cipher, created_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.dbId,
      path.resolve(record.path),
      record.tier,
      record.subjectId ?? null,
      record.keyRef,
      record.cipher,
      record.createdAt,
      record.status ?? 'active'
    );
    return this.get(record.dbId);
  }

  get(dbId) {
    return this.db.prepare('SELECT * FROM memory_dbs WHERE db_id = ?').get(dbId);
  }

  listActive() {
    return this.db.prepare("SELECT * FROM memory_dbs WHERE status = 'active' ORDER BY db_id").all();
  }

  tableNames() {
    return this.db.prepare(`
      SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name
    `).all().map(({ name }) => name);
  }

  close() {
    this.db.close();
  }
}
