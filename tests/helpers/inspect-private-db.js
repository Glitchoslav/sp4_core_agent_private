import fs from 'node:fs';

export function inspectPrivateDatabase(filePath, { canary }) {
  const bytes = fs.readFileSync(filePath);
  return {
    hasPlaintextHeader: bytes.subarray(0, 16).equals(Buffer.from('SQLite format 3\0')),
    containsCanary: bytes.includes(Buffer.from(canary, 'utf8'))
  };
}
