import crypto from 'node:crypto';

let lastTimestamp = -1;
let randomTail = 0n;
const RANDOM_MASK = (1n << 74n) - 1n;

function random74Bits() {
  return BigInt(`0x${crypto.randomBytes(10).toString('hex')}`) & RANDOM_MASK;
}

export function uuidv7(now = Date.now()) {
  let timestamp = Math.max(Number(now), lastTimestamp);
  if (!Number.isSafeInteger(timestamp) || timestamp < 0 || timestamp > 0xffffffffffff) {
    throw new RangeError('INVALID_UUIDV7_TIMESTAMP');
  }

  if (timestamp === lastTimestamp) {
    randomTail = (randomTail + 1n) & RANDOM_MASK;
    if (randomTail === 0n) timestamp += 1;
  } else {
    randomTail = random74Bits();
  }
  lastTimestamp = timestamp;

  const randA = randomTail >> 62n;
  const randB = randomTail & ((1n << 62n) - 1n);
  const value = (BigInt(timestamp) << 80n)
    | (0x7n << 76n)
    | (randA << 64n)
    | (0x2n << 62n)
    | randB;
  const hex = value.toString(16).padStart(32, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
