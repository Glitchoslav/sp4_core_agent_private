'use strict';

const crypto = require('node:crypto');
const {
  MAX_PAST_AGE_MS,
  assertFreshTimestamp,
  fail,
  getCredentialPrincipal,
  verifySignedPayload
} = require('./identity.cjs');

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
  );
}

function bodyHash(body) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(canonicalize(body ?? null)))
    .digest('hex');
}

function buildApiRequestPayload({
  method,
  path,
  memberId = null,
  communityId = null,
  entryId = null,
  query = {},
  body = null,
  issuedAt,
  nonce
}) {
  const context = canonicalize({
    bodySha256: bodyHash(body),
    communityId: communityId === null ? null : String(communityId),
    entryId: entryId === null ? null : String(entryId),
    issuedAt: String(issuedAt || ''),
    memberId: memberId === null ? null : String(memberId),
    method: String(method || '').toUpperCase(),
    nonce: String(nonce || ''),
    path: String(path || ''),
    query: canonicalize(query || {})
  });
  return `sp4-api:v1:${Buffer.from(JSON.stringify(context)).toString('base64url')}`;
}

function activeMemberForUser(db, userId, memberId) {
  return db.db.prepare(`
    SELECT id, sp4_user_id, dhz_member_id
      FROM sp4_member_links
     WHERE sp4_user_id = ? AND CAST(dhz_member_id AS TEXT) = ? AND status = 'active'
  `).get(userId, String(memberId));
}

function anyActiveMembership(db, userId, communityId) {
  if (communityId !== 'dhz') return null;
  return db.db.prepare(`
    SELECT id, sp4_user_id, dhz_member_id
      FROM sp4_member_links
     WHERE sp4_user_id = ? AND status = 'active'
     LIMIT 1
  `).get(userId);
}

function createApiAuthorizer({ db, now = Date.now } = {}) {
  if (!db?.db) throw new TypeError('identity database handle required');
  const seenNonces = new Map();

  function prune(nowMs) {
    for (const [key, expiresAt] of seenNonces) {
      if (expiresAt < nowMs) seenNonces.delete(key);
    }
  }

  function authorize(request) {
    const nowMs = now();
    assertFreshTimestamp(request.issuedAt, nowMs);
    if (typeof request.nonce !== 'string' || request.nonce.trim() === '') fail('MISSING_FIELD');
    const nonceKey = `${request.credentialId}:${request.nonce}`;
    prune(nowMs);
    if (seenNonces.has(nonceKey)) fail('REPLAY_DETECTED');

    const payload = buildApiRequestPayload(request);
    verifySignedPayload(db, {
      credentialId: request.credentialId,
      payload,
      signatureB64: request.signatureB64
    });
    const principal = getCredentialPrincipal(db, request.credentialId);

    if (request.memberId !== null && request.memberId !== undefined) {
      if (!activeMemberForUser(db, principal.userId, request.memberId)) fail('SUBJECT_MISMATCH');
    }
    if (request.communityId !== null && request.communityId !== undefined) {
      if (!anyActiveMembership(db, principal.userId, String(request.communityId))) {
        fail('NOT_COMMUNITY_MEMBER');
      }
    }

    seenNonces.set(nonceKey, nowMs + MAX_PAST_AGE_MS);
    return {
      ...principal,
      memberId: request.memberId ?? null,
      communityId: request.communityId ?? null
    };
  }

  return { authorize };
}

function resolveLegacyReadOnlyPrincipal(db, { memberId, communityId }) {
  let link;
  if (memberId !== null && memberId !== undefined) {
    link = db.db.prepare(`
      SELECT sp4_user_id, dhz_member_id FROM sp4_member_links
       WHERE CAST(dhz_member_id AS TEXT) = ? AND status = 'active'
    `).get(String(memberId));
  } else if (communityId === 'dhz') {
    fail('MISSING_MEMBER_ASSERTION');
  }
  if (!link) fail('NOT_COMMUNITY_MEMBER');
  return {
    userId: link.sp4_user_id,
    memberId: String(link.dhz_member_id),
    credentialId: null,
    readOnly: true
  };
}

module.exports = {
  buildApiRequestPayload,
  createApiAuthorizer,
  resolveLegacyReadOnlyPrincipal,
  bodyHash
};
