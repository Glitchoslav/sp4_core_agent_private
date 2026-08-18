import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { createBridgeIdentityAuth } from '../bridge-identity-auth.js';
import { routeContext } from '../bridge-identity-auth.js';

const NOW_MS = Date.parse('2026-08-18T12:00:00.000Z');
const NOW = new Date(NOW_MS).toISOString();

let substrate;
let sqlite;
let db;
let authorizer;
let userA;
let userB;
let outsider;

function keyPair() {
  const pair = crypto.generateKeyPairSync('ed25519');
  return {
    ...pair,
    publicKey: pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64')
  };
}

function sign(privateKey, payload) {
  return crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64');
}

function credential(userId, credentialId) {
  const keys = keyPair();
  sqlite.prepare('INSERT INTO sp4_users (user_id) VALUES (?)').run(userId);
  sqlite.prepare(
    'INSERT INTO sp4_credentials (credential_id, user_id, public_key, type) VALUES (?, ?, ?, ?)'
  ).run(credentialId, userId, keys.publicKey, 'root');
  return { userId, credentialId, ...keys };
}

function requestFor(principal, {
  method = 'GET',
  path,
  memberId = null,
  communityId = null,
  entryId = null,
  query = {},
  body = null,
  issuedAt = NOW,
  nonce = crypto.randomUUID(),
  signedEntryId = entryId
}) {
  const payload = substrate.buildApiRequestPayload({
    method,
    path,
    memberId,
    communityId,
    entryId: signedEntryId,
    query,
    body,
    issuedAt,
    nonce
  });
  return {
    method,
    path,
    memberId,
    communityId,
    entryId,
    query,
    body,
    credentialId: principal.credentialId,
    issuedAt,
    nonce,
    signatureB64: sign(principal.privateKey, payload)
  };
}

function rejectsCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code, `expected ${code}`);
}

before(async () => {
  substrate = (await import('../identity-substrate/index.cjs')).default;
  sqlite = new DatabaseSync(':memory:');
  db = { db: sqlite };
  substrate.ensureIdentitySchema(db);

  userA = credential('user-a', 'cred-a');
  userB = credential('user-b', 'cred-b');
  outsider = credential('user-outsider', 'cred-outsider');
  sqlite.prepare('INSERT INTO sp4_users (user_id) VALUES (?)').run('user-legacy');
  sqlite.prepare(
    "INSERT INTO sp4_member_links (sp4_user_id, dhz_person_uid, dhz_member_id, status) VALUES (?, ?, ?, 'active')"
  ).run(userA.userId, 'person-a', 101);
  sqlite.prepare(
    "INSERT INTO sp4_member_links (sp4_user_id, dhz_person_uid, dhz_member_id, status) VALUES (?, ?, ?, 'active')"
  ).run(userB.userId, 'person-b', 202);
  sqlite.prepare(
    "INSERT INTO sp4_member_links (sp4_user_id, dhz_person_uid, dhz_member_id, status) VALUES (?, ?, ?, 'active')"
  ).run('user-legacy', 'person-legacy', 303);

  authorizer = substrate.createApiAuthorizer({ db, now: () => NOW_MS });
});

describe('M1 credential transition', () => {
  test('Express mount trimming cannot remove the signed API route domain', () => {
    const context = routeContext({
      path: '/202/memory',
      originalUrl: '/api/member/202/memory?entry_id=e-1',
      query: { entry_id: 'e-1' },
      body: null,
      headers: {}
    });
    assert.equal(context.path, '/api/member/202/memory');
    assert.equal(context.memberId, '202');
    assert.equal(context.entryId, 'e-1');
  });

  function invoke({ method, path, memberHeader, body = null }) {
    const middleware = createBridgeIdentityAuth({ db, now: () => NOW_MS });
    let nextCalls = 0;
    let statusCode = null;
    let responseBody = null;
    const req = {
      method,
      path,
      originalUrl: path,
      headers: memberHeader ? { 'x-sp4-member-id': memberHeader } : {},
      body,
      query: {}
    };
    const res = {
      status(code) { statusCode = code; return this; },
      json(value) { responseBody = value; return this; }
    };
    middleware(req, res, () => { nextCalls += 1; });
    return { nextCalls, statusCode, responseBody, principal: req.sp4Principal };
  }

  test('member without credential can read only own minimal memory', () => {
    const own = invoke({
      method: 'GET',
      path: '/api/member/303/memory',
      memberHeader: '303'
    });
    assert.equal(own.nextCalls, 1);
    assert.equal(own.principal.readOnly, true);
    assert.equal(own.principal.userId, 'user-legacy');

    const foreign = invoke({
      method: 'GET',
      path: '/api/member/202/memory',
      memberHeader: '303'
    });
    assert.equal(foreign.nextCalls, 0);
    assert.equal(foreign.statusCode, 403);
    assert.equal(foreign.responseBody.error, 'SUBJECT_MISMATCH');
  });

  test('member without credential cannot write private/minimal memory', () => {
    const result = invoke({
      method: 'POST',
      path: '/api/member/303/note',
      memberHeader: '303',
      body: { text: 'blocked' }
    });
    assert.equal(result.nextCalls, 0);
    assert.equal(result.statusCode, 401);
    assert.equal(result.responseBody.error, 'CREDENTIAL_REQUIRED');
  });
});

after(() => sqlite?.close());

describe('M1 negative auth/API gates', () => {
  test('N1 user A cannot read private/minimal memory of user B', () => {
    const request = requestFor(userA, {
      path: '/api/member/202/memory',
      memberId: '202'
    });
    rejectsCode(() => authorizer.authorize(request), 'SUBJECT_MISMATCH');
  });

  test('N2 signature over a foreign entry_id cannot authorize another entry', () => {
    const request = requestFor(userA, {
      path: '/api/member/101/memory',
      memberId: '101',
      entryId: 'entry-a',
      signedEntryId: 'entry-b'
    });
    rejectsCode(() => authorizer.authorize(request), 'INVALID_SIGNATURE');
  });

  test('N3 non-member cannot read community memory', () => {
    const request = requestFor(outsider, {
      path: '/api/collective/insights',
      communityId: 'dhz'
    });
    rejectsCode(() => authorizer.authorize(request), 'NOT_COMMUNITY_MEMBER');
  });

  test('N6 stale signature and nonce replay are rejected', () => {
    const stale = requestFor(userA, {
      path: '/api/collective/insights',
      communityId: 'dhz',
      issuedAt: new Date(NOW_MS - substrate.MAX_PAST_AGE_MS - 1).toISOString()
    });
    rejectsCode(() => authorizer.authorize(stale), 'STALE_TIMESTAMP');

    const nonce = 'nonce-replay-gate';
    const first = requestFor(userA, {
      path: '/api/collective/insights',
      communityId: 'dhz',
      nonce
    });
    assert.equal(authorizer.authorize(first).userId, userA.userId);
    rejectsCode(() => authorizer.authorize(first), 'REPLAY_DETECTED');
  });
});
