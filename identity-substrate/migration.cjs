'use strict';

const { SP4_TABLES, ensureIdentitySchema } = require('./schema.cjs');

function tableExists(handle, table) {
  return Boolean(handle.prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?"
  ).get(table));
}

function migrateIdentityTables({ sourceDb, targetDb }) {
  if (!sourceDb?.db || !targetDb?.db) throw new TypeError('sourceDb and targetDb are required');
  ensureIdentitySchema(targetDb);
  const report = {};

  targetDb.db.exec('BEGIN IMMEDIATE');
  try {
    for (const table of SP4_TABLES) {
      if (!tableExists(sourceDb.db, table)) {
        report[table] = { source: 0, inserted: 0, target: 0 };
        continue;
      }
      const rows = sourceDb.db.prepare(`SELECT * FROM ${table} ORDER BY rowid ASC`).all();
      const columns = sourceDb.db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name);
      const placeholders = columns.map(() => '?').join(', ');
      const insert = targetDb.db.prepare(
        `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
      );
      let inserted = 0;
      for (const row of rows) {
        const result = insert.run(...columns.map((column) => row[column]));
        inserted += Number(result.changes || 0);
      }
      const target = targetDb.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
      if (Number(target) < rows.length) throw new Error(`identity migration count mismatch: ${table}`);
      report[table] = { source: rows.length, inserted, target: Number(target) };
    }
    targetDb.db.exec('COMMIT');
    return report;
  } catch (error) {
    targetDb.db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = { migrateIdentityTables };
