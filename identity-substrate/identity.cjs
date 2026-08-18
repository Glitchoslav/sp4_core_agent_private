'use strict';

const crypto = require('node:crypto');
const audit = require('./audit.cjs');

const MAX_PAST_AGE_MS = 5 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 2 * 60 * 1000;
const SIGNED_PAYLOAD_PREFIXES = Object.freeze([
  'sp4-register:v1:',
  'sp4-devicecert:v1:',
  'sp4-invite-accept:v1:',
  'sp4-api:v1:'
]);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function requireNonEmptyString(value) {
  if (typeof value !== 'string' || value.trim() === '') fail('MISSING_FIELD');
  return value;
}

function decodeStrictBase64(value, errorCode) {
  if (typeof value !== 'string') fail('MISSING_FIELD');
  if (value.length === 0) fail(errorCode);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) fail(errorCode);
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length === 0 || decoded.toString('base64') !== value) fail(errorCode);
  return decoded;
}

function parseEd25519PublicKey(publicKey) {
  try {
    const key = crypto.createPublicKey({
      key: decodeStrictBase64(publicKey, 'INVALID_KEY_FORMAT'),
      type: 'spki',
      format: 'der'
    });
    if (key.asymmetricKeyType !== 'ed25519') fail('INVALID_KEY_FORMAT');
    return key;
  } catch (error) {
    if (error?.code === 'MISSING_FIELD' || error?.code === 'INVALID_KEY_FORMAT') throw error;
    fail('INVALID_KEY_FORMAT');
  }
}

function assertFreshTimestamp(issuedAt, nowMs = Date.now()) {
  requireNonEmptyString(issuedAt);
  const issuedAtMs = Date.parse(issuedAt);
  if (!Number.isFinite(issuedAtMs)
      || nowMs - issuedAtMs > MAX_PAST_AGE_MS
      || issuedAtMs - nowMs > MAX_FUTURE_SKEW_MS) {
    fail('STALE_TIMESTAMP');
  }
}

function credentialState(db, credentialId) {
  requireNonEmptyString(credentialId);
  const credential = db.db.prepare(`
    SELECT c.*, u.status AS user_status
      FROM sp4_credentials c
      JOIN sp4_users u ON u.user_id = c.user_id
     WHERE c.credential_id = ?
  `).get(credentialId);
  if (!credential) fail('UNKNOWN_CREDENTIAL');
  if (credential.status !== 'active' || credential.revoked_at !== null) fail('CREDENTIAL_REVOKED');
  if (credential.user_status !== 'active') fail('USER_DISABLED');
  return credential;
}

function userState(db, userId) {
  requireNonEmptyString(userId);
  const user = db.db.prepare('SELECT * FROM sp4_users WHERE user_id = ?').get(userId);
  if (!user) fail('UNKNOWN_CREDENTIAL');
  if (user.status !== 'active') fail('USER_DISABLED');
  return user;
}

function runTransaction(db, operation) {
  if (typeof db.db.transaction === 'function') return db.db.transaction(operation)();
  db.db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.db.exec('COMMIT');
    return result;
  } catch (error) {
    db.db.exec('ROLLBACK');
    throw error;
  }
}

function verifySignedPayload(db, { credentialId, payload, payloadJson, signatureB64 }) {
  const signedPayload = payload ?? payloadJson;
  requireNonEmptyString(signedPayload);
  if (!SIGNED_PAYLOAD_PREFIXES.some((prefix) => signedPayload.startsWith(prefix))) {
    fail('INVALID_SIGNATURE');
  }
  const credential = credentialState(db, credentialId);
  let signature;
  try {
    signature = decodeStrictBase64(signatureB64, 'INVALID_SIGNATURE');
  } catch (error) {
    if (signatureB64 === '') fail('EMPTY_SIGNATURE');
    throw error;
  }
  const verified = crypto.verify(
    null,
    Buffer.from(signedPayload, 'utf8'),
    parseEd25519PublicKey(credential.public_key),
    signature
  );
  if (!verified) fail('INVALID_SIGNATURE');
  return true;
}

function buildRegistrationPayload({ userId, devicePublicKeyBase64, issuedAt }) {
  return `sp4-register:v1:${requireNonEmptyString(userId)}:${requireNonEmptyString(devicePublicKeyBase64)}:${requireNonEmptyString(issuedAt)}`;
}

function buildDeviceCertificatePayload({ userId, deviceId, devicePublicKey, credentialId, issuedAt }) {
  return `sp4-devicecert:v1:${requireNonEmptyString(userId)}:${requireNonEmptyString(deviceId)}:${requireNonEmptyString(devicePublicKey)}:${requireNonEmptyString(credentialId)}:${requireNonEmptyString(issuedAt)}`;
}

function registerUserWithRootCredential(db, { userId, publicKey, issuedAt, signatureB64 }) {
  requireNonEmptyString(userId);
  parseEd25519PublicKey(publicKey);
  assertFreshTimestamp(issuedAt);
  const payload = buildRegistrationPayload({ userId, devicePublicKeyBase64: publicKey, issuedAt });
  const signature = decodeStrictBase64(signatureB64, signatureB64 === '' ? 'EMPTY_SIGNATURE' : 'INVALID_SIGNATURE');
  if (!crypto.verify(null, Buffer.from(payload), parseEd25519PublicKey(publicKey), signature)) {
    fail('INVALID_SIGNATURE');
  }
  return runTransaction(db, () => {
    const existing = db.db.prepare('SELECT user_id, status FROM sp4_users WHERE user_id = ?').get(userId);
    if (existing) {
      if (existing.status !== 'active') fail('USER_DISABLED');
      const credential = db.db.prepare(`
        SELECT credential_id FROM sp4_credentials
         WHERE user_id = ? AND public_key = ? AND type = 'root'
           AND status = 'active' AND revoked_at IS NULL
      `).get(userId, publicKey);
      if (!credential) fail('UNKNOWN_CREDENTIAL');
      return { user_id: userId, credential_id: credential.credential_id };
    }
    const credentialId = crypto.randomUUID();
    db.db.prepare('INSERT INTO sp4_users (user_id) VALUES (?)').run(userId);
    db.db.prepare(`
      INSERT INTO sp4_credentials (credential_id, user_id, public_key, type)
      VALUES (?, ?, ?, 'root')
    `).run(credentialId, userId, publicKey);
    audit.append(db, 'identity_created', userId, 'USER', {
      via: 'registerUserWithRootCredential',
      credential_id: credentialId
    });
    return { user_id: userId, credential_id: credentialId };
  });
}

function createUser(db, { userId }) {
  requireNonEmptyString(userId);
  return runTransaction(db, () => {
    const existing = db.db.prepare('SELECT user_id, status FROM sp4_users WHERE user_id = ?').get(userId);
    if (existing) {
      if (existing.status !== 'active') fail('USER_DISABLED');
      return { user_id: existing.user_id };
    }
    db.db.prepare('INSERT INTO sp4_users (user_id) VALUES (?)').run(userId);
    audit.append(db, 'identity_created', userId, 'USER', { via: 'createUser' });
    return { user_id: userId };
  });
}

function addCredential(db, { userId, publicKey, type = 'root' }) {
  requireNonEmptyString(userId);
  parseEd25519PublicKey(publicKey);
  if (type !== 'root' && type !== 'rotation') fail('MISSING_FIELD');
  userState(db, userId);
  const credentialId = crypto.randomUUID();
  db.db.prepare(
    'INSERT INTO sp4_credentials (credential_id, user_id, public_key, type) VALUES (?, ?, ?, ?)'
  ).run(credentialId, userId, publicKey, type);
  return { credential_id: credentialId, user_id: userId };
}

function getActiveCredentials(db, userId) {
  userState(db, userId);
  return db.db.prepare(`
    SELECT * FROM sp4_credentials
     WHERE user_id = ? AND status = 'active' AND revoked_at IS NULL
  `).all(userId);
}

function parseCertificate(certJson) {
  requireNonEmptyString(certJson);
  let cert;
  try {
    cert = JSON.parse(certJson);
  } catch {
    fail('MISSING_FIELD');
  }
  if (!cert || typeof cert !== 'object' || Array.isArray(cert)) fail('MISSING_FIELD');
  for (const field of ['userId', 'deviceId', 'devicePublicKey', 'credentialId', 'issuedAt']) {
    requireNonEmptyString(cert[field]);
  }
  if (cert.signature === undefined || cert.signature === null) fail('MISSING_FIELD');
  if (cert.signature === '') fail('EMPTY_SIGNATURE');
  return cert;
}

function addDevice(db, { userId, deviceId, devicePublicKey, certJson }) {
  requireNonEmptyString(userId);
  requireNonEmptyString(deviceId);
  parseEd25519PublicKey(devicePublicKey);
  const cert = parseCertificate(certJson);
  if (cert.userId !== userId) fail('USER_MISMATCH');
  if (cert.deviceId !== deviceId || cert.devicePublicKey !== devicePublicKey) fail('INVALID_SIGNATURE');
  assertFreshTimestamp(cert.issuedAt);
  const credential = credentialState(db, cert.credentialId);
  if (credential.user_id !== cert.userId) fail('USER_MISMATCH');
  const payload = buildDeviceCertificatePayload(cert);
  const signature = decodeStrictBase64(cert.signature, 'INVALID_SIGNATURE');
  if (!crypto.verify(null, Buffer.from(payload), parseEd25519PublicKey(credential.public_key), signature)) {
    fail('INVALID_SIGNATURE');
  }
  const existing = db.db.prepare(
    'SELECT device_id, credential_id, public_key, revoked_at FROM sp4_devices WHERE device_id = ?'
  ).get(deviceId);
  if (existing?.revoked_at !== null && existing?.revoked_at !== undefined) fail('DEVICE_REVOKED');
  if (existing) {
    if (existing.credential_id !== credential.credential_id || existing.public_key !== devicePublicKey) {
      fail('INVALID_SIGNATURE');
    }
    return { device_id: existing.device_id, credential_id: existing.credential_id };
  }
  return runTransaction(db, () => {
    db.db.prepare(`
      INSERT INTO sp4_devices (device_id, user_id, credential_id, public_key, cert_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(deviceId, userId, credential.credential_id, devicePublicKey, certJson);
    audit.append(db, 'device_added', userId, 'USER', {
      device_id: deviceId,
      credential_id: credential.credential_id
    });
    return { device_id: deviceId, credential_id: credential.credential_id };
  });
}

function revokeCredential(db, credentialId) {
  const credential = credentialState(db, credentialId);
  return runTransaction(db, () => {
    db.db.prepare(
      "UPDATE sp4_credentials SET status = 'revoked', revoked_at = datetime('now') WHERE credential_id = ?"
    ).run(credentialId);
    audit.append(db, 'credential_revoked', credential.user_id, 'USER', { credential_id: credentialId });
    return db.db.prepare(
      'SELECT credential_id, revoked_at FROM sp4_credentials WHERE credential_id = ?'
    ).get(credentialId);
  });
}

function revokeDevice(db, deviceId) {
  requireNonEmptyString(deviceId);
  const device = db.db.prepare(
    'SELECT device_id, user_id, revoked_at FROM sp4_devices WHERE device_id = ?'
  ).get(deviceId);
  if (!device || device.revoked_at !== null) fail('DEVICE_REVOKED');
  return runTransaction(db, () => {
    db.db.prepare("UPDATE sp4_devices SET revoked_at = datetime('now') WHERE device_id = ?").run(deviceId);
    audit.append(db, 'device_revoked', device.user_id, 'USER', { device_id: deviceId });
    return db.db.prepare('SELECT device_id, revoked_at FROM sp4_devices WHERE device_id = ?').get(deviceId);
  });
}

function getUserByDevice(db, deviceId) {
  requireNonEmptyString(deviceId);
  const device = db.db.prepare(`
    SELECT d.user_id, d.revoked_at, u.status AS user_status
      FROM sp4_devices d
      JOIN sp4_users u ON u.user_id = d.user_id
     WHERE d.device_id = ?
  `).get(deviceId);
  if (!device) return null;
  if (device.revoked_at !== null) fail('DEVICE_REVOKED');
  if (device.user_status !== 'active') fail('USER_DISABLED');
  return db.db.prepare('SELECT * FROM sp4_users WHERE user_id = ?').get(device.user_id);
}

function getCredentialPrincipal(db, credentialId) {
  const credential = credentialState(db, credentialId);
  return { userId: credential.user_id, credentialId: credential.credential_id };
}

module.exports = {
  buildRegistrationPayload,
  buildDeviceCertificatePayload,
  registerUserWithRootCredential,
  createUser,
  addCredential,
  getActiveCredentials,
  verifySignedPayload,
  addDevice,
  revokeCredential,
  revokeDevice,
  getUserByDevice,
  getCredentialPrincipal,
  assertFreshTimestamp,
  MAX_PAST_AGE_MS,
  MAX_FUTURE_SKEW_MS,
  fail
};
