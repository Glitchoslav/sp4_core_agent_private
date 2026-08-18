import fs from 'node:fs';
import path from 'node:path';

import { fail, requireText } from './errors.js';

const ENV_REF = /^env:([A-Z][A-Z0-9_]{2,127})$/;
const SYSTEMD_REF = /^systemd-cred:([A-Za-z0-9][A-Za-z0-9_.@-]{0,127})$/;

export function assertKeyReference(keyRef) {
  requireText(keyRef, 'INVALID_KEY_REF');
  if (!ENV_REF.test(keyRef) && !SYSTEMD_REF.test(keyRef)) fail('INVALID_KEY_REF');
  return keyRef;
}

function decodeDek(value) {
  requireText(value, 'MISSING_KEY_MATERIAL');
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, 'hex');
  if (/^[A-Za-z0-9+/]{43}=$/.test(value)) return Buffer.from(value, 'base64');
  fail('INVALID_DEK_FORMAT');
}

export function resolveKeyReference(keyRef, { env = process.env, readFile = fs.readFileSync } = {}) {
  assertKeyReference(keyRef);
  const envMatch = ENV_REF.exec(keyRef);
  if (envMatch) return decodeDek(env[envMatch[1]]);

  const credentialName = SYSTEMD_REF.exec(keyRef)[1];
  const credentialDirectory = env.CREDENTIALS_DIRECTORY;
  requireText(credentialDirectory, 'CREDENTIALS_DIRECTORY_REQUIRED');
  const credentialPath = path.resolve(credentialDirectory, credentialName);
  if (path.dirname(credentialPath) !== path.resolve(credentialDirectory)) fail('INVALID_KEY_REF');
  try {
    return decodeDek(readFile(credentialPath, 'utf8').trim());
  } catch (error) {
    if (error?.code?.startsWith?.('INVALID_') || error?.code === 'MISSING_KEY_MATERIAL') throw error;
    fail('KEY_CREDENTIAL_UNAVAILABLE', error);
  }
}
