import path from 'node:path';

import { MemoryDbCatalog } from './catalog.js';
import { resolveKeyReference } from './key-reference.js';
import { loadIdentityContext } from './startup.js';
import { MemoryStore } from './store.js';

export function createMemoryStoreFromEnvironment({
  env = process.env,
  catalogPath,
  resolveKey = (keyRef) => resolveKeyReference(keyRef, { env })
} = {}) {
  const identity = loadIdentityContext({ env });
  const catalog = new MemoryDbCatalog(path.resolve(catalogPath));
  const store = new MemoryStore({
    catalog,
    identityDb: identity.identityDb,
    substrate: identity.substrate,
    resolveKey,
    nodeEnv: env.NODE_ENV
  });
  return {
    catalog,
    identityDb: identity.identityDb,
    store,
    close() {
      store.close();
      catalog.close();
      identity.identityDb.db.close();
    }
  };
}
