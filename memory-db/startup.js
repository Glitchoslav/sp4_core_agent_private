import path from 'node:path';
import { createRequire } from 'node:module';

import { fail, requireText } from './errors.js';

const require = createRequire(import.meta.url);

export function assertRuntimeVersion(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 5)) fail('NODE_22_5_REQUIRED');
  return version;
}

export function assertIdentityEnvironment(env = process.env) {
  const modulePath = requireText(env.SP4_IDENTITY_MODULE_PATH, 'SP4_IDENTITY_MODULE_PATH_REQUIRED');
  const databasePath = requireText(env.SP4_IDENTITY_DB_PATH, 'SP4_IDENTITY_DB_PATH_REQUIRED');
  return { modulePath, databasePath };
}

export function loadIdentityContext({ env = process.env } = {}) {
  assertRuntimeVersion();
  const configured = assertIdentityEnvironment(env);
  const modulePath = path.resolve(configured.modulePath);
  const databasePath = path.resolve(configured.databasePath);
  let substrate;
  try {
    substrate = require(modulePath);
  } catch (error) {
    fail('IDENTITY_MODULE_UNAVAILABLE', error);
  }
  if (typeof substrate.getCredentialPrincipal !== 'function'
      || typeof substrate.openIdentityDatabase !== 'function') {
    fail('IDENTITY_MODULE_INVALID');
  }
  return {
    substrate,
    identityDb: substrate.openIdentityDatabase(databasePath),
    modulePath,
    databasePath
  };
}
