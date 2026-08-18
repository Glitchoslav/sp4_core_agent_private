export const PRIVATE_SYNCTHING_IGNORES = Object.freeze([
  'sp4-private-*.db',
  'sp4-private-*.db-wal',
  'sp4-private-*.db-shm'
]);

export function validateSyncthingIgnore(text) {
  const patterns = new Set(String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  const missing = PRIVATE_SYNCTHING_IGNORES.filter((pattern) => !patterns.has(pattern));
  return { valid: missing.length === 0, missing };
}
