'use strict';

const EVENT_TYPES = Object.freeze([
  'identity_created',
  'invite_accepted',
  'member_created',
  'consent_changed',
  'data_shared',
  'device_added',
  'device_revoked',
  'credential_revoked',
  'member_left'
]);

function append(db, eventType, userId, actor, payload = {}) {
  if (!EVENT_TYPES.includes(eventType)) throw new Error('UNKNOWN_EVENT_TYPE');
  db.db.prepare(
    'INSERT INTO sp4_audit (event_type, user_id, actor, payload_json) VALUES (?, ?, ?, ?)'
  ).run(eventType, userId || null, actor, JSON.stringify(payload));
}

function list(db, { limit = 100, userId } = {}) {
  if (userId) {
    return db.db.prepare(
      'SELECT * FROM sp4_audit WHERE user_id = ? ORDER BY id ASC LIMIT ?'
    ).all(userId, limit);
  }
  return db.db.prepare('SELECT * FROM sp4_audit ORDER BY id ASC LIMIT ?').all(limit);
}

module.exports = { append, list, EVENT_TYPES };
